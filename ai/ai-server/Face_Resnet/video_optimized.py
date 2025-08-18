# video_optimized.py
# GPU 중심 파이프라인 + 세그먼트 리포트(face_result형) 출력

import os
import sys
import cv2
import json
import time
import torch
import argparse
import numpy as np
from PIL import Image
from datetime import datetime
from collections import Counter
from transformers import ResNetForImageClassification, AutoImageProcessor

UNCERTAIN_LABEL = "불확실"

# ===== Quiet + thread cap + env check =====
try:
    from app.utils.force_cpu_disable import make_things_quiet_and_sane, warn_if_slow_env
    make_things_quiet_and_sane(max_threads=int(os.getenv("MAX_CPU_THREADS", "2")), debug=False)
    warn_if_slow_env(debug=True)
except Exception:
    pass

# ===== Debug helpers =====
def _ts():
    return time.strftime("%H:%M:%S")

def dbg(msg, on=True):
    if on:
        print(f"[{_ts()}][DBG] {msg}")

def timing_ms(t0):
    return (time.perf_counter() - t0) * 1000.0

# ===== Optional MediaPipe fallback (CPU) =====
try:
    import logging
    logging.getLogger('absl').setLevel(logging.ERROR)
    logging.getLogger('mediapipe').setLevel(logging.ERROR)
    logging.getLogger('tensorflow').setLevel(logging.ERROR)
    import mediapipe as mp
    MP_AVAILABLE = True
    mp_fd = mp.solutions.face_detection
    mp_fm = mp.solutions.face_mesh
except Exception as e:
    print(f"[{_ts()}][WARN] MediaPipe import failed: {e}")
    MP_AVAILABLE = False
    mp_fd = None
    mp_fm = None

# ===== Face detector: OpenCV DNN (CUDA) =====
def init_face_detector_dnn(proto_path: str, model_path: str, use_cuda=True):
    if not (os.path.isfile(proto_path) and os.path.isfile(model_path)):
        raise FileNotFoundError("Face DNN files not found")
    net = cv2.dnn.readNetFromCaffe(proto_path, model_path)
    if use_cuda:
        try:
            net.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
            net.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA)
            dbg("OpenCV DNN set to CUDA backend/target", True)
        except Exception as e:
            print(f"[{_ts()}][WARN] DNN CUDA not available: {e}")
    else:
        net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
    return net

def detect_and_crop_face_dnn(frame_bgr, net, conf_thr=0.7, margin=0.2, min_face=80):
    H, W = frame_bgr.shape[:2]
    blob = cv2.dnn.blobFromImage(cv2.resize(frame_bgr, (300, 300)),
                                 1.0, (300, 300), (104.0, 177.0, 123.0))
    net.setInput(blob)
    dets = net.forward()
    best = None; best_area = -1
    for i in range(dets.shape[2]):
        conf = float(dets[0,0,i,2])
        if conf < conf_thr: continue
        x0 = int(dets[0,0,i,3] * W); y0 = int(dets[0,0,i,4] * H)
        x1 = int(dets[0,0,i,5] * W); y1 = int(dets[0,0,i,6] * H)
        w = x1 - x0; h = y1 - y0
        mx = int(w * margin); my = int(h * margin)
        X0 = max(0, x0 - mx); Y0 = max(0, y0 - my)
        X1 = min(W, x1 + mx); Y1 = min(H, y1 + my)
        if X1 <= X0 or Y1 <= Y0: continue
        area = (X1 - X0) * (Y1 - Y0)
        if area > best_area:
            best_area = area; best = (X0, Y0, X1, Y1)
    if best is None:
        return None
    X0, Y0, X1, Y1 = best
    face = frame_bgr[Y0:Y1, X0:X1]
    if face.size == 0 or min(face.shape[0], face.shape[1]) < min_face:
        return None
    return face, (X0, Y0, X1, Y1)

# ===== MediaPipe fallback detector/mesh =====
def init_face_detector_mediapipe(min_conf=0.5, model_selection=1):
    if not MP_AVAILABLE or mp_fd is None:
        return None
    return mp_fd.FaceDetection(model_selection=model_selection, min_detection_confidence=min_conf)

def init_face_mesh():
    if not MP_AVAILABLE or mp_fm is None:
        return None
    return mp_fm.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True)

