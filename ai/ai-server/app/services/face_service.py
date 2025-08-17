# app/services/face_service.py
from __future__ import annotations
import os, sys, io, tempfile
from pathlib import Path
from functools import lru_cache
from typing import List, Dict, Any, Optional, Iterable
from datetime import datetime
from collections import Counter

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

# 원본 모델의 7클래스 라벨
CLASS_NAMES = ["angry","disgust","fear","happy","sad","surprise","neutral"]

# 7→3 카테고리 집계용 인덱스 (장치 맞춤은 함수 내에서 처리)
NEG_NAMES = ["angry","disgust","fear","sad","surprise"]
POS_NAMES = ["happy"]
NEU_NAMES = ["neutral"]

# ─────────────────────────────────────────────────────────────
# 7→3 카테고리로 '확률'을 합산해서 한 번만 결정
# ─────────────────────────────────────────────────────────────
def _idx_tensor(names: List[str], device):
    idxs = [CLASS_NAMES.index(n) for n in names if n in CLASS_NAMES]
    if not idxs:
        return None
    return torch.tensor(idxs, dtype=torch.long, device=device)

def probs7_to_threecat(probs: torch.Tensor, min_conf: float = 0.45, margin: float = 0.10):
    """
    probs: shape (7,) 소프트맥스 확률(합=1).
    7클래스 확률을 3카테고리(positive/neutral/negative)로 합산해 단방향으로 라벨을 정함.
    - min_conf: 탑 카테고리 확률이 이 값 미만이면 neutral
    - margin: 1위와 2위 확률 차가 이 값 미만이면 neutral
    """
    device = probs.device
    pos_idx = _idx_tensor(POS_NAMES, device)
    neu_idx = _idx_tensor(NEU_NAMES, device)
    neg_idx = _idx_tensor(NEG_NAMES, device)

    p_pos = probs[pos_idx].sum() if pos_idx is not None else torch.tensor(0.0, device=device, dtype=probs.dtype)
    p_neu = probs[neu_idx].sum() if neu_idx is not None else torch.tensor(0.0, device=device, dtype=probs.dtype)
    p_neg = probs[neg_idx].sum() if neg_idx is not None else torch.tensor(0.0, device=device, dtype=probs.dtype)

    cat_names = ["positive", "neutral", "negative"]
    cat_probs = torch.stack([p_pos, p_neu, p_neg])

    top = int(torch.argmax(cat_probs))
    sorted_vals, _ = torch.sort(cat_probs, descending=True)
    top_prob = float(sorted_vals[0].item())
    sec_prob = float(sorted_vals[1].item())

    if (top_prob < min_conf) or ((top_prob - sec_prob) < margin):
        return "neutral", {n: float(cat_probs[i].item()) for i, n in enumerate(cat_names)}
    return cat_names[top], {n: float(cat_probs[i].item()) for i, n in enumerate(cat_names)}

# 이전 버전 호환용(가능하면 사용하지 마세요)
def classify_emotion_to_3_categories(emotion: str, confidence: float = 1.0) -> str:
    """(구) 탑1 라벨만으로 판단하던 함수를 호환 목적으로 유지.
       새 파이프라인에서는 probs7_to_threecat()만 사용."""
    if emotion == "happy":
        return "positive"
    elif emotion == "neutral":
        return "neutral"
    else:
        # 구 로직의 과도한 neutral화 방지를 위해 완화
        return "negative" if confidence >= 0.45 else "neutral"

def _convert_distribution_to_3_categories(distribution: Dict[str, int]) -> Dict[str, int]:
    """이미 3카테고리로 라벨링된 분포라면 그대로 반환."""
    return distribution

