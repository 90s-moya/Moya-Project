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

# Tesla T4 GPU 메모리 최적화를 위한 유틸리티 함수
def cleanup_gpu_memory():
    """GPU 메모리 정리"""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        import gc
        gc.collect()

@lru_cache(maxsize=1)
def get_face_model(device: str = "cuda"):
    """Tesla T4 최적화 Face 모델 로드"""
    dev = "cuda" if device == "cuda" and torch.cuda.is_available() else "cpu"
    
    # Tesla T4 GPU 최적화 설정
    if dev == "cuda":
        # cuDNN 최적화 설정
        torch.backends.cudnn.benchmark = True
        torch.backends.cudnn.deterministic = False
        
        print(f"Face Model - Using GPU: {torch.cuda.get_device_name(0)}")
        print(f"Face Model - CUDA Version: {torch.version.cuda}")
    
    model = load_model(CKPT_PATH, device=dev, num_classes=len(CLASS_NAMES))
    
    # Tesla T4 최적화: Half precision 모델 변환
    if dev == "cuda":
        model = model.half()  # FP16 변환
        # GPU 메모리 정보 출력
        memory_allocated = torch.cuda.memory_allocated(0) / 1024**3  # GB
        print(f"Face Model - GPU Memory Allocated: {memory_allocated:.2f}GB")
    
    model.eval()
    return model, dev

def infer_face(image_bytes: bytes, device: str = "cuda") -> dict:
    """이미지 바이트 -> 감정 분류 (Tesla T4 GPU 최적화)"""
    model, dev = get_face_model(device)
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    x = _preprocess(img).unsqueeze(0).to(dev)
    
    # Tesla T4 GPU 최적화 추론
    with torch.no_grad():
        # FP16 사용 (GPU인 경우)
        if dev == "cuda":
            with torch.cuda.amp.autocast():
                logits = model(x.half())  # Half precision 입력
        else:
            logits = model(x)
            
        # GPU에서 직접 연산 수행 (CPU 이동 최소화)
        probs = F.softmax(logits, dim=1)
        top_idx = torch.argmax(probs, dim=1).item()
        top_score = probs[0, top_idx].item()
        
        # 모든 확률을 한 번에 CPU로 이동
        all_probs = probs.cpu().numpy().squeeze()
    
    # 추론 완료 후 GPU 메모리 정리 (Tesla T4 최적화)
    if dev == "cuda":
        cleanup_gpu_memory()
    
    return {
        "label": CLASS_NAMES[top_idx],
        "score": float(top_score),
        "probs": {CLASS_NAMES[i]: float(all_probs[i]) for i in range(len(CLASS_NAMES))}
    }

def _bytes_to_temp_video(b: bytes, suffix: str = ".mp4") -> str:
    f = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    f.write(b)
    f.flush(); f.close()
    return f.name

def infer_face_video(
    video_bytes: bytes,
    device: str = "cuda",
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