def detect_and_crop_face_mediapipe(frame_bgr, detector, margin=0.2, min_face=80):
    if detector is None: return None
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
        Wb = int(bw * w); Hb = int(bh * h)
        mx = int(Wb * margin); my = int(Hb * margin)
        X0 = max(0, X - mx); Y0 = max(0, Y - my)
        X1 = min(w, X + Wb + mx); Y1 = min(h, Y + Hb + my)
        area = (X1 - X0) * (Y1 - Y0)
        if area > best_area:
            best_area = area; best = (X0, Y0, X1, Y1)
    if best is None:
        return None
    X0, Y0, X1, Y1 = best
    face = frame_bgr[Y0:Y1, X0:X1]
    if face.size == 0 or min(face.shape[0], face.shape[1]) < min_face:
        return None
    return face, (X0, Y0, X1, Y1)

# ===== Utils =====
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
    tracker = None
    if hasattr(cv2, "legacy"):
        for name in ("TrackerCSRT_create", "TrackerKCF_create", "TrackerMOSSE_create"):
            if hasattr(cv2.legacy, name):
                try:
                    tracker = getattr(cv2.legacy, name)()
                    return tracker
                except Exception:
                    continue
    for name in ("TrackerCSRT_create", "TrackerKCF_create", "TrackerMOSSE_create"):
        if hasattr(cv2, name):
            try:
                tracker = getattr(cv2, name)()
                return tracker
            except Exception:
                continue
    return None

# ====== run-compress helpers (불확실 제외) ======
def _compress_runs_1based(labels, exclude_label=UNCERTAIN_LABEL):
    """
    labels: 길이 N의 라벨 시퀀스 (1프레임=1라벨, 1-based 프레임 인덱스 기준으로 구간 생성)
    exclude_label: 이 라벨의 구간은 리포트에서 제외
    """
    n = len(labels)
    if n == 0: return []
    segs = []
    cur = labels[0]; start = 1
    for i in range(2, n + 1):
        if labels[i - 1] != cur:
            end = i - 1
            if cur != exclude_label:
                segs.append({"label": cur, "start_frame": start, "end_frame": end})
            cur = labels[i - 1]
            start = i
    # tail
    if cur != exclude_label:
        segs.append({"label": cur, "start_frame": start, "end_frame": n})
    return segs

def _count_distribution(labels, exclude_label=UNCERTAIN_LABEL):
    ctr = Counter([lb for lb in labels if lb != exclude_label])
    return {k: int(v) for k, v in ctr.items()}

