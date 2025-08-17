# video_optimized.py
# - CPU 가속 강제 차단 제거 (XNNPACK 등 그대로 사용)
# - 얼굴 탐지 N프레임마다 + 사이 프레임은 트래커(CSRT/KCF/MOSSE)로 추적
# - 해피가드 기본 OFF, "happy" 추정 시 N프레임에 1번만 검사
# - 출력 인코딩은 가벼운 코덱 우선 (MJPG/mp4v)
# - 히스테리시스/EMA/로짓바이어스 그대로 유지
# - bare call(옵션 없이 실행) 면접 프리셋 적용(수정된 값)

import os
import sys
import cv2
import json
import torch
import argparse
import numpy as np
from PIL import Image
from datetime import datetime
from collections import Counter
from transformers import ResNetForImageClassification, AutoImageProcessor

UNCERTAIN_LABEL = "불확실"

# (선택) 조용한 실행 + 스레드 상한
try:
    from app.utils.force_cpu_disable import make_things_quiet_and_sane  # 안전판
    make_things_quiet_and_sane(max_threads=int(os.getenv("MAX_CPU_THREADS", "2")))
except Exception:
    pass

# ===== MediaPipe 준비 (가속 차단하지 않음) =====
try:
    import logging
    logging.getLogger('absl').setLevel(logging.ERROR)
    logging.getLogger('mediapipe').setLevel(logging.ERROR)
    logging.getLogger('tensorflow').setLevel(logging.ERROR)

    import mediapipe as mp
    MP_AVAILABLE = True
    mp_fd = mp.solutions.face_detection
    mp_fm = mp.solutions.face_mesh
    print("[MediaPipe] Imported (CPU accel enabled)")
except Exception as e:
    print(f"[WARNING] MediaPipe import failed: {e}")
    MP_AVAILABLE = False
    mp_fd = None
    mp_fm = None

def init_face_detector(min_conf=0.5, model_selection=1):
    if not MP_AVAILABLE or mp_fd is None:
        return None
    # MediaPipe Python 솔루션은 사실상 CPU 경로
    return mp_fd.FaceDetection(model_selection=model_selection, min_detection_confidence=min_conf)

def init_face_mesh():
    if not MP_AVAILABLE or mp_fm is None:
        return None
    return mp_fm.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True)

