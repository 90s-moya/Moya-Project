# app/services/face_service.py
from __future__ import annotations
import os, sys, io, tempfile
from pathlib import Path
from functools import lru_cache
from typing import List, Dict, Any, Optional, Iterable

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
        for j, tid in enumerate(top_idx):
            lbl = CLASS_NAMES[int(tid)]
            labels_seq.append(lbl)
            if return_points:
                # timeline은 "처리된 프레임 순번"이 아니라 "원본 인덱스"도 함께 줄 수 있음
                timeline.append({"frame": frame_ids[j], "label": lbl})
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

    result: Dict[str, Any] = {
        "timestamp": datetime.utcnow().isoformat(),
        "total_frames": int(total_frames),
        "frame_distribution": dist,
        "detailed_logs": segments,
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
