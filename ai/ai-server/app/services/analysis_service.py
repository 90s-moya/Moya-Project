import cv2
import tempfile
import os
from datetime import datetime
from app.utils.posture import analyze_video_bytes
from app.services.gaze_service import infer_gaze
from app.services.face_service import infer_face_video
import torch
import torch.nn.functional as F



def preprocess_video_gpu(video_bytes: bytes, target_fps: int = 30, max_frames: int = 1800, resize_to=(960, 540), device: str = "cuda") -> bytes:
    """CUDA OpenCV 없이도 GPU(Torch)로 리사이즈/전처리 가속"""

    # CPU 스파이크 완화
    cv2.setNumThreads(1)

    # 원본 저장
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

    dev = torch.device("cuda" if (device == "cuda" and torch.cuda.is_available()) else "cpu")

    frame_count = 0
    processed_frames = 0

    try:
        while True:
            ret, frame_bgr = cap.read()
            if not ret:
                break

            if frame_count % frame_interval == 0:
                # BGR -> RGB -> torch tensor (H,W,3) -> (1,3,H,W)
                rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                t = torch.from_numpy(rgb).to(dev, non_blocking=True)       # uint8
                t = t.permute(2, 0, 1).unsqueeze(0).float() / 255.0        # 1,3,H,W float32

                if resize_to:
                    # resize_to=(W,H) 이므로 torch는 (H,W)로 전달
                    t = F.interpolate(t, size=(resize_to[1], resize_to[0]), mode="bilinear", align_corners=False)

                # back to uint8 CPU
                out_np = (t.squeeze(0).clamp(0, 1) * 255.0).byte().permute(1, 2, 0).to("cpu").numpy()
                out_bgr = cv2.cvtColor(out_np, cv2.COLOR_RGB2BGR)

                if out_writer is None:
                    h, w = out_bgr.shape[:2]
                    out_writer = cv2.VideoWriter(out_path, fourcc, target_fps, (w, h))

                out_writer.write(out_bgr)
                processed_frames += 1
                if processed_frames >= max_frames:
                    break

            frame_count += 1
    finally:
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
