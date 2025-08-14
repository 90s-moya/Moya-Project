# app/services/gaze_service.py
from __future__ import annotations

import sys
import io
import os
import tempfile
import json
from pathlib import Path
from functools import lru_cache
from typing import Optional, Any, Dict


# === Gaze_TR_pro 경로 등록 ===
# gaze_service.py는 ai-server/app/services/ 에 있고
# Gaze_TR_pro는 ai-server/Gaze_TR_pro/ 에 있음
# 따라서 parents[2]로 ai-server 디렉토리로 이동한 후 Gaze_TR_pro 찾기
AI_SERVER_ROOT = Path(__file__).resolve().parents[2]  # ai-server 디렉토리
GAZE_DIR = AI_SERVER_ROOT / "Gaze_TR_pro"
sys.path.append(str(GAZE_DIR))

# 캘리브레이션과 시선 추적 모듈 직접 임포트
try:
    from gaze_calibration import GazeCalibrator
    from gaze_tracking import GazeTracker
except ImportError as e:
    print(f"Warning: Could not import gaze modules: {e}")
    GazeCalibrator = None
    GazeTracker = None


# 전역 캘리브레이터와 트래커 인스턴스
_calibrator_instance = None
_tracker_instance = None


def get_calibrator(screen_width=1920, screen_height=1080, window_width=1344, window_height=756) -> 'GazeCalibrator':
    """캘리브레이터 인스턴스 획득 (싱글톤)"""
    global _calibrator_instance
    if _calibrator_instance is None:
        if GazeCalibrator is None:
            raise ImportError("GazeCalibrator not available")
        _calibrator_instance = GazeCalibrator(screen_width, screen_height, window_width, window_height)
    return _calibrator_instance


def get_tracker(screen_width=1920, screen_height=1080, window_width=1344, window_height=756) -> 'GazeTracker':
    """트래커 인스턴스 획득 (싱글톤)"""
    global _tracker_instance
    if _tracker_instance is None:
        if GazeTracker is None:
            raise ImportError("GazeTracker not available")
        _tracker_instance = GazeTracker(screen_width, screen_height, window_width, window_height)
    return _tracker_instance


