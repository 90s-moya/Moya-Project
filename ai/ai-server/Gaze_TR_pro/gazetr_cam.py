import cv2
import numpy as np
import os
from omegaconf import OmegaConf
from ptgaze.gaze_estimator import GazeEstimator
from ptgaze.head_pose_estimation import LandmarkEstimator
from scipy.interpolate import griddata, Rbf
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline

import json
import time
from datetime import datetime

def analyze_gaze_data(gaze_points, frame_size, roi_ratio=0.3):
    if not gaze_points:
        return None

    width, height = frame_size
    total_frames = len(gaze_points)

    # 중앙 원형 ROI 계산 (화면에 그려지는 원과 동일)
    center_x, center_y = width // 2, height // 2
    roi_radius = int(min(width, height) * roi_ratio)

    # 원형 ROI 응시 비율 계산
    roi_focus_frames = 0
    for p in gaze_points:
        # 점과 중심 사이의 거리 계산
        distance = ((p["x"] - center_x) ** 2 + (p["y"] - center_y) ** 2) ** 0.5
        if distance <= roi_radius:
            roi_focus_frames += 1
    
    target_focus_ratio = (roi_focus_frames / total_frames) * 100

    # 시선 일관성 계산
    coords = np.array([[p["x"], p["y"]] for p in gaze_points])
    diffs = np.linalg.norm(np.diff(coords, axis=0), axis=1)
    unstable_moves = np.sum(diffs > 30)  # 30픽셀 이상 이동 = 불안정
    gaze_consistency = (1 - unstable_moves / total_frames) * 100

    return {
        "gaze_consistency": round(gaze_consistency, 2),
        "target_focus_ratio": round(target_focus_ratio, 2),
        "details": {
            "total_frames": total_frames,
            "unstable_moves": int(unstable_moves),
            "roi_focus_frames": roi_focus_frames
        }
    }

def save_report(data, save_dir=r"C:\Users\SSAFY\Desktop\AI\Gaze_TR_pro\report"):
    os.makedirs(save_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_path = os.path.join(save_dir, f"gaze_report_{timestamp}.json")

    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"[INFO] Report saved to {save_path}")

# ===============================
# 1. 모니터/해상도 환경 설정 (15인치 노트북)
# ===============================
# 15인치 노트북 일반적 설정
SCREEN_WIDTH_PX = 1920   # 실제 화면 해상도
SCREEN_HEIGHT_PX = 1080

# 웹캠 창 크기 (화면의 70% 크기로 설정)
WINDOW_WIDTH = 1344  # 1920 * 0.7
WINDOW_HEIGHT = 756  # 1080 * 0.7

# 실제 모니터 크기 (물리적 크기)
SCREEN_WIDTH_MM = 345   # 15.6인치 16:9 화면 가로
SCREEN_HEIGHT_MM = 194  # 15.6인치 16:9 화면 세로
VIEWING_DISTANCE_MM = 500  # 눈-화면 거리 50cm

PPI_X = WINDOW_WIDTH / SCREEN_WIDTH_MM
PPI_Y = WINDOW_HEIGHT / SCREEN_HEIGHT_MM

# ===============================
# 2. 캘리브레이션 데이터
# ===============================
calib_vectors = []
calib_points = []
transform_matrix = None
transform_method = None
poly_model_x = None
poly_model_y = None
rbf_x = None
rbf_y = None

# 캘리브레이션 타겟 - 9개 포인트로 최적화
calib_targets = [
    # 모서리 4개 (필수)
    (150, 100),     # 좌상단
    (1190, 100),    # 우상단  
    (150, 650),     # 좌하단
    (1190, 650),    # 우하단
    # 중앙과 가장자리 중점 5개
    (672, 378),     # 정중앙 (가장 중요)
    (400, 200),     # 좌상 중간 
    (940, 200),     # 우상 중간
    (400, 550),     # 좌하 중간
    (940, 550),     # 우하 중간
]
calib_index = 0
calibrating = True
samples_per_point = 1  # 각 포인트당 수집할 샘플 수 (1=빠름, 3=정확함)

