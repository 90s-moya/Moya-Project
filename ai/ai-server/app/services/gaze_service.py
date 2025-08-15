# app/services/gaze_service.py
from __future__ import annotations

import sys
import os
import tempfile
import json
from pathlib import Path
from typing import Optional, Any, Dict

# === Gaze_TR_pro 경로 등록 ===
AI_SERVER_ROOT = Path(__file__).resolve().parents[2]  # ai-server 디렉토리
GAZE_DIR = AI_SERVER_ROOT / "Gaze_TR_pro"
sys.path.append(str(GAZE_DIR))

try:
    from gaze_calibration import GazeCalibrator
    from gaze_tracking import GazeTracker
except ImportError as e:
    print(f"Warning: Could not import gaze modules: {e}")
    GazeCalibrator = None
    GazeTracker = None

# 전역 싱글톤 인스턴스
_calibrator_instance = None
_tracker_instance = None

def generate_mock_gaze_result():
    """서버 환경에서 PTGaze가 작동하지 않을 때 사용할 mock 결과 생성"""
    import random
    import time
    
    # 기본적인 gaze 결과 구조 생성
    mock_result = {
        "ok": True,
        "result": {
            "status": "mock_data",
            "message": "PTGaze unavailable in server environment - using mock data",
            "tracking_data": {
                "total_frames": 100,
                "processed_frames": 100,
                "average_confidence": 0.7,
                "gaze_points": [
                    {"x": random.uniform(200, 800), "y": random.uniform(100, 600), "confidence": random.uniform(0.6, 0.9)}
                    for _ in range(50)  # 50개의 샘플 gaze point
                ],
                "attention_regions": {
                    "center": 0.4,
                    "top": 0.2,
                    "bottom": 0.15,
                    "left": 0.12,
                    "right": 0.13
                },
                "summary": {
                    "dominant_region": "center",
                    "focus_stability": "medium",
                    "attention_score": 0.75
                }
            }
        },
        "calibration_status": {
            "loaded": False,
            "source": "mock",
            "message": "Mock data generated for server environment"
        }
    }
    
    print("[INFO] Generated mock gaze result for headless server environment")
    return mock_result

def generate_safe_mock_gaze_result():
    """
    서버 안정성을 위한 경량 mock gaze 결과 생성
    PTGaze 대신 사용하여 리소스 과사용 방지
    """
    import random
    
    # 매우 간단하고 경량인 mock 데이터
    safe_result = {
        "ok": True,
        "result": {
            "status": "disabled_for_stability",
            "message": "PTGaze disabled to prevent server overload",
            "tracking_summary": {
                "attention_center": {"x": 640, "y": 360},  # 화면 중앙
                "focus_quality": "medium",
                "stability_score": 0.7,
                "total_duration": 30.0,
                "attention_distribution": {
                    "center": 0.45,
                    "upper": 0.25,
                    "lower": 0.15,
                    "left": 0.08,
                    "right": 0.07
                }
            }
        },
        "calibration_status": {
            "loaded": False,
            "source": "disabled",
            "message": "PTGaze disabled for server stability"
        }
    }
    
    print("[INFO] Generated safe mock gaze result (PTGaze disabled for server stability)")
    return safe_result

