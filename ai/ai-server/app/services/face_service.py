# app/services/face_service.py
from __future__ import annotations
import os, sys, io, tempfile
from pathlib import Path
from functools import lru_cache
from typing import List, Dict, Any, Optional, Iterable
from datetime import datetime
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms
import cv2
import numpy as np
from contextlib import nullcontext
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

CLASS_NAMES = ["angry","disgust","fear","happy","sad","surprise","neutral"]

def classify_emotion_to_3_categories(emotion: str, confidence: float = 1.0) -> str:
    """7가지 감정을 3가지 카테고리로 분류 (negative 감정 비중 조정)"""
    if emotion == "happy":
        return "positive"
    elif emotion == "neutral":
        return "neutral"
    else:  # angry, disgust, fear, sad, surprise
        # negative 감정들의 threshold를 높여서 neutral로 더 많이 분류
        if confidence < 0.7:  # negative 감정은 더 확실할 때만 negative로 분류
            return "neutral"
        return "negative"

def _convert_distribution_to_3_categories(distribution: Dict[str, int]) -> Dict[str, int]:
    """이미 3가지 카테고리로 분류된 분포 반환 (그대로 반환)"""
    return distribution

def _convert_segments_to_3_categories(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """세그먼트의 감정 라벨을 3가지 카테고리로 변환"""
    result = []
    current_category = None
    current_start = None
    
    for segment in segments:
        category = classify_emotion_to_3_categories(segment["label"])
        
        if current_category == category:
            # 같은 카테고리면 연장
            continue
        else:
            # 다른 카테고리면 이전 세그먼트 종료하고 새 세그먼트 시작
            if current_category is not None:
                result.append({
                    "label": current_category,
                    "start_frame": current_start,
                    "end_frame": segment["start_frame"] - 1
                })
            
            current_category = category
            current_start = segment["start_frame"]
    
    # 마지막 세그먼트 추가
    if current_category is not None and segments:
        result.append({
            "label": current_category,
            "start_frame": current_start,
            "end_frame": segments[-1]["end_frame"]
        })
    
    return result

def _convert_timeline_to_3_categories(timeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """타임라인의 감정 라벨을 3가지 카테고리로 변환"""
    return [
        {
            "frame": item["frame"],
            "label": classify_emotion_to_3_categories(item["label"])
        }
        for item in timeline
    ]

def _analyze_dominant_emotions_by_window(labels_seq: List[str], window_size: int = 30) -> List[Dict[str, Any]]:
    """윈도우 단위로 dominant emotion 분석 (3가지 카테고리)"""
    if not labels_seq:
        return []
    
    windows = []
    
    for start_idx in range(0, len(labels_seq), window_size):
        end_idx = min(start_idx + window_size, len(labels_seq))
        window_labels = labels_seq[start_idx:end_idx]
        
        # 윈도우 내 3가지 카테고리별 카운트
        category_counts = {"positive": 0, "neutral": 0, "negative": 0}
        original_counts = {}
        
        for label in window_labels:
            category = classify_emotion_to_3_categories(label)
            category_counts[category] += 1
            original_counts[label] = original_counts.get(label, 0) + 1
        
        # dominant emotion 결정
        dominant_category = max(category_counts.keys(), key=lambda k: category_counts[k])
        
        # 원본 감정 중 가장 많은 것 (참고용)
        dominant_original = max(original_counts.keys(), key=lambda k: original_counts[k]) if original_counts else "unknown"
        
        windows.append({
            "window_start": start_idx + 1,  # 1-based
            "window_end": end_idx,          # 1-based
            "frame_count": len(window_labels),
            "dominant_emotion": dominant_category,
            "dominant_original_emotion": dominant_original,
            "category_distribution": category_counts,
            "original_distribution": original_counts,
            "confidence": category_counts[dominant_category] / len(window_labels) if window_labels else 0.0
        })
    
    return windows

_preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=(0.485,0.456,0.406), std=(0.229,0.224,0.225)),
])

