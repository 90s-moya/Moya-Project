# ============================ #
# Builder
# ============================ #
FROM nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04 AS builder

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

# Python 패키지 설치
COPY requirements.txt /app/requirements.txt
RUN python3.10 -m pip install --upgrade pip && \
    python3.10 -m pip install --no-cache-dir -r requirements.txt

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
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04 AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# 런타임 의존성 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    libgl1 libglib2.0-0 libsm6 libxext6 \
    xz-utils curl ca-certificates jq \
    && rm -rf /var/lib/apt/lists/*

# ---- ✨ [핵심] BtbN의 GPU 지원 FFmpeg 설치 ----
ARG FFMPEG_FLAVOR=linux64-gpl-shared
RUN set -eux; \
    api='https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest'; \
    url="$(curl -fsSL "$api" | jq -r ".assets[] | select(.name | test(\"${FFMPEG_FLAVOR}.*\\\\.tar\\\\.xz$\")) | .browser_download_url" | head -n1)"; \
    if [ -z "$url" ]; then echo "No ffmpeg asset found for ${FFMPEG_FLAVOR}"; exit 1; fi; \
    echo "Downloading FFmpeg from: $url"; \
    curl -fL --retry 3 --retry-all-errors -o /tmp/ffmpeg.tar.xz "$url"; \
    mkdir -p /opt/ffmpeg; \
    tar -xJf /tmp/ffmpeg.tar.xz -C /opt/ffmpeg --strip-components=1; \
    ln -sf /opt/ffmpeg/bin/ffmpeg /usr/local/bin/ffmpeg; \
    ln -sf /opt/ffmpeg/bin/ffprobe /usr/local/bin/ffprobe; \
    rm -f /tmp/ffmpeg.tar.xz; \
    # 라이브러리 경로 시스템에 등록
    echo "/opt/ffmpeg/lib" > /etc/ld.so.conf.d/ffmpeg.conf; \
    ldconfig;

# ============================ #
# 최적화 ENV (기존 설정 유지)
# ============================ #

# Tesla T4 최적화
ENV OMP_NUM_THREADS=2 \
    OPENBLAS_NUM_THREADS=2 \
    MKL_NUM_THREADS=2 \
    NUMEXPR_NUM_THREADS=2 \
    TFLITE_NUM_THREADS=2 \
    TOKENIZERS_PARALLELISM=false \
    TF_CPP_MIN_LOG_LEVEL=2 \
    GLOG_minloglevel=3 \
    UVICORN_WORKERS=1

# FFmpeg 설정
ENV FFMPEG_THREADS=3 \
    X264_PRESET=veryfast \
    X264_CRF=28

# NVENC 설정
ENV NVENC_PRESET=p1 \
    NVENC_TUNE=ull \
    NVENC_RC=cbr \
    NVENC_BITRATE=1.5M \
    NVENC_MAXRATE=1.5M \
    NVENC_BUFSIZE=3M

# CUDA/PyTorch 설정
ENV CUDA_VISIBLE_DEVICES=0

# ... (기타 TensorFlow, MediaPipe 등 GPU 최적화 ENV는 그대로 유지) ...
# (생략된 ENV들은 이전 Dockerfile과 동일하게 유지하면 됩니다)

# ============================ #
# 빌더 산출물 복사
# ============================ #
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=builder /root/.ptgaze /root/.ptgaze
COPY --from=builder /app /app

# ============================ #
# 실행 설정
# ============================ #
EXPOSE 8000
CMD ["python3.10", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]