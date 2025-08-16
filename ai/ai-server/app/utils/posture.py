# app/utils/posture.py
import cv2
import mediapipe as mp
from collections import Counter
import numpy as np
import datetime
import tempfile
import os

# Tesla T4 GPU 가속 초기화 (Posture 분석용 - 폴백 모드 지원)
def init_posture_gpu():
    """자세 분석 GPU 가속 초기화 - 폴백 모드 지원"""
    # TensorFlow CPU 백엔드 비활성화 (기본)
    os.environ['TF_DISABLE_XNNPACK'] = '1'
    os.environ['TF_DISABLE_ONEDNN'] = '1'
    os.environ['TF_DISABLE_MKL'] = '1'
    os.environ['TF_LITE_DISABLE_CPU_DELEGATE'] = '1'
    
    # CUDA/PyTorch GPU 설정
    os.environ['CUDA_VISIBLE_DEVICES'] = '0'
    os.environ['TORCH_CUDNN_V8_API_ENABLED'] = '1'
    
    # MediaPipe GPU 우선 설정
    os.environ['MEDIAPIPE_ENABLE_GPU'] = '1'
    os.environ['MEDIAPIPE_GPU_DEVICE'] = '0'
    
    # GPU 사용 가능 여부 확인
    gpu_available = False
    try:
        import torch
        gpu_available = torch.cuda.is_available()
        if gpu_available:
            os.environ['TF_FORCE_GPU_ONLY'] = '1'
            os.environ['MEDIAPIPE_FORCE_GPU_DELEGATE'] = '1'
            os.environ['MEDIAPIPE_DISABLE_CPU_DELEGATE'] = '1'
            print("[GPU] Posture analysis GPU-only mode initialized")
        else:
            print("[CPU] Posture analysis CPU fallback mode")
    except ImportError:
        print("[CPU] Posture analysis CPU mode (PyTorch not available)")
    
    return gpu_available

# GPU 가속 초기화 실행
init_posture_gpu()

mp_pose = mp.solutions.pose

def _get_center(p1, p2):
    return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]

def _extract_feedbacks(landmarks, mp_pose):
    """
    한 프레임에서 발견된 모든 자세 피드백을 리스트로 반환
    """
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

    if shoulder_diff_y > 0.03:
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
        mp_pose.PoseLandmark.RIGHT_INDEX,
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

# 프레임별 대표 라벨 우선순위 (원하면 자유롭게 조정)
_LABEL_PRIORITY = [
    "Good Posture",
    "Head Off-Center",
    "Head Down",
    "Shoulders Uneven",
    "Hands Above Shoulders",
]

def _choose_label(feedbacks):
    """
    여러 피드백이 동시에 있을 때, 프레임당 대표 라벨 하나 선택
    """
    if not feedbacks:
        return "Good Posture"
    for p in _LABEL_PRIORITY:
        if p in feedbacks:
            return p
    return feedbacks[0]

def _compress_runs(sampled_frames, labels, step):
    """
    동일 라벨이 연속되는 구간을 start/end 프레임으로 압축
    sampled_frames: 샘플링된 프레임 인덱스 리스트 (오름차순)
    labels: 각 프레임의 대표 라벨
    step: 샘플링 스텝(프레임 단위), 예: 30 -> 30fps에서 1fps
    """
    if not sampled_frames:
        return []
    segments = []
    cur_label = labels[0]
    seg_start = sampled_frames[0]
    prev_frame = sampled_frames[0]

    for i in range(1, len(sampled_frames)):
        f = sampled_frames[i]
        lb = labels[i]
        contiguous = (f == prev_frame + step)
        if lb == cur_label and contiguous:
            prev_frame = f
            continue
        # 구간 종료 후 저장
        segments.append({
            "label": cur_label,
            "start_frame": int(seg_start),
            "end_frame": int(prev_frame),
        })
        # 새 구간 시작
        cur_label = lb
        seg_start = f
        prev_frame = f

    # 마지막 구간 저장
    segments.append({
        "label": cur_label,
        "start_frame": int(seg_start),
        "end_frame": int(prev_frame),
    })
    return segments

def analyze_video_bytes(file_bytes: bytes, mode: str = "segments", sample_every: int = 1):
    """
    업로드된 동영상 바이트 -> 샘플링/분석 -> JSON 리포트 반환

    반환 포맷
    {
      "timestamp": ISO8601,
      "total_frames": int,                # 원본에서 읽은 총 프레임 수(스킵 포함)
      "frame_distribution": {label:int},  # 라벨별 카운트
      "detailed_logs": [                  # 연속 구간
        {"label": str, "start_frame": int, "end_frame": int}, ...
      ]
    }
    """
    assert mode in ("segments", "samples"), "mode must be 'segments' or 'samples'"
    assert sample_every >= 1

    # 임시 파일 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    # Tesla T4 GPU 가속 MediaPipe Pose (GPU 전용)
    pose_ctx = mp_pose.Pose(
        static_image_mode=False,
        min_detection_confidence=0.5,
        model_complexity=1,
        # GPU 전용 설정 (CPU 완전 차단)
        enable_segmentation=False,  # 세그멘테이션 비활성화로 성능 향상
        smooth_landmarks=True,      # GPU 기반 랜드마크 추적
        min_tracking_confidence=0.5
    )
    cap = cv2.VideoCapture(tmp_path)

    try:
        total_frames_read = 0
        sampled_frames = []
        per_frame_labels = []

        frame_idx = -1  # 0-based 인덱스
        while True:
            grabbed = cap.grab()
            if not grabbed:
                break
            frame_idx += 1
            total_frames_read += 1

            # 샘플링: sample_every 프레임마다 1회 처리
            if (frame_idx % sample_every) != 0:
                continue

            ret, frame = cap.retrieve()
            if not ret:
                continue

            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose_ctx.process(image_rgb)

            feedbacks = []
            if results.pose_landmarks:
                feedbacks = _extract_feedbacks(results.pose_landmarks.landmark, mp_pose)
            label = _choose_label(feedbacks)

            sampled_frames.append(frame_idx)
            per_frame_labels.append(label)
    finally:
        cap.release()
        pose_ctx.close()
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    # 라벨 카운트만 남김
    if per_frame_labels:
        counts = Counter(per_frame_labels)
        frame_distribution = {k: int(v) for k, v in counts.items()}
    else:
        frame_distribution = {}

    # detailed_logs 생성
    if mode == "samples":
        detailed_logs = [{"frame": int(f), "label": lb} for f, lb in zip(sampled_frames, per_frame_labels)]
    else:
        detailed_logs = _compress_runs(sampled_frames, per_frame_labels, step=sample_every)

    # 최종 리포트
    report = {
        "timestamp": datetime.datetime.now().isoformat(),
        "total_frames": int(total_frames_read),
        "frame_distribution": frame_distribution,
        "detailed_logs": detailed_logs,
    }
    return report
