# app/utils/force_cpu_disable.py
# 안전판: CPU 가속 차단 금지, 로그 억제 + 스레드 상한만 제공. 자동 실행 없음!

import os
import time
import warnings

def _ts():
    return time.strftime("%H:%M:%S")

def make_things_quiet_and_sane(max_threads: int = 2, debug: bool = False) -> None:
    """
    - TensorFlow/absl 등의 시끄러운 로그를 억제
    - BLAS/OpenCV/PyTorch CPU 스레드 상한을 설정(폭주 방지)
    - *절대* XNNPACK/CPU delegate/MediaPipe 가속을 끄지 않음
    """
    # 1) 로그 억제
    os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '3')
    warnings.filterwarnings('ignore', category=UserWarning)
    warnings.filterwarnings('ignore', category=FutureWarning)

    # 2) BLAS/NumExpr 스레드 상한
    for k in ('OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'NUMEXPR_NUM_THREADS'):
        os.environ.setdefault(k, str(int(max_threads)))

    if debug:
        print(f"[{_ts()}][QUIET] TF_CPP_MIN_LOG_LEVEL=3, Threads={max_threads}")

    # 3) OpenCV 스레드 상한
    try:
        import cv2  # type: ignore
        try:
            cv2.setNumThreads(int(max_threads))
            if debug:
                print(f"[{_ts()}][QUIET] OpenCV threads set to {max_threads}")
        except Exception as e:
            if debug:
                print(f"[{_ts()}][QUIET] OpenCV setNumThreads failed: {e}")
    except Exception:
        pass

    # 4) PyTorch 스레드 상한 (CPU 경로일 때)
    try:
        import torch  # type: ignore
        torch.set_num_threads(int(max_threads))
        torch.set_num_interop_threads(int(max_threads))
        if debug:
            print(f"[{_ts()}][QUIET] PyTorch threads set to {max_threads}")
    except Exception as e:
        if debug:
            print(f"[{_ts()}][QUIET] PyTorch thread set failed: {e}")

def warn_if_slow_env(debug: bool = True) -> None:
    """
    느려지는 환경변수 감지(참고용). XNNPACK/CPU delegate 끄면 Mediapipe/TFLite가 느려집니다.
    """
    import os
    bad = [k for k in os.environ if any(x in k for x in [
        'TF_LITE_DISABLE_CPU_DELEGATE','TF_LITE_DISABLE_XNNPACK','TF_DISABLE_XNNPACK',
        'MEDIAPIPE_DISABLE_CPU','MEDIAPIPE_DISABLE_XNNPACK','MEDIAPIPE_FORCE_GPU_ONLY'
    ]) and os.environ.get(k) == '1']
    if bad and debug:
        print(f"[{_ts()}][WARN] Potentially slow env detected → {bad}")

    # OpenCV / Torch CUDA 상태
    try:
        import cv2
        if debug:
            print(f"[{_ts()}][CHECK] OpenCV CUDA devices: {cv2.cuda.getCudaEnabledDeviceCount()}")
    except Exception as e:
        if debug:
            print(f"[{_ts()}][CHECK] OpenCV CUDA check failed: {e}")

    try:
        import torch
        if debug:
            print(f"[{_ts()}][CHECK] torch.cuda.is_available={torch.cuda.is_available()}")
            if torch.cuda.is_available():
                print(f"[{_ts()}][CHECK] GPU={torch.cuda.get_device_name(0)}, CUDA={torch.version.cuda}")
    except Exception as e:
        if debug:
            print(f"[{_ts()}][CHECK] Torch check failed: {e}")