# app/utils/posture.py
from __future__ import annotations
import cv2
import mediapipe as mp
from collections import Counter
import numpy as np
import datetime
import tempfile
import os
from typing import Iterable, List, Dict, Any, Optional

mp_pose = mp.solutions.pose

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

def analyze_video_frames(
    frames: Iterable[np.ndarray],
    mode: str = "segments",
    sample_every: int = 1,
    analyzed_fps: float | None = 15.0,
    reported_fps: int | None = 30
) -> Dict[str, Any]:
    assert mode in ("segments","samples")
    assert sample_every >= 1
    pose_ctx = mp_pose.Pose(
        static_image_mode=False, min_detection_confidence=0.5, model_complexity=0,
        enable_segmentation=False, smooth_landmarks=True, min_tracking_confidence=0.5
    )
    try:
        total_frames_read = 0
        sampled_frames: List[int] = []
        per_frame_labels: List[str] = []
        for i, bgr in enumerate(frames):
            total_frames_read += 1
            if (i % sample_every) != 0:
                continue
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            results = pose_ctx.process(rgb)
            feedbacks = []
            if results.pose_landmarks:
                feedbacks = _extract_feedbacks(results.pose_landmarks.landmark, mp_pose)
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
        }
    }
    if detailed_logs_frames_reported is not None:
        report["detailed_logs_frames_reported"] = detailed_logs_frames_reported
        report["total_frames_reported"] = total_frames_reported
    return report

# ====== 기존 analyze_video_bytes는 호환용으로 유지 ======
def analyze_video_bytes(
    file_bytes: bytes,
    mode: str = "segments",
    sample_every: int = 1,
    analyzed_fps: float | None = None,
    reported_fps: int | None = None
):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    cap = cv2.VideoCapture(tmp_path)
    frames = []
    while True:
        ok, frame = cap.read()
        if not ok: break
        frames.append(frame)
    cap.release()
    try: os.remove(tmp_path)
    except Exception: pass
    # analyzed_fps가 없으면 VideoCapture 추정값 사용(대략)
    if analyzed_fps is None:
        analyzed_fps = 15.0
    return analyze_video_frames(frames, mode=mode, sample_every=sample_every,
                                analyzed_fps=analyzed_fps, reported_fps=reported_fps or 30)
