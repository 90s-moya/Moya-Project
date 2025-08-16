# app/utils/gpu_validation.py
# Tesla T4 GPU 전용 모드 검증 도구
import os
import logging

def validate_gpu_only_mode():
    """
    GPU 전용 모드가 올바르게 설정되었는지 검증
    CPU 델리게이트가 모두 비활성화되었는지 확인
    """
    validation_results = {
        "tensorflow_cpu_disabled": False,
        "mediapipe_gpu_forced": False,
        "pytorch_gpu_available": False,
        "opencv_gpu_backend": False,
        "warnings": [],
        "errors": []
    }
    
    # TensorFlow CPU 델리게이트 비활성화 확인
    tf_cpu_vars = [
        'TF_DISABLE_XNNPACK',
        'TF_DISABLE_ONEDNN', 
        'TF_DISABLE_MKL',
        'TF_LITE_DISABLE_CPU_DELEGATE',
        'TF_FORCE_GPU_ONLY'
    ]
    
    tf_disabled_count = sum(1 for var in tf_cpu_vars if os.environ.get(var) == '1')
    validation_results["tensorflow_cpu_disabled"] = tf_disabled_count == len(tf_cpu_vars)
    
    if tf_disabled_count < len(tf_cpu_vars):
        missing_vars = [var for var in tf_cpu_vars if os.environ.get(var) != '1']
        validation_results["warnings"].append(f"Missing TensorFlow CPU disable vars: {missing_vars}")
    
    # MediaPipe GPU 강제 설정 확인
    mp_gpu_vars = [
        'MEDIAPIPE_FORCE_GPU_DELEGATE',
        'MEDIAPIPE_DISABLE_CPU_DELEGATE',
        'MEDIAPIPE_ENABLE_GPU'
    ]
    
    mp_gpu_count = sum(1 for var in mp_gpu_vars if os.environ.get(var) == '1')
    validation_results["mediapipe_gpu_forced"] = mp_gpu_count == len(mp_gpu_vars)
    
    if mp_gpu_count < len(mp_gpu_vars):
        missing_vars = [var for var in mp_gpu_vars if os.environ.get(var) != '1']
        validation_results["warnings"].append(f"Missing MediaPipe GPU vars: {missing_vars}")
    
    # PyTorch GPU 확인
    try:
        import torch
        if torch.cuda.is_available():
            validation_results["pytorch_gpu_available"] = True
            device_name = torch.cuda.get_device_name(0)
            if "Tesla T4" not in device_name:
                validation_results["warnings"].append(f"GPU is not Tesla T4: {device_name}")
        else:
            validation_results["errors"].append("PyTorch CUDA not available")
    except ImportError:
        validation_results["warnings"].append("PyTorch not available")
    
    # OpenCV GPU 백엔드 확인
    try:
        import cv2
        if cv2.cuda.getCudaEnabledDeviceCount() > 0:
            validation_results["opencv_gpu_backend"] = True
        else:
            validation_results["warnings"].append("OpenCV CUDA devices not found")
    except Exception as e:
        validation_results["warnings"].append(f"OpenCV GPU check failed: {e}")
    
    # 전체 검증 결과
    all_gpu_ready = (
        validation_results["tensorflow_cpu_disabled"] and
        validation_results["mediapipe_gpu_forced"] and
        validation_results["pytorch_gpu_available"]
    )
    
    validation_results["overall_status"] = "GPU_ONLY_MODE_ACTIVE" if all_gpu_ready else "CPU_DELEGATES_DETECTED"
    
    return validation_results

def log_gpu_validation():
    """GPU 검증 결과를 로그로 출력"""
    results = validate_gpu_only_mode()
    
    print(f"[GPU-VALIDATION] Status: {results['overall_status']}")
    print(f"[GPU-VALIDATION] TensorFlow CPU disabled: {results['tensorflow_cpu_disabled']}")
    print(f"[GPU-VALIDATION] MediaPipe GPU forced: {results['mediapipe_gpu_forced']}")
    print(f"[GPU-VALIDATION] PyTorch GPU available: {results['pytorch_gpu_available']}")
    print(f"[GPU-VALIDATION] OpenCV GPU backend: {results['opencv_gpu_backend']}")
    
    if results["warnings"]:
        for warning in results["warnings"]:
            print(f"[GPU-VALIDATION-WARNING] {warning}")
    
    if results["errors"]:
        for error in results["errors"]:
            print(f"[GPU-VALIDATION-ERROR] {error}")
    
    return results

if __name__ == "__main__":
    log_gpu_validation()