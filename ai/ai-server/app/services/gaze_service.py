# app/services/gaze_service.py
from __future__ import annotations
import sys, os, json, tempfile
from pathlib import Path
from typing import Optional, Dict, Any, List

import cv2

# === Gaze_TR_pro 경로 등록 ===
AI_SERVER_ROOT = Path(__file__).resolve().parents[2]
GAZE_DIR = AI_SERVER_ROOT / "Gaze_TR_pro"
sys.path.append(str(GAZE_DIR))

# Gaze 모듈 로드
try:
    from gaze_calibration import GazeCalibrator  # 캘리브레이션 유틸(프로젝트 쪽 모듈)
    from gaze_tracking import GazeTracker        # 실제 추적기(프로젝트 쪽 모듈)
except Exception as e:
    # 임포트 실패 시, 라우터가 명확히 알 수 있도록 즉시 예외 발생
    raise ImportError(f"Gaze modules import failed: {e}")

# === 전역 싱글톤 ===
_calibrator_instance: GazeCalibrator | None = None
_tracker_instance: GazeTracker | None = None


def get_calibrator(
    screen_width: int = 1920,
    screen_height: int = 1080,
    window_width: int = 1344,
    window_height: int = 756,
) -> GazeCalibrator:
    global _calibrator_instance
    if _calibrator_instance is None:
        _calibrator_instance = GazeCalibrator(screen_width, screen_height, window_width, window_height)
    return _calibrator_instance


def get_tracker(
    screen_width: int = 1920,
    screen_height: int = 1080,
    window_width: int = 1344,
    window_height: int = 756,
) -> GazeTracker:
    global _tracker_instance
    if _tracker_instance is None:
        _tracker_instance = GazeTracker(screen_width, screen_height, window_width, window_height)
    return _tracker_instance


# ========== 캘리브레이션 API (routes.py가 호출) ==========
def start_calibration(screen_width=1920, screen_height=1080, window_width=1344, window_height=756) -> Dict[str, Any]:
    c = get_calibrator(screen_width, screen_height, window_width, window_height)
    return {"status": "success", "message": "Calibration initialized", "targets": c.calib_targets}

def add_calibration_point(gaze_vector: list, target_point: tuple) -> Dict[str, Any]:
    c = get_calibrator()
    c.add_calibration_point(gaze_vector, target_point)
    return {"status": "success", "total_points": len(c.calib_points)}

def run_calibration(mode: str = "quick") -> Dict[str, Any]:
    c = get_calibrator()
    result = c.run_calibration(mode=mode)
    return {"status": "success", "calibration_result": result}

def save_calibration(filename: Optional[str] = None) -> Dict[str, Any]:
    c = get_calibrator()
    path = c.save_calibration_data(filename)
    return {"status": "success", "filepath": path}

def list_calibrations() -> Dict[str, Any]:
    calib_dir = GAZE_DIR / "calibration_data"
    if not calib_dir.exists():
        return {"status": "success", "calibrations": []}
    items = []
    for f in calib_dir.glob("*.json"):
        items.append({"filename": f.name, "filepath": str(f), "created": f.stat().st_mtime})
    return {"status": "success", "calibrations": items}

def load_calibration_for_tracking(calib_path: Optional[str] = None, calib_data: Optional[dict] = None) -> Dict[str, Any]:
    t = get_tracker()
    if calib_data is None:
        if not calib_path:
            return {"status": "error", "message": "No calibration data or path provided"}
        with open(calib_path, "r", encoding="utf-8") as f:
            calib_data = json.load(f)

    # GazeTracker가 기대하는 필드들 주입
    t.calib_vectors = calib_data.get("calibration_vectors", [])
    t.calib_points = calib_data.get("calibration_points", [])
    t.transform_matrix = calib_data.get("transform_matrix")
    t.transform_method = calib_data.get("transform_method")
    return {"status": "success", "message": "Calibration loaded for tracking"}


# ========== 프레임 추출 유틸 ==========
def _extract_frames_from_video_bytes(
    video_bytes: bytes,
    target_fps: int = 30,
    resize_to: tuple[int, int] | None = (1344, 756),  # GazeTracker 윈도우 크기와 맞춤
    max_frames: int = 1800,
) -> List:
    """webm/mp4 바이트 → 프레임 배열(BGR). FFmpeg 없는 환경에서도 동작."""
    # 임시 파일로 저장 (확장자는 크게 중요치 않음)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    frames: List = []
    try:
        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise RuntimeError("Cannot open video for frame extraction")

        src_fps = cap.get(cv2.CAP_PROP_FPS) or target_fps
        if src_fps <= 0 or src_fps > 240:
            src_fps = target_fps
        step = max(1, int(round(src_fps / target_fps)))

        idx = -1
        taken = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            idx += 1
            if idx % step != 0:
                continue

            if resize_to:
                frame = cv2.resize(frame, resize_to)  # BGR 유지

            frames.append(frame)
            taken += 1
            if taken >= max_frames:
                break
    finally:
        try:
            cap.release()
        except Exception:
            pass
        try:
            os.remove(tmp_path)
        except Exception:
            pass

    return frames


# ========== 핵심: infer_gaze (routes.py가 임포트) ==========
def infer_gaze_frame(
    video_bytes: bytes,
    calib_path: Optional[str] = None,
    calib_data: Optional[dict] = None,
    use_localstorage: bool = True,
) -> Dict[str, Any]:
    """
    업로드된 비디오 바이트에서 프레임을 뽑아 GazeTracker.process_frames로 추적.
    routes.py가 이 심볼을 import 하므로 반드시 존재해야 함.
    """
    # 트래커 준비
    tracker = get_tracker()

    # 캘리브레이션 주입
    if calib_data is not None:
        load_calibration_for_tracking(calib_data=calib_data)
    elif calib_path:
        load_calibration_for_tracking(calib_path=calib_path)
    elif use_localstorage:
        # 프로젝트 루트(frontend)에서 자동 탐색
        try:
            frontend_root = (AI_SERVER_ROOT.parent / "frontend")
            candidates = []
            for name in ("gaze_calibration_data.json",):
                p = frontend_root / name
                if p.exists():
                    candidates.append(p)
            # 패턴 탐색
            candidates += list(frontend_root.glob("calibration_data_*.json"))
            if candidates:
                latest = max(candidates, key=lambda p: p.stat().st_mtime)
                load_calibration_for_tracking(calib_path=str(latest))
        except Exception:
            pass  # 캘리브 없으면 기본 매핑으로 진행

    # 프레임 추출
    frames = _extract_frames_from_video_bytes(
        video_bytes,
        target_fps=30,
        resize_to=(tracker.WINDOW_WIDTH, tracker.WINDOW_HEIGHT),
        max_frames=1800,
    )
    if not frames:
        return {"ok": False, "error": "No frames extracted from video"}

    # 추적 실행
    result = tracker.process_frames(frames)
    # tracker.process_frames는 dict를 반환하도록 작성되어 있음
    # 라우터 일관성 위해 ok/status 키 정리
    if isinstance(result, dict):
        return {"ok": bool(result.get("success", True)), "result": result}
    return {"ok": True, "result": result}
