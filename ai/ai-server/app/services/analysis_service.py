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
):
    """하나의 업로드 영상으로 Posture + Emotion + Gaze 동시 실행"""
    # 1) Posture 분석
    posture = analyze_video_bytes(video_bytes)

    # 2) Emotion 분석
    face = infer_face_video(video_bytes, device, stride, None, return_points)

    # 3) Gaze 분석
    gaze = infer_gaze(video_bytes)

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "device": device,
        "stride": stride,
        "posture": posture,   # 자세 리포트 (요약/로그)
        "emotion": face,      # dominant + distribution (+ timeline)
        "gaze": gaze,         # 시선 추적 결과
    }

