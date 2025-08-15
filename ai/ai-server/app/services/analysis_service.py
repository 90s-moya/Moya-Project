# app/services/analysis_service.py (예시)
import cv2, tempfile, os, torch, torch.nn.functional as F
from datetime import datetime
from app.services.gaze_service import infer_gaze
from app.services.face_service import infer_face_video

def preprocess_video_torch(video_bytes: bytes, target_fps=30, max_frames=1800, resize_to=(960,540)) -> bytes:
    cv2.setNumThreads(1)

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(video_bytes); tmp_path = tmp.name

    cap = cv2.VideoCapture(tmp_path)
    if not cap.isOpened():
        raise RuntimeError("비디오 파일을 열 수 없습니다.")
    src_fps = cap.get(cv2.CAP_PROP_FPS) or target_fps
    if src_fps <= 0 or src_fps > 240: src_fps = target_fps
    frame_interval = max(1, int(round(src_fps/target_fps)))

    out_path = tmp_path + "_processed.mp4"
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out_writer = None

    dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    processed, count = 0, 0

    try:
        while True:
            ret, bgr = cap.read()
            if not ret: break
            if count % frame_interval == 0:
                rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
                t = torch.from_numpy(rgb).to(dev, non_blocking=True)          # HWC uint8
                t = t.permute(2,0,1).unsqueeze(0).float()/255.0               # 1,3,H,W
                if resize_to:
                    t = F.interpolate(t, size=(resize_to[1], resize_to[0]), mode="bilinear", align_corners=False)
                out_np = (t.squeeze(0).clamp(0,1)*255).byte().permute(1,2,0).cpu().numpy()
                out_bgr = cv2.cvtColor(out_np, cv2.COLOR_RGB2BGR)
                if out_writer is None:
                    h,w = out_bgr.shape[:2]
                    out_writer = cv2.VideoWriter(out_path, fourcc, target_fps, (w,h))
                out_writer.write(out_bgr)
                processed += 1
                if processed >= max_frames: break
            count += 1
    finally:
        cap.release()
        if out_writer: out_writer.release()

    with open(out_path, "rb") as f:
        data = f.read()
    os.remove(tmp_path); os.remove(out_path)
    return data

def analyze_all(video_bytes: bytes, device: str="cuda", stride: int=5, return_points: bool=False, calib_data: dict|None=None):
    processed_bytes = preprocess_video_torch(video_bytes, target_fps=30, max_frames=1800, resize_to=(960,540))
    # posture = None  # 임시 비활성화 (원인 분리)
    face = infer_face_video(processed_bytes, device=device, stride=stride, max_frames=None, return_points=return_points)
    gaze = infer_gaze(processed_bytes, calib_data=calib_data)
    return {
        "timestamp": datetime.utcnow().isoformat()+"Z",
        "device": device,
        "stride": stride,
        "posture": None,
        "emotion": face,
        "gaze": gaze,
    }
