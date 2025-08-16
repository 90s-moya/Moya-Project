# Face video_optimized.py
# TensorFlow Lite CPU 델리게이트 강제 차단
import os
# 모든 TensorFlow CPU 델리게이트 차단 (임포트 전)
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
    'MEDIAPIPE_DISABLE_CPU_INFERENCE': '1'
})
print("[PRE-IMPORT] All CPU delegates disabled before module imports")

# video_optimized.py (완전 교체본: 기본 실행 시 '면접 최적 프리셋' 자동 적용)
# - 얼굴 검출+크롭(MediaPipe)
# - 블러/크기 품질 필터
# - EMA(시간 스무딩)
# - 히스테리시스(enter/exit/margin + 최소 지속 프레임)
# - "불확실"은 세그먼트 전환으로 취급하지 않음
# - 모델 선택 가능(--model)
# - 도메인 로짓 바이어스(--logit-bias "happy=-0.4,neutral=0.2,fear=0.1")
# - 해피-가드(--happy-guard): 입꼬리/눈가 단서 없으면 happy 강등
# - ★ bare call(옵션 없이 실행) 시 면접 프리셋 자동 적용

import sys
import cv2
import json
import torch
import argparse
import numpy as np
from PIL import Image
from datetime import datetime
from collections import Counter
from transformers import ResNetForImageClassification, ResNetConfig, AutoImageProcessor

# Tesla T4 GPU 가속 초기화 (폴백 모드 포함)
def init_gpu_acceleration():
    """Tesla T4 GPU 가속 초기화 - 폴백 모드 지원"""
    import os
    
    # TensorFlow CPU 백엔드 완전 차단 (GPU 없어도 적용)
    os.environ['TF_DISABLE_XNNPACK'] = '1'
    os.environ['TF_DISABLE_ONEDNN'] = '1'  
    os.environ['TF_DISABLE_MKL'] = '1'
    os.environ['TF_LITE_DISABLE_CPU_DELEGATE'] = '1'
    
    # MediaPipe 설정 (GPU 우선, CPU 폴백 허용)
    os.environ['MEDIAPIPE_ENABLE_GPU'] = '1'
    os.environ['MEDIAPIPE_GPU_DEVICE'] = '0'
    
    gpu_available = False
    
    try:
        # OpenCV GPU 백엔드 설정 시도
        cuda_devices = cv2.cuda.getCudaEnabledDeviceCount()
        if cuda_devices > 0:
            print(f"[GPU] OpenCV CUDA devices: {cuda_devices}")
            cv2.setUseOptimized(True)
            
            # DNN 백엔드를 CUDA로 설정
            cv2.dnn.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
            cv2.dnn.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA)
            print("[GPU] OpenCV DNN backend set to CUDA")
            
            # GPU 전용 모드 설정
            os.environ['TF_FORCE_GPU_ONLY'] = '1'
            os.environ['MEDIAPIPE_FORCE_GPU_DELEGATE'] = '1'
            os.environ['MEDIAPIPE_DISABLE_CPU_DELEGATE'] = '1'
            
            gpu_available = True
            print("[GPU] GPU-ONLY MODE ACTIVE - CPU delegates DISABLED")
        else:
            print("[WARNING] No CUDA devices found - using CPU fallback mode")
            gpu_available = False
    except Exception as e:
        print(f"[WARNING] GPU initialization failed: {e} - using CPU fallback")
        gpu_available = False
    
    if not gpu_available:
        print("[FALLBACK] Running in CPU mode - GPU acceleration disabled")
        # CPU 모드에서는 TF_FORCE_GPU_ONLY 해제
        if 'TF_FORCE_GPU_ONLY' in os.environ:
            del os.environ['TF_FORCE_GPU_ONLY']
        if 'MEDIAPIPE_FORCE_GPU_DELEGATE' in os.environ:
            del os.environ['MEDIAPIPE_FORCE_GPU_DELEGATE']
        if 'MEDIAPIPE_DISABLE_CPU_DELEGATE' in os.environ:
            del os.environ['MEDIAPIPE_DISABLE_CPU_DELEGATE']
    
    return gpu_available

# GPU 가속 초기화 실행 (폴백 모드 지원)
GPU_AVAILABLE = init_gpu_acceleration()

