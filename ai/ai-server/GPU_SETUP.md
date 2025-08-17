# Tesla T4 GPU 서버 설정 가이드

## 🚀 GPU Docker 실행 방법

### 1. GPU 런타임으로 Docker 실행
```bash
# GPU 지원 Docker 컨테이너 실행
docker run --gpus all -p 8000:8000 your-image-name

# 또는 특정 GPU 디바이스 지정
docker run --gpus device=0 -p 8000:8000 your-image-name
```

### 2. Docker Compose GPU 설정
```yaml
version: '3.8'
services:
  ai-server:
    build: .
    ports:
      - "8000:8000"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### 3. NVIDIA Docker 설치 확인
```bash
# NVIDIA Docker 런타임 설치 확인
nvidia-docker --version

# GPU 상태 확인
nvidia-smi

# Docker에서 GPU 접근 테스트
docker run --rm --gpus all nvidia/cuda:11.8-base-ubuntu20.04 nvidia-smi
```

## 🔧 문제 해결

### GPU 없는 환경에서 실행
서버가 CPU 폴백 모드로 자동 전환됩니다:
```
[STARTUP] CUDA not available - using CPU fallback mode
[CPU] Posture analysis CPU fallback mode
[CPU] Gaze service CPU fallback mode
```

### GPU 접근 권한 문제
```bash
# Docker에 GPU 접근 권한 부여
sudo usermod -aG docker $USER
sudo systemctl restart docker

# NVIDIA Container Toolkit 설치
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### CUDA 라이브러리 문제
```bash
# CUDA 드라이버 확인
cat /proc/driver/nvidia/version

# CUDA 라이브러리 경로 확인
echo $LD_LIBRARY_PATH
```

## 📊 GPU 성능 모니터링

### GPU 사용률 실시간 모니터링
```bash
# GPU 메모리 및 사용률 모니터링
watch -n 1 nvidia-smi

# 컨테이너 내부에서 GPU 상태 확인
docker exec -it container_name python /app/gpu_check.py
```

### 서버 시작 전 GPU 검증
```bash
# GPU 설정 사전 검증
cd /app && python gpu_check.py

# 예상 출력:
# ✓ GPU-ONLY MODE ACTIVE - Ready for production
# ✓ All CPU delegates disabled
# ✓ Tesla T4 GPU acceleration enabled
```

## ⚡ 성능 최적화

### Tesla T4 최적 설정
- **GPU 메모리**: 16GB VRAM 활용
- **Mixed Precision**: FP16 자동 사용
- **NVENC 인코딩**: h264_nvenc 하드웨어 가속
- **cuDNN 최적화**: 벤치마크 모드 활성화

### CPU 부하 제거
모든 TensorFlow Lite XNNPACK CPU 델리게이트가 완전히 비활성화되어 CPU 부하를 최소화합니다.

## 🔍 로그 확인

### 시작 로그 확인
```
[STARTUP] GPU-only mode initialized - CPU delegates DISABLED
[GPU] OpenCV CUDA devices: 1
[GPU] OpenCV DNN backend set to CUDA
[GPU] GPU-ONLY MODE ACTIVE - CPU delegates DISABLED
[SUCCESS] GPU-only mode active
```

### 오류 로그 확인
```
[ERROR] No CUDA devices found - GPU acceleration required!
[FALLBACK] Running in CPU mode - GPU acceleration disabled
```

이제 서버가 GPU 없는 환경에서도 안정적으로 실행되며, GPU 환경에서는 최적의 성능을 제공합니다! 🎯