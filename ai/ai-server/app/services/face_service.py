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
try:
    import mediapipe as mp
    MP_AVAILABLE = True
    mp_fd = mp.solutions.face_detection
except Exception:
    MP_AVAILABLE = False
    mp_fd = None
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
def get_face_model(device: str = "cuda"):
    dev = "cuda" if device == "cuda" and torch.cuda.is_available() else "cpu"
    model = load_model(CKPT_PATH, device=dev, num_classes=len(CLASS_NAMES))
    model.eval()
    return model, dev

def infer_face(image_bytes: bytes, device: str = "cuda") -> dict:
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
    optimization_level: str = "balanced",  # "fast", "balanced", "quality"
) -> Dict[str, Any]:
    """
    동영상 바이트 -> 고급 감정 분석 (video_optimized.py 사용)
    - MediaPipe 얼굴 검출 + 크롭
    - EMA 스무딩 + 히스테리시스
    - 블러/품질 필터링
    - 면접 최적화 프리셋 적용
    """
    # 최적화 레벨에 따른 설정 조정
    if optimization_level == "fast":
        # 빠른 처리를 위한 설정
        config = {
            "ema_alpha": 0.85,
            "enter_thr": 0.55,
            "exit_thr": 0.45,
            "margin_thr": 0.15,
            "min_stable": 3,
            "face_margin": 0.15,
            "min_face_px": 80,
            "blur_thr": 70.0,
            "use_clahe": False,
            "logit_bias_str": "happy=-0.3,neutral=0.1",
            "use_happy_guard": False
        }
    elif optimization_level == "quality":
        # 고품질 분석을 위한 설정
        config = {
            "ema_alpha": 0.95,
            "enter_thr": 0.65,
            "exit_thr": 0.55,
            "margin_thr": 0.25,
            "min_stable": 8,
            "face_margin": 0.30,
            "min_face_px": 128,
            "blur_thr": 100.0,
            "use_clahe": True,
            "logit_bias_str": "happy=-0.5,neutral=0.3,fear=0.2",
            "use_happy_guard": True
        }
    else:  # balanced
        # 균형 잡힌 설정 (기본값)
        config = {
            "ema_alpha": 0.92,
            "enter_thr": 0.60,
            "exit_thr": 0.50,
            "margin_thr": 0.20,
            "min_stable": 6,
            "face_margin": 0.25,
            "min_face_px": 112,
            "blur_thr": 90.0,
            "use_clahe": False,
            "logit_bias_str": "happy=-0.4,neutral=0.2,fear=0.1",
            "use_happy_guard": True
        }
    
    # video_optimized.py의 고급 분석 사용
    report = analyze_video_bytes(
        video_bytes=video_bytes,
        model_name="Celal11/resnet-50-finetuned-FER2013-0.001",
        output_path=None,
        show_video=False,
        **config
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

def _center_crop_square_bgr(img_bgr, out_size=224):
    h, w = img_bgr.shape[:2]
    side = min(h, w)
    y0 = (h - side) // 2
    x0 = (w - side) // 2
    crop = img_bgr[y0:y0+side, x0:x0+side]
    if crop.shape[0] != out_size or crop.shape[1] != out_size:
        crop = cv2.resize(crop, (out_size, out_size))
    return crop


def _detect_and_crop_face_bgr(frame_bgr, detector, margin=0.25, min_size=80):
    """
    MediaPipe 얼굴 검출로 가장 큰 얼굴 영역을 크롭. 실패 시 None.
    """
    if detector is None:
        return None

    h, w = frame_bgr.shape[:2]
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    res = detector.process(rgb)
    if not res or not res.detections:
        return None

    best = None
    best_area = -1
    for det in res.detections:
        bbox = det.location_data.relative_bounding_box
        x, y, bw, bh = bbox.xmin, bbox.ymin, bbox.width, bbox.height
        X = max(0, int(x * w)); Y = max(0, int(y * h))
        W = int(bw * w); H = int(bh * h)
        mx = int(W * margin); my = int(H * margin)
        X0 = max(0, X - mx); Y0 = max(0, Y - my)
        X1 = min(w, X + W + mx); Y1 = min(h, Y + H + my)
        area = (X1 - X0) * (Y1 - Y0)
        if area > best_area:
            best_area = area
            best = (X0, Y0, X1, Y1)

    if best is None:
        return None
    X0, Y0, X1, Y1 = best
    face = frame_bgr[Y0:Y1, X0:X1]
    if face.size == 0:
        return None
    if min(face.shape[0], face.shape[1]) < min_size:
        return None
    # 정사각 리사이즈
    face = cv2.resize(face, (224, 224))
    return face


def infer_face_frames(
    frames: List[np.ndarray],
    device: str = "cuda",
    sample_stride: int = 1,
    return_points: bool = False,
    use_face_detector: bool = True,
) -> Dict[str, Any]:
    """
    프레임 리스트 기반 감정 추론.
    - MediaPipe 얼굴검출 + 크롭(옵션). 실패하면 센터크롭으로 대체.
    - sample_stride로 샘플링(예: 3이면 3프레임마다 1개만 추론)
    """
    model, dev = get_face_model(device)
    detector = mp_fd.FaceDetection(model_selection=1, min_detection_confidence=0.5) if (MP_AVAILABLE and use_face_detector) else None

    counts = {k: 0 for k in CLASS_NAMES}
    timeline = []
    used = 0

    with torch.no_grad():
        for i, bgr in enumerate(frames):
            if sample_stride > 1 and (i % sample_stride) != 0:
                continue

            face_bgr = None
            if detector is not None:
                face_bgr = _detect_and_crop_face_bgr(bgr, detector)
            if face_bgr is None:
                face_bgr = _center_crop_square_bgr(bgr, 224)

            rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(rgb)
            x = _preprocess(img).unsqueeze(0).to(dev)

            logits = model(x)
            probs = F.softmax(logits, dim=1).cpu().numpy().squeeze()
            top_idx = int(probs.argmax())
            label = CLASS_NAMES[top_idx]

            counts[label] += 1
            used += 1

            if return_points:
                timeline.append({
                    "frame": i,
                    "label": label,
                    "score": float(probs[top_idx]),
                    "probs": {CLASS_NAMES[j]: float(probs[j]) for j in range(len(CLASS_NAMES))}
                })

    if used == 0:
        return {
            "label": "neutral",
            "score": 0.0,
            "probs": {k: 0.0 for k in CLASS_NAMES},
            "samples": 0,
            "timeline": timeline if return_points else None
        }

    dominant = max(counts, key=counts.get)
    probs_dist = {k: counts[k] / float(used) for k in CLASS_NAMES}
    result = {
        "label": dominant,
        "score": float(probs_dist[dominant]),
        "probs": probs_dist,
        "samples": used
    }
    if return_points:
        result["timeline"] = timeline
    return result