# === 캘리브레이션 관련 함수들 ===
def start_calibration(screen_width=1920, screen_height=1080, window_width=1344, window_height=756) -> Dict[str, Any]:
    """캘리브레이션 시작"""
    try:
        calibrator = get_calibrator(screen_width, screen_height, window_width, window_height)
        return {
            "status": "success",
            "message": "Calibration initialized",
            "targets": calibrator.calib_targets
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


def add_calibration_point(gaze_vector: list, target_point: tuple) -> Dict[str, Any]:
    """캘리브레이션 포인트 추가"""
    try:
        calibrator = get_calibrator()
        calibrator.add_calibration_point(gaze_vector, target_point)
        return {
            "status": "success", 
            "message": f"Added calibration point: {target_point}",
            "total_points": len(calibrator.calib_points)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


def run_calibration(mode="quick") -> Dict[str, Any]:
    """캘리브레이션 실행"""
    try:
        calibrator = get_calibrator()
        result = calibrator.run_calibration(mode=mode)
        return {"status": "success", "calibration_result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def save_calibration(filename: Optional[str] = None) -> Dict[str, Any]:
    """캘리브레이션 데이터 저장"""
    try:
        calibrator = get_calibrator()
        filepath = calibrator.save_calibration_data(filename)
        return {"status": "success", "filepath": filepath}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def list_calibrations() -> Dict[str, Any]:
    """저장된 캘리브레이션 목록"""
    try:
        calib_dir = GAZE_DIR / "calibration_data"
        if not calib_dir.exists():
            return {"status": "success", "calibrations": []}
        
        calibrations = []
        for file in calib_dir.glob("*.json"):
            calibrations.append({
                "filename": file.name,
                "filepath": str(file),
                "created": file.stat().st_mtime
            })
        
        return {"status": "success", "calibrations": calibrations}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# === 시선 추적 관련 함수들 ===
def load_calibration_from_localstorage() -> Dict[str, Any]:
    """프론트엔드 로컬 스토리지에서 캘리브레이션 데이터 로드"""
    try:
        # 프론트엔드 디렉토리에서 gaze_calibration_data 파일 찾기
        frontend_root = AI_SERVER_ROOT.parent / "frontend"
        calib_file_patterns = [
            "gaze_calibration_data.json",
            "calibration_data_*.json"
        ]
        
        calib_path = None
        for pattern in calib_file_patterns:
            files = list(frontend_root.glob(pattern))
            if files:
                # 가장 최신 파일 선택
                calib_path = max(files, key=lambda f: f.stat().st_mtime)
                break
        
        if not calib_path or not calib_path.exists():
            # 현재 디렉토리에서도 찾아보기
            for pattern in calib_file_patterns:
                files = list(Path.cwd().glob(pattern))
                if files:
                    calib_path = max(files, key=lambda f: f.stat().st_mtime)
                    break
        
        if not calib_path:
            return {"status": "error", "message": "No calibration data found in local storage"}
        
        with open(calib_path, 'r', encoding='utf-8') as f:
            calib_data = json.load(f)
        
        # 데이터 유효성 검사
        required_fields = ['calibration_vectors', 'calibration_points', 'transform_method']
        for field in required_fields:
            if field not in calib_data:
                return {"status": "error", "message": f"Missing required field: {field}"}
        
        return {
            "status": "success", 
            "message": "Calibration data loaded from local storage",
            "data": calib_data,
            "file_path": str(calib_path)
        }
        
    except Exception as e:
        return {"status": "error", "message": f"Failed to load calibration from local storage: {str(e)}"}


def load_calibration_for_tracking(calib_path: str = None, calib_data: dict = None) -> Dict[str, Any]:
    """시선 추적용 캘리브레이션 로드"""
    try:
        tracker = get_tracker()
        
        # 캘리브레이션 데이터가 직접 전달되지 않은 경우 파일에서 로드
        if calib_data is None:
            if calib_path is None:
                return {"status": "error", "message": "No calibration data or path provided"}
            
            with open(calib_path, 'r') as f:
                calib_data = json.load(f)
        
        # 캘리브레이션 데이터를 트래커에 로드
        tracker.calib_vectors = calib_data.get('calibration_vectors', [])
        tracker.calib_points = calib_data.get('calibration_points', [])
        tracker.transform_matrix = calib_data.get('transform_matrix')
        tracker.transform_method = calib_data.get('transform_method')
        
        return {"status": "success", "message": "Calibration loaded for tracking"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def infer_gaze(video_bytes: bytes, calib_path: Optional[str] = None, use_localstorage: bool = True) -> Dict[str, Any]:
    """
    업로드된 비디오 바이트에서 시선 추적 수행
    """
    try:
        tracker = get_tracker()
        
        # 캘리브레이션 데이터 로드 시도
        calibration_loaded = False
        
        # 1. 로컬 스토리지에서 캘리브레이션 데이터 자동 로드 시도
        if use_localstorage:
            localstorage_result = load_calibration_from_localstorage()
            if localstorage_result["status"] == "success":
                load_result = load_calibration_for_tracking(calib_data=localstorage_result["data"])
                if load_result["status"] == "success":
                    calibration_loaded = True
                    print(f"[INFO] Loaded calibration from local storage: {localstorage_result['file_path']}")
        
        # 2. 캘리브레이션 파일이 직접 제공된 경우 사용
        if not calibration_loaded and calib_path:
            load_result = load_calibration_for_tracking(calib_path)
            if load_result["status"] == "success":
                calibration_loaded = True
                print(f"[INFO] Loaded calibration from provided path: {calib_path}")
            else:
                return load_result
        
        # 3. 캘리브레이션 데이터가 없는 경우 경고하지만 기본 시선 추적 계속 진행
        if not calibration_loaded:
            print("[WARNING] No calibration data found. Using default gaze-to-screen coordinate mapping.")
            print("[WARNING] Results may be less accurate without calibration.")
        
        # 임시 mp4 파일 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(video_bytes)
            input_path = tmp.name

        try:
            # 시선 추적 실행
            result = tracker.process_video_file(input_path)
            return {
                "ok": True, 
                "result": result,
                "calibration_status": {
                    "loaded": calibration_loaded,
                    "source": "local_storage" if (calibration_loaded and use_localstorage and localstorage_result["status"] == "success") 
                             else "provided_path" if (calibration_loaded and calib_path) 
                             else "none",
                    "message": "Calibration applied successfully" if calibration_loaded 
                              else "No calibration applied - using default mapping"
                }
            }
        finally:
            try:
                os.remove(input_path)
            except Exception:
                pass
                
    except Exception as e:
        return {"ok": False, "error": str(e)}