UNCERTAIN_LABEL = "불확실"

# ===== MediaPipe 준비 (CPU 델리게이트 차단) =====
# pip install mediapipe
try:
    # MediaPipe 임포트 전 추가 CPU 델리게이트 차단
    import os
    os.environ['MEDIAPIPE_DISABLE_XNNPACK'] = '1'
    os.environ['MEDIAPIPE_DISABLE_CPU_INFERENCE'] = '1'
    os.environ['MEDIAPIPE_FORCE_GPU_ONLY'] = '1'
    
    # TensorFlow Lite 로그 억제
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    
    # absl 로그 억제
    import logging
    logging.getLogger('absl').setLevel(logging.ERROR)
    
    # stderr 리다이렉트
    import sys
    import io
    from contextlib import redirect_stderr
    
    # MediaPipe 임포트 시 stderr 억제
    stderr_backup = sys.stderr
    try:
        with redirect_stderr(io.StringIO()):
            import mediapipe as mp
        MP_AVAILABLE = True
        mp_fd = mp.solutions.face_detection
        mp_fm = mp.solutions.face_mesh
        print("[MEDIAIPE] Imported with CPU delegate blocking")
    finally:
        sys.stderr = stderr_backup
        
except Exception as e:
    print(f"[WARNING] MediaPipe import failed: {e}")
    MP_AVAILABLE = False
    mp_fd = None
    mp_fm = None

def init_face_detector(min_conf=0.5, model_selection=1, gpu_available=True):
    if not MP_AVAILABLE or mp_fd is None:
        return None
    
    # GPU 사용 가능 여부에 따른 설정
    detector_kwargs = {
        'model_selection': model_selection,
        'min_detection_confidence': min_conf
    }
    
    if gpu_available:
        # Tesla T4 GPU 가속 설정 (GPU 사용 가능시)
        try:
            detector_kwargs.update({
                'enable_gpu': True,
                'gpu_id': 0
            })
            print("[GPU] MediaPipe FaceDetection GPU mode enabled")
        except Exception:
            print("[WARNING] MediaPipe GPU parameters not supported - using default")
    else:
        print("[CPU] MediaPipe FaceDetection CPU mode")
    
    return mp_fd.FaceDetection(**detector_kwargs)

def init_face_mesh(gpu_available=True):
    if not MP_AVAILABLE or mp_fm is None:
        return None
    
    # GPU 사용 가능 여부에 따른 설정
    mesh_kwargs = {
        'static_image_mode': False,
        'max_num_faces': 1,
        'refine_landmarks': True
    }
    
    if gpu_available:
        # Tesla T4 GPU 가속 설정 (GPU 사용 가능시)
        try:
            mesh_kwargs.update({
                'enable_gpu': True,
                'gpu_id': 0
            })
            print("[GPU] MediaPipe FaceMesh GPU mode enabled")
        except Exception:
            print("[WARNING] MediaPipe GPU parameters not supported - using default")
    else:
        print("[CPU] MediaPipe FaceMesh CPU mode")
    
    return mp_fm.FaceMesh(**mesh_kwargs)

def detect_and_crop_face(frame_bgr, detector, margin=0.2, min_face=80):
    h, w = frame_bgr.shape[:2]
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    if detector is None:
        return None
    res = detector.process(frame_rgb)
    if not res or not res.detections:
        return None
    best, best_area = None, -1
    for det in res.detections:
        bbox = det.location_data.relative_bounding_box
        x, y, bw, bh = bbox.xmin, bbox.ymin, bbox.width, bbox.height
        X = max(0, int(x * w)); Y = max(0, int(y * h))
        W = int(bw * w); H = int(bh * h)
        mx = int(W * margin); my = int(H * margin)
        X0 = max(0, X - mx); Y0 = max(0, Y - my)
        X1 = min(w, X + W + mx); Y1 = min(h, Y + H + my)
        area = (X1 - X0) * (Y1 - Y0)
        if area > best_area:
            best_area = area; best = (X0, Y0, X1, Y1)
    if best is None:
        return None
    X0, Y0, X1, Y1 = best
    face = frame_bgr[Y0:Y1, X0:X1]
    if face.size == 0:
        return None
    fh, fw = face.shape[:2]
    if fh < min_face or fw < min_face:
        return None
    return face, (X0, Y0, X1, Y1)

