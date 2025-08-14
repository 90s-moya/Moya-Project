# app/services/analysis_service.py
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from app.utils.posture import analyze_video_bytes
from app.services.gaze_service import infer_gaze ## 추후 gaze 관련 복구 바랍니다.
from app.services.face_service import infer_face_video

def analyze_all(
    video_bytes: bytes,
    device: str = "cpu",
    stride: int = 5,
    return_points: bool = False,
    calib_data: dict = None,
):
    """하나의 업로드 영상으로 Posture + Emotion + Gaze 동시 실행"""
    with ThreadPoolExecutor(max_workers=3) as ex:
        f_posture = ex.submit(analyze_video_bytes, video_bytes)
        f_face    = ex.submit(infer_face_video, video_bytes, device, stride, None, return_points)
        f_gaze    = ex.submit(infer_gaze, video_bytes, calib_data=calib_data)

        posture = f_posture.result()
        face    = f_face.result()
        gaze    = f_gaze.result()

    print(f"[DEBUG] analyze_all results:")
    print(f"[DEBUG] posture type: {type(posture)}")
    print(f"[DEBUG] face type: {type(face)}")
    print(f"[DEBUG] gaze type: {type(gaze)}")
    print(f"[DEBUG] gaze content: {gaze}")

    result = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "device": device,
        "stride": stride,
        "posture": posture,   # 자세 리포트 (요약/로그)
        "emotion": face,      # dominant + distribution (+ timeline)
        "gaze": gaze,         # 시선 추적 결과
    }
    
    print(f"[DEBUG] Final analyze_all result: {result}")
    return result

