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
    python3.10 python3.10-dev python3.10-venv \
    gcc g++ cmake make build-essential \
    default-libmysqlclient-dev pkg-config \
    libgl1 libglib2.0-0 \
    wget curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 가상 환경 생성
RUN python3.10 -m venv /opt/venv

# Python 패키지 설치 (가상 환경 사용)
COPY requirements.txt /app/requirements.txt
RUN /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

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

# PATH 환경 변수에 가상 환경 경로를 먼저 추가
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# 런타임 의존성 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 \
    xz-utils curl ca-certificates jq \
    && rm -rf /var/lib/apt/lists/*

# ---- BtbN의 GPU 지원 FFmpeg 설치 ----
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
# (이전 Dockerfile의 모든 최적화 ENV 설정을 여기에 그대로 붙여넣으세요)
# 예시:
# ENV OMP_NUM_THREADS=2
# ENV NVENC_PRESET=p1
# ENV CUDA_VISIBLE_DEVICES=0

# ============================ #
# 빌더 산출물 복사
# ============================ #
COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /root/.ptgaze /root/.ptgaze
COPY --from=builder /app /app

# ============================ #
# 실행 설정
# ============================ #
EXPOSE 8000
# ✨ [수정] python 대신 가상 환경의 파이썬 실행 파일 전체 경로를 명시
CMD ["/opt/venv/bin/python", "-m", "uvicorn", "app.main:app", "—host", "0.0.0.0", "—port", "8000"]