# app/services/analysis_service.py
from __future__ import annotations
import os
import tempfile
from datetime import datetime
from app.utils.posture import analyze_video_bytes as analyze_posture
from app.services.gaze_service import infer_gaze
from app.services.face_service import infer_face_video

def preprocess_video(video_bytes: bytes, target_fps: int = 30, max_frames: int = 1800, resize_to=(960, 540)) -> bytes:
    """영상 FPS 제한, 해상도 축소, 최대 프레임 제한"""
    import cv2
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    cap = cv2.VideoCapture(tmp_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_interval = max(1, int(fps / target_fps))

    out_path = tmp_path + "_processed.mp4"
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out_writer = None

    frame_count = 0
    processed_frames = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_count % frame_interval == 0:
            if resize_to:
                frame = cv2.resize(frame, resize_to)
            if out_writer is None:
                h, w = frame.shape[:2]
                out_writer = cv2.VideoWriter(out_path, fourcc, target_fps, (w, h))
            out_writer.write(frame)
            processed_frames += 1
            if processed_frames >= max_frames:
                break
        frame_count += 1

    cap.release()
    if out_writer:
        out_writer.release()

    with open(out_path, "rb") as f:
        processed_bytes = f.read()

    os.remove(tmp_path)
    os.remove(out_path)
    return processed_bytes


def analyze_all(video_bytes: bytes, device: str = "cpu", stride: int = 5, return_points: bool = False, calib_data: dict = None):
    """
    posture / face / gaze 분석 직렬 실행 (동일한 video_bytes 사용)
    """
    # 1. 전처리 (공통 영상)
    processed_video = preprocess_video(video_bytes, target_fps=30, max_frames=1800, resize_to=(960, 540))

    # 2. posture 분석
    posture = analyze_posture(processed_video)

    # 3. face 분석
    face = infer_face_video(
        video_bytes=processed_video,
        device=device,
        stride=stride,
        return_points=return_points
    )

    # 4. gaze 분석
    gaze = infer_gaze(
        video_bytes=processed_video,
        calib_data=calib_data
    )

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "device": device,
        "stride": stride,
        "posture": posture,
        "emotion": face,
        "gaze": gaze
    }
