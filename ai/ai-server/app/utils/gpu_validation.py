# app/utils/gpu_validation.py
import os
import torch
import cv2

def log_gpu_validation():
    # 상태만 로깅 (환경변수 set/unset 금지!)
    tf_cpu_disabled = (os.environ.get("TF_FORCE_GPU_ONLY") == "1")
    mp_gpu_forced   = (os.environ.get("MEDIAPIPE_FORCE_GPU_DELEGATE") == "1")
    torch_cuda_ok   = bool(torch.cuda.is_available())
    opencv_cuda_ok  = False
    try:
        opencv_cuda_ok = (cv2.cuda.getCudaEnabledDeviceCount() > 0)
    except Exception:
        opencv_cuda_ok = False

    status = {
        "TensorFlow CPU disabled": tf_cpu_disabled,
        "MediaPipe GPU forced": mp_gpu_forced,
        "PyTorch GPU available": torch_cuda_ok,
        "OpenCV GPU backend": opencv_cuda_ok,
    }

    # 요약
    if not torch_cuda_ok:
        overall = "CPU_ONLY_RUNTIME"
    else:
        overall = "GPU_OK"

    print(f"[GPU-VALIDATION] {status} | overall={overall}")
    return {"overall_status": overall, **status}