def is_blurry(img_bgr, thr=60.0):
    val = cv2.Laplacian(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
    return val < thr, float(val)

def apply_clahe_on_face(face_bgr):
    ycrcb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2YCrCb)
    y, cr, cb = cv2.split(ycrcb)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    y = clahe.apply(y)
    ycrcb = cv2.merge([y, cr, cb])
    return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)

def load_model_and_processor(model_name):
    import os
    import logging
    
    # Tesla T4 GPU 가속 설정
    os.environ['CUDA_VISIBLE_DEVICES'] = '0'
    os.environ['TORCH_CUDNN_V8_API_ENABLED'] = '1'  # cuDNN v8 최적화
    
    # TensorFlow Lite GPU 델리게이트 설정 (MediaPipe용)
    os.environ['TF_FORCE_GPU_ALLOW_GROWTH'] = 'true'
    os.environ['TF_GPU_ALLOCATOR'] = 'cuda_malloc_async'
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # TF 로그 억제
    
    # MediaPipe GPU 설정
    os.environ['MEDIAPIPE_ENABLE_GPU'] = '1'
    os.environ['MEDIAPIPE_GPU_DEVICE'] = '0'
    
    # 경고 메시지 억제
    logging.getLogger('transformers').setLevel(logging.ERROR)
    logging.getLogger('tensorflow').setLevel(logging.ERROR)
    
    # Tesla T4 최적화: 메모리 효율적 모델 로드
    model = ResNetForImageClassification.from_pretrained(
        model_name,
        torch_dtype=torch.float16,  # Half precision for memory efficiency
        low_cpu_mem_usage=True      # 메모리 효율적 로드
    )
    processor = AutoImageProcessor.from_pretrained(model_name)
    id2label = model.config.id2label
    return model, processor, id2label

class EmaSmoother:
    def __init__(self, num_labels, alpha=0.8, device="cuda"):
        self.alpha = alpha
        self.device = device
        self.state = None
        self.num_labels = num_labels
        
    def update(self, logits):
        logits = logits.detach()
        # GPU 메모리 최적화: 이미 올바른 디바이스와 타입이면 불필요한 변환 방지
        if logits.device != self.device:
            logits = logits.to(self.device)
            
        if self.state is None:
            self.state = logits.clone()  # clone으로 메모리 분리
        else:
            # In-place 연산으로 메모리 절약
            self.state.mul_(self.alpha).add_(logits, alpha=(1.0 - self.alpha))
        return self.state

def parse_logit_bias(bias_str, id2label):
    bias = torch.zeros(len(id2label))
    if not bias_str:
        return bias
    label2id = {v: k for k, v in id2label.items()}
    for token in bias_str.split(','):
        if '=' not in token:
            continue
        name, val = token.split('=', 1)
        name = name.strip()
        try:
            val = float(val.strip())
        except Exception:
            continue
        if name in label2id:
            bias[label2id[name]] = val
    return bias

def happy_guard(face_bgr, face_mesh, smile_thr=0.02, ear_thr=0.18):
    if face_mesh is None:
        return True
    h, w = face_bgr.shape[:2]
    res = face_mesh.process(cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB))
    if not res.multi_face_landmarks:
        return True
    lm = res.multi_face_landmarks[0].landmark
    def pt(i): return np.array([lm[i].x * w, lm[i].y * h], dtype=np.float32)
    left_c, right_c = pt(61), pt(291)
    up_lip, low_lip = pt(13), pt(14)
    center_y = (up_lip[1] + low_lip[1]) / 2.0
    corner_y = (left_c[1] + right_c[1]) / 2.0
    smile_score = (center_y - corner_y) / max(h, 1)
    l_up, l_low = pt(159), pt(145)
    r_up, r_low = pt(386), pt(374)
    eye_gap = (np.linalg.norm(l_up - l_low) + np.linalg.norm(r_up - r_low)) / 2.0
    mouth_width = np.linalg.norm(left_c - right_c) + 1e-6
    ear_like = eye_gap / mouth_width
    return (smile_score > smile_thr) and (ear_like < ear_thr)