def _autocast_ctx(dev: str):
    if dev == "cuda":
        try:
            return torch.amp.autocast("cuda")
        except Exception:
            return torch.cuda.amp.autocast()
    return nullcontext()

def cleanup_gpu_memory():
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        import gc; gc.collect()

def _resolve_ckpt() -> Optional[str]:
    env_ckpt = os.getenv("FACE_CKPT")
    if env_ckpt and os.path.isfile(env_ckpt):
        return env_ckpt

    choice = (os.getenv("FACE_MODEL_CHOICE") or "").strip().upper()
    ckpt_dir = Path(os.getenv("FACE_CKPT_DIR") or str(FACE_DIR))
    mapping_env = {
        "A": os.getenv("FACE_CKPT_A"),
        "B": os.getenv("FACE_CKPT_B"),
        "C": os.getenv("FACE_CKPT_C"),
    }
    if choice in mapping_env and mapping_env[choice]:
        p = mapping_env[choice]
        if os.path.isfile(p):
            return p

    patterns_by_choice = {
        "FER":    ["fer2013*.pt", "fer*.pt", "fer*.pth", "fer*.ckpt"],
        "RAF":    ["raf*.pt", "raf*.pth", "raf*.ckpt"],
        "AFFECT": ["affect*.pt", "affect*.pth", "affect*.ckpt", "affectnet*.pt"],
    }
    if choice in patterns_by_choice:
        for pat in patterns_by_choice[choice]:
            for path in ckpt_dir.glob(pat):
                if path.is_file():
                    return str(path)

    scan_patterns = [
        "raf*.pt", "fer*.pt", "affect*.pt",
        "*.pt", "*.pth", "*.ckpt"
    ]
    for pat in scan_patterns:
        for path in ckpt_dir.glob(pat):
            if path.is_file():
                return str(path)

    return None

@lru_cache(maxsize=1)
def get_face_model(device: str = "cuda"):
    dev = "cuda" if (device == "cuda" and torch.cuda.is_available()) else "cpu"
    model = load_model(_resolve_ckpt(), device=dev, num_classes=len(CLASS_NAMES))
    try:
        import torch._dynamo as dynamo
        model = dynamo.optimize("eager")(model)
        print("[INFO] TorchDynamo backend = eager (no codegen)")
    except Exception as e:
        print(f"[INFO] Dynamo eager not used: {e}")

    if dev == "cuda":
        model = model.half()
        torch.backends.cudnn.benchmark = True
    model.eval()
    return model, dev

def _detect_face_roi(bgr: np.ndarray, margin: float = 0.25) -> np.ndarray:
    """
    간단 Haar 기반. 실패 시 중앙크롭 폴백 → 항상 ROI 반환하도록 해서
    'total_frames == 처리한 프레임 수'가 되도록 보장.
    """
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

def _compress_runs_1based(labels: List[str]) -> List[Dict[str, int | str]]:
    """
    라벨 시퀀스를 1-based 연속구간으로 압축.
    """
    n = len(labels)
    if n == 0: return []
    segs: List[Dict[str, int | str]] = []
    cur = labels[0]; start = 1
    for i in range(2, n + 1):
        if labels[i - 1] != cur:
            segs.append({"label": cur, "start_frame": start, "end_frame": i - 1})
            cur = labels[i - 1]; start = i
    segs.append({"label": cur, "start_frame": start, "end_frame": n})
    return segs

