import cv2
import tempfile
import os
from datetime import datetime
from app.utils.posture import analyze_video_bytes
from app.services.gaze_service import infer_gaze
from app.services.face_service import infer_face_video


def preprocess_video_gpu(video_bytes: bytes, target_fps: int = 30, max_frames: int = 1800, resize_to=(960, 540)) -> bytes:
    """GPU(OpenCV CUDA)로 영상 FPS 제한, 해상도 축소, 최대 프레임 제한"""
    
    # 임시 저장 (원본)
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    cap = cv2.VideoCapture(tmp_path)
    if not cap.isOpened():
        raise RuntimeError("비디오 파일을 열 수 없습니다.")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or fps > 240:
        fps = target_fps
    frame_interval = max(1, int(round(fps / target_fps)))

    out_path = tmp_path + "_processed.mp4"
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out_writer = None

    frame_count = 0
    processed_frames = 0

    gpu_frame = cv2.cuda_GpuMat()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % frame_interval == 0:
            # GPU 업로드
            gpu_frame.upload(frame)

            # 리사이즈도 GPU에서 처리
            if resize_to:
                gpu_frame = cv2.cuda.resize(gpu_frame, resize_to)

            # CPU로 다운로드 최소화 (VideoWriter가 CPU 기반이라 필요)
            frame_resized = gpu_frame.download()

            if out_writer is None:
                h, w = frame_resized.shape[:2]
                out_writer = cv2.VideoWriter(out_path, fourcc, target_fps, (w, h))

            out_writer.write(frame_resized)
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


def analyze_all_gpu(
    video_bytes: bytes,
    device: str = "cuda",
    stride: int = 5,
    return_points: bool = False,
    calib_data: dict | None = None,
):
    """Posture + Emotion + Gaze 모두 GPU에서 실행"""
    
    processed_bytes = preprocess_video_gpu(video_bytes, target_fps=30, max_frames=1800, resize_to=(960, 540))

    # Posture 분석 (GPU 지원)
    posture = analyze_video_bytes(processed_bytes, device=device)  # device 추가 필요

    # Emotion 분석 (GPU)
    face = infer_face_video(processed_bytes, device=device, stride=stride, calib_data=None, return_points=return_points)

    # Gaze 분석 (GPU)
    gaze = infer_gaze(processed_bytes, device=device, calib_data=calib_data)

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "device": device,
        "stride": stride,
        "posture": posture,
        "emotion": face,
        "gaze": gaze,
    }
