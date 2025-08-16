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
    default-libmysqlclient-dev pkg-config \
    libgl1 libglib2.0-0 \
    wget curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 wheel 빌드
COPY requirements.txt /app/requirements.txt
RUN python3.10 -m pip install --upgrade pip setuptools wheel && \
    python3.10 -m pip wheel --wheel-dir=/wheels -r requirements.txt || true && \
    rm -rf /root/.cache/pip

# PTGaze 모델 다운로드
RUN mkdir -p /root/.ptgaze/models && \
    wget -O /root/.ptgaze/models/eth-xgaze_resnet18.pth \
      "https://github.com/hysts/pytorch_mpiigaze/releases/download/v0.1.0/eth-xgaze_resnet18.pth" || \
    curl -L -o /root/.ptgaze/models/eth-xgaze_resnet18.pth \
      "https://github.com/hysts/pytorch_mpiigaze/releases/download/v0.1.0/eth-xgaze_resnet18.pth"

# 소스 복사
COPY . .

# ============================ #
# Runner
# ============================ #
FROM nvidia/cuda:12.8.0-cudnn-runtime-ubuntu22.04 AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 python3-pip \
    libgl1 libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ============================ #
# 최적화 ENV
# ============================ #
ENV OMP_NUM_THREADS=2 \
    OPENBLAS_NUM_THREADS=2 \
    MKL_NUM_THREADS=2 \
    NUMEXPR_NUM_THREADS=2 \
    TFLITE_NUM_THREADS=2 \
    TOKENIZERS_PARALLELISM=false \
    TF_CPP_MIN_LOG_LEVEL=2 \
    GLOG_minloglevel=3 \
    UVICORN_WORKERS=1

ENV FFMPEG_PREFER_ORDER=h264_nvenc,libx264 \
    FFMPEG_THREADS=3 \
    FFMPEG_FILTER_THREADS=2 \
    X264_PRESET=veryfast \
    X264_CRF=28

ENV LD_LIBRARY_PATH=/usr/local/lib:/opt/ffmpeg/lib:/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH}

ENV NVENC_PRESET=p1 \
    NVENC_TUNE=ull \
    NVENC_RC=cbr \
    NVENC_BITRATE=1.5M \
    NVENC_MAXRATE=1.5M \
    NVENC_BUFSIZE=3M

ENV CUDA_VISIBLE_DEVICES=0 \
    TORCH_CUDNN_V8_API_ENABLED=1 \
    PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512 \
    CUDA_LAUNCH_BLOCKING=0

# ============================ #
# 빌더 산출물 복사
# ============================ #
COPY --from=builder /wheels /wheels
RUN python3.10 -m pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* || true

COPY --from=builder /root/.ptgaze /root/.ptgaze
COPY --from=builder /app /app

# 권한 설정
RUN set -e; \
    if [ -d "/root/.ptgaze/models/" ]; then \
        chmod -R 644 /root/.ptgaze/models/ || true; \
    fi; \
    if [ -d "/app" ]; then \
        find /app -type f -name "*.py" -exec chmod 644 {} \; || true; \
        find /app -type d -exec chmod 755 {} \; || true; \
    fi

# ============================ #
# 실행 설정
# ============================ #
EXPOSE 8000
ENV PYTHONPATH=/app:${PYTHONPATH:-}

CMD ["sh", "-c", "cd /app && python3.10 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --log-level info"]
