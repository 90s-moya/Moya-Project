from __future__ import annotations
# ===== CPU 사용 최소화를 위한 환경변수 (반드시 mediapipe 임포트 전) =====
import os
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
# TFLite/XNNPACK 멀티스레딩 억제 → CPU 사용량↓ (느려질 수 있음)
os.environ.setdefault("TF_NUM_INTRAOP_THREADS", "1")
os.environ.setdefault("TF_NUM_INTEROP_THREADS", "1")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("TF_LITE_DISABLE_XNNPACK", "1")   # 중요: XNNPACK CPU delegate 끄기
# XNNPACK이 내부적으로 쓰는 pthreadpool도 제한 (가능한 경우에만)
os.environ.setdefault("PTHREADPOOL_THREADS", "1")

import cv2
try:
    # OpenCV 자체 스레드도 차단
    cv2.setNumThreads(0)
except Exception:
    pass

import mediapipe as mp
from collections import Counter
import numpy as np
import datetime
import tempfile
from typing import Iterable, List, Dict, Any, Optional

mp_pose = mp.solutions.pose

# ----- 유틸 -----
def _get_center(p1, p2):
    return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]

def _extract_feedbacks(landmarks, mp_pose):
    def get_xy(idx):
        lm = landmarks[idx]
        return [lm.x, lm.y]
    feedbacks = []
    r_shoulder = get_xy(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
    l_shoulder = get_xy(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
    nose = get_xy(mp_pose.PoseLandmark.NOSE.value)
    r_eye = get_xy(mp_pose.PoseLandmark.RIGHT_EYE.value)
    l_eye = get_xy(mp_pose.PoseLandmark.LEFT_EYE.value)

    shoulder_center = _get_center(r_shoulder, l_shoulder)
    eye_center = _get_center(r_eye, l_eye)

    shoulder_diff_y = abs(r_shoulder[1] - l_shoulder[1])
    head_down_ratio = abs(nose[1] - eye_center[1])
    off_center_ratio = abs(nose[0] - shoulder_center[0])

    if shoulder_diff_y > 0.03: feedbacks.append("Shoulders Uneven")
    if head_down_ratio > 0.07: feedbacks.append("Head Down")
    if off_center_ratio > 0.05: feedbacks.append("Head Off-Center")

    upper_parts = [
        mp_pose.PoseLandmark.LEFT_ELBOW, mp_pose.PoseLandmark.RIGHT_ELBOW,
        mp_pose.PoseLandmark.LEFT_WRIST, mp_pose.PoseLandmark.RIGHT_WRIST,
        mp_pose.PoseLandmark.LEFT_INDEX, mp_pose.PoseLandmark.RIGHT_INDEX,
    ]
    shoulder_y = shoulder_center[1]
    for part in upper_parts:
        part_y = landmarks[part.value].y
        if part_y < shoulder_y:
            feedbacks.append("Hands Above Shoulders")
            break

    if not feedbacks:
        feedbacks.append("Good Posture")
    return feedbacks

_LABEL_PRIORITY = [
    "Good Posture","Head Off-Center","Head Down","Shoulders Uneven","Hands Above Shoulders",
]

def _choose_label(feedbacks):
    if not feedbacks: return "Good Posture"
    for p in _LABEL_PRIORITY:
        if p in feedbacks: return p
    return feedbacks[0]

def _compress_runs(sampled_frames, labels, step):
    if not sampled_frames: return []
    segments = []
    cur_label = labels[0]
    seg_start = sampled_frames[0]
    prev_frame = sampled_frames[0]
    for i in range(1, len(sampled_frames)):
        f = sampled_frames[i]; lb = labels[i]
        contiguous = (f == prev_frame + step)
        if lb == cur_label and contiguous:
            prev_frame = f; continue
        segments.append({"label": cur_label, "start_frame": int(seg_start), "end_frame": int(prev_frame)})
        cur_label = lb; seg_start = f; prev_frame = f
    segments.append({"label": cur_label, "start_frame": int(seg_start), "end_frame": int(prev_frame)})
    return segments

def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except Exception:
        return default

# ----- 메인 -----
def analyze_video_frames(
    frames: Iterable[np.ndarray],
    mode: str = "segments",
    sample_every: int = None,                 # ← None면 env 또는 1
    analyzed_fps: float | None = 15.0,
    reported_fps: int | None = 30,
    input_is_rgb: bool = True                 # frames 경로는 RGB, bytes 경로는 BGR
) -> Dict[str, Any]:
    """
    - CPU 사용 최소화를 위해 XNNPACK 비활성화 및 스레드 1로 고정.
    - frames 경로일 때는 input_is_rgb=True로 전달하여 추가 변환을 피함.
    - sample_every는 환경변수 POSTURE_SAMPLE_EVERY로도 제어 가능(기본 1).
    """
    assert mode in ("segments","samples")
    # 샘플링 주기: env가 우선
    if sample_every is None:
        sample_every = _env_int("POSTURE_SAMPLE_EVERY", 1)
    sample_every = max(1, int(sample_every))

    # 가장 가벼운 설정 (CPU↓)
    pose_ctx = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=0,
        enable_segmentation=False,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    try:
        total_frames_read = 0
        sampled_frames: List[int] = []
        per_frame_labels: List[str] = []

        for i, frame in enumerate(frames):
            total_frames_read += 1
            if (i % sample_every) != 0:
                continue

            # frames 경로: 이미 RGB. bytes 경로: BGR → RGB 변환 필요.
            if input_is_rgb:
                rgb = frame
            else:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            results = pose_ctx.process(rgb)
            if results.pose_landmarks:
                feedbacks = _extract_feedbacks(results.pose_landmarks.landmark, mp_pose)
            else:
                feedbacks = []

            label = _choose_label(feedbacks)
            sampled_frames.append(i)
            per_frame_labels.append(label)
    finally:
        pose_ctx.close()

    frame_distribution = {k: int(v) for k, v in Counter(per_frame_labels).items()} if per_frame_labels else {}

    if mode == "samples":
        detailed_logs = [{"frame": int(f), "label": lb} for f, lb in zip(sampled_frames, per_frame_labels)]
    else:
        detailed_logs = _compress_runs(sampled_frames, per_frame_labels, step=sample_every)

    def _f2s(fr): return fr / float(analyzed_fps or 15.0)
    def _f_report(fr):
        if not reported_fps: return int(fr)
        return int(round(_f2s(fr) * reported_fps))

    if mode == "samples":
        detailed_logs_seconds = [{"time_s": _f2s(f), "label": lb} for f, lb in zip(sampled_frames, per_frame_labels)]
    else:
        detailed_logs_seconds = [{
            "label": seg["label"], "start_s": _f2s(seg["start_frame"]), "end_s": _f2s(seg["end_frame"])
        } for seg in detailed_logs]

    detailed_logs_frames_reported = None
    total_seconds = None
    total_frames_reported = None
    if analyzed_fps:
        total_seconds = total_frames_read / float(analyzed_fps)
        if reported_fps:
            detailed_logs_frames_reported = [{
                "label": seg["label"],
                "start_frame": _f_report(seg["start_frame"]),
                "end_frame": _f_report(seg["end_frame"]),
            } for seg in (detailed_logs if mode=="segments" else [])]
            total_frames_reported = int(round(total_seconds * reported_fps))

    report = {
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "total_frames": int(total_frames_read),
        "frame_distribution": frame_distribution,
        "detailed_logs": detailed_logs,
        "detailed_logs_seconds": detailed_logs_seconds,
        "meta": {
            "analyzed_fps": float(analyzed_fps or 15.0),
            "reported_fps": int(reported_fps or (analyzed_fps or 15.0)),
            "sample_every": int(sample_every),
            "duration_s": float(total_seconds) if total_seconds is not None else None,
            "xnnpack_disabled": os.getenv("TF_LITE_DISABLE_XNNPACK") == "1",
            "cv2_threads": 0,
        }
    }
    if detailed_logs_frames_reported is not None:
        report["detailed_logs_frames_reported"] = detailed_logs_frames_reported
        report["total_frames_reported"] = total_frames_reported
    return report


# ====== bytes 경로(호환) — 이 경로는 프레임이 BGR라 input_is_rgb=False ======
def analyze_video_bytes(
    file_bytes: bytes,
    mode: str = "segments",
    sample_every: int | None = None,
    analyzed_fps: float | None = None,
    reported_fps: int | None = None
):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    cap = cv2.VideoCapture(tmp_path)

    # 스트리밍 처리(리스트로 전부 안 올림 → 메모리↓)
    def _gen():
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            yield frame  # BGR

    # analyzed_fps가 없으면 보수적으로 15.0
    if analyzed_fps is None:
        analyzed_fps = 15.0

    try:
        return analyze_video_frames(
            _gen(),
            mode=mode,
            sample_every=sample_every,
            analyzed_fps=analyzed_fps,
            reported_fps=reported_fps or 30,
            input_is_rgb=False,  # bytes 경로는 BGR
        )
    finally:
        cap.release()
        try: os.remove(tmp_path)
        except Exception: pass
