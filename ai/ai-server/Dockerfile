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
    python3.10 \
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
###Tesla T4 (4 vCPU, 15GB RAM) 최적화
ENV OMP_NUM_THREADS=2 \
    OPENBLAS_NUM_THREADS=2 \
    MKL_NUM_THREADS=2 \
    NUMEXPR_NUM_THREADS=2 \
    TFLITE_NUM_THREADS=2 \
    TOKENIZERS_PARALLELISM=false \
    TF_CPP_MIN_LOG_LEVEL=2 \
    GLOG_minloglevel=3 \
    UVICORN_WORKERS=1

###FFmpeg 설정
ENV FFMPEG_PREFER_ORDER=h264_nvenc,libx264 \
    FFMPEG_THREADS=3 \
    FFMPEG_FILTER_THREADS=2 \
    X264_PRESET=veryfast \
    X264_CRF=28

###라이브러리 경로
ENV LD_LIBRARY_PATH=/usr/local/lib:/opt/ffmpeg/lib:/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH}

###NVENC 설정
ENV NVENC_PRESET=p1 \
    NVENC_TUNE=ull \
    NVENC_RC=cbr \
    NVENC_BITRATE=1.5M \
    NVENC_MAXRATE=1.5M \
    NVENC_BUFSIZE=3M

###CUDA/PyTorch 설정
ENV CUDA_VISIBLE_DEVICES=0 \
    TORCH_CUDNN_V8_API_ENABLED=1 \
    PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512 \
    CUDA_LAUNCH_BLOCKING=0

###TensorFlow/MediaPipe GPU 전용 설정 (CPU 완전 차단)
ENV TF_FORCE_GPU_ALLOW_GROWTH=true \
    TF_GPU_ALLOCATOR=cuda_malloc_async \
    TF_CPP_MIN_LOG_LEVEL=3 \
    TF_DISABLE_XNNPACK=1 \
    TF_DISABLE_ONEDNN=1 \
    TF_DISABLE_MKL=1 \
    TF_DISABLE_SEGMENT_REDUCTION=1 \
    TF_LITE_DISABLE_CPU_DELEGATE=1 \
    TF_LITE_DISABLE_XNNPACK=1 \
    TF_LITE_FORCE_GPU_DELEGATE=1 \
    TF_XLA_FLAGS="--tf_xla_auto_jit=0" \
    TF_ENABLE_ONEDNN_OPTS=0 \
    TF_FORCE_GPU_ONLY=1 \
    MEDIAPIPE_ENABLE_GPU=1 \
    MEDIAPIPE_GPU_DEVICE=0 \
    MEDIAPIPE_FORCE_GPU_DELEGATE=1 \
    MEDIAPIPE_DISABLE_CPU_DELEGATE=1 \
    MEDIAPIPE_DISABLE_XNNPACK=1 \
    MEDIAPIPE_DISABLE_CPU_INFERENCE=1 \
    MEDIAPIPE_FORCE_GPU_ONLY=1

###OpenCV GPU 가속 설정
ENV OPENCV_DNN_BACKEND=5 \
    OPENCV_DNN_TARGET=6

###기타 GPU 가속 라이브러리 설정
ENV NUMBA_ENABLE_CUDASIM=0 \
    OPENVINO_DISABLE_CPU_PLUGIN=1 \
    TENSORFLOW_LITE_DISABLE_CPU_DELEGATES=1
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
CMD ["/opt/venv/bin/python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
