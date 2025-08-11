# app/utils/posture.py
import cv2
import mediapipe as mp
from collections import Counter
import numpy as np
import datetime
import tempfile
import os

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

    if shoulder_diff_y > 0.02:
        feedbacks.append("Shoulders Uneven")
    if head_down_ratio > 0.07:
        feedbacks.append("Head Down")
    if off_center_ratio > 0.05:
        feedbacks.append("Head Off-Center")

    upper_parts = [
        mp_pose.PoseLandmark.LEFT_ELBOW,
        mp_pose.PoseLandmark.RIGHT_ELBOW,
        mp_pose.PoseLandmark.LEFT_WRIST,
        mp_pose.PoseLandmark.RIGHT_WRIST,
        mp_pose.PoseLandmark.LEFT_INDEX,
        mp_pose.PoseLandmark.RIGHT_INDEX
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

def analyze_video_bytes(file_bytes: bytes):
    """업로드된 동영상 바이트 -> 프레임 반복 분석 -> JSON 리포트 반환"""
    # 임시 파일에 저장 후 OpenCV로 읽기
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    posture_logs = []
    frame_count = 0

    pose = mp_pose.Pose(static_image_mode=False,
                        min_detection_confidence=0.5,
                        model_complexity=1)
    cap = cv2.VideoCapture(tmp_path)
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1
            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(image_rgb)

            feedbacks = []
            if results.pose_landmarks:
                feedbacks = _extract_feedbacks(results.pose_landmarks.landmark, mp_pose)
            posture_logs.append(feedbacks)
    finally:
        cap.release()
        pose.close()
        os.remove(tmp_path)

    # 요약 생성
    if posture_logs:
        all_feedbacks = [f for frame_fbs in posture_logs for f in frame_fbs]
        count = Counter(all_feedbacks)
        total_frames = len(posture_logs)
        summary = {
            fb: {
                "frames": count[fb],
                "ratio": round((count[fb] / total_frames) * 100, 1)
            } for fb in count
        }
        report = {
            "timestamp": datetime.datetime.now().isoformat(),
            "total_frames": total_frames,
            "summary": summary,
            "detailed_logs": posture_logs
        }
        return report
    else:
        return {
            "timestamp": datetime.datetime.now().isoformat(),
            "total_frames": 0,
            "summary": {},
            "detailed_logs": []
        }
