import cv2
import numpy as np
import os
import json
from datetime import datetime
from omegaconf import OmegaConf
from ptgaze.gaze_estimator import GazeEstimator
from ptgaze.head_pose_estimation import LandmarkEstimator
from scipy.interpolate import Rbf
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline

# NumPy compatibility fix for versions >= 1.20
import warnings
with warnings.catch_warnings():
    warnings.simplefilter("ignore", FutureWarning)
    if not hasattr(np, 'float'):
        np.float = float
    if not hasattr(np, 'int'):
        np.int = int  
    if not hasattr(np, 'bool'):
        np.bool = bool
    if not hasattr(np, 'complex'):
        np.complex = complex

class GazeTracker:
    def __init__(self, screen_width=1920, screen_height=1080, window_width=1344, window_height=756):
        # 화면 설정
        self.SCREEN_WIDTH_PX = screen_width
        self.SCREEN_HEIGHT_PX = screen_height
        self.WINDOW_WIDTH = window_width
        self.WINDOW_HEIGHT = window_height
        
        # 캘리브레이션 데이터 (로드됨)
        self.calib_vectors = []
        self.calib_points = []
        self.transform_matrix = None
        self.transform_method = None
        self.poly_model_x = None
        self.poly_model_y = None
        self.rbf_x = None
        self.rbf_y = None
        
        # 히트맵 설정
        self.HEATMAP_GRID_W = 160
        self.HEATMAP_GRID_H = 90
        self.gaze_heatmap_2d = None
        
        # 카메라 설정
        self.FLIP_CAMERA = True
        
        # 시선 추적 데이터
        self.gaze_data = []
        self.tracking_active = False
        
        # ptgaze 초기화
        self._init_ptgaze()
        
        # 히트맵 초기화
        self.initialize_gaze_heatmap()
    
    def _init_ptgaze(self):
        """ptgaze 모델 초기화"""
        home = os.path.expanduser("~")
        
        camera_params_path = os.path.join(os.path.dirname(__file__), "calib", "sample_params.yaml")
        try:
            import ptgaze
            ptgaze_path = os.path.dirname(ptgaze.__file__)
            normalized_params_path = os.path.join(
                ptgaze_path,
                "data",
                "normalized_camera_params",
                "eth-xgaze.yaml"
            )
        except ImportError:
            normalized_params_path = os.path.join(
                os.path.dirname(__file__),
                "venv",
                "Lib",
                "site-packages",
                "ptgaze",
                "data",
                "normalized_camera_params",
                "eth-xgaze.yaml"
            )
        
        config = OmegaConf.create({
            "mode": "ETH-XGaze",
            "device": "cpu",
            "model": {"name": "resnet18"},
            "face_detector": {
                "mode": "mediapipe",
                "dlib_model_path": os.path.join(home, ".ptgaze", "dlib", "shape_predictor_68_face_landmarks.dat"),
                "mediapipe_max_num_faces": 1,
                "mediapipe_static_image_mode": False
            },
            "gaze_estimator": {
                "checkpoint": os.path.join(home, ".ptgaze", "models", "eth-xgaze_resnet18.pth"),
                "camera_params": camera_params_path,
                "normalized_camera_params": normalized_params_path,
                "use_dummy_camera_params": False,
                "normalized_camera_distance": 0.6,
                "image_size": [224, 224]
            }
        })
        
        try:
            self.gaze_estimator = GazeEstimator(config)
            self.landmark_estimator = LandmarkEstimator(config)
            print("[INFO] Gaze estimator initialized successfully")
        except Exception as e:
            print(f"[ERROR] Failed to initialize gaze estimator: {e}")
            raise e
    
    def initialize_gaze_heatmap(self):
        """히트맵 초기화"""
        self.gaze_heatmap_2d = np.zeros((self.HEATMAP_GRID_H, self.HEATMAP_GRID_W), dtype=np.int32)
        print(f"[INFO] Initialized gaze heatmap grid: {self.HEATMAP_GRID_W}x{self.HEATMAP_GRID_H}")
    
    def load_calibration_from_localstorage(self):
        """프론트엔드 로컬 스토리지에서 캘리브레이션 데이터 자동 로드"""
        try:
            # 프론트엔드 디렉토리에서 gaze_calibration_data 파일 찾기
            current_dir = os.path.dirname(__file__)
            project_root = os.path.abspath(os.path.join(current_dir, "../../"))
            frontend_root = os.path.join(project_root, "frontend")
            
            calib_file_patterns = [
                "gaze_calibration_data.json",
                "calibration_data_*.json"
            ]
            
            calib_path = None
            for pattern in calib_file_patterns:
                import glob
                files = glob.glob(os.path.join(frontend_root, pattern))
                if files:
                    # 가장 최신 파일 선택
                    calib_path = max(files, key=os.path.getmtime)
                    break
            
            if not calib_path:
                # 현재 디렉토리에서도 찾아보기
                for pattern in calib_file_patterns:
                    files = glob.glob(pattern)
                    if files:
                        calib_path = max(files, key=os.path.getmtime)
                        break
            
            if not calib_path:
                print("[WARNING] No calibration data found in local storage")
                return False
            
            return self.load_calibration_data(calib_path)
            
        except Exception as e:
            print(f"[ERROR] Failed to load calibration from local storage: {e}")
            return False

    def load_calibration_data(self, filename):
        """캘리브레이션 데이터 로드"""
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                calib_data = json.load(f)
            
            self.calib_vectors = calib_data.get('calibration_vectors', [])
            self.calib_points = calib_data.get('calibration_points', [])
            self.transform_method = calib_data.get('transform_method', None)
            
            # 변환 모델 복원
            if self.transform_method == "polynomial" and "polynomial_models" in calib_data:
                poly_data = calib_data["polynomial_models"]
                degree = poly_data["degree"]
                
                # 다항식 모델 재생성
                A = np.array(self.calib_vectors, dtype=np.float32)
                B = np.array(self.calib_points, dtype=np.float32)
                
                self.poly_model_x = Pipeline([
                    ('poly', PolynomialFeatures(degree=degree)),
                    ('linear', LinearRegression())
                ])
                self.poly_model_y = Pipeline([
                    ('poly', PolynomialFeatures(degree=degree)),
                    ('linear', LinearRegression())
                ])
                
                self.poly_model_x.fit(A, B[:, 0])
                self.poly_model_y.fit(A, B[:, 1])
                
            elif self.transform_method == "geometric" and "transform_matrix" in calib_data:
                self.transform_matrix = np.array(calib_data["transform_matrix"], dtype=np.float32)
            
            elif self.transform_method == "rbf":
                # RBF 모델 재생성
                A = np.array(self.calib_vectors, dtype=np.float32)
                B = np.array(self.calib_points, dtype=np.float32)
                
                self.rbf_x = Rbf(A[:, 0], A[:, 1], B[:, 0], function='multiquadric', smooth=0.1)
                self.rbf_y = Rbf(A[:, 0], A[:, 1], B[:, 1], function='multiquadric', smooth=0.1)
            
            print(f"[INFO] Calibration data loaded: {len(self.calib_points)} points, method: {self.transform_method}")
            return True
            
        except Exception as e:
            print(f"[ERROR] Failed to load calibration data: {e}")
            return False
    
    def gaze_to_screen_coords(self, gaze_vector):
        """ETH-XGaze 시선 벡터를 화면 좌표로 변환"""
        vx, vy, vz = gaze_vector[0], gaze_vector[1], gaze_vector[2]
        
        yaw = np.arctan2(-vx, -vz)
        pitch = np.arcsin(-vy)
        
        scale_factor = 800
        screen_x = int(np.tan(yaw) * scale_factor + (self.WINDOW_WIDTH / 2))
        screen_y = int(np.tan(pitch) * scale_factor + (self.WINDOW_HEIGHT / 2))
        
        return screen_x, screen_y
    
    def apply_transform(self, gaze_vector):
        """캘리브레이션 변환 적용"""
        if self.transform_matrix is None and self.poly_model_x is None and self.rbf_x is None:
            return self.gaze_to_screen_coords(gaze_vector)
        
        vx, vy, vz = gaze_vector[0], gaze_vector[1], gaze_vector[2]
        yaw = np.arctan2(-vx, -vz)
        pitch = np.arcsin(-vy)
        
        try:
            if self.transform_method == "geometric" and self.transform_matrix is not None:
                if self.transform_matrix.shape[0] == 3:  # Homography
                    point = np.array([yaw, pitch, 1], dtype=np.float32)
                    result = np.dot(self.transform_matrix, point)
                    if result[2] != 0:
                        transformed_x = int(result[0] / result[2])
                        transformed_y = int(result[1] / result[2])
                    else:
                        return self.gaze_to_screen_coords(gaze_vector)
                else:  # Affine
                    vec = np.array([yaw, pitch, 1], dtype=np.float32)
                    result = np.dot(self.transform_matrix, vec)
                    transformed_x = int(result[0])
                    transformed_y = int(result[1])
            
            elif self.transform_method == "polynomial" and self.poly_model_x is not None:
                input_point = np.array([[yaw, pitch]])
                transformed_x = int(self.poly_model_x.predict(input_point)[0])
                transformed_y = int(self.poly_model_y.predict(input_point)[0])
            
            elif self.transform_method == "rbf" and self.rbf_x is not None:
                transformed_x = int(self.rbf_x(yaw, pitch))
                transformed_y = int(self.rbf_y(yaw, pitch))
            
            else:
                return self.gaze_to_screen_coords(gaze_vector)
        
        except Exception as e:
            print(f"[ERROR] Transform apply failed: {e}")
            return self.gaze_to_screen_coords(gaze_vector)
        
        # 화면 범위 내로 제한
        transformed_x = max(0, min(transformed_x, self.WINDOW_WIDTH - 1))
        transformed_y = max(0, min(transformed_y, self.WINDOW_HEIGHT - 1))
        
        return transformed_x, transformed_y
    
    def add_gaze_to_heatmap(self, x, y):
        """히트맵에 시선 데이터 추가"""
        if self.gaze_heatmap_2d is None:
            self.initialize_gaze_heatmap()
        
        grid_x = int(x / (self.WINDOW_WIDTH / self.HEATMAP_GRID_W))
        grid_y = int(y / (self.WINDOW_HEIGHT / self.HEATMAP_GRID_H))
        
        grid_x = max(0, min(grid_x, self.HEATMAP_GRID_W - 1))
        grid_y = max(0, min(grid_y, self.HEATMAP_GRID_H - 1))
        
        self.gaze_heatmap_2d[grid_y][grid_x] += 1
    
    def record_gaze_data(self, raw_point, calibrated_point, timestamp=None):
        """시선 데이터 기록"""
        if timestamp is None:
            timestamp = datetime.now().timestamp()
        
        # 히트맵에 추가
        self.add_gaze_to_heatmap(calibrated_point[0], calibrated_point[1])
        
        # 상세 데이터 기록
        gaze_entry = {
            "timestamp": timestamp,
            "raw_point": raw_point,
            "calibrated_point": calibrated_point
        }
        self.gaze_data.append(gaze_entry)
    
    def process_video_file(self, video_path, output_prefix=None, auto_load_calibration=True):
        """동영상 파일에서 시선 추적"""
        if not os.path.exists(video_path):
            print(f"[ERROR] Video file not found: {video_path}")
            return False
        
        # 자동 캘리브레이션 로드 시도
        if auto_load_calibration and not self.calib_vectors:
            print("[INFO] Attempting to load calibration data from local storage...")
            calibration_loaded = self.load_calibration_from_localstorage()
            if calibration_loaded:
                print("[INFO] Calibration data loaded successfully")
            else:
                print("[WARNING] No calibration data found. Using default gaze-to-screen mapping.")
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"[ERROR] Cannot open video file: {video_path}")
            return False
        
        if output_prefix is None:
            output_prefix = os.path.splitext(os.path.basename(video_path))[0]
        
        # 비디오 정보
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps
        
        print(f"[INFO] Processing video: {video_path}")
        print(f"[INFO] FPS: {fps}, Total frames: {total_frames}, Duration: {duration:.2f}s")
        
        frame_count = 0
        successful_tracks = 0
        
        # 히트맵 초기화
        self.initialize_gaze_heatmap()
        self.gaze_data.clear()
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                timestamp = frame_count / fps
                
                # 프레임 크기 조정
                frame = cv2.resize(frame, (self.WINDOW_WIDTH, self.WINDOW_HEIGHT))
                
                if self.FLIP_CAMERA:
                    frame = cv2.flip(frame, 1)
                
                # 얼굴 탐지
                faces = self.landmark_estimator.detect_faces(frame)
                if len(faces) == 0:
                    continue
                
                face = faces[0]
                
                # 시선 추정
                try:
                    self.gaze_estimator.estimate_gaze(frame, face)
                    gaze_vector = face.gaze_vector
                    if gaze_vector is None:
                        continue
                    
                    # 시선 좌표 변환
                    raw_point = self.gaze_to_screen_coords(gaze_vector)
                    calibrated_point = self.apply_transform(gaze_vector)
                    
                    # 화면 범위 내로 제한
                    raw_point = (
                        max(0, min(raw_point[0], self.WINDOW_WIDTH - 1)),
                        max(0, min(raw_point[1], self.WINDOW_HEIGHT - 1))
                    )
                    
                    # 데이터 기록
                    self.record_gaze_data(raw_point, calibrated_point, timestamp)
                    successful_tracks += 1
                    
                    if frame_count % 100 == 0:
                        print(f"[INFO] Processed {frame_count}/{total_frames} frames ({frame_count/total_frames*100:.1f}%)")
                
                except Exception as e:
                    continue
        
        except KeyboardInterrupt:
            print("\n[INFO] Video processing interrupted")
        finally:
            cap.release()
        
        print(f"[INFO] Video processing complete: {successful_tracks}/{frame_count} frames tracked")
        
        # 결과 저장 및 반환
        if successful_tracks > 0:
            # 결과 파일 저장
            saved_files = self.save_tracking_results(output_prefix)
            
            # 히트맵 데이터와 분석 결과 반환
            center_ratio = self.calculate_center_gaze_ratio()
            
            result = {
                "success": True,
                "total_frames": frame_count,
                "tracked_frames": successful_tracks,
                "tracking_ratio": successful_tracks / frame_count if frame_count > 0 else 0,
                "heatmap_data": self.gaze_heatmap_2d.tolist() if self.gaze_heatmap_2d is not None else None,
                "metadata": {
                    "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "screen_size": {
                        "width": self.WINDOW_WIDTH,
                        "height": self.WINDOW_HEIGHT
                    },
                    "grid_size": {
                        "width": self.HEATMAP_GRID_W,
                        "height": self.HEATMAP_GRID_H
                    },
                    "total_gaze_samples": int(np.sum(self.gaze_heatmap_2d)) if self.gaze_heatmap_2d is not None else 0,
                    "center_gaze_ratio": round(center_ratio, 2)
                },
                "analysis": {
                    "center_gaze_percentage": round(center_ratio, 2),
                    "peripheral_gaze_percentage": round(100 - center_ratio, 2),
                    "gaze_distribution": "concentrated" if center_ratio > 60 else "distributed" if center_ratio > 30 else "scattered"
                },
                "saved_files": saved_files if isinstance(saved_files, list) else []
            }
            
            return result
        else:
            print("[WARNING] No gaze data was successfully tracked")
            return {
                "success": False,
                "error": "No gaze data was successfully tracked",
                "total_frames": frame_count,
                "tracked_frames": 0
            }
    
    def process_webcam_live(self, duration_seconds=None):
        """웹캠에서 실시간 시선 추적"""
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("[ERROR] Cannot open webcam")
            return False
        
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.WINDOW_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.WINDOW_HEIGHT)
        cv2.namedWindow("Gaze Tracking", cv2.WINDOW_AUTOSIZE)
        
        print("[INFO] Starting live gaze tracking")
        print("[INFO] Press 's' to start/stop recording, 'q' to quit")
        
        # 히트맵 초기화
        self.initialize_gaze_heatmap()
        self.gaze_data.clear()
        
        start_time = datetime.now()
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # 시간 제한 확인
                if duration_seconds and (datetime.now() - start_time).seconds >= duration_seconds:
                    break
                
                frame = cv2.resize(frame, (self.WINDOW_WIDTH, self.WINDOW_HEIGHT))
                
                if self.FLIP_CAMERA:
                    frame = cv2.flip(frame, 1)
                
                frame = cv2.convertScaleAbs(frame, alpha=1.2, beta=30)
                
                # 얼굴 탐지
                faces = self.landmark_estimator.detect_faces(frame)
                if len(faces) == 0:
                    cv2.putText(frame, "No face detected", (30, 50),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                    cv2.imshow("Gaze Tracking", frame)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                    continue
                
                face = faces[0]
                
                # 시선 추정
                try:
                    self.gaze_estimator.estimate_gaze(frame, face)
                    gaze_vector = face.gaze_vector
                    if gaze_vector is None:
                        cv2.putText(frame, "Gaze estimation failed", (30, 80),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
                        cv2.imshow("Gaze Tracking", frame)
                        if cv2.waitKey(1) & 0xFF == ord('q'):
                            break
                        continue
                except Exception as e:
                    cv2.putText(frame, f"Error: {str(e)[:50]}", (30, 80),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                    cv2.imshow("Gaze Tracking", frame)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                    continue
                
                # 시선 좌표 변환
                raw_point = self.gaze_to_screen_coords(gaze_vector)
                calibrated_point = self.apply_transform(gaze_vector)
                
                # 화면 범위 내로 제한
                raw_point = (
                    max(0, min(raw_point[0], frame.shape[1] - 1)),
                    max(0, min(raw_point[1], frame.shape[0] - 1))
                )
                
                # 시선 위치 표시
                cv2.circle(frame, calibrated_point, 10, (0, 255, 0), -1)  # 녹색 (보정된 시선)
                cv2.circle(frame, raw_point, 5, (0, 0, 255), -1)  # 빨간색 (원시 시선)
                
                # 데이터 기록 (활성화 시에만)
                if self.tracking_active:
                    self.record_gaze_data(raw_point, calibrated_point)
                
                # 상태 정보 표시
                status_text = "Recording" if self.tracking_active else "Paused"
                status_color = (0, 255, 0) if self.tracking_active else (0, 0, 255)
                cv2.putText(frame, f"Status: {status_text}", (30, 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2)
                
                total_samples = np.sum(self.gaze_heatmap_2d) if self.gaze_heatmap_2d is not None else 0
                cv2.putText(frame, f"Samples: {total_samples}", (30, 90),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                cv2.putText(frame, f"Raw: {raw_point}, Cal: {calibrated_point}", 
                            (30, frame.shape[0] - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                
                cv2.imshow("Gaze Tracking", frame)
                
                key = cv2.waitKey(1) & 0xFF
                
                if key == ord('s'):
                    self.tracking_active = not self.tracking_active
                    print(f"[INFO] Recording {'started' if self.tracking_active else 'stopped'}")
                
                if key == ord('q'):
                    break
        
        except KeyboardInterrupt:
            print("\n[INFO] Live tracking interrupted")
        finally:
            cap.release()
            cv2.destroyAllWindows()
        
        # 결과 저장
        if len(self.gaze_data) > 0:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            self.save_tracking_results(f"live_tracking_{timestamp}")
            return True
        else:
            print("[WARNING] No gaze data was recorded")
            return False
    
    def calculate_center_gaze_ratio(self):
        """중앙 영역 응시 비율 계산"""
        if self.gaze_heatmap_2d is None or np.sum(self.gaze_heatmap_2d) == 0:
            return 0.0
        
        total_gaze = np.sum(self.gaze_heatmap_2d)
        
        center_margin_x = self.HEATMAP_GRID_W // 4
        center_margin_y = self.HEATMAP_GRID_H // 4
        
        start_x = center_margin_x
        end_x = self.HEATMAP_GRID_W - center_margin_x
        start_y = center_margin_y  
        end_y = self.HEATMAP_GRID_H - center_margin_y
        
        center_gaze = np.sum(self.gaze_heatmap_2d[start_y:end_y, start_x:end_x])
        center_ratio = (center_gaze / total_gaze) * 100 if total_gaze > 0 else 0.0
        
        return center_ratio
    
    def save_tracking_results(self, prefix="gaze_tracking"):
        """시선 추적 결과 저장"""
        if not os.path.exists("results"):
            os.makedirs("results")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        saved_files = []
        
        # 히트맵 JSON 저장
        if self.gaze_heatmap_2d is not None and np.sum(self.gaze_heatmap_2d) > 0:
            center_ratio = self.calculate_center_gaze_ratio()
            
            heatmap_data = {
                "metadata": {
                    "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "screen_size": {
                        "width": self.WINDOW_WIDTH,
                        "height": self.WINDOW_HEIGHT
                    },
                    "grid_size": {
                        "width": self.HEATMAP_GRID_W,
                        "height": self.HEATMAP_GRID_H
                    },
                    "total_gaze_samples": int(np.sum(self.gaze_heatmap_2d)),
                    "active_grid_cells": int(np.count_nonzero(self.gaze_heatmap_2d)),
                    "max_gaze_count": int(np.max(self.gaze_heatmap_2d)),
                    "center_gaze_ratio": round(center_ratio, 2)
                },
                "heatmap_data": self.gaze_heatmap_2d.tolist(),
                "analysis": {
                    "center_gaze_percentage": round(center_ratio, 2),
                    "peripheral_gaze_percentage": round(100 - center_ratio, 2),
                    "gaze_distribution": "concentrated" if center_ratio > 60 else "distributed" if center_ratio > 30 else "scattered"
                }
            }
            
            heatmap_filename = f"results/{prefix}_heatmap_{timestamp}.json"
            with open(heatmap_filename, 'w', encoding='utf-8') as f:
                # heatmap_data만 따로 처리
                heatmap_array = heatmap_data.pop('heatmap_data')
                
                # 메타데이터와 분석 정보를 먼저 저장
                json_str = json.dumps(heatmap_data, indent=2, ensure_ascii=False)
                
                # heatmap_data를 각 행별로 한 줄씩 처리
                heatmap_lines = []
                for row in heatmap_array:
                    heatmap_lines.append('    ' + json.dumps(row, separators=(',', ':')))
                heatmap_str = '[\n' + ',\n'.join(heatmap_lines) + '\n  ]'
                
                # 마지막 }를 제거하고 heatmap_data 추가
                json_str = json_str.rstrip('\n}') + ',\n  "heatmap_data": ' + heatmap_str + '\n}'
                
                f.write(json_str)
            
            saved_files.append(heatmap_filename)
            print(f"[INFO] Heatmap saved: {heatmap_filename}")
        
        # 상세 시선 데이터 저장
        if self.gaze_data:
            detailed_filename = f"results/{prefix}_detailed_{timestamp}.json"
            with open(detailed_filename, 'w', encoding='utf-8') as f:
                json.dump(self.gaze_data, f, indent=2, ensure_ascii=False)
            
            saved_files.append(detailed_filename)
            print(f"[INFO] Detailed gaze data saved: {detailed_filename}")
        
        print(f"[INFO] Tracking results saved with prefix: {prefix}")
        return saved_files

if __name__ == "__main__":
    tracker = GazeTracker()
    
    print("=== GAZE TRACKING ===")
    print("1. Load calibration data")
    print("2. Process video file")
    print("3. Live webcam tracking")
    
    choice = input("Select option (1-3): ").strip()
    
    if choice == "1":
        calib_file = input("Enter calibration file path: ").strip()
        if tracker.load_calibration_data(calib_file):
            print("[INFO] Calibration data loaded successfully")
        else:
            print("[ERROR] Failed to load calibration data")
    
    elif choice == "2":
        calib_file = input("Enter calibration file path: ").strip()
        video_file = input("Enter video file path: ").strip()
        
        if tracker.load_calibration_data(calib_file):
            tracker.process_video_file(video_file)
        else:
            print("[ERROR] Failed to load calibration data")
    
    elif choice == "3":
        calib_file = input("Enter calibration file path: ").strip()
        
        if tracker.load_calibration_data(calib_file):
            tracker.process_webcam_live()
        else:
            print("[ERROR] Failed to load calibration data")