def detect_and_crop_face(frame_bgr, detector, margin=0.2, min_face=80):
    if detector is None:
        return None
    h, w = frame_bgr.shape[:2]
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
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
    import logging
    logging.getLogger('transformers').setLevel(logging.ERROR)
    model = ResNetForImageClassification.from_pretrained(
        model_name,
        torch_dtype=torch.float16 if torch.cuda.is_available() else None,
        low_cpu_mem_usage=True
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
        if str(logits.device) != str(self.device):
            logits = logits.to(self.device)
        if self.state is None:
            self.state = logits.clone()
        else:
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

def _create_tracker():
    """
    OpenCV 트래커 생성 (CSRT→KCF→MOSSE 폴백)
    """
    tracker = None
    # legacy 우선
    if hasattr(cv2, "legacy"):
        for name in ("TrackerCSRT_create", "TrackerKCF_create", "TrackerMOSSE_create"):
            if hasattr(cv2.legacy, name):
                try:
                    tracker = getattr(cv2.legacy, name)()
                    return tracker
                except Exception:
                    continue
    # non-legacy 폴백
    for name in ("TrackerCSRT_create", "TrackerKCF_create", "TrackerMOSSE_create"):
        if hasattr(cv2, name):
            try:
                tracker = getattr(cv2, name)()
                return tracker
            except Exception:
                continue
    return None

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
    use_happy_guard=False,
    detect_interval=12,         # N프레임마다 탐지
    happy_check_interval=10     # "happy"일 때 N프레임에 1번 해피가드
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    if device.type == 'cuda':
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"CUDA Version: {torch.version.cuda}")
        torch.backends.cudnn.benchmark = True
        torch.backends.cudnn.deterministic = False

    model, processor, id2label = load_model_and_processor(model_name)
    model.to(device)
    if device.type == 'cuda':
        model = model.half()
    model.eval()

    bias_vec = parse_logit_bias(logit_bias_str, id2label).to(device)
    if device.type == 'cuda':
        bias_vec = bias_vec.half()

    face_mesh = init_face_mesh() if use_happy_guard else None

    # 비디오 열기
    cap = None
    for backend in (cv2.CAP_FFMPEG, cv2.CAP_ANY):
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
    total_frames = total_frames_prop if (0 < total_frames_prop <= 1_000_000) else fps * 600

    # 출력 비디오(가벼운 코덱 우선)
    out = None
    if output_path:
        for codec in ('MJPG', 'mp4v', 'XVID', 'H264'):
            try:
                fourcc = cv2.VideoWriter_fourcc(*codec)
                out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
                if out.isOpened():
                    print(f"[VideoWriter] Init with {codec}")
                    break
                else:
                    out.release()
                    out = None
            except Exception as e:
                print(f"[VideoWriter] {codec} failed: {e}")
                if out:
                    out.release()
                    out = None
        if out is None:
            print("[VideoWriter] 모든 코덱 실패 → 저장 없이 진행")
            output_path = None

    detector = init_face_detector(min_conf=face_min_conf, model_selection=face_model_selection)

    all_frames_emotions = []
    detailed_logs = []
    current_emotion, start_frame = None, None
    candidate_emotion, candidate_count = None, 0
    frame_count = 0
    smoother = EmaSmoother(num_labels=len(id2label), alpha=ema_alpha, device=device)

    tracker = None
    tracked_bbox = None

    print(f"동영상 정보: {width}x{height}, {fps}fps, 예상 최대 {total_frames}프레임")
    print(f"모델: {model_name}")
    print("동영상 분석을 시작합니다...")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_count += 1

        # N프레임마다 탐지, 사이에는 트래커 사용
        crop_res = None
        do_detect = (tracker is None) or (frame_count % max(1, int(detect_interval)) == 1) or (frame_count <= max(6, int(detect_interval)))
        if do_detect:
            res = detect_and_crop_face(frame, detector, margin=face_margin, min_face=min_face_px)
            if res:
                face, bbox = res
                tracked_bbox = bbox
                tracker = _create_tracker()
                if tracker is not None:
                    x0, y0, x1, y1 = bbox
                    tracker.init(frame, (x0, y0, x1 - x0, y1 - y0))
                crop_res = (face, bbox)
            else:
                # 탐지 실패 → 트래커 초기화 해제
                tracker = None
                tracked_bbox = None
        else:
            if tracker is not None:
                ok, box = tracker.update(frame)
                if ok:
                    x, y, w, h = [int(v) for v in box]
                    x0, y0, x1, y1 = x, y, x + w, y + h
                    x0 = max(0, x0); y0 = max(0, y0)
                    x1 = min(frame.shape[1], x1); y1 = min(frame.shape[0], y1)
                    if x1 > x0 and y1 > y0:
                        face = frame[y0:y1, x0:x1]
                        if face.size > 0 and min(face.shape[0], face.shape[1]) >= min_face_px:
                            crop_res = (face, (x0, y0, x1, y1))
                            tracked_bbox = (x0, y0, x1, y1)
                        else:
                            crop_res = None
                    else:
                        crop_res = None
                else:
                    tracker = None
                    tracked_bbox = None

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
                if device.type == 'cuda':
                    inputs = {k: v.to(device, dtype=torch.float16) for k, v in inputs.items()}
                else:
                    inputs = {k: v.to(device) for k, v in inputs.items()}

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

                    # 해피가드: "happy"고, 특정 프레임 간격에서만 검사
                    if use_happy_guard and proposed.lower() == "happy" and (frame_count % max(1, int(happy_check_interval)) == 0):
                        if not happy_guard(face, face_mesh):
                            main_idx = int(top_indices[1].item())
                            proposed = id2label[main_idx]
                            top1 = float(top_probs[1].item())
                            top2 = float(top_probs[2].item())
                            margin = top1 - top2
                    observed_label = proposed if top1 is not None and top1 >= exit_thr else UNCERTAIN_LABEL
            else:
                observed_label = UNCERTAIN_LABEL
        else:
            observed_label = UNCERTAIN_LABEL

        # 히스테리시스
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

        if frame_count % 500 == 0:
            elapsed_time = frame_count / fps
            print(f"처리된 프레임: {frame_count}, 경과 시간: {elapsed_time:.1f}초")
            if device.type == 'cuda':
                import gc
                gc.collect()
                torch.cuda.empty_cache()
                memory_allocated = torch.cuda.memory_allocated(0) / 1024**3
                memory_reserved = torch.cuda.memory_reserved(0) / 1024**3
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
                "happy_guard": bool(use_happy_guard),
                "detect_interval": int(detect_interval),
                "happy_check_interval": int(happy_check_interval)
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
    use_happy_guard=False,
    detect_interval=12,
    happy_check_interval=10
):
    import tempfile
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
            use_happy_guard=use_happy_guard,
            detect_interval=detect_interval,
            happy_check_interval=happy_check_interval
        )
        return result
    finally:
        if os.path.exists(video_path):
            os.unlink(video_path)

def main():
    p = argparse.ArgumentParser(description='동영상 파일 표정 분석 (탐지+트래킹 + EMA + 히스테리시스 + 바이어스 + 해피-가드)')
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
    # 로짓 바이어스/해피-가드
    p.add_argument('--logit-bias', type=str, default='')
    p.add_argument('--happy-guard', action='store_true')
    # 탐지/해피 체크 주기
    p.add_argument('--detect-interval', type=int, default=12)
    p.add_argument('--happy-check-interval', type=int, default=10)

    args = p.parse_args()

    if not os.path.exists(args.video_path):
        print(f"동영상 파일이 존재하지 않습니다: {args.video_path}")
        return

    # ★ bare call(옵션 없이 실행) 감지 → 면접 프리셋 자동 적용
    if len(sys.argv) == 2:
        # 면접 프리셋(수정본)
        args.ema = 0.92
        args.enter_thr = 0.60
        args.exit_thr  = 0.50
        args.margin_thr = 0.20
        args.min_stable = 6
        args.face_margin = 0.25
        args.min_face = 112
        args.blur_thr = 90.0
        args.no_clahe = True
        args.logit_bias = "happy=-0.4,neutral=0.2,fear=0.1"
        args.happy_guard = False           # 기본 OFF로 변경
        args.detect_interval = 12          # 탐지 간격
        args.happy_check_interval = 10     # 해피가드 체크 간격
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
        use_happy_guard=args.happy_guard,
        detect_interval=args.detect_interval,
        happy_check_interval=args.happy_check_interval
    )

if __name__ == "__main__":
    main()
