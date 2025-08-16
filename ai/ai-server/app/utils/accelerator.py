# app/utils/accelerator.py
from __future__ import annotations
import os

_INITIALIZED = False
_DEVICE = "cpu"

def init_runtime() -> str:
    """
    - BLAS/OpenCV 스레드 1로 제한
    - OpenCV OpenCL 비활성화
    - torch CUDA 가용성 확인해서 device 결정
    - 여러 파일에서 import/init해도 한번만 적용(멱등)
    """
    global _INITIALIZED, _DEVICE
    if _INITIALIZED:
        return _DEVICE

    # CPU thread caps
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
    os.environ.setdefault("MKL_NUM_THREADS", "1")
    os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

    # ffmpeg 기본 스레드도 1/1 추천(없으면 서비스 코드 기본값 사용)
    os.environ.setdefault("FFMPEG_THREADS", "1")
    os.environ.setdefault("FFMPEG_FILTER_THREADS", "1")

    # OpenCV 스레드/ OpenCL
    try:
        import cv2
        cv2.setNumThreads(1)
        try:
            cv2.ocl.setUseOpenCL(False)
        except Exception:
            pass
    except Exception:
        pass

    # device 결정
    try:
        import torch
        _DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
        if _DEVICE == "cuda":
            # 안전한 메모리 / 성능 옵션
            torch.backends.cudnn.benchmark = True
            torch.backends.cudnn.deterministic = False
    except Exception:
        _DEVICE = "cpu"

    _INITIALIZED = True
    return _DEVICE

def device() -> str:
    if not _INITIALIZED:
        return init_runtime()
    return _DEVICE
