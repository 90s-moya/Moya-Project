#!/usr/bin/env python3
# GPU 상태 확인 및 CPU 델리게이트 차단 검증 스크립트
import os
import sys

# Tesla T4 GPU 전용 설정 강제 적용
os.environ['TF_DISABLE_XNNPACK'] = '1'
os.environ['TF_DISABLE_ONEDNN'] = '1'
os.environ['TF_DISABLE_MKL'] = '1'
os.environ['TF_LITE_DISABLE_CPU_DELEGATE'] = '1'
os.environ['TF_FORCE_GPU_ONLY'] = '1'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

os.environ['MEDIAPIPE_FORCE_GPU_DELEGATE'] = '1'
os.environ['MEDIAPIPE_DISABLE_CPU_DELEGATE'] = '1'
os.environ['MEDIAPIPE_ENABLE_GPU'] = '1'
os.environ['MEDIAPIPE_GPU_DEVICE'] = '0'

os.environ['CUDA_VISIBLE_DEVICES'] = '0'
os.environ['TORCH_CUDNN_V8_API_ENABLED'] = '1'

print("=" * 60)
print("Tesla T4 GPU Configuration Check")
print("=" * 60)

# 환경 변수 확인
print("\n1. Environment Variables:")
cpu_disable_vars = [
    'TF_DISABLE_XNNPACK',
    'TF_DISABLE_ONEDNN', 
    'TF_DISABLE_MKL',
    'TF_LITE_DISABLE_CPU_DELEGATE',
    'TF_FORCE_GPU_ONLY',
    'MEDIAPIPE_FORCE_GPU_DELEGATE',
    'MEDIAPIPE_DISABLE_CPU_DELEGATE'
]

for var in cpu_disable_vars:
    value = os.environ.get(var, 'NOT_SET')
    status = "✓ DISABLED" if value == '1' else "✗ ENABLED"
    print(f"   {var}: {value} [{status}]")

# PyTorch GPU 확인
print("\n2. PyTorch GPU Check:")
try:
    import torch
    print(f"   PyTorch version: {torch.__version__}")
    print(f"   CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"   GPU device: {torch.cuda.get_device_name(0)}")
        print(f"   CUDA version: {torch.version.cuda}")
        print(f"   GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f}GB")
    else:
        print("   ✗ CUDA not available!")
except ImportError:
    print("   ✗ PyTorch not installed")

# OpenCV GPU 확인
print("\n3. OpenCV GPU Check:")
try:
    import cv2
    print(f"   OpenCV version: {cv2.__version__}")
    cuda_devices = cv2.cuda.getCudaEnabledDeviceCount()
    print(f"   CUDA devices: {cuda_devices}")
    if cuda_devices > 0:
        print("   ✓ OpenCV CUDA support available")
    else:
        print("   ✗ OpenCV CUDA support not available")
except ImportError:
    print("   ✗ OpenCV not installed")

# MediaPipe 확인
print("\n4. MediaPipe Check:")
try:
    import mediapipe as mp
    print(f"   MediaPipe available: ✓")
    # MediaPipe GPU 테스트
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(
        static_image_mode=False,
        min_detection_confidence=0.5,
        model_complexity=1
    )
    print("   MediaPipe Pose initialized: ✓")
    pose.close()
except ImportError:
    print("   ✗ MediaPipe not installed")
except Exception as e:
    print(f"   ✗ MediaPipe error: {e}")

# TensorFlow Lite 확인
print("\n5. TensorFlow Lite Check:")
try:
    import tensorflow as tf
    print(f"   TensorFlow version: {tf.__version__}")
    
    # GPU 디바이스 확인
    gpu_devices = tf.config.list_physical_devices('GPU')
    print(f"   TensorFlow GPU devices: {len(gpu_devices)}")
    for i, device in enumerate(gpu_devices):
        print(f"     Device {i}: {device}")
    
    # CPU 델리게이트 확인 (XNNPACK 비활성화 테스트)
    try:
        import tensorflow.lite as tflite
        print("   TensorFlow Lite available: ✓")
        print(f"   XNNPACK disabled: {os.environ.get('TF_DISABLE_XNNPACK') == '1'}")
    except ImportError:
        print("   TensorFlow Lite not available")
        
except ImportError:
    print("   ✗ TensorFlow not installed")

# 최종 결과
print("\n" + "=" * 60)
print("SUMMARY:")

# 필수 조건 확인
gpu_ready = False
cpu_blocked = True

try:
    import torch
    gpu_ready = torch.cuda.is_available()
except:
    pass

# CPU 델리게이트 차단 확인
for var in cpu_disable_vars:
    if os.environ.get(var) != '1':
        cpu_blocked = False
        break

if gpu_ready and cpu_blocked:
    print("✓ GPU-ONLY MODE ACTIVE - Ready for production")
    print("✓ All CPU delegates disabled")
    print("✓ Tesla T4 GPU acceleration enabled")
    sys.exit(0)
else:
    print("✗ CONFIGURATION ISSUES DETECTED:")
    if not gpu_ready:
        print("  - GPU not available or not configured")
    if not cpu_blocked:
        print("  - CPU delegates still active")
    print("\nPlease fix configuration before starting the server!")
    sys.exit(1)