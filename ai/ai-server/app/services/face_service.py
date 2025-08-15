# app/utils/posture.py
import cv2
import mediapipe as mp
from collections import Counter
import numpy as np
import datetime
import tempfile
import os
from typing import List, Dict, Any

mp_pose = mp.solutions.pose

def _get_center(p1, p2): return [(p1[0]+p2[0])/2, (p1[1]+p2[1])/2]

def _extract_feedbacks(landmarks, mp_pose):
    def get_xy(idx):
        lm = landmarks[idx]; return [lm.x, lm.y]
    feedbacks = []
    r_sh = get_xy(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
    l_sh = get_xy(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
    nose = get_xy(mp_pose.PoseLandmark.NOSE.value)
    r_eye = get_xy(mp_pose.PoseLandmark.RIGHT_EYE.value)
    l_eye = get_xy(mp_pose.PoseLandmark.LEFT_EYE.value)
    shoulder_center = _get_center(r_sh, l_sh)
    eye_center = _get_center(r_eye, l_eye)
    if abs(r_sh[1]-l_sh[1]) > 0.03: feedbacks.append("Shoulders Uneven")
    if abs(nose[1]-eye_center[1]) > 0.07: feedbacks.append("Head Down")
    if abs(nose[0]-shoulder_center[0]) > 0.05: feedbacks.append("Head Off-Center")
    upper = [mp_pose.PoseLandmark.LEFT_ELBOW, mp_pose.PoseLandmark.RIGHT_ELBOW,
             mp_pose.PoseLandmark.LEFT_WRIST, mp_pose.PoseLandmark.RIGHT_WRIST,
             mp_pose.PoseLandmark.LEFT_INDEX, mp_pose.PoseLandmark.RIGHT_INDEX]
    sh_y = shoulder_center[1]
    for p in upper:
        if landmarks[p.value].y < sh_y:
            feedbacks.append("Hands Above Shoulders")
            break
    if not feedbacks: feedbacks.append("Good Posture")
    return feedbacks

_LABEL_PRIORITY = ["Good Posture","Head Off-Center","Head Down","Shoulders Uneven","Hands Above Shoulders"]

def _choose_label(feedbacks):
    if not feedbacks: return "Good Posture"
    for p in _LABEL_PRIORITY:
        if p in feedbacks: return p
    return feedbacks[0]

def _compress_runs(sampled_frames, labels, step):
    if not sampled_frames: return []
    segs = []
    cur = labels[0]; s = sampled_frames[0]; prev = sampled_frames[0]
    for i in range(1, len(sampled_frames)):
        f, lb = sampled_frames[i], labels[i]
        contiguous = (f == prev + step)
        if lb == cur and contiguous:
            prev = f; continue
        segs.append({"label": cur, "start_frame": int(s), "end_frame": int(prev)})
        cur, s, prev = lb, f, f
    segs.append({"label": cur, "start_frame": int(s), "end_frame": int(prev)})
    return segs

def analyze_frames(frames_bgr: List["np.ndarray"], sample_every: int = 30) -> Dict[str, Any]:
    """
    프레임 배열 기반 자세 분석 (30fps라면 sample_every=30 => 1fps 평가)
    """
    pose_ctx = mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, model_complexity=1)
    try:
        sampled_frames, per_labels = [], []
        for idx, frame in enumerate(frames_bgr):
            if (idx % sample_every) != 0:
                continue
            img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = pose_ctx.process(img_rgb)
            feedbacks = _extract_feedbacks(res.pose_landmarks.landmark, mp_pose) if res.pose_landmarks else []
            per_labels.append(_choose_label(feedbacks))
            sampled_frames.append(idx)
    finally:
        pose_ctx.close()

    counts = Counter(per_labels) if per_labels else {}
    dist = {k: int(v) for k, v in counts.items()}
    detailed = _compress_runs(sampled_frames, per_labels, step=sample_every)

    return {
        "timestamp": datetime.datetime.now().isoformat(),
        "total_frames": int(len(frames_bgr)),
        "frame_distribution": dist,
        "detailed_logs": detailed,
    }

# 기존 analyze_video_bytes는 남겨두되 내부에서 frames로 위임해도 됨 (원한다면).