# ===============================
# 3. 시선 벡터 → 화면 좌표 변환
# ===============================
def gaze_to_screen_coords(gaze_vector):
    """ETH-XGaze 시선 벡터를 화면 좌표로 변환 (간단한 각도 기반)"""
    vx, vy, vz = gaze_vector[0], gaze_vector[1], gaze_vector[2]
    
    # 각도 계산
    yaw = np.arctan2(-vx, -vz)    # 좌우 각도
    pitch = np.arcsin(-vy)        # 상하 각도
    
    # 각도를 화면 좌표로 변환 (스케일링 팩터 사용)
    scale_factor = 800  # 조정 가능한 스케일링 팩터
    
    screen_x = int(np.tan(yaw) * scale_factor + (WINDOW_WIDTH / 2))
    screen_y = int(np.tan(pitch) * scale_factor + (WINDOW_HEIGHT / 2))
    
    return screen_x, screen_y


def calibrate_step(gaze_vector, target_point):
    """캘리브레이션 단계: gaze vector를 직접 사용"""
    # gaze vector 자체를 특징으로 사용 (각도 변환)
    vx, vy, vz = gaze_vector[0], gaze_vector[1], gaze_vector[2]
    yaw = np.arctan2(-vx, -vz)
    pitch = np.arcsin(-vy)
    
    # 각도를 특징으로 저장
    calib_vectors.append([yaw, pitch])
    calib_points.append([target_point[0], target_point[1]])
    
    print(f"[CALIB] Gaze: ({vx:.3f}, {vy:.3f}, {vz:.3f})")
    print(f"[CALIB] Angles: yaw={np.degrees(yaw):.1f}°, pitch={np.degrees(pitch):.1f}°")
    print(f"[CALIB] Target: {target_point}")


def compute_transform():
    global transform_matrix, transform_method, poly_model_x, poly_model_y, rbf_x, rbf_y
    
    if len(calib_vectors) < 4:
        print("[ERROR] Need at least 4 calibration points!")
        return
    
    A = np.array(calib_vectors, dtype=np.float32)
    B = np.array(calib_points, dtype=np.float32)
    
    print(f"[CALIB] Computing transform from {len(calib_vectors)} points")
    print(f"[CALIB] Angle ranges: yaw={np.degrees(A[:,0].min()):.1f}° to {np.degrees(A[:,0].max()):.1f}°")
    print(f"[CALIB] Angle ranges: pitch={np.degrees(A[:,1].min()):.1f}° to {np.degrees(A[:,1].max()):.1f}°")
    print(f"[CALIB] Screen ranges: x={B[:,0].min():.0f} to {B[:,0].max():.0f}")
    print(f"[CALIB] Screen ranges: y={B[:,1].min():.0f} to {B[:,1].max():.0f}")
    
    methods = []
    
    # 1. 기존 기하학적 변환들
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
    
    # 2. 다항식 회귀 (2차 및 3차)
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
    
    # 3. RBF (Radial Basis Function) 보간
    try:
        for function in ['multiquadric', 'thin_plate', 'gaussian']:
            rbf_x_model = Rbf(A[:, 0], A[:, 1], B[:, 0], function=function, smooth=0.1)
            rbf_y_model = Rbf(A[:, 0], A[:, 1], B[:, 1], function=function, smooth=0.1)
            methods.append((f"RBF_{function}", (rbf_x_model, rbf_y_model), "rbf"))
    except Exception as e:
        print(f"[CALIB] RBF interpolation failed: {e}")
    
    # 각 방법의 정확도 평가
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
            
            # 오차 계산
            error = np.mean(np.sqrt(np.sum((transformed - B)**2, axis=1)))
            max_error = np.max(np.sqrt(np.sum((transformed - B)**2, axis=1)))
            
            print(f"[CALIB] {method_name}: avg_error={error:.1f}px, max_error={max_error:.1f}px")
            
            # 방향별 오차 분석
            errors_by_quadrant = []
            for i, (target, pred) in enumerate(zip(B, transformed)):
                quad = ""
                if target[0] < B[:, 0].mean() and target[1] < B[:, 1].mean():
                    quad = "TL"
                elif target[0] > B[:, 0].mean() and target[1] < B[:, 1].mean():
                    quad = "TR"
                elif target[0] < B[:, 0].mean() and target[1] > B[:, 1].mean():
                    quad = "BL"
                else:
                    quad = "BR"
                
                err = np.sqrt(np.sum((target - pred)**2))
                errors_by_quadrant.append((quad, err))
            
            # 사분면별 평균 오차
            from collections import defaultdict
            quad_errors = defaultdict(list)
            for quad, err in errors_by_quadrant:
                quad_errors[quad].append(err)
            
            quad_balance = max([np.mean(errs) for errs in quad_errors.values()]) - min([np.mean(errs) for errs in quad_errors.values()])
            
            # 균형잡힌 오차와 전체 오차를 모두 고려
            combined_score = error + quad_balance * 0.5
            
            print(f"[CALIB] {method_name}: quad_balance={quad_balance:.1f}px, combined_score={combined_score:.1f}")
            
            if combined_score < best_error:
                best_error = combined_score
                best_method = method_name
                best_transform = transform
                best_type = method_type
        
        except Exception as e:
            print(f"[CALIB] {method_name} evaluation failed: {e}")
    
    if best_transform is not None:
        transform_matrix = best_transform
        transform_method = best_type
        
        if best_type == "polynomial":
            poly_model_x, poly_model_y = best_transform
        elif best_type == "rbf":
            rbf_x, rbf_y = best_transform
            
        print(f"[CALIB] Selected {best_method} (type: {best_type}) with combined score {best_error:.1f}")
    else:
        print("[ERROR] All transformation methods failed!")


