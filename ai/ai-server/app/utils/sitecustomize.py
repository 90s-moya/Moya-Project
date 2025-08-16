# /app/sitecustomize.py
# Python이 start 시 sys.path에서 sitecustomize를 자동 import함.
# 어떤 모듈보다 먼저 실행되어 환경변수/스레드 캡을 정리한다.
import os

# (1) 외부에서 강제해둔 GPU-only/CPU delegate 차단 변수들 전부 제거
for k in ("TF_FORCE_GPU_ONLY", "MEDIAPIPE_FORCE_GPU_DELEGATE", "MEDIAPIPE_DISABLE_CPU_DELEGATE"):
    if os.environ.get(k):
        print(f"[SITE] Unset {k}")
        os.environ.pop(k, None)

# (2) CPU 스파이크 방지용 스레드 캡 (필요시 환경변수로 재설정 가능)
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("TFLITE_NUM_THREADS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

print("[SITE] Clean startup env applied (no GPU-only forcing, threads capped)")
