# app/utils/force_cpu_disable.py
# 안전판: CPU 가속 차단 금지, 로그 억제 + 스레드 상한만 제공. 자동 실행 없음!

import os
import warnings

def make_things_quiet_and_sane(max_threads: int = 2) -> None:
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

    # 3) OpenCV 스레드 상한
    try:
        import cv2  # type: ignore
        try:
            cv2.setNumThreads(int(max_threads))
        except Exception:
            pass
    except Exception:
        pass

    # 4) PyTorch 스레드 상한 (CPU 경로일 때)
    try:
        import torch  # type: ignore
        torch.set_num_threads(int(max_threads))
        torch.set_num_interop_threads(int(max_threads))
    except Exception:
        pass

# 자동 실행 절대 금지!
# import 시 부작용이 없도록 한다.
