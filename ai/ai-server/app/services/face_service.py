# app/services/face_service.py
from __future__ import annotations
import sys
from pathlib import Path
from functools import lru_cache
import io
import tempfile
from typing import List, Dict, Any, Optional

import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

# 동영상 처리용
import cv2
import numpy as np

# === Face_Resnet 경로 추가 ===
ROOT = Path(__file__).resolve().parents[2]
FACE_DIR = ROOT / "Face_Resnet"
sys.path.insert(0, str(FACE_DIR))

from Face_Resnet.model import load_model

CKPT_PATH = None
CLASS_NAMES = ["angry","disgust","fear","happy","sad","surprise","neutral"]

_preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=(0.485,0.456,0.406), std=(0.229,0.224,0.225)),
])

@lru_cache(maxsize=1)
def get_face_model(device: str = "cpu"):
    dev = "cuda" if device == "cuda" and torch.cuda.is_available() else "cpu"
    model = load_model(CKPT_PATH, device=dev, num_classes=len(CLASS_NAMES))
    model.eval()
    return model, dev

def infer_face(image_bytes: bytes, device: str = "cpu") -> dict:
    """이미지 바이트 -> 감정 분류"""
    model, dev = get_face_model(device)
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    x = _preprocess(img).unsqueeze(0).to(dev)
    with torch.no_grad():
        logits = model(x)
        probs = F.softmax(logits, dim=1).cpu().numpy().squeeze()
    top_idx = int(probs.argmax())
    return {
        "label": CLASS_NAMES[top_idx],
        "score": float(probs[top_idx]),
        "probs": {CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))}
    }

def _bytes_to_temp_video(b: bytes, suffix: str = ".mp4") -> str:
    f = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    f.write(b)
    f.flush(); f.close()
    return f.name

def infer_face_video(
    video_bytes: bytes,
    device: str = "cpu",
    stride: int = 5,
    max_frames: Optional[int] = None,
    return_points: bool = False,
) -> Dict[str, Any]:
    """
    동영상 바이트 -> 프레임 샘플링 감정 분포/지배 감정 반환
    - stride: N프레임마다 1장 샘플 (예: 5면 5프레임마다)
    - max_frames: 상한 (None이면 제한 없음)
    - return_points: 프레임별 간단 타임라인 포함
    """
    model, dev = get_face_model(device)
    path = _bytes_to_temp_video(video_bytes)

    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise RuntimeError("비디오를 열 수 없습니다.")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_idx = 0
    taken = 0

    all_probs: List[np.ndarray] = []
    timeline: List[Dict[str, Any]] = []

    with torch.no_grad():
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % stride == 0:
                # BGR -> RGB -> PIL
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil = Image.fromarray(rgb)
                x = _preprocess(pil).unsqueeze(0).to(dev)

                logits = model(x)
                probs = F.softmax(logits, dim=1).cpu().numpy().squeeze()
                all_probs.append(probs)

                if return_points:
                    sec = frame_idx / fps
                    top_idx = int(probs.argmax())
                    timeline.append({
                        "t": float(sec),
                        "frame": int(frame_idx),
                        "label": CLASS_NAMES[top_idx],
                        "score": float(probs[top_idx]),
                    })

                taken += 1
                if max_frames is not None and taken >= max_frames:
                    break

            frame_idx += 1

    cap.release()

    if not all_probs:
        raise RuntimeError("유효한 프레임을 추출하지 못했습니다.")

    avg = np.mean(np.stack(all_probs, axis=0), axis=0)
    top_idx = int(avg.argmax())

    return {
        "label": CLASS_NAMES[top_idx],
        "score": float(avg[top_idx]),
        "probs": {CLASS_NAMES[i]: float(avg[i]) for i in range(len(CLASS_NAMES))},
        "samples": len(all_probs),
        "fps": float(fps),
        **({"timeline": timeline} if return_points else {})
    }
