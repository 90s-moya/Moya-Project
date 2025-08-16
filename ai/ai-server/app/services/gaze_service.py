# app/services/gaze_service.py
from __future__ import annotations
import sys, os, json, cv2, tempfile
from pathlib import Path
from typing import Optional, Any, Dict, Iterable, List
from app.utils.accelerator import init_runtime

# 런타임/디바이스 초기화(멱등)
init_runtime()

AI_SERVER_ROOT = Path(__file__).resolve().parents[2]
GAZE_DIR = AI_SERVER_ROOT / "Gaze_TR_pro"
sys.path.append(str(GAZE_DIR))

try:
    from gaze_calibration import GazeCalibrator
    from gaze_tracking import GazeTracker
except Exception as e:
    print(f"[gaze] import warning: {e}")
    GazeCalibrator = None
    GazeTracker = None

_calibrator_instance = None
_tracker_instance = None

def get_calibrator(screen_width=1920, screen_height=1080, window_width=1344, window_height=756) -> 'GazeCalibrator':
    global _calibrator_instance
    if _calibrator_instance is None:
        if GazeCalibrator is None:
            raise ImportError("GazeCalibrator not available")
        _calibrator_instance = GazeCalibrator(screen_width, screen_height, window_width, window_height)
    return _calibrator_instance

def get_tracker(screen_width=1920, screen_height=1080, window_width=1344, window_height=756) -> 'GazeTracker':
    global _tracker_instance
    if _tracker_instance is None:
        if GazeTracker is None:
            raise ImportError("GazeTracker not available")
        _tracker_instance = GazeTracker(screen_width, screen_height, window_width, window_height)
    return _tracker_instance

# ---- 프레임 기반 추론 ----
def infer_gaze_frames(
    frames: Iterable, calib_data: Optional[dict] = None
) -> Dict[str, Any]:
    tracker = get_tracker()
    if calib_data:
        tracker.calib_vectors = calib_data.get('calibration_vectors', [])
        tracker.calib_points = calib_data.get('calibration_points', [])
        tracker.transform_matrix = calib_data.get('transform_matrix')
        tracker.transform_method = calib_data.get('transform_method')
    result = tracker.process_frames(list(frames))
    return {"ok": True, "result": result}

# ---- 바이트 기반(호환) : 임시파일→프레임→frames API 호출 ----
def infer_gaze(
    video_bytes: bytes,
    calib_path: Optional[str] = None,
    calib_data: Optional[dict] = None,
    use_localstorage: bool = True
) -> Dict[str, Any]:
    # 캘리브레이션 로딩(필요시)
    if calib_data is None and use_localstorage:
        try:
            frontend_root = AI_SERVER_ROOT.parent / "frontend"
            cand = list(frontend_root.glob("gaze_calibration_data.json")) + list(frontend_root.glob("calibration_data_*.json"))
            if cand:
                with open(max(cand, key=lambda f: f.stat().st_mtime), "r", encoding="utf-8") as f:
                    calib_data = json.load(f)
        except Exception:
            pass
    elif calib_data is None and calib_path:
        try:
            with open(calib_path, "r", encoding="utf-8") as f:
                calib_data = json.load(f)
        except Exception:
            pass

    # bytes → frames
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(video_bytes); tmp_path = tmp.name
    cap = cv2.VideoCapture(tmp_path)
    frames: List = []
    while True:
        ok, frame = cap.read()
        if not ok: break
        frames.append(frame)
    cap.release()
    try: os.remove(tmp_path)
    except Exception: pass

    if not frames:
        return {"ok": False, "error": "no frames"}
    return infer_gaze_frames(frames, calib_data=calib_data)
