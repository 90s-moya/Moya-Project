# app/services/face_service.py
from __future__ import annotations
import sys, io, tempfile
from pathlib import Path
from functools import lru_cache
from typing import List, Dict, Any, Optional, Iterable

import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms
import cv2
import numpy as np

from app.utils.accelerator import init_runtime
init_runtime()

ROOT = Path(__file__).resolve().parents[2]
FACE_DIR = ROOT / "Face_Resnet"
sys.path.insert(0, str(FACE_DIR))

try:
    from Face_Resnet.model import load_model
except ImportError as e:
    def load_model(*args, **kwargs):
        raise RuntimeError("Face_Resnet model not available")

CKPT_PATH = str(FACE_DIR / "best_model.pt")
CLASS_NAMES = ["angry","disgust","fear","happy","sad","surprise","neutral"]

_preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=(0.485,0.456,0.406), std=(0.229,0.224,0.225)),
])

def cleanup_gpu_memory():
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        import gc; gc.collect()

@lru_cache(maxsize=1)
def get_face_model(device: str = "cuda"):
    dev = "cuda" if (device == "cuda" and torch.cuda.is_available()) else "cpu"
    model = load_model(CKPT_PATH, device=dev, num_classes=len(CLASS_NAMES))
    if dev == "cuda":
        model = model.half()
        torch.backends.cudnn.benchmark = True
    model.eval()
    return model, dev

def _detect_face_roi(bgr: np.ndarray, margin: float = 0.25) -> np.ndarray:
    # 가장 단순하고 가벼운 Haar 사용(없으면 중앙크롭 폴백)
    try:
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        face_cascade = cv2.CascadeClassifier(cascade_path)
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.2, 3, minSize=(60,60))
        if len(faces) == 0:
            h, w = bgr.shape[:2]
            size = min(h, w)
            y0 = max(0, (h - size)//2); x0 = max(0, (w - size)//2)
            return bgr[y0:y0+size, x0:x0+size]
        x,y,w,h = max(faces, key=lambda r: r[2]*r[3])
        mx = int(w*margin); my = int(h*margin)
        x0 = max(0, x-mx); y0 = max(0, y-my)
        x1 = min(bgr.shape[1], x+w+mx); y1 = min(bgr.shape[0], y+h+my)
        return bgr[y0:y1, x0:x1]
    except Exception:
        h, w = bgr.shape[:2]
        size = min(h, w)
        y0 = max(0, (h - size)//2); x0 = max(0, (w - size)//2)
        return bgr[y0:y0+size, x0:x0+size]

def infer_face_frames(
    frames: Iterable[np.ndarray],
    device: str = "cuda",
    stride: int = 5,
    return_points: bool = False,
    batch: int = 16
) -> Dict[str, Any]:
    model, dev = get_face_model(device)
    xs: List[torch.Tensor] = []
    frame_ids: List[int] = []
    probs_sum = torch.zeros(len(CLASS_NAMES), dtype=torch.float32, device=("cuda" if dev=="cuda" else "cpu"))

    def _flush():
        nonlocal xs, frame_ids, probs_sum
        if not xs: return []
        x = torch.stack(xs, dim=0).to(dev, non_blocking=True)
        if dev == "cuda": x = x.half()
        with torch.no_grad():
            if dev == "cuda":
                with torch.cuda.amp.autocast():
                    logits = model(x)
            else:
                logits = model(x)
            p = F.softmax(logits, dim=1)  # (N,C)
        probs_sum += p.sum(dim=0)
        outs = p.detach().cpu().numpy()
        xs.clear(); ids = frame_ids[:]; frame_ids.clear()
        return [{"frame_idx": ids[i], "probs": outs[i]} for i in range(len(ids))]

    timeline: List[Dict[str, Any]] = []
    for i, bgr in enumerate(frames):
        if i % max(1, stride) != 0: continue
        roi = _detect_face_roi(bgr, margin=0.25)
        img = Image.fromarray(cv2.cvtColor(roi, cv2.COLOR_BGR2RGB))
        xs.append(_preprocess(img))
        frame_ids.append(i)
        if len(xs) >= batch:
            frame_outs = _flush()
            if return_points:
                for fo in frame_outs:
                    top = int(np.argmax(fo["probs"]))
                    timeline.append({"frame": fo["frame_idx"], "label": CLASS_NAMES[top]})
    # 잔여 플러시
    frame_outs = _flush()
    if return_points:
        for fo in frame_outs:
            top = int(np.argmax(fo["probs"]))
            timeline.append({"frame": fo["frame_idx"], "label": CLASS_NAMES[top]})

    # 집계
    probs_mean = (probs_sum / max(1, len(timeline) if return_points else (len(frame_outs) or 1))).cpu().numpy()
    top_idx = int(np.argmax(probs_mean))
    result = {
        "label": CLASS_NAMES[top_idx],
        "score": float(probs_mean[top_idx]),
        "probs": {CLASS_NAMES[i]: float(probs_mean[i]) for i in range(len(CLASS_NAMES))},
        "samples": int(len(timeline) if return_points else max(1, frame_ids[-1] if frame_ids else 0) + 1),
    }
    if return_points:
        result["timeline"] = timeline
    if dev == "cuda":
        cleanup_gpu_memory()
    return result

# ===== 바이트 기반(호환) : 임시파일→프레임→frames API 호출 =====
def infer_face_video(
    video_bytes: bytes,
    device: str = "cuda",
    stride: int = 5,
    max_frames: Optional[int] = None,
    return_points: bool = False,
    optimization_level: str = "balanced",
) -> Dict[str, Any]:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(video_bytes); tmp_path = tmp.name
    cap = cv2.VideoCapture(tmp_path)
    frames: List[np.ndarray] = []
    while True:
        ok, frame = cap.read()
        if not ok: break
        frames.append(frame)
        if max_frames and len(frames) >= max_frames: break
    cap.release()
    try: os.remove(tmp_path)
    except Exception: pass
    if not frames:
        raise RuntimeError("no frames")
    return infer_face_frames(frames, device=device, stride=stride, return_points=return_points)