def _convert_segments_to_3_categories(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """(구) 7→3 변환용. 현재 파이프라인은 처음부터 3카테고리라 사실상 no-op."""
    return segments

def _convert_timeline_to_3_categories(timeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """(구) 7→3 변환용. 현재 파이프라인은 처음부터 3카테고리라 사실상 no-op."""
    return timeline

def _analyze_dominant_emotions_by_window(labels_seq: List[str], window_size: int = 30) -> List[Dict[str, Any]]:
    """라벨(이미 3카테고리)을 윈도우 단위로 카운트."""
    if not labels_seq:
        return []
    windows = []
    for start_idx in range(0, len(labels_seq), window_size):
        end_idx = min(start_idx + window_size, len(labels_seq))
        window_labels = labels_seq[start_idx:end_idx]
        ctr = Counter(window_labels)  # positive/neutral/negative
        dominant = max(ctr.keys(), key=lambda k: ctr[k])
        windows.append({
            "window_start": start_idx + 1,  # 1-based
            "window_end": end_idx,
            "frame_count": len(window_labels),
            "dominant_emotion": dominant,
            "category_distribution": dict(ctr),
            "confidence": ctr[dominant] / len(window_labels) if window_labels else 0.0
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
    간단 Haar 기반. 실패 시 중앙크롭 폴백 → 항상 ROI 반환
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
    라벨 시퀀스를 1-based 연속구간으로 압축. (이미 3카테고리 라벨)
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
    batch: int = 16,
    min_conf_cat: float = 0.45,
    margin_cat: float = 0.10,
) -> Dict[str, Any]:
    """
    반환 형식:
    {
      "timestamp": "...",
      "total_frames": N,                 # 처리된 프레임 개수 (stride 반영)
      "frame_distribution": {"positive":..., "neutral":..., "negative":...},
      "detailed_logs": [                 # 연속 구간 (3카테고리)
        {"label":"neutral","start_frame":1,"end_frame":23},
        ...
      ],
      # (옵션)
      "window_summary": [ ... ]          # 30프레임 윈도우 요약
    }
    """
    model, dev = get_face_model(device)
    xs: List[torch.Tensor] = []
    frame_ids: List[int] = []          # 원본 인덱스(0-based)
    labels_seq: List[str] = []         # 처리 순서대로 3카테고리 라벨
    timeline: List[Dict[str, Any]] = []

    def _flush():
        nonlocal xs, frame_ids, labels_seq, timeline
        if not xs: return
        x = torch.stack(xs, dim=0).to(dev, non_blocking=True)
        if dev == "cuda":
            x = x.half()
        with torch.no_grad():
            with _autocast_ctx(dev):
                logits = model(x)                 # (B, 7)
        probs = F.softmax(logits, dim=1)          # (B, 7)

        for j in range(probs.shape[0]):
            cat_label, cat_prob_dict = probs7_to_threecat(
                probs[j], min_conf=min_conf_cat, margin=margin_cat
            )
            labels_seq.append(cat_label)
            if return_points:
                timeline.append({
                    "frame": frame_ids[j],
                    "label": cat_label,
                    "probs": cat_prob_dict,      # 디버깅 확인용(원하면 제거 가능)
                })
        xs.clear(); frame_ids.clear()

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

    # 리포트 생성 (이미 3카테고리 라벨)
    total_frames = len(labels_seq)
    dist_3 = dict(Counter(labels_seq))
    segments = _compress_runs_1based(labels_seq)

    # 30프레임 윈도우 요약(선택)
    window_summary = _analyze_dominant_emotions_by_window(labels_seq, window_size=30)

    result: Dict[str, Any] = {
        "timestamp": datetime.utcnow().isoformat(),
        "total_frames": int(total_frames),
        "frame_distribution": dist_3,     # 3카테고리 분포
        "detailed_logs": segments,        # 연속 구간(3카테고리)
        "window_summary": window_summary, # (옵션) 요약
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
    min_conf_cat: float = 0.45,
    margin_cat: float = 0.10,
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
        frames, device=device, stride=stride, return_points=return_points,
        min_conf_cat=min_conf_cat, margin_cat=margin_cat
    )