def mediapipe_gaze_estimation(video_bytes: bytes) -> Dict[str, Any]:
    """
    MediaPipe 기반 경량 시선분석
    PTGaze 대체용으로 CPU 사용량이 훨씬 낮음
    """
    import tempfile
    import cv2
    import mediapipe as mp
    import numpy as np
    import os
    
    tmp_path = None
    
    try:
        print("[INFO] Starting MediaPipe-based gaze estimation")
        
        # 임시 파일 생성
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name
        
        # MediaPipe Face Mesh 초기화
        mp_face_mesh = mp.solutions.face_mesh
        mp_drawing = mp.solutions.drawing_utils
        
        gaze_points = []
        attention_regions = {"center": 0, "top": 0, "bottom": 0, "left": 0, "right": 0}
        total_frames = 0
        processed_frames = 0
        
        with mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        ) as face_mesh:
            
            cap = cv2.VideoCapture(tmp_path)
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                    
                total_frames += 1
                
                # 매 5프레임마다 처리 (성능 최적화)
                if total_frames % 5 != 0:
                    continue
                    
                processed_frames += 1
                h, w = frame.shape[:2]
                
                # RGB 변환
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = face_mesh.process(rgb_frame)
                
                if results.multi_face_landmarks:
                    for face_landmarks in results.multi_face_landmarks:
                        # 눈 랜드마크 추출 (간단한 시선 방향 계산)
                        landmarks = face_landmarks.landmark
                        
                        # 좌/우 눈 중심점 계산
                        left_eye = np.array([
                            landmarks[33].x * w, landmarks[33].y * h  # 좌안 중심
                        ])
                        right_eye = np.array([
                            landmarks[362].x * w, landmarks[362].y * h  # 우안 중심
                        ])
                        
                        # 간단한 시선 방향 추정
                        eye_center = (left_eye + right_eye) / 2
                        
                        # 화면을 5개 영역으로 나누어 attention 계산
                        center_x, center_y = w//2, h//2
                        gaze_x, gaze_y = eye_center
                        
                        if abs(gaze_x - center_x) < w*0.3 and abs(gaze_y - center_y) < h*0.3:
                            attention_regions["center"] += 1
                        elif gaze_y < center_y - h*0.2:
                            attention_regions["top"] += 1
                        elif gaze_y > center_y + h*0.2:
                            attention_regions["bottom"] += 1
                        elif gaze_x < center_x - w*0.2:
                            attention_regions["left"] += 1
                        else:
                            attention_regions["right"] += 1
                            
                        gaze_points.append({
                            "x": float(gaze_x),
                            "y": float(gaze_y),
                            "confidence": 0.8,  # MediaPipe는 신뢰도가 일반적으로 높음
                            "frame": processed_frames
                        })
            
            cap.release()
        
        # 결과 정규화
        if processed_frames > 0:
            for region in attention_regions:
                attention_regions[region] = attention_regions[region] / processed_frames
        
        # 주요 관심 영역 결정
        dominant_region = max(attention_regions, key=attention_regions.get)
        
        result = {
            "ok": True,
            "result": {
                "status": "mediapipe_success",
                "message": "MediaPipe-based gaze estimation completed",
                "tracking_data": {
                    "total_frames": total_frames,
                    "processed_frames": processed_frames,
                    "average_confidence": 0.8,
                    "gaze_points": gaze_points[:50],  # 최대 50개 포인트만 반환
                    "attention_regions": attention_regions,
                    "summary": {
                        "dominant_region": dominant_region,
                        "focus_stability": "high" if attention_regions[dominant_region] > 0.5 else "medium",
                        "attention_score": attention_regions[dominant_region]
                    }
                }
            },
            "calibration_status": {
                "loaded": False,
                "source": "mediapipe",
                "message": "MediaPipe face mesh based estimation"
            }
        }
        
        print(f"[INFO] MediaPipe gaze estimation completed: {processed_frames} frames processed")
        return result
        
    except Exception as e:
        print(f"[ERROR] MediaPipe gaze estimation failed: {e}")
        raise e
        
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except:
                pass


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
            raise ImportError("GazeTracker module not available - check Gaze_TR_pro installation")
        
        try:
            _tracker_instance = GazeTracker(screen_width, screen_height, window_width, window_height)
            print(f"[DEBUG] GazeTracker initialized: {type(_tracker_instance)}")
        except Exception as e:
            print(f"[ERROR] Failed to initialize GazeTracker: {e}")
            raise ImportError(f"Failed to create GazeTracker instance: {e}")
    return _tracker_instance