def apply_transform(gaze_vector):
    global transform_matrix, transform_method, poly_model_x, poly_model_y, rbf_x, rbf_y
    if transform_matrix is None:
        return gaze_to_screen_coords(gaze_vector)
    
    # 각도 계산
    vx, vy, vz = gaze_vector[0], gaze_vector[1], gaze_vector[2]
    yaw = np.arctan2(-vx, -vz)
    pitch = np.arcsin(-vy)
    
    try:
        if transform_method == "geometric":
            if "Homography" in str(transform_matrix):
                # Homography 변환 적용
                point = np.array([yaw, pitch, 1], dtype=np.float32)
                result = np.dot(transform_matrix, point)
                if result[2] != 0:
                    transformed_x = int(result[0] / result[2])
                    transformed_y = int(result[1] / result[2])
                else:
                    return gaze_to_screen_coords(gaze_vector)
            else:
                # Affine 변환 적용
                vec = np.array([yaw, pitch, 1], dtype=np.float32)
                result = np.dot(transform_matrix, vec)
                transformed_x = int(result[0])
                transformed_y = int(result[1])
        
        elif transform_method == "polynomial":
            # 다항식 회귀 적용
            input_point = np.array([[yaw, pitch]])
            transformed_x = int(poly_model_x.predict(input_point)[0])
            transformed_y = int(poly_model_y.predict(input_point)[0])
        
        elif transform_method == "rbf":
            # RBF 보간 적용
            transformed_x = int(rbf_x(yaw, pitch))
            transformed_y = int(rbf_y(yaw, pitch))
        
        else:
            return gaze_to_screen_coords(gaze_vector)
    
    except Exception as e:
        print(f"[ERROR] Transform apply failed: {e}")
        return gaze_to_screen_coords(gaze_vector)
    
    # 화면 범위 내로 제한
    transformed_x = max(0, min(transformed_x, WINDOW_WIDTH - 1))
    transformed_y = max(0, min(transformed_y, WINDOW_HEIGHT - 1))
    
    return transformed_x, transformed_y

# ===============================
# 4. Config 구성
# ===============================
home = os.path.expanduser("~")

camera_params_path = os.path.join(os.path.dirname(__file__), "calib", "sample_params.yaml")
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
    "model": {
        "name": "resnet18"
    },
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

# ===============================
# 5. ptgaze 초기화
# ===============================
gaze_estimator = GazeEstimator(config)
landmark_estimator = LandmarkEstimator(config)

