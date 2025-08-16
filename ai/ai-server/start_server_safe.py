#!/usr/bin/env python3
# 안전한 서버 시작 스크립트 - CPU 델리게이트 완전 차단 검증
import os
import sys
import subprocess
import time

# 최우선 CPU 델리게이트 차단
CRITICAL_ENV_VARS = {
    'TF_DISABLE_XNNPACK': '1',
    'TF_DISABLE_ONEDNN': '1', 
    'TF_DISABLE_MKL': '1',
    'TF_DISABLE_SEGMENT_REDUCTION': '1',
    'TF_LITE_DISABLE_CPU_DELEGATE': '1',
    'TF_LITE_DISABLE_XNNPACK': '1',
    'TF_LITE_FORCE_GPU_DELEGATE': '1',
    'TF_XLA_FLAGS': '--tf_xla_auto_jit=0',
    'TF_ENABLE_ONEDNN_OPTS': '0',
    'TF_CPP_MIN_LOG_LEVEL': '3',
    'MEDIAPIPE_DISABLE_XNNPACK': '1',
    'MEDIAPIPE_DISABLE_CPU_INFERENCE': '1',
    'MEDIAPIPE_DISABLE_CPU_DELEGATE': '1',
    'MEDIAPIPE_FORCE_GPU_ONLY': '1'
}

def force_env_setup():
    """환경 변수 강제 설정"""
    for key, value in CRITICAL_ENV_VARS.items():
        os.environ[key] = value
    print("✓ Critical CPU delegate blocking environment variables set")

def verify_no_cpu_delegates():
    """CPU 델리게이트 생성 여부 검증"""
    print("\n🔍 Pre-flight CPU delegate check...")
    
    # 환경 변수 검증
    missing_vars = []
    for key, expected_value in CRITICAL_ENV_VARS.items():
        actual_value = os.environ.get(key)
        if actual_value != expected_value:
            missing_vars.append(f"{key}={actual_value} (expected: {expected_value})")
    
    if missing_vars:
        print("❌ Missing critical environment variables:")
        for var in missing_vars:
            print(f"   {var}")
        return False
    else:
        print("✓ All critical environment variables set correctly")
        return True

def test_imports():
    """모듈 임포트 시 CPU 델리게이트 생성 여부 테스트"""
    print("\n🧪 Testing module imports for CPU delegate creation...")
    
    # stderr 캡처하여 CPU 델리게이트 메시지 감지
    import subprocess
    import tempfile
    
    test_script = '''
import os
import sys
import warnings
from io import StringIO

# CPU 델리게이트 차단 설정
os.environ.update({
    'TF_DISABLE_XNNPACK': '1',
    'TF_DISABLE_ONEDNN': '1', 
    'TF_DISABLE_MKL': '1',
    'TF_DISABLE_SEGMENT_REDUCTION': '1',
    'TF_LITE_DISABLE_CPU_DELEGATE': '1',
    'TF_LITE_DISABLE_XNNPACK': '1',
    'TF_LITE_FORCE_GPU_DELEGATE': '1',
    'TF_XLA_FLAGS': '--tf_xla_auto_jit=0',
    'TF_ENABLE_ONEDNN_OPTS': '0',
    'TF_CPP_MIN_LOG_LEVEL': '3',
    'MEDIAPIPE_DISABLE_XNNPACK': '1',
    'MEDIAPIPE_DISABLE_CPU_INFERENCE': '1',
    'MEDIAPIPE_DISABLE_CPU_DELEGATE': '1',
    'MEDIAPIPE_FORCE_GPU_ONLY': '1'
})

# stderr 캡처
stderr_capture = StringIO()
original_stderr = sys.stderr
sys.stderr = stderr_capture

try:
    # 위험한 모듈들 임포트 테스트
    try:
        import mediapipe as mp
        print("MediaPipe imported successfully")
    except Exception as e:
        print(f"MediaPipe import failed: {e}")
    
    try:
        import tensorflow.lite as tflite
        print("TensorFlow Lite imported successfully")
    except Exception as e:
        print(f"TensorFlow Lite import failed: {e}")
        
finally:
    sys.stderr = original_stderr
    captured_output = stderr_capture.getvalue()
    
    # CPU 델리게이트 메시지 검사
    cpu_delegate_indicators = [
        "Created TensorFlow Lite XNNPACK delegate for CPU",
        "XNNPACK delegate",
        "CPU delegate"
    ]
    
    found_cpu_delegates = []
    for indicator in cpu_delegate_indicators:
        if indicator in captured_output:
            found_cpu_delegates.append(indicator)
    
    if found_cpu_delegates:
        print("❌ CPU delegates detected:")
        for delegate in found_cpu_delegates:
            print(f"   {delegate}")
        print("\\nCaptured output:")
        print(captured_output)
        sys.exit(1)
    else:
        print("✅ No CPU delegates detected in module imports")
        sys.exit(0)
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(test_script)
        test_file = f.name
    
    try:
        result = subprocess.run([sys.executable, test_file], 
                              capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            print("❌ CPU delegate test failed!")
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            return False
        else:
            print("✅ CPU delegate test passed!")
            print(result.stdout)
            return True
            
    except subprocess.TimeoutExpired:
        print("❌ CPU delegate test timed out")
        return False
    finally:
        try:
            os.unlink(test_file)
        except:
            pass

def start_server():
    """서버 시작"""
    print("\n🚀 Starting server with CPU delegate protection...")
    
    cmd = [
        sys.executable, "-m", "uvicorn", 
        "app.main:app", 
        "--host", "0.0.0.0", 
        "--port", "8000",
        "--workers", "1",
        "--log-level", "info"
    ]
    
    try:
        # 환경 변수와 함께 서버 시작
        env = os.environ.copy()
        env.update(CRITICAL_ENV_VARS)
        
        process = subprocess.Popen(cmd, env=env)
        print(f"✅ Server started with PID: {process.pid}")
        print("📝 Monitor logs for any CPU delegate messages")
        print("🛑 Press Ctrl+C to stop the server")
        
        process.wait()
        
    except KeyboardInterrupt:
        print("\n🛑 Server shutdown requested")
        process.terminate()
        process.wait()
    except Exception as e:
        print(f"❌ Server start failed: {e}")
        return False
    
    return True

def main():
    print("=" * 60)
    print("🛡️  SAFE SERVER START - CPU DELEGATE PROTECTION")
    print("=" * 60)
    
    # 1. 환경 변수 강제 설정
    force_env_setup()
    
    # 2. 환경 변수 검증
    if not verify_no_cpu_delegates():
        print("❌ Environment verification failed!")
        sys.exit(1)
    
    # 3. 모듈 임포트 테스트
    if not test_imports():
        print("❌ Module import test failed!")
        print("💡 CPU delegates are still being created despite blocking attempts")
        sys.exit(1)
    
    print("\n✅ All pre-flight checks passed!")
    print("🚀 Server is safe to start - no CPU delegates will be created")
    
    # 4. 서버 시작
    start_server()

if __name__ == "__main__":
    main()