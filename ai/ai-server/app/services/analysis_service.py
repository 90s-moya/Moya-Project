import cv2
import tempfile
import os
from datetime import datetime
from app.utils.posture import analyze_video_bytes
from app.services.gaze_service import infer_gaze
from app.services.face_service import infer_face_video

def preprocess_video(video_bytes: bytes, target_fps: int = 30, max_frames: int = 1800, resize_to=(960, 540)) -> bytes:
    """영상 FPS 제한, 해상도 축소, 최대 프레임 제한 (OpenCV 전용, webm 포함)"""
    
    # 1) 원본을 임시파일로 저장 (webm도 바로 가능)
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    cap = cv2.VideoCapture(tmp_path)

    if not cap.isOpened():
        raise RuntimeError("비디오 파일을 열 수 없습니다 (OpenCV)")

    # 원본 FPS
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or fps > 240:  # FPS 값이 이상하면 기본값 사용
        fps = 30

    frame_interval = max(1, int(round(fps / target_fps)))

    # 출력 mp4 경로 (처리 후 분석용)
    out_path = tmp_path + "_processed.mp4"
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out_writer = None

    frame_count = 0
    processed_frames = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # FPS 다운샘플링
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

    # mp4로 변환된 파일을 bytes로 읽기
    with open(out_path, "rb") as f:
        processed_bytes = f.read()

    # 임시 파일 정리
    os.remove(tmp_path)
    os.remove(out_path)

    return processed_bytes


def analyze_all(
    video_bytes: bytes,
    device: str = "cuda",
    stride: int = 5,
    return_points: bool = False,
    calib_data: dict | None = None,
):
    """하나의 업로드 영상으로 Posture + Emotion + Gaze 동시 실행"""

    # webm → mp4 변환 포함 전처리
    processed_bytes = preprocess_video(video_bytes, target_fps=30, max_frames=1800, resize_to=(320, 240))

    # 1) Posture 분석
    posture = analyze_video_bytes(processed_bytes)

    # 2) Emotion 분석
    face = infer_face_video(processed_bytes, device, stride, None, return_points)

    # 3) Gaze 분석
    gaze = infer_gaze(processed_bytes, calib_data=calib_data)

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "device": device,
        "stride": stride,
        "posture": posture,
        "emotion": face,
        "gaze": gaze,
    }