# ===============================
# 6. 웹캠 캘리브레이션 루프
# ===============================
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, WINDOW_WIDTH)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, WINDOW_HEIGHT)

# 캘리브레이션 모드 선택
print("=== CALIBRATION MODE SELECTION ===")
print("1. Quick mode: 9 points, 1 sample each (fast)")
print("2. Balanced mode: 9 points, 2 samples each (recommended)")  
print("3. Precise mode: 9 points, 3 samples each (accurate)")
print("4. Custom mode: 13 points, 1 sample each (full coverage)")

mode_choice = input("Select mode (1-4): ").strip()

if mode_choice == "2":
    samples_per_point = 2
    print("[INFO] Balanced mode selected")
elif mode_choice == "3":
    samples_per_point = 3
    print("[INFO] Precise mode selected") 
elif mode_choice == "4":
    samples_per_point = 1
    # 더 많은 포인트로 변경
    calib_targets = [
        (150, 100), (1190, 100), (150, 650), (1190, 650),  # 모서리 4개
        (672, 378), (672, 100), (672, 650), (150, 378), (1190, 378),  # 중앙 5개
        (400, 240), (940, 240), (400, 510), (940, 510)  # 대각선 4개
    ]
    print("[INFO] Custom mode selected - 13 points")
else:
    samples_per_point = 1
    print("[INFO] Quick mode selected (default)")

print(f"[INFO] Calibration will use {len(calib_targets)} points with {samples_per_point} samples each")
print(f"[INFO] Total samples needed: {len(calib_targets) * samples_per_point}")
print("[INFO] Press SPACE to record calibration point, 'q' to quit.")

# 첫 번째 프레임에서 실제 크기 확인 및 타겟 조정
first_frame = True
actual_targets = []

# ==== 시선 로그 초기화 ====
gaze_log = []
frame_idx = 0
start_time = time.time()


