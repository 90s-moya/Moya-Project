FROM python:3.10-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# 빌드 종속 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    cmake \
    make \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    libgl1 \
    libglib2.0-0 \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# requirements.txt 먼저 복사 → 캐시 최대 활용
COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

RUN mkdir -p /root/.ptgaze/models && \
    wget -O /root/.ptgaze/models/eth-xgaze_resnet18.pth \
    "https://github.com/hysts/pytorch_mpiigaze/releases/download/v0.1.0/eth-xgaze_resnet18.pth" || \
    curl -L -o /root/.ptgaze/models/eth-xgaze_resnet18.pth \
    "https://github.com/hysts/pytorch_mpiigaze/releases/download/v0.1.0/eth-xgaze_resnet18.pth"

# 소스 코드 복사
COPY . .

# ------------------------------

FROM python:3.10-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# 런타임 패키지만 설치
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# builder에서 설치된 Python 패키지와 모델 파일 복사
COPY --from=builder /usr/local /usr/local
COPY --from=builder /root/.ptgaze /root/.ptgaze
COPY --from=builder /app /app

# 모델 파일 권한 설정
RUN chmod -R 644 /root/.ptgaze/models/

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
