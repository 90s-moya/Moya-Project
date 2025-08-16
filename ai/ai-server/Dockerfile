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
    wget curl \
    && rm -rf /var/lib/apt/lists/*

# requirements.txt 복사 (캐시 활용)
COPY requirements.txt /app/requirements.txt

# OpenCV 중복 제거: opencv-* 사전 제거 후 requirements만 설치
RUN pip install --upgrade pip && \
    pip uninstall -y opencv-python opencv-python-headless opencv-contrib-python || true && \
    pip install --no-cache-dir -r requirements.txt

# PTGaze 모델 다운로드
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

# 런타임 패키지 (ffmpeg 포함)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 libglib2.0-0 libsm6 libxext6 \
    && rm -rf /var/lib/apt/lists/*

# builder에서 설치된 파이썬 패키지/모델/코드 복사
COPY --from=builder /usr/local /usr/local
COPY --from=builder /root/.ptgaze /root/.ptgaze
COPY --from=builder /app /app

# 모델 파일 권한
RUN chmod -R 644 /root/.ptgaze/models/ || true

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
