# app/services/analysis_service.py
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from app.utils.posture import analyze_video_bytes
# from app.services.gaze_service import infer_gaze  # 추후 복구
from app.services.face_service import infer_face_video

def analyze_all(
    video_bytes: bytes,
    device: str = "cpu",
    stride: int = 5,
    return_points: bool = False,
):
    """하나의 업로드 영상으로 Posture + Emotion 동시 실행"""
    with ThreadPoolExecutor(max_workers=2) as ex:
        f_posture = ex.submit(analyze_video_bytes, video_bytes)
        f_face    = ex.submit(infer_face_video, video_bytes, device, stride, None, return_points)

        posture = f_posture.result()
        face    = f_face.result()

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "device": device,
        "stride": stride,
        "posture": posture,   # 자세 리포트 (요약/로그)
        "emotion": face,      # dominant + distribution (+ timeline)
    }

# === (참고) 3개 동시 버전: 게이즈 복구 시 주석 해제 ===
# def analyze_all(video_bytes: bytes, device: str = "cpu", stride: int = 5, return_points: bool = False):
#     with ThreadPoolExecutor(max_workers=3) as ex:
#         f_posture = ex.submit(analyze_video_bytes, video_bytes)
#         f_gaze    = ex.submit(infer_gaze, video_bytes, device, stride, None, return_points)
#         f_face    = ex.submit(infer_face_video, video_bytes, device, stride, None, return_points)
#         return {
#             "timestamp": datetime.utcnow().isoformat() + "Z",
#             "device": device,
#             "stride": stride,
#             "posture": f_posture.result(),
#             "gaze": f_gaze.result(),
#             "emotion": f_face.result(),
#         }