def analyze_video_bytes(
    video_bytes,
    model_name="Celal11/resnet-50-finetuned-FER2013-0.001",
    output_path=None,
    show_video=False,
    face_min_conf=0.5,
    face_model_selection=1,
    face_margin=0.2,
    min_face_px=80,
    blur_thr=60.0,
    use_clahe=True,
    ema_alpha=0.8,
    enter_thr=0.55,
    exit_thr=0.45,
    margin_thr=0.15,
    min_stable=5,
    logit_bias_str="",
    use_happy_guard=False
):
    import tempfile
    import os
    
    # 다양한 비디오 포맷 지원
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
    temp_file.write(video_bytes)
    temp_file.flush()
    temp_file.close()
    video_path = temp_file.name
    
    try:
        result = analyze_video(
            video_path=video_path,
            model_name=model_name,
            output_path=output_path,
            show_video=show_video,
            face_min_conf=face_min_conf,
            face_model_selection=face_model_selection,
            face_margin=face_margin,
            min_face_px=min_face_px,
            blur_thr=blur_thr,
            use_clahe=use_clahe,
            ema_alpha=ema_alpha,
            enter_thr=enter_thr,
            exit_thr=exit_thr,
            margin_thr=margin_thr,
            min_stable=min_stable,
            logit_bias_str=logit_bias_str,
            use_happy_guard=use_happy_guard
        )
        return result
    finally:
        if os.path.exists(video_path):
            os.unlink(video_path)

