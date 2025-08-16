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

# 런타임 의존성 + 추가 라이브러리
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 \
    libgstreamer1.0-0 libgstreamer-plugins-base1.0-0 \
    libavcodec-dev libavformat-dev libavutil-dev \
    libswscale-dev libswresample-dev \
    xz-utils curl ca-certificates jq \
    && rm -rf /var/lib/apt/lists/*

# ---- CUDA 지원 ffmpeg 설치 (안정성 개선) ----
RUN set -eux; \
    # 백업 플랜: apt ffmpeg도 설치
    apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*; \
    # BtbN 빌드 시도
    api='https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/latest'; \
    url="$(curl -fsSL "$api" 2>/dev/null | jq -r ".assets[] | select(.name | test(\"linux64-gpl.*\\\\.tar\\\\.xz$\")) | .browser_download_url" 2>/dev/null | head -n1)" || true; \
    if [ -n "$url" ] && [ "$url" != "null" ]; then \
        echo "Downloading BtbN FFmpeg: $url"; \
        if curl -fL --retry 2 --retry-all-errors -o /tmp/ffmpeg.tar.xz "$url" 2>/dev/null; then \
            if tar -tJf /tmp/ffmpeg.tar.xz >/dev/null 2>&1; then \
                mkdir -p /opt/ffmpeg; \
                tar -xJf /tmp/ffmpeg.tar.xz -C /opt/ffmpeg --strip-components=1; \
                ln -sf /opt/ffmpeg/bin/ffmpeg /usr/local/bin/ffmpeg; \
                ln -sf /opt/ffmpeg/bin/ffprobe /usr/local/bin/ffprobe; \
                # 라이브러리 복사 (실패해도 계속)
                cp -r /opt/ffmpeg/lib/* /usr/local/lib/ 2>/dev/null || true; \
                echo "BtbN FFmpeg installed successfully"; \
            fi; \
            rm -f /tmp/ffmpeg.tar.xz; \
        fi; \
    else \
        echo "Using system FFmpeg as fallback"; \
    fi; \
    # 라이브러리 캐시 업데이트
    ldconfig 2>/dev/null || true; \
    # FFmpeg 테스트 (실패해도 계속)
    ffmpeg -version >/dev/null 2>&1 || echo "FFmpeg test failed"; \
    ffmpeg -v error -encoders 2>/dev/null | grep -q h264_nvenc || echo "NVENC not available"; \
    ffmpeg -v error -filters 2>/dev/null | grep -E 'scale_(cuda|npp)' || echo "CUDA filters not available"

# Tesla T4 (4 vCPU, 15GB RAM) 최적화 ENV
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
ENV FFMPEG_PREFER_ORDER=h264_nvenc,libx264 \
    FFMPEG_THREADS=3 \
    FFMPEG_FILTER_THREADS=2 \
    X264_PRESET=veryfast \
    X264_CRF=28

# 라이브러리 경로 (안전하게 설정)
ENV LD_LIBRARY_PATH=/usr/local/lib:/opt/ffmpeg/lib:/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH}

# NVENC 설정
ENV NVENC_PRESET=p1 \
    NVENC_TUNE=ull \
    NVENC_RC=cbr \
    NVENC_BITRATE=1.5M \
    NVENC_MAXRATE=1.5M \
    NVENC_BUFSIZE=3M

# CUDA/PyTorch 설정 (GPU 있을 때만 적용됨)
ENV CUDA_VISIBLE_DEVICES=0 \
    TORCH_CUDNN_V8_API_ENABLED=1 \
    PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512 \
    CUDA_LAUNCH_BLOCKING=0

# 빌더에서 산출물 복사
COPY --from=builder /usr/local /usr/local
COPY --from=builder /root/.ptgaze /root/.ptgaze
COPY --from=builder /app /app

# 권한 설정 (안전하게)
RUN set -e; \
    # PTGaze 모델 파일 권한 설정
    if [ -d "/root/.ptgaze/models/" ]; then \
        chmod -R 644 /root/.ptgaze/models/ 2>/dev/null || true; \
        find /root/.ptgaze/models/ -type f -name "*.pth" -exec chmod 644 {} \; 2>/dev/null || true; \
    fi; \
    # 앱 디렉토리 권한 설정
    if [ -d "/app" ]; then \
        find /app -type f -name "*.py" -exec chmod 644 {} \; 2>/dev/null || true; \
        find /app -type d -exec chmod 755 {} \; 2>/dev/null || true; \
    fi; \
    # Python 캐시 디렉토리 생성
    mkdir -p /tmp/python-cache && chmod 777 /tmp/python-cache || true

# 헬스체크 제거 (엔드포인트 없음)

EXPOSE 8000

# Python 경로 설정
ENV PYTHONPATH=/app:$PYTHONPATH

# 안전한 실행 명령 (오류 처리 포함)
CMD ["sh", "-c", "cd /app && python -c 'import sys; print(sys.path)' && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --log-level info"]
