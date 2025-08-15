# app/services/analysis_service.py
from datetime import datetime
from typing import Optional, Dict, Any, List

from app.utils.frame_iter import collect_frames_from_bytes
from app.services.face_service import infer_face_frames
from app.services.gaze_service import infer_gaze_frames
from app.utils.posture import analyze_frames

def analyze_all(
    video_bytes: bytes,
    device: str = "cuda",
    stride: int = 5,                 # (현재 프레임 기반에선 미사용, 하위호환용)
    return_points: bool = False,
    calib_data: Optional[dict] = None,
    include_posture: bool = False,   # 필요시 True
) -> Dict[str, Any]:
    """
    1) 비디오 → 30FPS / 960x540 프레임으로 '한 번만' 변환
    2) 그 프레임을 얼굴/시선/자세 모두가 재사용 → CPU 디코딩 스파이크 방지
    """
    frames = collect_frames_from_bytes(
        video_bytes,
        target_fps=30,
        resize_to=(960, 540),
        max_frames=1800,
        bgr=True,
    )

    # 프레임 없으면 바로 리턴
    if not frames:
        return {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "device": device,
            "stride": stride,
            "posture": None,
            "emotion": {"label":"neutral","score":0.0,"probs":{}, "samples":0, "fps":30.0},
            "gaze": {"ok": False, "error": "no frames"},
        }

    # 얼굴 감정
    face = infer_face_frames(frames, device=device, return_points=return_points, fps=30.0)

    # 시선 추적
    gaze = infer_gaze_frames(frames, calib_data=calib_data)

    # 자세 (옵션)
    posture = analyze_frames(frames, sample_every=30) if include_posture else None

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "device": device,
        "stride": stride,
        "posture": posture,
        "emotion": face,
        "gaze": gaze,
    }