def analyze_video(
    video_path,
    model_name="Celal11/resnet-50-finetuned-FER2013-0.001",
    output_path=None,
    show_video=False,
    face_min_conf=0.5,
    face_model_selection=1,
    face_margin=0.2,
    min_face_px=80,
    blur_thr=60.0,
    use_clahe=True,
    ema_alpha=0.8,
    enter_thr=0.55,
    exit_thr=0.45,
    margin_thr=0.15,
    min_stable=5,
    logit_bias_str="",
    use_happy_guard=False
):
    # Tesla T4 최적화 디바이스 설정
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    if device.type == 'cuda':
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"CUDA Version: {torch.version.cuda}")
        # Tesla T4 최적화 설정
        torch.backends.cudnn.benchmark = True  # 고정 크기 입력에 최적화
        torch.backends.cudnn.deterministic = False  # 성능 우선
        
    model, processor, id2label = load_model_and_processor(model_name)
    model.to(device)
    
    # Half precision 사용시 모델을 half()로 변환
    if device.type == 'cuda':
        model = model.half()  # FP16 추론
    
    model.eval()
    bias_vec = parse_logit_bias(logit_bias_str, id2label).to(device)
    if device.type == 'cuda':
        bias_vec = bias_vec.half()
        
    face_mesh = init_face_mesh(gpu_available=device.type == 'cuda') if use_happy_guard else None

    # 다양한 코덱 지원을 위한 백엔드 시도
    cap = None
    backends = [cv2.CAP_FFMPEG, cv2.CAP_ANY]
    
    for backend in backends:
        cap = cv2.VideoCapture(video_path, backend)
        if cap.isOpened():
            break
        cap.release()
    
    if cap is None or not cap.isOpened():
        print(f"동영상 파일을 열 수 없습니다: {video_path}")
        return

    fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
    total_frames_prop = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # WebM 파일의 경우 프레임 수가 부정확할 수 있으므로 안전한 기본값 사용
    if total_frames_prop <= 0 or total_frames_prop > 1000000:  # 비정상적으로 큰 값 필터링
        # 예상 프레임 수 계산 (최대 10분 영상 가정)
        max_duration_seconds = 600  # 10분
        total_frames = fps * max_duration_seconds
        print(f"경고: 프레임 수가 비정상적입니다 ({total_frames_prop}). 예상값 {total_frames}로 설정합니다.")
    else:
        total_frames = total_frames_prop

    out = None
    if output_path:
        # 더 안정적인 코덱 선택
        codecs_to_try = ['H264', 'XVID', 'MJPG', 'mp4v']
        out = None
        
        for codec in codecs_to_try:
            try:
                fourcc = cv2.VideoWriter_fourcc(*codec)
                out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
                if out.isOpened():
                    print(f"[Face VideoWriter] {codec} 코덱으로 성공적으로 초기화")
                    break
                else:
                    out.release()
                    out = None
            except Exception as e:
                print(f"[Face VideoWriter] {codec} 코덱 실패: {e}")
                if out:
                    out.release()
                    out = None
                continue
        
        if out is None:
            print("[Face VideoWriter] 모든 코덱 실패, 출력 비디오 저장 없이 진행")
            output_path = None

    detector = init_face_detector(min_conf=face_min_conf, model_selection=face_model_selection, gpu_available=device.type == 'cuda')

    all_frames_emotions = []
    detailed_logs = []
    current_emotion, start_frame = None, None
    candidate_emotion, candidate_count = None, 0
    frame_count = 0
    smoother = EmaSmoother(num_labels=len(id2label), alpha=ema_alpha, device=device)

    print(f"동영상 정보: {width}x{height}, {fps}fps, 예상 최대 {total_frames}프레임")
    print(f"모델: {model_name}")
    print("동영상 분석을 시작합니다...")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_count += 1

        # 성능 최적화: 매 프레임마다 얼굴 검출하지 않고 대략 5프레임마다 검출
        if frame_count % 3 == 1 or frame_count <= 10:  # 초기에는 더 빠르게 검출
            crop_res = detect_and_crop_face(frame, detector, margin=face_margin, min_face=min_face_px)
        else:
            crop_res = None  # 이전 결과 재사용

        observed_label = UNCERTAIN_LABEL
        top_emotions = []
        bbox = None
        is_blur = False
        top1 = top2 = margin = None
        proposed = None

        if crop_res:
            face, bbox = crop_res
            is_blur, blur_val = is_blurry(face, thr=blur_thr)
            if not is_blur:
                if use_clahe:
                    face = apply_clahe_on_face(face)
                pil_image = Image.fromarray(cv2.cvtColor(face, cv2.COLOR_BGR2RGB))
                inputs = processor(images=pil_image, return_tensors="pt")
                
                # GPU 최적화: 데이터 타입 맞춤
                if device.type == 'cuda':
                    inputs = {k: v.to(device, dtype=torch.float16) for k, v in inputs.items()}
                else:
                    inputs = {k: v.to(device) for k, v in inputs.items()}
                
                # GPU 추론 최적화
                with torch.no_grad(), torch.cuda.amp.autocast(enabled=(device.type == 'cuda')):
                    outputs = model(**inputs)
                    logits = outputs.logits[0] + bias_vec
                    smoothed_logits = smoother.update(logits)
                    probs = torch.nn.functional.softmax(smoothed_logits, dim=-1)
                    top_probs, top_indices = torch.topk(probs, 3)
                    for prob, idx in zip(top_probs, top_indices):
                        emotion = id2label[idx.item()]
                        top_emotions.append((emotion, float(prob.item())))
                    top1 = float(top_probs[0].item())
                    top2 = float(top_probs[1].item())
                    margin = top1 - top2
                    main_idx = int(top_indices[0].item())
                    proposed = id2label[main_idx]
                    if use_happy_guard and proposed.lower() == "happy":
                        if not happy_guard(face, face_mesh):
                            main_idx = int(top_indices[1].item())
                            proposed = id2label[main_idx]
                            top1 = float(top_probs[1].item())
                            top2 = float(top_probs[2].item())
                            margin = top1 - top2
                    observed_label = proposed if top1 >= exit_thr else UNCERTAIN_LABEL
            else:
                observed_label = UNCERTAIN_LABEL
        else:
            observed_label = UNCERTAIN_LABEL

        # 히스테리시스 (성능 최적화: 불필요한 연산 감소)
        if observed_label == UNCERTAIN_LABEL:
            predicted_emotion = current_emotion if current_emotion else UNCERTAIN_LABEL
            candidate_emotion, candidate_count = None, 0
        else:
            if crop_res and not is_blur and top_emotions:
                if current_emotion is None:
                    current_emotion = observed_label
                    start_frame = frame_count
                    predicted_emotion = current_emotion
                    candidate_emotion, candidate_count = None, 0
                else:
                    if observed_label != current_emotion:
                        if (top1 is not None) and (margin is not None) and (top1 >= enter_thr) and (margin >= margin_thr):
                            if candidate_emotion == observed_label:
                                candidate_count += 1
                            else:
                                candidate_emotion, candidate_count = observed_label, 1
                            if candidate_count >= min_stable:
                                end_frame = frame_count - 1
                                if start_frame is not None:
                                    detailed_logs.append({
                                        "label": current_emotion,
                                        "start_frame": start_frame,
                                        "end_frame": end_frame,
                                        "duration_seconds": (end_frame - start_frame + 1) / fps
                                    })
                                current_emotion = observed_label
                                start_frame = frame_count
                                predicted_emotion = current_emotion
                                candidate_emotion, candidate_count = None, 0
                            else:
                                predicted_emotion = current_emotion
                        else:
                            candidate_emotion, candidate_count = None, 0
                            predicted_emotion = current_emotion
                    else:
                        predicted_emotion = current_emotion
                        candidate_emotion, candidate_count = None, 0
            else:
                predicted_emotion = current_emotion if current_emotion else UNCERTAIN_LABEL
                candidate_emotion, candidate_count = None, 0

        all_frames_emotions.append(observed_label)

        # 시각화
        if bbox:
            (x0, y0, x1, y1) = bbox
            cv2.rectangle(frame, (x0, y0), (x1, y1), (0, 200, 0), 2)
        y_offset = 50
        for i, (emo, prob) in enumerate(top_emotions):
            cv2.putText(frame, f"{emo}: {prob:.2f}",
                        (50, y_offset + i * 30), cv2.FONT_HERSHEY_SIMPLEX,
                        0.8, (0, 255, 0), 2, cv2.LINE_AA)
        if observed_label == UNCERTAIN_LABEL:
            cv2.putText(frame, "Uncertain / No face / Blur / Low conf",
                        (50, y_offset + 3 * 30), cv2.FONT_HERSHEY_SIMPLEX,
                        0.6, (50, 50, 255), 2, cv2.LINE_AA)
        time_text = f"Frame: {frame_count}/{total_frames} | Time: {frame_count/fps:.1f}s"
        cv2.putText(frame, time_text, (50, height - 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)

        if out:
            out.write(frame)
        if show_video:
            cv2.imshow('Video Emotion Analysis', frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("사용자에 의해 분석이 중단되었습니다.")
                break

        # 500프레임마다 진행상황 출력 (더 안정적)
        if frame_count % 500 == 0:
            elapsed_time = frame_count / fps
            print(f"처리된 프레임: {frame_count}, 경과 시간: {elapsed_time:.1f}초")
            
        # Tesla T4 메모리 최적화: 500프레임마다 GPU 메모리 정리
        if frame_count % 500 == 0:
            import gc
            gc.collect()
            if device.type == 'cuda':
                torch.cuda.empty_cache()  # GPU 메모리 캐시 정리
                memory_allocated = torch.cuda.memory_allocated(0) / 1024**3  # GB
                memory_reserved = torch.cuda.memory_reserved(0) / 1024**3   # GB
                print(f"GPU Memory - Allocated: {memory_allocated:.2f}GB, Reserved: {memory_reserved:.2f}GB")

    if current_emotion is not None and current_emotion != UNCERTAIN_LABEL and start_frame is not None:
        end_frame = frame_count
        detailed_logs.append({
            "label": current_emotion,
            "start_frame": start_frame,
            "end_frame": end_frame,
            "duration_seconds": (end_frame - start_frame + 1) / fps
        })

    cap.release()
    if out:
        out.release()
    if show_video:
        cv2.destroyAllWindows()

    if frame_count > 0:
        emotion_counts = Counter(all_frames_emotions)
        frame_distribution = {
            emo: {
                "frames": cnt,
                "percentage": (cnt / frame_count) * 100,
                "duration_seconds": cnt / fps
            } for emo, cnt in emotion_counts.items()
        }
        report = {
            "video_info": {
                "file_path": video_path,
                "total_frames": frame_count,
                "original_frame_count_prop": total_frames_prop,
                "fps": fps,
                "duration_seconds": frame_count / fps,
                "resolution": f"{width}x{height}"
            },
            "analysis_info": {
                "timestamp": datetime.now().isoformat(),
                "model_used": model_name,
                "ema_alpha": ema_alpha,
                "hysteresis": {
                    "enter_thr": enter_thr,
                    "exit_thr": exit_thr,
                    "margin_thr": margin_thr,
                    "min_stable": min_stable
                },
                "face_min_px": min_face_px,
                "blur_threshold": blur_thr,
                "clahe": bool(use_clahe),
                "mediapipe": bool(MP_AVAILABLE),
                "logit_bias": logit_bias_str,
                "happy_guard": bool(use_happy_guard)
            },
            "frame_distribution": frame_distribution,
            "detailed_logs": detailed_logs,
            "summary": {
                "dominant_emotion": max(emotion_counts, key=emotion_counts.get) if emotion_counts else "N/A",
                "emotion_changes": len(detailed_logs),
                "average_emotion_duration": (
                    sum([log["duration_seconds"] for log in detailed_logs]) / len(detailed_logs)
                ) if detailed_logs else 0
            }
        }
        video_name = os.path.splitext(os.path.basename(video_path))[0]
        report_filename = f"{video_name}_emotion_report.json"
        with open(report_filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=4)
        print("\n분석 완료!")
        print(f"감정 변화 리포트: {report_filename}")
        if output_path:
            print(f"분석된 동영상 저장: {output_path}")
        return report
    else:
        print("감지된 프레임이 없어 리포트를 생성하지 않습니다.")
        return None

def main():
    p = argparse.ArgumentParser(description='동영상 파일 표정 분석 (얼굴 크롭 + EMA + 히스테리시스 + 바이어스 + 해피-가드)')
    p.add_argument('video_path', help='분석할 동영상 파일 경로')
    p.add_argument('--output', '-o', help='분석 결과 동영상 출력 경로')
    p.add_argument('--show', '-s', action='store_true', help='분석 과정을 실시간으로 표시')
    p.add_argument('--model', default='Celal11/resnet-50-finetuned-FER2013-0.001',
                   help='Hugging Face 모델 이름')
    # 얼굴/품질
    p.add_argument('--face-conf', type=float, default=0.5)
    p.add_argument('--face-sel', type=int, default=1)
    p.add_argument('--face-margin', type=float, default=0.2)
    p.add_argument('--min-face', type=int, default=80)
    p.add_argument('--blur-thr', type=float, default=60.0)
    p.add_argument('--no-clahe', action='store_true')
    # 시간 스무딩
    p.add_argument('--ema', type=float, default=0.8)
    # 히스테리시스
    p.add_argument('--enter-thr', type=float, default=0.55)
    p.add_argument('--exit-thr', type=float, default=0.45)
    p.add_argument('--margin-thr', type=float, default=0.15)
    p.add_argument('--min-stable', type=int, default=5)
    # 도메인 로짓 바이어스/해피-가드
    p.add_argument('--logit-bias', type=str, default='')
    p.add_argument('--happy-guard', action='store_true')

    args = p.parse_args()

    if not os.path.exists(args.video_path):
        print(f"동영상 파일이 존재하지 않습니다: {args.video_path}")
        return

    # ★ bare call(옵션 없이 실행) 감지 → 면접 최적 프리셋 자동 적용
    # sys.argv: [script, video_path] 인 경우 길이 2
    if len(sys.argv) == 2:
        # 면접 프리셋
        args.ema = 0.92
        args.enter_thr = 0.60
        args.exit_thr  = 0.50
        args.margin_thr = 0.20
        args.min_stable = 6
        args.face_margin = 0.25
        args.min_face = 112
        args.blur_thr = 90.0
        args.no_clahe = True          # 기본은 CLAHE 끔
        args.logit_bias = "happy=-0.4,neutral=0.2,fear=0.1"
        args.happy_guard = True
        print("[Preset] Interview-defaults applied (bare call).")

    analyze_video(
        video_path=args.video_path,
        model_name=args.model,
        output_path=args.output,
        show_video=args.show,
        face_min_conf=args.face_conf,
        face_model_selection=args.face_sel,
        face_margin=args.face_margin,
        min_face_px=args.min_face,
        blur_thr=args.blur_thr,
        use_clahe=not args.no_clahe,
        ema_alpha=args.ema,
        enter_thr=args.enter_thr,
        exit_thr=args.exit_thr,
        margin_thr=args.margin_thr,
        min_stable=args.min_stable,
        logit_bias_str=args.logit_bias,
        use_happy_guard=args.happy_guard
    )

if __name__ == "__main__":
    main()
