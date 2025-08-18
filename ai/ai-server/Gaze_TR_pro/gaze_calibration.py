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
from collections import defaultdict

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

class GazeCalibrator:
    def __init__(self, screen_width=1920, screen_height=1080, window_width=1344, window_height=756):
        # 화면 설정
        self.SCREEN_WIDTH_PX = screen_width
        self.SCREEN_HEIGHT_PX = screen_height
        self.WINDOW_WIDTH = window_width
        self.WINDOW_HEIGHT = window_height
        
        # 캘리브레이션 데이터
        self.calib_vectors = []
        self.calib_points = []
        self.transform_matrix = None
        self.transform_method = None
        self.poly_model_x = None
        self.poly_model_y = None
        self.rbf_x = None
        self.rbf_y = None
        
        # 캘리브레이션 타겟 포인트
        self.calib_targets = [
            (150, 100), (1190, 100), (150, 650), (1190, 650),  # 모서리 4개
            (672, 378),  # 정중앙
            (400, 200), (940, 200), (400, 550), (940, 550),    # 중간 4개
        ]
        
        self.calib_index = 0
        self.calibrating = True
        self.samples_per_point = 1
        
        # 카메라 설정
        self.FLIP_CAMERA = True
        
        # ptgaze 초기화
        self._init_ptgaze()
    
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
            "device": "cuda",
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
    
    def gaze_to_screen_coords(self, gaze_vector):
        """ETH-XGaze 시선 벡터를 화면 좌표로 변환"""
        vx, vy, vz = gaze_vector[0], gaze_vector[1], gaze_vector[2]
        
        yaw = np.arctan2(-vx, -vz)
        pitch = np.arcsin(-vy)
        
        scale_factor = 800
        screen_x = int(np.tan(yaw) * scale_factor + (self.WINDOW_WIDTH / 2))
        screen_y = int(np.tan(pitch) * scale_factor + (self.WINDOW_HEIGHT / 2))
        
        return screen_x, screen_y
    
    def add_calibration_point(self, gaze_vector, target_point):
        """캘리브레이션 포인트 추가"""
        vx, vy, vz = gaze_vector[0], gaze_vector[1], gaze_vector[2]
        yaw = np.arctan2(-vx, -vz)
        pitch = np.arcsin(-vy)
        
        self.calib_vectors.append([yaw, pitch])
        self.calib_points.append([target_point[0], target_point[1]])
        
        print(f"[CALIB] Gaze: ({vx:.3f}, {vy:.3f}, {vz:.3f})")
        print(f"[CALIB] Angles: yaw={np.degrees(yaw):.1f}°, pitch={np.degrees(pitch):.1f}°")
        print(f"[CALIB] Target: {target_point}")
    
    def compute_transform(self):
        """캘리브레이션 변환 행렬 계산"""
        if len(self.calib_vectors) < 4:
            print("[ERROR] Need at least 4 calibration points!")
            return False
        
        A = np.array(self.calib_vectors, dtype=np.float32)
        B = np.array(self.calib_points, dtype=np.float32)
        
        print(f"[CALIB] Computing transform from {len(self.calib_vectors)} points")
        
        methods = []
        
        # 기하학적 변환
        try:
            homo_result = cv2.findHomography(A, B, cv2.RANSAC, 5.0)
            if homo_result is not None and homo_result[0] is not None:
                methods.append(("Homography", homo_result[0], "geometric"))
        except Exception as e:
            print(f"[CALIB] Homography failed: {e}")
        
        try:
            affine_result = cv2.estimateAffine2D(A, B, method=cv2.RANSAC, confidence=0.95)
            if affine_result is not None and affine_result[0] is not None:
                methods.append(("Affine2D", affine_result[0], "geometric"))
        except Exception as e:
            print(f"[CALIB] Affine2D failed: {e}")
        
        # 다항식 회귀
        try:
            for degree in [2, 3]:
                poly_x = Pipeline([
                    ('poly', PolynomialFeatures(degree=degree)),
                    ('linear', LinearRegression())
                ])
                poly_y = Pipeline([
                    ('poly', PolynomialFeatures(degree=degree)),
                    ('linear', LinearRegression())
                ])
                
                poly_x.fit(A, B[:, 0])
                poly_y.fit(A, B[:, 1])
                
                methods.append((f"Polynomial_{degree}D", (poly_x, poly_y), "polynomial"))
        except Exception as e:
            print(f"[CALIB] Polynomial regression failed: {e}")
        
        # RBF 보간
        try:
            for function in ['multiquadric', 'thin_plate', 'gaussian']:
                rbf_x_model = Rbf(A[:, 0], A[:, 1], B[:, 0], function=function, smooth=0.1)
                rbf_y_model = Rbf(A[:, 0], A[:, 1], B[:, 1], function=function, smooth=0.1)
                methods.append((f"RBF_{function}", (rbf_x_model, rbf_y_model), "rbf"))
        except Exception as e:
            print(f"[CALIB] RBF interpolation failed: {e}")
        
        # 최적 방법 선택
        best_method = None
        best_transform = None
        best_error = float('inf')
        best_type = None
        
        for method_name, transform, method_type in methods:
            try:
                if method_type == "geometric":
                    if method_name == "Homography":
                        A_homo = np.column_stack((A, np.ones(len(A))))
                        transformed = []
                        for point in A_homo:
                            result_homo = np.dot(transform, point)
                            if result_homo[2] != 0:
                                transformed.append([result_homo[0]/result_homo[2], result_homo[1]/result_homo[2]])
                        transformed = np.array(transformed)
                    else:  # Affine
                        A_affine = np.column_stack((A, np.ones(len(A))))
                        transformed = np.array([np.dot(transform, point) for point in A_affine])
                
                elif method_type == "polynomial":
                    poly_x, poly_y = transform
                    pred_x = poly_x.predict(A)
                    pred_y = poly_y.predict(A)
                    transformed = np.column_stack((pred_x, pred_y))
                
                elif method_type == "rbf":
                    rbf_x_model, rbf_y_model = transform
                    pred_x = rbf_x_model(A[:, 0], A[:, 1])
                    pred_y = rbf_y_model(A[:, 0], A[:, 1])
                    transformed = np.column_stack((pred_x, pred_y))
                
                error = np.mean(np.sqrt(np.sum((transformed - B)**2, axis=1)))
                print(f"[CALIB] {method_name}: avg_error={error:.1f}px")
                
                if error < best_error:
                    best_error = error
                    best_method = method_name
                    best_transform = transform
                    best_type = method_type
            
            except Exception as e:
                print(f"[CALIB] {method_name} evaluation failed: {e}")
        
        if best_transform is not None:
            self.transform_matrix = best_transform
            self.transform_method = best_type
            
            if best_type == "polynomial":
                self.poly_model_x, self.poly_model_y = best_transform
            elif best_type == "rbf":
                self.rbf_x, self.rbf_y = best_transform
                
            print(f"[CALIB] Selected {best_method} (type: {best_type}) with error {best_error:.1f}")
            return True
        else:
            print("[ERROR] All transformation methods failed!")
            return False
    
    def save_calibration_data(self, filename=None):
        """캘리브레이션 데이터 저장"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d")
            filename = f"calibration_data_{timestamp}.json"
        
        calib_data = {
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "screen_settings": {
                "screen_width": self.SCREEN_WIDTH_PX,
                "screen_height": self.SCREEN_HEIGHT_PX,
                "window_width": self.WINDOW_WIDTH,
                "window_height": self.WINDOW_HEIGHT
            },
            "calibration_vectors": self.calib_vectors,
            "calibration_points": self.calib_points,
            "transform_method": self.transform_method,
            "samples_per_point": self.samples_per_point,
            "total_points": len(self.calib_points)
        }
        
        # 변환 모델 데이터 추가
        if self.transform_method == "polynomial" and self.poly_model_x is not None:
            calib_data["polynomial_models"] = {
                "degree": self.poly_model_x.named_steps['poly'].degree,
                "x_coefficients": self.poly_model_x.named_steps['linear'].coef_.tolist(),
                "y_coefficients": self.poly_model_y.named_steps['linear'].coef_.tolist(),
                "x_intercept": float(self.poly_model_x.named_steps['linear'].intercept_),
                "y_intercept": float(self.poly_model_y.named_steps['linear'].intercept_)
            }
        elif self.transform_method == "geometric" and self.transform_matrix is not None:
            calib_data["transform_matrix"] = self.transform_matrix.tolist()
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(calib_data, f, indent=2, ensure_ascii=False)
        
        print(f"[INFO] Calibration data saved: {filename}")
        return filename
    
    def run_calibration(self, mode="quick"):
        """캘리브레이션 실행"""
        if mode == "balanced":
            self.samples_per_point = 2
        elif mode == "precise":
            self.samples_per_point = 3
        elif mode == "custom":
            self.samples_per_point = 1
            self.calib_targets = [
                (150, 100), (1190, 100), (150, 650), (1190, 650),
                (672, 378), (672, 100), (672, 650), (150, 378), (1190, 378),
                (400, 240), (940, 240), (400, 510), (940, 510)
            ]
        else:
            self.samples_per_point = 1
        
        print(f"[INFO] Starting calibration with {len(self.calib_targets)} points, {self.samples_per_point} samples each")
        
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("[ERROR] Cannot open webcam")
            return False
        
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.WINDOW_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.WINDOW_HEIGHT)
        cv2.namedWindow("Gaze Calibration", cv2.WINDOW_AUTOSIZE)
        
        print("[INFO] Press SPACE to record calibration point, 'q' to quit")
        
        try:
            while self.calibrating:
                ret, frame = cap.read()
                if not ret:
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
                    cv2.imshow("Gaze Calibration", frame)
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
                        cv2.imshow("Gaze Calibration", frame)
                        if cv2.waitKey(1) & 0xFF == ord('q'):
                            break
                        continue
                except Exception as e:
                    cv2.putText(frame, f"Error: {str(e)[:50]}", (30, 80),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                    cv2.imshow("Gaze Calibration", frame)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                    continue
                
                # 캘리브레이션 타겟 표시
                if self.calib_index < len(self.calib_targets):
                    target = self.calib_targets[self.calib_index]
                    
                    cv2.circle(frame, target, 25, (0, 255, 255), -1)
                    cv2.circle(frame, target, 30, (255, 255, 255), 3)
                    
                    current_samples = len([v for v, p in zip(self.calib_vectors, self.calib_points) 
                                         if tuple(p) == target])
                    needed_samples = self.samples_per_point - current_samples
                    
                    cv2.putText(frame, f"Point {self.calib_index+1}/{len(self.calib_targets)} - Need {needed_samples} more samples",
                                (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                    cv2.putText(frame, f"Target: {target}", (30, 90), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
                
                # 현재 시선 위치 표시
                raw_screen_point = self.gaze_to_screen_coords(gaze_vector)
                raw_screen_point = (
                    max(0, min(raw_screen_point[0], frame.shape[1] - 1)),
                    max(0, min(raw_screen_point[1], frame.shape[0] - 1))
                )
                cv2.circle(frame, raw_screen_point, 8, (0, 0, 255), -1)
                
                cv2.imshow("Gaze Calibration", frame)
                
                key = cv2.waitKey(1) & 0xFF
                
                # 캘리브레이션 포인트 기록
                if key == 32 and self.calib_index < len(self.calib_targets):  # SPACE
                    current_target = self.calib_targets[self.calib_index]
                    self.add_calibration_point(gaze_vector, current_target)
                    
                    current_samples = len([v for v, p in zip(self.calib_vectors, self.calib_points) 
                                         if tuple(p) == current_target])
                    print(f"[INFO] Recorded sample {current_samples}/{self.samples_per_point} for point {self.calib_index+1}")
                    
                    if current_samples >= self.samples_per_point:
                        self.calib_index += 1
                        if self.calib_index >= len(self.calib_targets):
                            success = self.compute_transform()
                            if success:
                                self.calibrating = False
                                print("[INFO] Calibration complete!")
                            else:
                                print("[ERROR] Calibration failed!")
                                break
                
                if key == ord('q'):
                    break
        
        except KeyboardInterrupt:
            print("\n[INFO] Calibration interrupted")
        finally:
            cap.release()
            cv2.destroyAllWindows()
        
        return not self.calibrating  # True if calibration completed successfully

if __name__ == "__main__":
    calibrator = GazeCalibrator()
    
    print("=== CALIBRATION MODE SELECTION ===")
    print("1. Quick mode: 9 points, 1 sample each")
    print("2. Balanced mode: 9 points, 2 samples each")  
    print("3. Precise mode: 9 points, 3 samples each")
    print("4. Custom mode: 13 points, 1 sample each")
    
    mode_choice = input("Select mode (1-4): ").strip()
    
    mode_map = {"1": "quick", "2": "balanced", "3": "precise", "4": "custom"}
    mode = mode_map.get(mode_choice, "quick")
    
    success = calibrator.run_calibration(mode)
    
    if success:
        filename = calibrator.save_calibration_data()
        print(f"[INFO] Calibration completed and saved to: {filename}")
    else:
        print("[ERROR] Calibration failed or was cancelled")