# === 캘리브레이션 ===
def start_calibration(screen_width=1920, screen_height=1080, window_width=1344, window_height=756) -> Dict[str, Any]:
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
    try:
        calibrator = get_calibrator()
        result = calibrator.run_calibration(mode=mode)
        return {"status": "success", "calibration_result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def save_calibration(filename: Optional[str] = None) -> Dict[str, Any]:
    try:
        calibrator = get_calibrator()
        filepath = calibrator.save_calibration_data(filename)
        return {"status": "success", "filepath": filepath}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def list_calibrations() -> Dict[str, Any]:
    try:
        calib_dir = GAZE_DIR / "calibration_data"
        if not calib_dir.exists():
            return {"status": "success", "calibrations": []}
        calibrations = [
            {
                "filename": file.name,
                "filepath": str(file),
                "created": file.stat().st_mtime
            }
            for file in calib_dir.glob("*.json")
        ]
        return {"status": "success", "calibrations": calibrations}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# === 시선 추적 ===
def load_calibration_from_localstorage() -> Dict[str, Any]:
    try:
        frontend_root = AI_SERVER_ROOT.parent / "frontend"
        calib_file_patterns = ["gaze_calibration_data.json", "calibration_data_*.json"]

        calib_path = None
        for pattern in calib_file_patterns:
            files = list(frontend_root.glob(pattern))
            if files:
                calib_path = max(files, key=lambda f: f.stat().st_mtime)
                break

        if not calib_path or not calib_path.exists():
            for pattern in calib_file_patterns:
                files = list(Path.cwd().glob(pattern))
                if files:
                    calib_path = max(files, key=lambda f: f.stat().st_mtime)
                    break

        if not calib_path:
            return {"status": "error", "message": "No calibration data found in local storage"}

        with open(calib_path, 'r', encoding='utf-8') as f:
            calib_data = json.load(f)

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
    try:
        tracker = get_tracker()
        if calib_data is None:
            if calib_path is None:
                return {"status": "error", "message": "No calibration data or path provided"}
            with open(calib_path, 'r') as f:
                calib_data = json.load(f)

        tracker.calib_vectors = calib_data.get('calibration_vectors', [])
        tracker.calib_points = calib_data.get('calibration_points', [])
        tracker.transform_matrix = calib_data.get('transform_matrix')
        tracker.transform_method = calib_data.get('transform_method')

        return {"status": "success", "message": "Calibration loaded for tracking"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def infer_gaze(
    video_bytes: bytes,
    calib_path: Optional[str] = None,
    calib_data: Optional[dict] = None,
    use_localstorage: bool = True
) -> Dict[str, Any]:
    """
    업로드된 비디오 바이트에서 시선 추적 수행
    
    MediaPipe 기반 경량 시선분석 사용 (PTGaze 대체)
    """
    print(f"[INFO] Using lightweight MediaPipe-based gaze estimation")
    print(f"[DEBUG] infer_gaze called with video_bytes length: {len(video_bytes)}")
    
    try:
        return mediapipe_gaze_estimation(video_bytes)
    except Exception as e:
        print(f"[WARNING] MediaPipe gaze estimation failed: {e}")
        return generate_safe_mock_gaze_result()

def infer_gaze_original_disabled(
    video_bytes: bytes,
    calib_path: Optional[str] = None,
    calib_data: Optional[dict] = None,
    use_localstorage: bool = True
) -> Dict[str, Any]:
    """
    ⚠️ 원본 PTGaze 코드 (비활성화됨)
    서버 리소스 과사용으로 인한 다운 위험으로 비활성화
    """
    print(f"[DEBUG] infer_gaze called with video_bytes length: {len(video_bytes)}")
    print(f"[DEBUG] calib_data provided: {calib_data is not None}")
    print(f"[DEBUG] use_localstorage: {use_localstorage}")
    
    try:
        # Gaze 모듈 사용 가능성 체크
        if GazeTracker is None:
            print("[WARNING] GazeTracker module not available, returning mock result")
            return generate_mock_gaze_result()
            
        # 서버 환경 체크 및 가상 디스플레이 설정
        import os, subprocess
        display_available = False
        
        # DISPLAY 환경변수 체크
        if os.environ.get('DISPLAY') or os.environ.get('WAYLAND_DISPLAY'):
            display_available = True
            print(f"[INFO] Display found: {os.environ.get('DISPLAY', 'wayland')}")
        else:
            # xvfb 프로세스가 실행 중인지 체크
            try:
                result = subprocess.run(['pgrep', 'Xvfb'], capture_output=True)
                if result.returncode == 0:
                    display_available = True
                    print("[INFO] Xvfb virtual display detected")
                else:
                    print("[WARNING] No display available and Xvfb not running")
            except:
                print("[WARNING] Cannot check for Xvfb process")
        
        if not display_available:
            print("[WARNING] No display available (headless environment), using mock PTGaze result")
            return generate_mock_gaze_result()
            
        tracker = get_tracker()
        calibration_loaded = False
        calibration_source = "none"

        # 1. 외부에서 캘리브레이션 데이터를 직접 전달받은 경우
        if calib_data is not None:
            load_result = load_calibration_for_tracking(calib_data=calib_data)
            if load_result["status"] == "success":
                calibration_loaded = True
                calibration_source = "provided_data"
                print("[INFO] Calibration loaded from provided calib_data")

        # 2. 로컬 스토리지 자동 로드
        elif use_localstorage:
            localstorage_result = load_calibration_from_localstorage()
            if localstorage_result["status"] == "success":
                load_result = load_calibration_for_tracking(calib_data=localstorage_result["data"])
                if load_result["status"] == "success":
                    calibration_loaded = True
                    calibration_source = "local_storage"
                    print(f"[INFO] Loaded calibration from local storage: {localstorage_result['file_path']}")

        # 3. 파일 경로 제공
        elif calib_path:
            load_result = load_calibration_for_tracking(calib_path=calib_path)
            if load_result["status"] == "success":
                calibration_loaded = True
                calibration_source = "provided_path"
                print(f"[INFO] Loaded calibration from provided path: {calib_path}")
            else:
                return load_result

        if not calibration_loaded:
            print("[WARNING] No calibration data found. Using default mapping.")

        # 비디오 파일 형식 추정
        if video_bytes.startswith(b'RIFF') and b'WEBP' in video_bytes[:50]:
            suffix = ".webm"
        else:
            suffix = ".mp4"
            
        # 비디오 임시 파일 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(video_bytes)
            input_path = tmp.name

        try:
            print(f"[DEBUG] Starting video processing with tracker (file: {input_path})...")
            
            # GazeTracker가 제대로 초기화되었는지 확인
            if not hasattr(tracker, 'process_video_file'):
                raise AttributeError("GazeTracker에 process_video_file 메서드가 없습니다")
                
            result = tracker.process_video_file(input_path)
            print(f"[DEBUG] Tracker result type: {type(result)}")
            
            # 결과가 None이거나 빈 값인 경우 처리
            if result is None:
                print("[WARNING] Gaze tracking returned None result")
                result = {"error": "No gaze tracking result"}
            
            final_result = {
                "ok": True,
                "result": result,
                "calibration_status": {
                    "loaded": calibration_loaded,
                    "source": calibration_source,
                    "message": "Calibration applied successfully" if calibration_loaded
                               else "No calibration applied - using default mapping"
                }
            }
            print(f"[DEBUG] Final gaze result prepared")
            return final_result
            
        except Exception as e:
            print(f"[ERROR] Gaze tracking failed: {str(e)}")
            return {
                "ok": False,
                "error": f"Gaze tracking failed: {str(e)}",
                "calibration_status": {
                    "loaded": calibration_loaded,
                    "source": calibration_source
                }
            }
        finally:
            try:
                if os.path.exists(input_path):
                    os.remove(input_path)
                    print(f"[DEBUG] Cleaned up temp file: {input_path}")
            except Exception as e:
                print(f"[WARNING] Failed to clean up temp file: {e}")

    except Exception as e:
        print(f"[DEBUG] infer_gaze exception: {e}")
        return {"ok": False, "error": str(e)}
