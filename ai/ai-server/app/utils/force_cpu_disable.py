# app/utils/force_cpu_disable.py
# TensorFlow Lite CPU 델리게이트 강제 차단 도구
import os
import sys
import warnings

def force_disable_cpu_delegates():
    """
    모든 가능한 TensorFlow CPU 델리게이트를 강제로 차단
    모듈 임포트 전에 실행해야 함
    """
    # 환경 변수로 CPU 델리게이트 차단
    cpu_disable_env = {
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
        'MEDIAPIPE_FORCE_GPU_ONLY': '1'
    }
    
    for key, value in cpu_disable_env.items():
        os.environ[key] = value
        
    print("[FORCE-DISABLE] All CPU delegate environment variables set")
    
    # TensorFlow 모듈 로딩 시 CPU 델리게이트 차단
    try:
        # TensorFlow가 이미 로드되었다면 설정 적용
        if 'tensorflow' in sys.modules:
            import tensorflow as tf
            # 물리적 GPU 디바이스만 사용하도록 설정
            gpus = tf.config.list_physical_devices('GPU')
            if gpus:
                try:
                    for gpu in gpus:
                        tf.config.experimental.set_memory_growth(gpu, True)
                    print(f"[FORCE-DISABLE] TensorFlow GPU devices configured: {len(gpus)}")
                except RuntimeError as e:
                    print(f"[FORCE-DISABLE] TensorFlow GPU config error: {e}")
            else:
                print("[FORCE-DISABLE] No TensorFlow GPU devices found")
                
        # TensorFlow Lite 설정 (있다면)
        if 'tensorflow.lite' in sys.modules:
            import tensorflow.lite as tflite
            print("[FORCE-DISABLE] TensorFlow Lite module found - applying CPU delegate block")
            
    except ImportError:
        pass
    
    # MediaPipe 초기화 전 설정
    try:
        if 'mediapipe' in sys.modules:
            print("[FORCE-DISABLE] MediaPipe module found - CPU delegates should be blocked")
    except ImportError:
        pass

def monkey_patch_tflite():
    """
    TensorFlow Lite 델리게이트 생성 함수를 무력화
    """
    try:
        import tensorflow.lite as tflite
        
        # 원본 함수 백업
        if hasattr(tflite, 'experimental') and hasattr(tflite.experimental, 'load_delegate'):
            original_load_delegate = tflite.experimental.load_delegate
            
            def disabled_load_delegate(library, options=None):
                # CPU 관련 델리게이트 로딩 차단
                if library and any(cpu_lib in str(library).lower() for cpu_lib in ['xnnpack', 'cpu', 'mkldnn', 'onednn']):
                    print(f"[BLOCKED] CPU delegate loading blocked: {library}")
                    return None
                return original_load_delegate(library, options)
            
            tflite.experimental.load_delegate = disabled_load_delegate
            print("[MONKEY-PATCH] TensorFlow Lite delegate loading patched")
        
        # Interpreter 초기화 훅
        if hasattr(tflite, 'Interpreter'):
            original_interpreter_init = tflite.Interpreter.__init__
            
            def patched_interpreter_init(self, *args, **kwargs):
                # 모든 CPU 델리게이트 옵션 제거
                if 'experimental_delegates' in kwargs:
                    delegates = kwargs['experimental_delegates'] or []
                    filtered_delegates = []
                    for delegate in delegates:
                        if hasattr(delegate, '__class__'):
                            delegate_name = delegate.__class__.__name__.lower()
                            if 'xnnpack' not in delegate_name and 'cpu' not in delegate_name:
                                filtered_delegates.append(delegate)
                            else:
                                print(f"[BLOCKED] CPU delegate filtered: {delegate_name}")
                    kwargs['experimental_delegates'] = filtered_delegates
                
                # num_threads 설정 제거 (CPU 사용량 최소화)
                if 'num_threads' in kwargs:
                    kwargs['num_threads'] = 1
                    
                return original_interpreter_init(self, *args, **kwargs)
            
            tflite.Interpreter.__init__ = patched_interpreter_init
            print("[MONKEY-PATCH] TensorFlow Lite Interpreter patched")
            
    except ImportError:
        pass
    except Exception as e:
        print(f"[WARNING] TensorFlow Lite patching failed: {e}")

def suppress_tensorflow_warnings():
    """TensorFlow 관련 경고 메시지 억제"""
    warnings.filterwarnings('ignore', category=UserWarning, module='google.protobuf')
    warnings.filterwarnings('ignore', category=UserWarning, module='tensorflow')
    warnings.filterwarnings('ignore', category=FutureWarning, module='tensorflow')
    warnings.filterwarnings('ignore', category=UserWarning, module='mediapipe')
    
    # absl 로깅 억제
    try:
        import absl.logging
        absl.logging.set_verbosity(absl.logging.ERROR)
        absl.logging.set_stderrthreshold(absl.logging.ERROR)
        # InitializeLog 경고 억제
        absl.logging.use_absl_handler()
    except ImportError:
        pass
    
    # MediaPipe 로깅 억제
    try:
        import logging
        logging.getLogger('mediapipe').setLevel(logging.ERROR)
        logging.getLogger('tensorflow').setLevel(logging.ERROR)
    except ImportError:
        pass
    
    print("[SUPPRESS] TensorFlow warnings suppressed")

def hook_mediapipe_imports():
    """
    MediaPipe 임포트 훅을 설치하여 CPU 델리게이트 차단
    """
    import importlib.util
    import sys
    
    original_find_spec = importlib.util.find_spec
    
    def hooked_find_spec(name, package=None):
        if name and 'mediapipe' in name:
            # MediaPipe 모듈 로드 전 추가 설정
            os.environ['MEDIAPIPE_DISABLE_XNNPACK'] = '1'
            os.environ['MEDIAPIPE_DISABLE_CPU_INFERENCE'] = '1'
            os.environ['MEDIAPIPE_FORCE_GPU_ONLY'] = '1'
            print(f"[HOOK] MediaPipe import detected: {name} - CPU delegates blocked")
        
        return original_find_spec(name, package)
    
    importlib.util.find_spec = hooked_find_spec
    print("[HOOK] MediaPipe import hook installed")

# 모듈 로드 시 자동 실행
if __name__ != "__main__":
    force_disable_cpu_delegates()
    monkey_patch_tflite() 
    suppress_tensorflow_warnings()
    hook_mediapipe_imports()