# ===== 메인 분석 =====
def analyze_video(
    video_path,
    model_name="Celal11/resnet-50-finetuned-FER2013-0.001",
    output_path=None,
    show_video=False,
    # 얼굴/품질
    face_min_conf=0.5,
    face_model_selection=1,
    face_margin=0.2,
    min_face_px=80,
    blur_thr=60.0,
    use_clahe=True,
    # 스무딩/히스테리시스
    ema_alpha=0.8,
    enter_thr=0.55,
    exit_thr=0.45,
    margin_thr=0.15,
    min_stable=5,
    # 바이어스/해피가드
    logit_bias_str="",
    use_happy_guard=False,
    # 퍼포먼스
    detect_interval=12,
    happy_check_interval=10,
    proc_interval=1,
    cls_interval=1,
    batch_size=2,
    # 얼굴탐지 DNN 파일
    face_proto=None,
    face_model=None,
    dnn_conf=0.7,
    debug=True
):
    # ===== Device summary =====
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[{_ts()}] Using device: {device}")
    if device.type == 'cuda':
        print(f"[{_ts()}] GPU: {torch.cuda.get_device_name(0)} | CUDA {torch.version.cuda}")
        torch.backends.cudnn.benchmark = True
        torch.backends.cudnn.deterministic = False

    # ===== Model =====
    t0 = time.perf_counter()
    model, processor, id2label = load_model_and_processor(model_name)
    model.to(device)
    if device.type == 'cuda':
        model = model.half()
    model.eval()
    bias_vec = parse_logit_bias(logit_bias_str, id2label).to(device)
    if device.type == 'cuda':
        bias_vec = bias_vec.half()
    dbg(f"Model loaded in {timing_ms(t0):.1f} ms", debug)

    # ===== Face Mesh (해피가드) =====
    face_mesh = init_face_mesh() if use_happy_guard else None

    # ===== Video open =====
    cap = None
    for backend in (cv2.CAP_FFMPEG, cv2.CAP_ANY):
        cap = cv2.VideoCapture(video_path, backend)
        if cap.isOpened():
            break
        cap.release()
    if cap is None or not cap.isOpened():
        print(f"[{_ts()}] 동영상 파일을 열 수 없습니다: {video_path}")
        return

    fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
    total_frames_prop = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = total_frames_prop if (0 < total_frames_prop <= 1_000_000) else fps * 600
    print(f"[{_ts()}] Video info: {width}x{height} @{fps}fps (est frames {total_frames})")

    # ===== Output writer (선택) =====
    out = None
    if output_path:
        for codec in ('MJPG', 'mp4v', 'XVID', 'H264'):
            try:
                fourcc = cv2.VideoWriter_fourcc(*codec)
                out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
                if out.isOpened():
                    print(f"[{_ts()}] [VideoWriter] Init with {codec}")
                    break
                else:
                    out.release(); out = None
            except Exception as e:
                print(f"[{_ts()}] [VideoWriter] {codec} failed: {e}")
                if out: out.release(); out = None
        if out is None:
            print(f"[{_ts()}] [VideoWriter] 모든 코덱 실패 → 저장 없이 진행")
            output_path = None

    # ===== Face detector prefer DNN(CUDA) else MediaPipe =====
    dnn_net = None
    if face_proto is None:
        face_proto = os.getenv("FACE_PROTO", "")
    if face_model is None:
        face_model = os.getenv("FACE_MODEL", "")
    if face_proto and face_model:
        try:
            dnn_net = init_face_detector_dnn(face_proto, face_model, use_cuda=True)
            dbg("Face detector: OpenCV DNN (CUDA)", debug)
        except Exception as e:
            print(f"[{_ts()}][WARN] DNN face detector init failed → {e}")
            dnn_net = None

    if dnn_net is None:
        detector_mp = init_face_detector_mediapipe(min_conf=face_min_conf, model_selection=face_model_selection)
        dbg("Face detector: MediaPipe (CPU fallback)", debug)
    else:
        detector_mp = None

    # ===== Stats =====
    per_frame_label = []           # 프레임별 관측 라벨(1프레임=1라벨, 불확실 포함)
    detailed_logs = []             # (히스테리시스 기반 전환 로그: 내부 사용/디버그)
    current_emotion, start_frame = None, None
    candidate_emotion, candidate_count = None, 0
    frame_count = 0
    smoother = EmaSmoother(num_labels=len(id2label), alpha=ema_alpha, device=device)

    tracker = None
    tracked_bbox = None

    # timing stats
    t_det_sum = t_cls_sum = t_draw_sum = 0.0
    det_calls = cls_calls = draw_calls = 0
    last_observed_label = UNCERTAIN_LABEL
    last_top_emotions = []

    # micro-batch accumulators
    batch_faces_pil = []

    print(f"[{_ts()}] Start analysis... (proc_interval={proc_interval}, cls_interval={cls_interval}, batch_size={batch_size})")

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_count += 1

        # (A) 전역 프레임 스킵
        if proc_interval > 1 and (frame_count % int(proc_interval) != 0):
            if out: out.write(frame)
            if show_video:
                cv2.imshow('Video Emotion Analysis', frame)
                if cv2.waitKey(1) & 0xFF == ord('q'): break
            per_frame_label.append(last_observed_label)
            continue

        # (B) 탐지/트래킹
        t0 = time.perf_counter()
        crop_res = None
        do_detect = (tracker is None) or (frame_count % max(1, int(detect_interval)) == 1) or (frame_count <= max(6, int(detect_interval)))
        if do_detect:
            if dnn_net is not None:
                res = detect_and_crop_face_dnn(frame, dnn_net, conf_thr=dnn_conf, margin=face_margin, min_face=min_face_px)
            else:
                res = detect_and_crop_face_mediapipe(frame, detector_mp, margin=face_margin, min_face=min_face_px)
            if res:
                face, bbox = res
                tracked_bbox = bbox
                tracker = _create_tracker()
                if tracker is not None:
                    x0, y0, x1, y1 = bbox
                    tracker.init(frame, (x0, y0, x1 - x0, y1 - y0))
                crop_res = (face, bbox)
            else:
                tracker = None; tracked_bbox = None
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
        t_det = timing_ms(t0); t_det_sum += t_det; det_calls += 1

        # (C) 분류(마이크로배칭 + cls_interval)
        observed_label = last_observed_label
        top_emotions = last_top_emotions
        bbox = None
        is_blur = False

        if crop_res:
            face, bbox = crop_res
            is_blur, blur_val = is_blurry(face, thr=blur_thr)
            if not is_blur:
                if use_clahe:
                    face = apply_clahe_on_face(face)
                pil_image = Image.fromarray(cv2.cvtColor(face, cv2.COLOR_BGR2RGB))
                batch_faces_pil.append(pil_image)

        run_cls_now = (len(batch_faces_pil) >= int(cls_interval) and len(batch_faces_pil) >= int(batch_size)) \
                      or (cls_interval <= 1 and batch_faces_pil) \
                      or (cls_interval > 1 and frame_count % int(cls_interval) == 0 and batch_faces_pil)

        if run_cls_now:
            t1 = time.perf_counter()
            inputs = processor(images=batch_faces_pil, return_tensors="pt")
            if device.type == 'cuda':
                inputs = {k: v.to(device, dtype=torch.float16) for k, v in inputs.items()}
            else:
                inputs = {k: v.to(device) for k, v in inputs.items()}
            with torch.no_grad(), torch.cuda.amp.autocast(enabled=(device.type == 'cuda')):
                outputs = model(**inputs)
                logits_batch = outputs.logits  # (B, C)
                top_emotions = []
                last_label = observed_label
                for i in range(logits_batch.shape[0]):
                    logits = logits_batch[i] + bias_vec
                    smoothed = smoother.update(logits)
                    probs = torch.nn.functional.softmax(smoothed, dim=-1)
                    top_probs, top_indices = torch.topk(probs, 3)
                    trio = []
                    for prob, idx in zip(top_probs, top_indices):
                        trio.append((id2label[idx.item()], float(prob.item())))
                    top_emotions = trio
                    if trio:
                        top1 = trio[0][1]
                        last_label = trio[0][0] if top1 >= exit_thr else UNCERTAIN_LABEL
                observed_label = last_label
            t_cls = timing_ms(t1); t_cls_sum += t_cls; cls_calls += 1
            batch_faces_pil = []

            # 해피가드(조건부+간헐)
            if use_happy_guard and observed_label and observed_label.lower() == "happy" and (frame_count % max(1, int(happy_check_interval)) == 0) and crop_res:
                if not happy_guard(face, face_mesh):
                    if len(top_emotions) >= 2:
                        observed_label = top_emotions[1][0]
                        top_emotions[0], top_emotions[1] = top_emotions[1], top_emotions[0]

        # (D) 히스테리시스(디버그용 detailed_logs)
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
                        top1_val = top_emotions[0][1] if top_emotions else None
                        top2_val = top_emotions[1][1] if len(top_emotions) > 1 else None
                        margin = (top1_val - top2_val) if (top1_val is not None and top2_val is not None) else None
                        if (top1_val is not None) and (margin is not None) and (top1_val >= enter_thr) and (margin >= margin_thr):
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

        # 프레임 레벨 라벨 기록(세그먼트 리포트용)
        per_frame_label.append(observed_label)
        last_observed_label = observed_label
        last_top_emotions = top_emotions

        # (E) 시각화
        t2 = time.perf_counter()
        # draw omitted for brevity (same as before)
        t_draw = timing_ms(t2); t_draw_sum += t_draw; draw_calls += 1

        if out: out.write(frame)
        if show_video:
            cv2.imshow('Video Emotion Analysis', frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print(f"[{_ts()}] 사용자에 의해 분석이 중단되었습니다.")
                break

        # 주기적 디버깅 출력
        if frame_count % 300 == 0:
            det_avg = (t_det_sum / det_calls) if det_calls else 0
            cls_avg = (t_cls_sum / cls_calls) if cls_calls else 0
            draw_avg = (t_draw_sum / draw_calls) if draw_calls else 0
            if device.type == 'cuda':
                torch.cuda.synchronize()
                mem_alloc = torch.cuda.memory_allocated(0) / 1024**3
                mem_resv  = torch.cuda.memory_reserved(0) / 1024**3
                dbg(f"Frames={frame_count} | det={det_avg:.1f}ms, cls={cls_avg:.1f}ms, draw={draw_avg:.1f}ms | GPU mem A={mem_alloc:.2f}G R={mem_resv:.2f}G", debug)
            else:
                dbg(f"Frames={frame_count} | det={det_avg:.1f}ms, cls={cls_avg:.1f}ms, draw={draw_avg:.1f}ms (CPU)", debug)

    # flush 마지막 상태(히스테리시스 디버그)
    if current_emotion is not None and current_emotion != UNCERTAIN_LABEL and start_frame is not None:
        end_frame = frame_count
        detailed_logs.append({
            "label": current_emotion,
            "start_frame": start_frame,
            "end_frame": end_frame,
            "duration_seconds": (end_frame - start_frame + 1) / fps
        })

    cap.release()
    if out: out.release()
    if show_video: cv2.destroyAllWindows()

    # ======== 최종 face_result(요구 포맷) ========
    # 1) 프레임 분포(불확실 제외)
    frame_distribution = _count_distribution(per_frame_label, exclude_label=UNCERTAIN_LABEL)
    # 2) 연속 구간 압축(불확실 제외), 1-based 인덱스
    segments = _compress_runs_1based(per_frame_label, exclude_label=UNCERTAIN_LABEL)

    face_result = {
        "timestamp": datetime.now().isoformat(),
        "total_frames": frame_count,
        "frame_distribution": frame_distribution,
        "detailed_logs": segments
    }

    # (선택) JSON 파일 저장
    try:
        video_name = os.path.splitext(os.path.basename(video_path))[0]
        report_filename = f"{video_name}_emotion_report.json"
        with open(report_filename, 'w', encoding='utf-8') as f:
            json.dump(face_result, f, ensure_ascii=False, indent=4)
        print(f"\n[{_ts()}] 분석 완료! report={report_filename} " + (f" video={output_path}" if output_path else ""))
    except Exception as e:
        print(f"[{_ts()}] report 저장 실패: {e}")

    return face_result

def analyze_video_bytes(video_bytes, **kwargs):
    import tempfile
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
    temp_file.write(video_bytes)
    temp_file.flush()
    temp_file.close()
    video_path = temp_file.name
    try:
        result = analyze_video(video_path=video_path, **kwargs)
        return result
    finally:
        if os.path.exists(video_path):
            os.unlink(video_path)

def main():
    p = argparse.ArgumentParser(description='동영상 표정 분석 (GPU DNN 얼굴탐지 + 트래커 + 배칭 + EMA/히스테리시스)')
    p.add_argument('video_path', help='분석할 동영상 경로')
    p.add_argument('--output', '-o', help='분석 결과 동영상 출력 경로')
    p.add_argument('--show', '-s', action='store_true', help='실시간 표시')
    p.add_argument('--model', default='Celal11/resnet-50-finetuned-FER2013-0.001', help='Hugging Face 모델 이름')
    # 얼굴/품질
    p.add_argument('--face-conf', type=float, default=0.5)
    p.add_argument('--face-sel', type=int, default=1)
    p.add_argument('--face-margin', type=float, default=0.2)
    p.add_argument('--min-face', type=int, default=80)
    p.add_argument('--blur-thr', type=float, default=60.0)
    p.add_argument('--no-clahe', action='store_true')
    # 스무딩/히스테리시스
    p.add_argument('--ema', type=float, default=0.8)
    p.add_argument('--enter-thr', type=float, default=0.55)
    p.add_argument('--exit-thr', type=float, default=0.45)
    p.add_argument('--margin-thr', type=float, default=0.15)
    p.add_argument('--min-stable', type=int, default=5)
    p.add_argument('--logit-bias', type=str, default='')
    p.add_argument('--happy-guard', action='store_true')
    # 퍼포먼스
    p.add_argument('--detect-interval', type=int, default=12)
    p.add_argument('--happy-check-interval', type=int, default=10)
    p.add_argument('--proc-interval', type=int, default=1)
    p.add_argument('--cls-interval', type=int, default=1)
    p.add_argument('--batch-size', type=int, default=2)
    # DNN 파일
    p.add_argument('--face-proto', type=str, default=os.getenv("FACE_PROTO", ""))
    p.add_argument('--face-model', type=str, default=os.getenv("FACE_MODEL", ""))
    p.add_argument('--dnn-conf', type=float, default=0.7)
    p.add_argument('--debug', action='store_true')

    args = p.parse_args()

    if not os.path.exists(args.video_path):
        print(f"[{_ts()}] 동영상 파일이 존재하지 않습니다: {args.video_path}")
        return

    # ★ bare call(옵션 없이 실행) → 면접 프리셋
    if len(sys.argv) == 2:
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
        args.happy_guard = False
        args.detect_interval = 12
        args.happy_check_interval = 10
        args.proc_interval = 1
        args.cls_interval = 1
        args.batch_size = 2
        print(f"[{_ts()}] [Preset] Interview defaults applied.")

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
        happy_check_interval=args.happy_check_interval,
        proc_interval=args.proc_interval,
        cls_interval=args.cls_interval,
        batch_size=args.batch_size,
        face_proto=args.face_proto,
        face_model=args.face_model,
        dnn_conf=args.dnn_conf,
        debug=args.debug
    )

if __name__ == "__main__":
    main()
