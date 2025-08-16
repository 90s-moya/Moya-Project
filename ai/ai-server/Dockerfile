# ============================
# Builder
# ============================
FROM python:3.10-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ cmake make build-essential \
    default-libmysqlclient-dev pkg-config \
    libgl1 libglib2.0-0 \
    wget curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# PTGaze 모델
RUN mkdir -p /root/.ptgaze/models && \
    wget -O /root/.ptgaze/models/eth-xgaze_resnet18.pth \
      "https://github.com/hysts/pytorch_mpiigaze/releases/download/v0.1.0/eth-xgaze_resnet18.pth" || \
    curl -L -o /root/.ptgaze/models/eth-xgaze_resnet18.pth \
      "https://github.com/hysts/pytorch_mpiigaze/releases/download/v0.1.0/eth-xgaze_resnet18.pth"

COPY . .

# ============================
# Runner
# ============================
FROM python:3.10-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# ---- 런타임 의존성 (※ apt ffmpeg 제거! 대신 CUDA 지원 ffmpeg 설치) ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 \
    xz-utils curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---- CUDA 지원 ffmpeg (BtbN 정적 빌드) 설치 ----
# h264_nvenc / scale_cuda 포함
RUN curl -L -o /tmp/ffmpeg.tar.xz \
      https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n6.1.1-linux64-gpl-6.1.tar.xz && \
    mkdir -p /opt/ffmpeg && \
    tar -xJf /tmp/ffmpeg.tar.xz -C /opt/ffmpeg --strip-components=1 && \
    ln -sf /opt/ffmpeg/bin/ffmpeg /usr/local/bin/ffmpeg && \
    ln -sf /opt/ffmpeg/bin/ffprobe /usr/local/bin/ffprobe && \
    rm -f /tmp/ffmpeg.tar.xz

# ---- 성능/로그/FFmpeg 제어 ENV (필요에 맞게 조정 가능) ----
ENV OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    NUMEXPR_NUM_THREADS=1 \
    TFLITE_NUM_THREADS=1 \
    TOKENIZERS_PARALLELISM=false \
    TF_CPP_MIN_LOG_LEVEL=2 \
    GLOG_minloglevel=3 \
    FFMPEG_PREFER_ORDER=h264_nvenc,libx264 \
    FFMPEG_THREADS=2 \
    FFMPEG_FILTER_THREADS=1 \
    X264_PRESET=ultrafast \
    X264_CRF=26

# (선택) 빌드 시점 스모크 체크: nvenc/scale_cuda가 목록에 보이는지만 확인
# 실패해도 컨테이너는 빌드되도록 || true
RUN ffmpeg -v error -encoders | grep -q h264_nvenc || true && \
    ffmpeg -v error -filters  | grep -E 'scale_(cuda|npp)' || true

# ---- 빌더에서 파일 복사 ----
COPY --from=builder /usr/local /usr/local
COPY --from=builder /root/.ptgaze /root/.ptgaze
COPY --from=builder /app /app

RUN chmod -R 644 /root/.ptgaze/models/ || true

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
