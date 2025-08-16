# app/services/face_service.py
from __future__ import annotations

import os
import sys
import io
import tempfile
from pathlib import Path
from functools import lru_cache
from typing import List, Dict, Any, Optional

# ==== CPU 점유 방지: 스레드 제한 (모듈 임포트 초기에 세팅) ====
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("TFLITE_NUM_THREADS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms
import cv2
cv2.setNumThreads(0)  # OpenCV 내부 스레딩 비활성화

try:
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
except Exception:
    pass

# cuDNN/Matmul 튜닝
torch.backends.cudnn.benchmark = True
try:
    torch.set_float32_matmul_precision("high")
except Exception:
    pass

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

def _pick_device(device: str) -> torch.device:
    if device and device.startswith("cuda") and torch.cuda.is_available():
        return torch.device(device)
    return torch.device("cpu")

@lru_cache(maxsize=1)
def get_face_model(device: str = "cuda"):
    """
    모델을 1회만 로드/캐시. CUDA면 fp16으로 올려서 추론 비용 감소.
    """
    dev = _pick_device(device)
    model = load_model(CKPT_PATH, device=str(dev), num_classes=len(CLASS_NAMES))
    model.eval()
    if dev.type == "cuda":
        try:
            model = model.half()  # fp16 추론
        except Exception:
            pass
    return model, dev

def infer_face(image_bytes: bytes, device: str = "cuda") -> dict:
    """
    이미지 바이트 -> 감정 분류 (GPU 최적화)
    - 모델 캐시, channels_last, fp16 autocast, GPU에서 softmax/argmax
    """
    model, dev = get_face_model(device)

    # 1) 디코드(PIL) - CPU 작업, 최소화
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # 2) 전처리 + 배치 + 메모리 포맷
    x = _preprocess(img)  # [C,H,W], float32
    x = x.to(memory_format=torch.channels_last).unsqueeze(0)  # [1,C,H,W]

    # 3) 디바이스/정밀도 이동
    if dev.type == "cuda":
        if x.device.type == "cpu":
            x = x.pin_memory()
        x = x.to(dev, dtype=torch.float16, non_blocking=True)
    else:
        x = x.to(dev, dtype=torch.float32)

    # 4) 추론 (GPU에서 softmax/argmax)
    try:
        with torch.inference_mode():
            if dev.type == "cuda":
                with torch.autocast(device_type="cuda", dtype=torch.float16):
                    logits = model(x)
            else:
                logits = model(x)

            probs_t = logits.softmax(dim=1)          # GPU/CPU 상관없이 텐서 그대로
            top_prob_t, top_idx_t = probs_t.max(1)   # [1]
            top_idx = int(top_idx_t.item())
            top_prob = float(top_prob_t.item())
            probs_list = probs_t.squeeze(0).to(torch.float32).cpu().tolist()
    except torch.cuda.OutOfMemoryError:
        # OOM 시 CPU 폴백
        torch.cuda.empty_cache()
        with torch.inference_mode():
            logits = model.to("cpu").float()(x.to("cpu").float())
            probs_t = logits.softmax(dim=1)
            top_prob_t, top_idx_t = probs_t.max(1)
            top_idx = int(top_idx_t.item())
            top_prob = float(top_prob_t.item())
            probs_list = probs_t.squeeze(0).cpu().tolist()

    return {
        "label": CLASS_NAMES[top_idx],
        "score": top_prob,
        "probs": {CLASS_NAMES[i]: float(probs_list[i]) for i in range(len(CLASS_NAMES))}
    }

def _bytes_to_temp_video(b: bytes, suffix: str = ".mp4") -> str:
    f = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    f.write(b); f.flush(); f.close()
    return f.name

def infer_face_video(
    video_bytes: bytes,
    device: str = "cuda",
    stride: int = 8,                 # 프레임 스킵↑으로 연산량 절감
    max_frames: Optional[int] = 1200,  # 최대 프레임 제한 (필요시 조정)
    return_points: bool = False,
    optimization_level: str = "balanced",  # "fast", "balanced", "quality"
) -> Dict[str, Any]:
    """
    동영상 바이트 -> 감정 분석 (Face_Resnet.video_optimized 사용)
    CPU 점유 완화:
      - stride 증가, max_frames 제한
      - face detect/추론 파라미터 보수적으로
      - 가능하면 device 전달(미지원이면 자동 무시)
    """
    # 최적화 레벨별 기본 설정
    if optimization_level == "fast":
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
    else:
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

    # 공통 런타임 제한(연산량 다운)
    # video_optimized가 이 인자를 지원한다면 적용, 아니면 무시됨
    common_kwargs = dict(
        model_name="Celal11/resnet-50-finetuned-FER2013-0.001",
        output_path=None,
        show_video=False,
        frame_stride=stride,     # 지원 시 프레임 스킵
        max_frames=max_frames,   # 지원 시 최대 프레임 제한
    )

    # device 전달 시도 → 미지원이면 TypeError로 한번 더 호출
    try:
        report = analyze_video_bytes(
            video_bytes=video_bytes,
            device=device,          # 지원한다면 GPU/CPU 제어
            **common_kwargs,
            **config
        )
    except TypeError:
        # 구버전 시그니처: device/stride 등을 지원 안 할 수 있음
        report = analyze_video_bytes(
            video_bytes=video_bytes,
            **common_kwargs,
            **config
        )

    if not report:
        raise RuntimeError("비디오 분석에 실패했습니다.")

    # --- 결과 변환 ---
    frame_dist = report.get("frame_distribution", {})
    summary = report.get("summary", {})
    vinfo = report.get("video_info", {}) or {}
    fps = float(vinfo.get("fps", 25.0))
    total_frames = int(vinfo.get("total_frames", 1)) or 1

    dominant_emotion = summary.get("dominant_emotion", "neutral")
    if dominant_emotion == "불확실":
        dominant_emotion = "neutral"

    # 프레임 비율(%) → 확률
    probs: Dict[str, float] = {}
    for emotion in CLASS_NAMES:
        if emotion in frame_dist:
            probs[emotion] = float(frame_dist[emotion].get("percentage", 0.0)) / 100.0
        else:
            probs[emotion] = 0.0

    dominant_score = float(probs.get(dominant_emotion, 0.0))

    result: Dict[str, Any] = {
        "label": dominant_emotion,
        "score": dominant_score,
        "probs": probs,
        "samples": total_frames,
        "fps": fps,
        "emotion_changes": int(summary.get("emotion_changes", 0) or 0),
        "average_emotion_duration": float(summary.get("average_emotion_duration", 0.0) or 0.0),
    }

    # 타임라인(요청 시)
    if return_points and "detailed_logs" in report:
        tl = []
        for log in report["detailed_logs"]:
            s = int(log.get("start_frame", 0) or 0)
            dur_s = float(log.get("duration_seconds", 0.0) or 0.0)
            tl.append({
                "t": s / fps,
                "frame": s,
                "label": log.get("label", "neutral"),
                "duration": dur_s
            })
        result["timeline"] = tl

    return result