while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # 첫 번째 프레임에서 실제 크기에 맞게 타겟 재조정
    if first_frame:
        actual_height, actual_width = frame.shape[:2]
        print(f"[INFO] Actual frame size: {actual_width}x{actual_height}")
        
        # 비율에 맞게 타겟 재조정
        scale_x = actual_width / WINDOW_WIDTH
        scale_y = actual_height / WINDOW_HEIGHT
        
        for original_target in calib_targets:
            new_x = int(original_target[0] * scale_x)
            new_y = int(original_target[1] * scale_y)
            actual_targets.append((new_x, new_y))
        
        print(f"[INFO] Adjusted targets: {actual_targets}")
        first_frame = False
    
    # 프레임 밝기 조정 (더 잘 보이게)
    frame = cv2.convertScaleAbs(frame, alpha=1.2, beta=30)

    # Mediapipe 얼굴 탐지
    faces = landmark_estimator.detect_faces(frame)
    if len(faces) == 0:
        cv2.putText(frame, "No face detected", (30, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        cv2.imshow("Gaze Calibration", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        continue

    face = faces[0]

    # 시선 추정 (수정된 방식)
    try:
        gaze_estimator.estimate_gaze(frame, face)
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

    # 중앙 응시 영역 표시 (항상 표시)
    center_x, center_y = frame.shape[1] // 2, frame.shape[0] // 2
    roi_radius = int(min(frame.shape[1], frame.shape[0]) * 0.3)  # 화면의 30% 크기의 반지름
    cv2.circle(frame, (center_x, center_y), roi_radius, (128, 128, 128), 2)  # 회색 원
    cv2.putText(frame, "Center Focus Area", (center_x - 80, center_y - roi_radius - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (128, 128, 128), 2)
    
    # 캘리브레이션 모드 시 타겟 표시
    if calibrating and actual_targets:
        target = actual_targets[calib_index]
        print(f"[DEBUG] Target {calib_index+1} at: {target}, Frame size: {frame.shape[:2]}")
        
        # 더 크고 밝은 캘리브레이션 타겟
        cv2.circle(frame, target, 25, (0, 255, 255), -1)  # 노란색 원 (크기 25)
        cv2.circle(frame, target, 30, (255, 255, 255), 3)  # 흰색 테두리
        # 현재 포인트의 수집된 샘플 수 계산
        current_target = actual_targets[calib_index]
        current_samples = len([v for v, p in zip(calib_vectors, calib_points) if tuple(p) == current_target])
        needed_samples = samples_per_point - current_samples
        
        cv2.putText(frame, f"Point {calib_index+1}/{len(actual_targets)} - Need {needed_samples} more samples",
                    (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(frame, f"Target: {target}", (30, 90), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

    # 시선 좌표 변환
    raw_screen_point = gaze_to_screen_coords(gaze_vector)
    
    # 화면 범위 내로 제한
    raw_screen_point = (
        max(0, min(raw_screen_point[0], frame.shape[1] - 1)),
        max(0, min(raw_screen_point[1], frame.shape[0] - 1))
    )

    # 캘리브레이션 보정 적용
    if transform_matrix is not None:
        calibrated_point = apply_transform(gaze_vector)
        # ==== 캘리브레이션 후 시선 좌표 기록 ====
        frame_idx += 1
        timestamp = round(time.time() - start_time, 3)
        gaze_log.append({
            "frame": frame_idx,
            "time": timestamp,
            "x": calibrated_point[0],
            "y": calibrated_point[1]
        })

        # 캘리브레이션 적용된 점 (큰 녹색)
        cv2.circle(frame, calibrated_point, 10, (0, 255, 0), -1)  # 녹색 원
        cv2.circle(frame, calibrated_point, 15, (0, 200, 0), 3)  # 어두운 녹색 테두리
        
        # 원시 점도 표시 (작은 빨간색)
        cv2.circle(frame, raw_screen_point, 5, (0, 0, 255), -1)  # 빨간색 원
        
        # 정보 표시
        cv2.putText(frame, "GREEN: Calibrated, RED: Raw", (30, frame.shape[0] - 60), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        cv2.putText(frame, f"Raw: {raw_screen_point}, Cal: {calibrated_point}", 
                    (30, frame.shape[0] - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    else:
        # 캘리브레이션 전: 원시 점만 표시
        cv2.circle(frame, raw_screen_point, 8, (0, 0, 255), -1)  # 빨간색 원
        cv2.circle(frame, raw_screen_point, 12, (0, 0, 200), 2)  # 어두운 빨간색 테두리
        cv2.putText(frame, "RED: Raw gaze (not calibrated)", (30, frame.shape[0] - 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    cv2.imshow("Gaze Calibration", frame)
    key = cv2.waitKey(1) & 0xFF

    # 캘리브레이션 포인트 기록
    if key == 32 and calibrating and actual_targets:  # SPACE
        current_target = actual_targets[calib_index]
        calibrate_step(gaze_vector, current_target)
        
        # 현재 포인트의 수집된 샘플 수 확인
        current_samples = len([v for v, p in zip(calib_vectors, calib_points) if tuple(p) == current_target])
        print(f"[INFO] Recorded sample {current_samples}/{samples_per_point} for point {calib_index+1}")
        
        # 충분한 샘플이 수집되면 다음 포인트로
        if current_samples >= samples_per_point:
            calib_index += 1
            print(f"[INFO] Point {calib_index} completed, moving to next...")
            
            if calib_index >= len(actual_targets):
                compute_transform() 
                calibrating = False
                print("[INFO] Calibration complete!")
                print("[INFO] Now look around - GREEN dot shows calibrated gaze, RED dot shows raw gaze")
                print("[INFO] Press 'r' to recalibrate, 'q' to quit")

    # 재캘리브레이션
    if key == ord('r'):
        calib_vectors.clear()
        calib_points.clear()
        transform_matrix = None
        transform_method = None
        poly_model_x = None
        poly_model_y = None
        rbf_x = None
        rbf_y = None
        calib_index = 0
        calibrating = True
        print("[INFO] Recalibrating...")
        
    if key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
# ==== 종료 시 리포트 분석 및 저장 ====
if gaze_log:
    report_data = analyze_gaze_data(gaze_log, (WINDOW_WIDTH, WINDOW_HEIGHT))
    if report_data:
        save_report(report_data)
else:
    print("[INFO] No gaze data recorded, report not generated.")
