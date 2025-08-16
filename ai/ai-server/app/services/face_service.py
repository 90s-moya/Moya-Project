# app/services/face_service.py
from __future__ import annotations
import os, sys, io, tempfile, glob
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
            return torch.amp.autocast("cuda")  # 신 API
        except Exception:
            return torch.cuda.amp.autocast()   # 구 API 폴백
    return nullcontext()

def cleanup_gpu_memory():
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        import gc; gc.collect()

def _resolve_ckpt() -> Optional[str]:
    """
    세 가지(또는 임의) 체크포인트를 유연하게 선택:
    - FACE_CKPT: 절대/상대 경로 직접 지정 (최우선)
    - FACE_MODEL_CHOICE: A/B/C/FER/RAF/AFFECT 중 택1
        A -> FACE_CKPT_A
        B -> FACE_CKPT_B
        C -> FACE_CKPT_C
        FER -> <FACE_CKPT_DIR>/fer2013*.pt(스캔)
        RAF -> <FACE_CKPT_DIR>/raf*.pt(스캔)
        AFFECT -> <FACE_CKPT_DIR>/affect*.pt(스캔)
    - 없으면 FACE_CKPT_DIR(기본 Face_Resnet)에서 *.pt/*.pth/*.ckpt 자동 탐색
    """
    # 1) 명시 경로가 있으면 그것부터
    env_ckpt = os.getenv("FACE_CKPT")
    if env_ckpt and os.path.isfile(env_ckpt):
        return env_ckpt

    # 2) 선택지 기반 (A/B/C or 별칭)
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

    # 3) 별칭: FER/RAF/AFFECT → 디렉터리 스캔
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

    # 4) 마지막으로 일반 스캔 (가장 그럴듯한 이름 우선)
    scan_patterns = [
        "raf*.pt", "fer*.pt", "affect*.pt",
        "*.pt", "*.pth", "*.ckpt"
    ]
    for pat in scan_patterns:
        for path in ckpt_dir.glob(pat):
            if path.is_file():
                return str(path)

    # 5) 못 찾으면 None → ImageNet 사전학습만 사용
    return None

@lru_cache(maxsize=1)
def get_face_model(device: str = "cuda"):
    dev = "cuda" if (device == "cuda" and torch.cuda.is_available()) else "cpu"
    ckpt = _resolve_ckpt()
    if ckpt:
        print(f"[FACE] Using checkpoint: {ckpt}")
    else:
        print("[FACE] No checkpoint selected/found. Using ImageNet pretrained ResNet18.")
    # load_model은 ckpt가 None이면 사전학습만 로드
    model = load_model(ckpt, device=dev, num_classes=len(CLASS_NAMES))
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
        if dev == "cuda":
            x = x.half()
        with torch.no_grad():
            with _autocast_ctx(dev):
                logits = model(x)
            p = F.softmax(logits, dim=1)    
        probs_sum += p.sum(dim=0)
        outs = p.detach().cpu().numpy()
        xs.clear(); ids = frame_ids[:]; frame_ids.clear()
        return [{"frame_idx": ids[i], "probs": outs[i]} for i in range(len(ids))]

    timeline: List[Dict[str, Any]] = []
    samples_cnt = 0
    for i, bgr in enumerate(frames):
        if i % max(1, stride) != 0: continue
        roi = _detect_face_roi(bgr, margin=0.25)
        img = Image.fromarray(cv2.cvtColor(roi, cv2.COLOR_BGR2RGB))
        xs.append(_preprocess(img))
        frame_ids.append(i); samples_cnt += 1
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

    probs_mean = (probs_sum / max(1, samples_cnt)).cpu().numpy()
    top_idx = int(np.argmax(probs_mean))
    result = {
        "label": CLASS_NAMES[top_idx],
        "score": float(probs_mean[top_idx]),
        "probs": {CLASS_NAMES[i]: float(probs_mean[i]) for i in range(len(CLASS_NAMES))},
        "samples": int(samples_cnt),
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
