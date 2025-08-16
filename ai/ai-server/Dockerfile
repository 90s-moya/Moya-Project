# ============================
# Builder
# ============================
FROM python:3.10-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# 빌드 종속 패키지
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ cmake make build-essential \
    default-libmysqlclient-dev pkg-config \
    libgl1 libglib2.0-0 \
    wget curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# PTGaze 모델
RUN mkdir -p /root/.ptgaze/models && \
    wget -O /root/.ptgaze/models/eth-xgaze_resnet18.pth \
      "https://github.com/hysts/pytorch_mpiigaze/releases/download/v0.1.0/eth-xgaze_resnet18.pth" || \
    curl -L -o /root/.ptgaze/models/eth-xgaze_resnet18.pth \
      "https://github.com/hysts/pytorch_mpiigaze/releases/download/v0.1.0/eth-xgaze_resnet18.pth"

# 소스 복사
COPY . .

# ============================
# Runner
# ============================
FROM python:3.10-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# 런타임 의존성 (※ apt ffmpeg 넣지 않음)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 \
    xz-utils curl ca-certificates jq \
    && rm -rf /var/lib/apt/lists/*

# ---- CUDA 지원 ffmpeg 설치 (BtbN 최신 릴리스에서 linux64-gpl 자산 자동 선택) ----
# h264_nvenc / (환경 맞으면) scale_cuda 포함
ARG FFMPEG_FLAVOR=linux64-gpl
RUN set -eux; \
    api='https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest'; \
    url="$(curl -fsSL "$api" | jq -r ".assets[] | select(.name | test(\"${FFMPEG_FLAVOR}.*\\\\.tar\\\\.xz$\")) | .browser_download_url" | head -n1)"; \
    if [ -z "$url" ]; then echo "No ffmpeg asset found for ${FFMPEG_FLAVOR}"; exit 1; fi; \
    echo "Downloading: $url"; \
    curl -fL --retry 3 --retry-all-errors -o /tmp/ffmpeg.tar.xz "$url"; \
    tar -tJf /tmp/ffmpeg.tar.xz > /dev/null; \
    mkdir -p /opt/ffmpeg; \
    tar -xJf /tmp/ffmpeg.tar.xz -C /opt/ffmpeg --strip-components=1; \
    ln -sf /opt/ffmpeg/bin/ffmpeg /usr/local/bin/ffmpeg; \
    ln -sf /opt/ffmpeg/bin/ffprobe /usr/local/bin/ffprobe; \
    # 라이브러리 경로 설정 (라이브러리 파일들을 시스템 경로에 복사)
    cp -r /opt/ffmpeg/lib/* /usr/local/lib/ || true; \
    ldconfig; \
    rm -f /tmp/ffmpeg.tar.xz; \
    # 스모크 체크(실패해도 빌드는 계속)
    ffmpeg -v error -encoders | grep -q h264_nvenc || true; \
    ffmpeg -v error -filters  | grep -E 'scale_(cuda|npp)' || true

# Tesla T4 (4 vCPU, 15GB RAM) 최적화 ENV
ENV OMP_NUM_THREADS=2 \
    OPENBLAS_NUM_THREADS=2 \
    MKL_NUM_THREADS=2 \
    NUMEXPR_NUM_THREADS=2 \
    TFLITE_NUM_THREADS=2 \
    TOKENIZERS_PARALLELISM=false \
    TF_CPP_MIN_LOG_LEVEL=2 \
    GLOG_minloglevel=3 \
    UVICORN_WORKERS=1 \
    FFMPEG_PREFER_ORDER=h264_nvenc,libx264 \
    FFMPEG_THREADS=3 \
    FFMPEG_FILTER_THREADS=2 \
    X264_PRESET=veryfast \
    X264_CRF=28 \
    LD_LIBRARY_PATH=/usr/local/lib:/opt/ffmpeg/lib:$LD_LIBRARY_PATH \
    NVENC_PRESET=p1 \
    NVENC_TUNE=ull \
    NVENC_RC=cbr \
    NVENC_BITRATE=1.5M \
    NVENC_MAXRATE=1.5M \
    NVENC_BUFSIZE=3M \
    CUDA_VISIBLE_DEVICES=0 \
    TORCH_CUDNN_V8_API_ENABLED=1 \
    PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512 \
    CUDA_LAUNCH_BLOCKING=0

# 빌더에서 산출물 복사
COPY --from=builder /usr/local /usr/local
COPY --from=builder /root/.ptgaze /root/.ptgaze
COPY --from=builder /app /app

# 권한
RUN chmod -R 644 /root/.ptgaze/models/ || true

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
