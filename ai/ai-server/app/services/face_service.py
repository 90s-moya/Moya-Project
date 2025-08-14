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
from Face_Resnet.video_optimized import analyze_video_bytes

CKPT_PATH = str(FACE_DIR / "best_model.pt")
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
    동영상 바이트 -> 고급 감정 분석 (video_optimized.py 사용)
    - MediaPipe 얼굴 검출 + 크롭
    - EMA 스무딩 + 히스테리시스
    - 블러/품질 필터링
    - 면접 최적화 프리셋 적용
    """
    # video_optimized.py의 고급 분석 사용 (면접 최적 프리셋)
    report = analyze_video_bytes(
        video_bytes=video_bytes,
        model_name="Celal11/resnet-50-finetuned-FER2013-0.001",
        output_path=None,
        show_video=False,
        # 면접 최적 프리셋
        ema_alpha=0.92,
        enter_thr=0.60,
        exit_thr=0.50,
        margin_thr=0.20,
        min_stable=6,
        face_margin=0.25,
        min_face_px=112,
        blur_thr=90.0,
        use_clahe=False,
        logit_bias_str="happy=-0.4,neutral=0.2,fear=0.1",
        use_happy_guard=True
    )
    
    if not report:
        raise RuntimeError("비디오 분석에 실패했습니다.")
    
    # report 구조를 face_service 형식으로 변환
    frame_dist = report.get("frame_distribution", {})
    summary = report.get("summary", {})
    
    # 지배 감정 결정
    dominant_emotion = summary.get("dominant_emotion", "neutral")
    if dominant_emotion == "불확실":
        dominant_emotion = "neutral"
    
    # 확률 분포 계산 (퍼센트를 확률로 변환)
    probs = {}
    total_frames = report.get("video_info", {}).get("total_frames", 1)
    
    for emotion in CLASS_NAMES:
        if emotion in frame_dist:
            probs[emotion] = frame_dist[emotion]["percentage"] / 100.0
        else:
            probs[emotion] = 0.0
    
    # 지배 감정의 점수
    dominant_score = probs.get(dominant_emotion, 0.0)
    
    result = {
        "label": dominant_emotion,
        "score": float(dominant_score),
        "probs": probs,
        "samples": total_frames,
        "fps": float(report.get("video_info", {}).get("fps", 30.0)),
        "emotion_changes": summary.get("emotion_changes", 0),
        "average_emotion_duration": summary.get("average_emotion_duration", 0.0)
    }
    
    # 타임라인 정보 추가 (요청 시)
    if return_points and "detailed_logs" in report:
        timeline = []
        for log in report["detailed_logs"]:
            timeline.append({
                "t": float(log["start_frame"] / result["fps"]),
                "frame": int(log["start_frame"]),
                "label": log["label"],
                "duration": float(log["duration_seconds"])
            })
        result["timeline"] = timeline
    
    return result
