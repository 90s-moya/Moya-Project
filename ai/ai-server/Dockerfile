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
    wget curl ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

# requirements 먼저 복사 (캐시 활용)
COPY requirements.txt /app/requirements.txt

# pip 업그레이드 및 패키지 설치
RUN python3.10 -m pip install --upgrade pip && \
    pip install --no-cache-dir --prefer-binary -r requirements.txt

# PTGaze 모델 다운로드
RUN mkdir -p /root/.ptgaze/models && \
    wget -O /root/.ptgaze/models/eth-xgaze_resnet18.pth \
      "https://github.com/hysts/pytorch_mpiigaze/releases/download/v0.1.0/eth-xgaze_resnet18.pth"

# 소스 복사
COPY . /app

# ============================ #
# Runner
# ============================ #
FROM nvidia/cuda:12.8.0-cudnn-runtime-ubuntu22.04 AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# 런타임 의존성 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 python3-pip \
    libgl1 libglib2.0-0 libsm6 libxext6 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 빌더 산출물 복사
COPY --from=builder /usr/local /usr/local
COPY --from=builder /root/.ptgaze /root/.ptgaze
COPY --from=builder /app /app

# 실행 포트
EXPOSE 8000

# Python Path
ENV PYTHONPATH=/app:$PYTHONPATH

# 실행 명령
CMD ["python3.10", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
