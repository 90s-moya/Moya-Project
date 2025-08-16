# ============================ #
# Builder
# ============================ #
FROM nvidia/cuda:12.8.0-cudnn-devel-ubuntu22.04 AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Python 및 빌드 종속 패키지 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 python3.10-dev python3-pip \
    gcc g++ cmake make build-essential \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치 (wheel로 빌드)
COPY requirements.txt /app/requirements.txt
RUN python3.10 -m pip install --upgrade pip && \
    python3.10 -m pip wheel --wheel-dir=/wheels -r requirements.txt && \
    rm -rf /root/.cache/pip

# 소스 복사
COPY . .

# ============================ #
# Runner
# ============================ #
FROM nvidia/cuda:12.8.0-base-ubuntu22.04 AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# 런타임 의존성 + FFmpeg 설치 (개발용 -dev 제거)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 python3-pip \
    libgl1 libglib2.0-0 libsm6 libxext6 \
    libgstreamer1.0-0 libgstreamer-plugins-base1.0-0 \
    ffmpeg \
    curl ca-certificates jq \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/ffmpeg /usr/local/bin/ffmpeg

# ============================ #
# 최적화 ENV
# ============================ #

# Tesla T4 (4 vCPU, 15GB RAM) 최적화
ENV OMP_NUM_THREADS=2 \
    OPENBLAS_NUM_THREADS=2 \
    MKL_NUM_THREADS=2 \
    NUMEXPR_NUM_THREADS=2 \
    TOKENIZERS_PARALLELISM=false \
    TF_CPP_MIN_LOG_LEVEL=2 \
    GLOG_minloglevel=3 \
    UVICORN_WORKERS=1

# FFmpeg 설정
ENV FFMPEG_PREFER_ORDER=h264_nvenc,libx264 \
    FFMPEG_THREADS=3 \
    FFMPEG_FILTER_THREADS=2 \
    X264_PRESET=veryfast \
    X264_CRF=28

# 라이브러리 경로
ENV LD_LIBRARY_PATH=/usr/local/lib:/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH}

# NVENC 설정
ENV NVENC_PRESET=p1 \
    NVENC_TUNE=ull \
    NVENC_RC=cbr \
    NVENC_BITRATE=1.5M \
    NVENC_MAXRATE=1.5M \
    NVENC_BUFSIZE=3M

# CUDA/PyTorch 설정
ENV CUDA_VISIBLE_DEVICES=0 \
    TORCH_CUDNN_V8_API_ENABLED=1 \
    PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512 \
    CUDA_LAUNCH_BLOCKING=0

# TensorFlow/MediaPipe GPU 전용 설정
ENV TF_FORCE_GPU_ALLOW_GROWTH=true \
    TF_GPU_ALLOCATOR=cuda_malloc_async \
    TF_CPP_MIN_LOG_LEVEL=3 \
    TF_DISABLE_XNNPACK=1 \
    TF_DISABLE_ONEDNN=1 \
    TF_DISABLE_MKL=1 \
    TF_DISABLE_SEGMENT_REDUCTION=1 \
    TF_LITE_FORCE_GPU_DELEGATE=1 \
    MEDIAPIPE_ENABLE_GPU=1 \
    MEDIAPIPE_GPU_DEVICE=0

# OpenCV GPU 가속 설정
ENV OPENCV_DNN_BACKEND=5 \
    OPENCV_DNN_TARGET=6

# ============================ #
# 빌더 산출물 복사
# ============================ #
COPY --from=builder /wheels /wheels
RUN python3.10 -m pip install --no-cache-dir /wheels/* && rm -rf /wheels

COPY --from=builder /app /app

# 모델 디렉토리 (외부 마운트 전용)
RUN mkdir -p /root/.ptgaze/models

# 권한 설정
RUN set -e; \
    if [ -d "/app" ]; then \
        find /app -type f -name "*.py" -exec chmod 644 {} \; 2>/dev/null || true; \
        find /app -type d -exec chmod 755 {} \; 2>/dev/null || true; \
    fi; \
    mkdir -p /tmp/python-cache && chmod 777 /tmp/python-cache || true

# ============================ #
# 실행 설정
# ============================ #
EXPOSE 8000
ENV PYTHONPATH=/app:$PYTHONPATH

# 실행 명령
CMD ["sh", "-c", "cd /app && python3.10 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --log-level info"]