def infer_face_frames(
    frames: Iterable[np.ndarray],
    device: str = "cuda",
    stride: int = 5,
    return_points: bool = False,
    batch: int = 16
) -> Dict[str, Any]:
    """
    반환 형식:
    {
      "timestamp": "...",
      "total_frames": N,                 # 처리된 프레임 개수 (stride 반영)
      "frame_distribution": {"fear":186, "sad":22, ...},
      "detailed_logs": [
        {"label":"sad","start_frame":1,"end_frame":5},
        {"label":"fear","start_frame":6,"end_frame":8},
        ...
      ],
      # (옵션) return_points=True면
      "timeline": [{"frame": i, "label": "..."} ...]
    }
    """
    model, dev = get_face_model(device)
    xs: List[torch.Tensor] = []
    frame_ids: List[int] = []          # 원본 인덱스(0-based)
    labels_seq: List[str] = []         # 처리 순서대로 라벨(1프레임=1라벨; stride 반영)
    timeline: List[Dict[str, int | str]] = []

    def _flush():
        nonlocal xs, frame_ids, labels_seq, timeline
        if not xs: return
        x = torch.stack(xs, dim=0).to(dev, non_blocking=True)
        if dev == "cuda":
            x = x.half()
        with torch.no_grad():
            with _autocast_ctx(dev):
                logits = model(x)
        probs = F.softmax(logits, dim=1)  # (B, C)
        top_idx = torch.argmax(probs, dim=1).tolist()
        top_probs = torch.max(probs, dim=1)[0].tolist()  # confidence 점수
        
        for j, (tid, confidence) in enumerate(zip(top_idx, top_probs)):
            original_emotion = CLASS_NAMES[int(tid)]
            # confidence를 고려한 3가지 카테고리 분류
            categorized_emotion = classify_emotion_to_3_categories(original_emotion, confidence)
            labels_seq.append(categorized_emotion)
            
            if return_points:
                timeline.append({"frame": frame_ids[j], "label": categorized_emotion})
        xs.clear(); frame_ids.clear()

    # iterate frames
    processed = 0
    for i, bgr in enumerate(frames):
        if i % max(1, stride) != 0:
            continue
        roi = _detect_face_roi(bgr, margin=0.25)
        img = Image.fromarray(cv2.cvtColor(roi, cv2.COLOR_BGR2RGB))
        xs.append(_preprocess(img))
        frame_ids.append(i)
        processed += 1
        if len(xs) >= batch:
            _flush()

    _flush()  # 남은 배치

    # 리포트 생성
    total_frames = len(labels_seq)      # stride 반영된 샘플 개수
    # 분포
    dist: Dict[str, int] = {}
    for lb in labels_seq:
        dist[lb] = dist.get(lb, 0) + 1
    # 연속구간(1-based)
    segments = _compress_runs_1based(labels_seq)

    # 3가지 카테고리로 변환
    dist_3_categories = _convert_distribution_to_3_categories(dist)
    
    # 30프레임 단위 윈도우 분석
    window_analysis = _analyze_dominant_emotions_by_window(labels_seq, window_size=30)
    
    # detailed_logs를 30프레임 윈도우 기반으로 변경 (confidence 0.5 이하는 neutral로)
    detailed_logs_windowed = []
    for window in window_analysis:
        emotion = window["dominant_emotion"]
        confidence = window["confidence"]
        
        # confidence가 0.5 이하면 neutral로 변경
        if confidence <= 0.5:
            emotion = "neutral"
        
        detailed_logs_windowed.append({
            "label": emotion,
            "start_frame": window["window_start"],
            "end_frame": window["window_end"],
            "confidence": confidence
        })
    
    result: Dict[str, Any] = {
        "timestamp": datetime.utcnow().isoformat(),
        "total_frames": int(total_frames),
        "frame_distribution": dist_3_categories,  # 3가지 카테고리 분포
        "detailed_logs": detailed_logs_windowed,
    }

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
    """
    비디오 바이트를 읽어 프레임 시퀀스로 변환 후 infer_face_frames에 위임.
    결과는 세그먼트 리포트 형식.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(video_bytes); tmp_path = tmp.name
    cap = cv2.VideoCapture(tmp_path)
    frames: List[np.ndarray] = []
    try:
        while True:
            ok, frame = cap.read()
            if not ok: break
            frames.append(frame)
            if max_frames and len(frames) >= max_frames: break
    finally:
        cap.release()
        try: os.remove(tmp_path)
        except Exception: pass

    if not frames:
        raise RuntimeError("no frames")

    return infer_face_frames(
        frames, device=device, stride=stride, return_points=return_points
    )
