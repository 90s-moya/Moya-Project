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
import matplotlib.pyplot as plt
from collections import defaultdict
from datetime import datetime
import json

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

# 히트맵용 시선 추적 데이터 - 2차원 응시 빈도 배열
gaze_heatmap_2d = None  # 격자 형태의 2D 배열 (응시 횟수 저장)

# 히트맵 격자 설정 (화면을 격자로 나누어서 한눈에 보기)
HEATMAP_GRID_W = 160   # 160 격자 (가로)
HEATMAP_GRID_H = 90    # 90 격자 (세로)

# 카메라 설정
FLIP_CAMERA = True  # 카메라 좌우반전 여부

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


def initialize_gaze_heatmap():
    """격자 형태의 2차원 응시 빈도 배열 초기화"""
    global gaze_heatmap_2d
    gaze_heatmap_2d = np.zeros((HEATMAP_GRID_H, HEATMAP_GRID_W), dtype=np.int32)
    print(f"[INFO] Initialized gaze heatmap grid: {HEATMAP_GRID_W}x{HEATMAP_GRID_H}")


def add_gaze_to_heatmap(x, y):
    """특정 좌표를 격자로 변환하여 응시 빈도 +1"""
    global gaze_heatmap_2d
    
    if gaze_heatmap_2d is None:
        initialize_gaze_heatmap()
    
    # 좌표를 격자 인덱스로 변환
    grid_x = int(x / (WINDOW_WIDTH / HEATMAP_GRID_W))
    grid_y = int(y / (WINDOW_HEIGHT / HEATMAP_GRID_H))
    
    # 경계 확인
    grid_x = max(0, min(grid_x, HEATMAP_GRID_W - 1))
    grid_y = max(0, min(grid_y, HEATMAP_GRID_H - 1))
    
    # 해당 격자의 응시 횟수 증가
    gaze_heatmap_2d[grid_y][grid_x] += 1


def save_gaze_heatmap_2d(filename=None):
    """2차원 응시 빈도 배열을 전체 격자 형태로 저장 (한눈에 보기)"""
    global gaze_heatmap_2d
    
    if gaze_heatmap_2d is None or np.sum(gaze_heatmap_2d) == 0:
        print("[WARNING] No gaze heatmap data to save")
        return
    
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"results/gaze_heatmap_2d_{timestamp}.txt"
    
    with open(filename, 'w') as f:
        f.write("# Gaze Heatmap 2D Grid Array (Full Grid Format)\n")
        f.write(f"# Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"# Screen Size: {WINDOW_WIDTH}x{WINDOW_HEIGHT} -> Grid: {HEATMAP_GRID_W}x{HEATMAP_GRID_H}\n")
        f.write(f"# Total gaze samples: {np.sum(gaze_heatmap_2d)}\n")
        f.write(f"# Grid cell size: {WINDOW_WIDTH//HEATMAP_GRID_W}x{WINDOW_HEIGHT//HEATMAP_GRID_H} pixels\n")
        f.write("# Format: Each number = gaze count for that grid cell\n")
        f.write("# 0 = never gazed, higher numbers = more frequently gazed\n")
        f.write("# Each row = horizontal line of screen, each column = vertical line\n")
        f.write("# ====================================\n")
        
        # 전체 격자 배열을 그대로 저장 (한눈에 패턴 파악 가능)
        for row in gaze_heatmap_2d:
            # 숫자를 3자리로 맞춰서 정렬해서 보기 좋게
            formatted_row = ' '.join(f'{num:3d}' for num in row)
            f.write(formatted_row + '\n')
    
    # 통계 정보도 함께 저장
    max_gaze = np.max(gaze_heatmap_2d)
    nonzero_cells = np.count_nonzero(gaze_heatmap_2d)
    
    print(f"[INFO] Gaze heatmap 2D grid saved: {filename}")
    print(f"[INFO] Total gaze samples: {np.sum(gaze_heatmap_2d)}")
    print(f"[INFO] Grid size: {HEATMAP_GRID_W}x{HEATMAP_GRID_H} ({nonzero_cells} active cells)")
    print(f"[INFO] Max gaze count: {max_gaze}")
    
    return filename


def calculate_center_gaze_ratio():
    """중앙 영역 응시 비율 계산"""
    global gaze_heatmap_2d
    
    if gaze_heatmap_2d is None or np.sum(gaze_heatmap_2d) == 0:
        return 0.0
    
    total_gaze = np.sum(gaze_heatmap_2d)
    
    # 중앙 영역 정의 (전체의 25% 영역 = 중앙의 50%x50%)
    center_margin_x = HEATMAP_GRID_W // 4  # 160/4 = 40 (좌우 40씩 제외)
    center_margin_y = HEATMAP_GRID_H // 4  # 90/4 = 22 (상하 22씩 제외)
    
    start_x = center_margin_x
    end_x = HEATMAP_GRID_W - center_margin_x
    start_y = center_margin_y  
    end_y = HEATMAP_GRID_H - center_margin_y
    
    # 중앙 영역의 응시 횟수 합계
    center_gaze = np.sum(gaze_heatmap_2d[start_y:end_y, start_x:end_x])
    
    # 중앙 응시 비율 계산
    center_ratio = (center_gaze / total_gaze) * 100 if total_gaze > 0 else 0.0
    
    return center_ratio


def save_gaze_heatmap_json(filename=None):
    """히트맵을 JSON 형태로 저장 (중앙응시비율 포함)"""
    global gaze_heatmap_2d
    
    if gaze_heatmap_2d is None or np.sum(gaze_heatmap_2d) == 0:
        print("[WARNING] No gaze heatmap data to save as JSON")
        return
    
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"results/gaze_heatmap_{timestamp}.json"
    
    # 중앙 응시 비율 계산
    center_ratio = calculate_center_gaze_ratio()
    
    # JSON 데이터 구성
    heatmap_data = {
        "metadata": {
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "screen_size": {
                "width": WINDOW_WIDTH,
                "height": WINDOW_HEIGHT
            },
            "grid_size": {
                "width": HEATMAP_GRID_W,
                "height": HEATMAP_GRID_H
            },
            "grid_cell_size": {
                "width": WINDOW_WIDTH // HEATMAP_GRID_W,
                "height": WINDOW_HEIGHT // HEATMAP_GRID_H
            },
            "total_gaze_samples": int(np.sum(gaze_heatmap_2d)),
            "active_grid_cells": int(np.count_nonzero(gaze_heatmap_2d)),
            "max_gaze_count": int(np.max(gaze_heatmap_2d)),
            "center_gaze_ratio": round(center_ratio, 2)
        },
        "heatmap_data": gaze_heatmap_2d.tolist(),  # 2D 배열을 리스트로 변환
        "analysis": {
            "center_gaze_percentage": round(center_ratio, 2),
            "peripheral_gaze_percentage": round(100 - center_ratio, 2),
            "gaze_distribution": "concentrated" if center_ratio > 60 else "distributed" if center_ratio > 30 else "scattered"
        }
    }
    
    # JSON 파일로 저장
    with open(filename, 'w', encoding='utf-8') as f:
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
    
    print(f"[INFO] Gaze heatmap JSON saved: {filename}")
    print(f"[INFO] Total gaze samples: {heatmap_data['metadata']['total_gaze_samples']}")
    print(f"[INFO] Center gaze ratio: {center_ratio:.2f}%")
    print(f"[INFO] Gaze pattern: {heatmap_data['analysis']['gaze_distribution']}")
    
    return filename


def save_gaze_heatmap(filename=None):
    """시선 추적 데이터를 히트맵으로 저장"""
    if not gaze_heatmap_data:
        print("[WARNING] No gaze data to create heatmap")
        return
    
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"gaze_heatmap_{timestamp}.png"
    
    print(f"[INFO] Creating heatmap from {len(gaze_heatmap_data)} gaze points...")
    
    # 데이터 분리
    x_coords = [point[0] for point in gaze_heatmap_data]
    y_coords = [point[1] for point in gaze_heatmap_data]
    
    # 히트맵 생성
    plt.figure(figsize=(12, 8))
    
    # 2D 히스토그램 생성
    bins_x = min(50, max(10, len(set(x_coords))//2))
    bins_y = min(40, max(10, len(set(y_coords))//2))
    
    hist, xedges, yedges = np.histogram2d(x_coords, y_coords, bins=[bins_x, bins_y])
    
    # 좌표계 조정 (y축 뒤집기)
    hist = hist.T
    extent = [xedges[0], xedges[-1], yedges[-1], yedges[0]]
    
    # 히트맵 그리기
    plt.imshow(hist, extent=extent, cmap='hot', interpolation='bilinear', aspect='auto')
    plt.colorbar(label='Gaze Frequency')
    
    # 캘리브레이션 포인트 표시 (있을 경우)
    if calib_points:
        calib_x = [point[0] for point in calib_points]
        calib_y = [point[1] for point in calib_points]
        plt.scatter(calib_x, calib_y, c='cyan', s=100, marker='x', 
                   linewidths=3, label='Calibration Points')
        plt.legend()
    
    plt.title(f'Gaze Tracking Heatmap\n({len(gaze_heatmap_data)} data points)', fontsize=14)
    plt.xlabel('Screen X Coordinate (pixels)')
    plt.ylabel('Screen Y Coordinate (pixels)')
    
    # 화면 경계 표시
    plt.xlim(0, WINDOW_WIDTH)
    plt.ylim(0, WINDOW_HEIGHT)
    
    # 저장
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    print(f"[INFO] Heatmap saved as: {filename}")
    
    plt.close()


def save_accuracy_analysis(filename=None):
    """정확도 분석 결과를 저장"""
    if not gaze_accuracy_data:
        print("[WARNING] No accuracy data to analyze")
        return
    
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"gaze_accuracy_{timestamp}.png"
    
    print(f"[INFO] Creating accuracy analysis from {len(gaze_accuracy_data)} data points...")
    
    # 데이터 분리
    errors = [data['error'] for data in gaze_accuracy_data]
    raw_points = [data['raw_point'] for data in gaze_accuracy_data]
    calibrated_points = [data['calibrated_point'] for data in gaze_accuracy_data]
    
    # 서브플롯 생성
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))
    
    # 1. 오차 분포 히스토그램
    ax1.hist(errors, bins=30, alpha=0.7, color='red', edgecolor='black')
    ax1.set_xlabel('Error (pixels)')
    ax1.set_ylabel('Frequency')
    ax1.set_title(f'Error Distribution\nMean: {np.mean(errors):.1f}px, Std: {np.std(errors):.1f}px')
    ax1.grid(True, alpha=0.3)
    
    # 2. 오차의 공간적 분포
    if calibrated_points and raw_points:
        x_coords = [point[0] for point in calibrated_points]
        y_coords = [point[1] for point in calibrated_points]
        scatter = ax2.scatter(x_coords, y_coords, c=errors, cmap='Reds', 
                            s=30, alpha=0.6)
        plt.colorbar(scatter, ax=ax2, label='Error (pixels)')
        ax2.set_xlabel('Calibrated X (pixels)')
        ax2.set_ylabel('Calibrated Y (pixels)')
        ax2.set_title('Spatial Error Distribution')
        ax2.set_xlim(0, WINDOW_WIDTH)
        ax2.set_ylim(0, WINDOW_HEIGHT)
    
    # 3. 구역별 정확도 분석
    if calibrated_points:
        # 화면을 4분면으로 나눔
        quadrant_errors = defaultdict(list)
        center_x, center_y = WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2
        
        for point, error in zip(calibrated_points, errors):
            if point[0] < center_x and point[1] < center_y:
                quadrant_errors['Top-Left'].append(error)
            elif point[0] >= center_x and point[1] < center_y:
                quadrant_errors['Top-Right'].append(error)
            elif point[0] < center_x and point[1] >= center_y:
                quadrant_errors['Bottom-Left'].append(error)
            else:
                quadrant_errors['Bottom-Right'].append(error)
        
        quadrants = list(quadrant_errors.keys())
        mean_errors = [np.mean(quadrant_errors[q]) if quadrant_errors[q] else 0 for q in quadrants]
        
        bars = ax3.bar(quadrants, mean_errors, alpha=0.7, color=['blue', 'green', 'orange', 'purple'])
        ax3.set_ylabel('Mean Error (pixels)')
        ax3.set_title('Error by Screen Quadrant')
        ax3.grid(True, alpha=0.3)
        
        # 각 막대 위에 값 표시
        for bar, error in zip(bars, mean_errors):
            if error > 0:
                ax3.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                        f'{error:.1f}px', ha='center', va='bottom')
    
    # 4. 시간에 따른 오차 변화
    ax4.plot(errors, alpha=0.7, color='red', linewidth=1)
    ax4.set_xlabel('Sample Number')
    ax4.set_ylabel('Error (pixels)')
    ax4.set_title('Error Over Time')
    ax4.grid(True, alpha=0.3)
    
    # 이동 평균 추가
    if len(errors) > 10:
        window_size = min(50, len(errors) // 10)
        moving_avg = np.convolve(errors, np.ones(window_size)/window_size, mode='valid')
        ax4.plot(range(window_size-1, len(errors)), moving_avg, 
                color='blue', linewidth=2, label=f'Moving Average (n={window_size})')
        ax4.legend()
    
    plt.tight_layout()
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    print(f"[INFO] Accuracy analysis saved as: {filename}")
    
    plt.close()


def record_gaze_data(raw_point, calibrated_point=None, target_point=None):
    """시선 데이터를 2차원 응시 빈도 배열에 기록"""
    # 보정된 점 우선, 없으면 원시 점
    point_to_record = calibrated_point if calibrated_point else raw_point
    
    # 해당 좌표의 응시 빈도 증가
    add_gaze_to_heatmap(point_to_record[0], point_to_record[1])


def save_all_results():
    """모든 결과를 저장 (2차원 응시 빈도 배열 + JSON)"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 2차원 응시 빈도 배열이 있는 경우에만 저장
    if gaze_heatmap_2d is not None and np.sum(gaze_heatmap_2d) > 0:
        # 1. 텍스트 형태로 저장 (한눈에 보기)
        heatmap_file = save_gaze_heatmap_2d(f"results/gaze_heatmap_2d_{timestamp}.txt")
        print(f"[INFO] Gaze heatmap 2D array saved: {heatmap_file}")
        
        # 2. JSON 형태로 저장 (중앙응시비율 포함)
        json_file = save_gaze_heatmap_json(f"results/gaze_heatmap_{timestamp}.json")
        print(f"[INFO] Gaze heatmap JSON saved: {json_file}")
    
    # 캘리브레이션 정보 저장
    if calib_vectors and calib_points:
        with open(f"results/calibration_data_{timestamp}.txt", "w") as f:
            f.write(f"Calibration Results - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("="*50 + "\n")
            f.write(f"Transform Method: {transform_method}\n")
            f.write(f"Total Calibration Points: {len(calib_points)}\n")
            
            if gaze_heatmap_2d is not None:
                center_ratio = calculate_center_gaze_ratio()
                f.write(f"Total Gaze Samples: {np.sum(gaze_heatmap_2d)}\n")
                f.write(f"Center Gaze Ratio: {center_ratio:.2f}%\n")
                f.write(f"Heatmap Grid Size: {HEATMAP_GRID_W}x{HEATMAP_GRID_H}\n")
                f.write(f"Grid Cell Size: {WINDOW_WIDTH//HEATMAP_GRID_W}x{WINDOW_HEIGHT//HEATMAP_GRID_H} pixels\n")
            
            f.write("\nCalibration Points:\n")
            for i, (vector, point) in enumerate(zip(calib_vectors, calib_points)):
                f.write(f"Point {i+1}: {point} <- Angles: {vector}\n")
        
        print(f"[INFO] Calibration data saved with timestamp: {timestamp}")
    
    print(f"[INFO] Results saved in 'results/' directory (TXT + JSON formats)")

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
try:
    print("[INFO] Initializing gaze estimator...")
    gaze_estimator = GazeEstimator(config)
    landmark_estimator = LandmarkEstimator(config)
    print("[INFO] Gaze estimator initialized successfully")
except Exception as e:
    print(f"[ERROR] Failed to initialize gaze estimator: {e}")
    print("[INFO] This might be due to missing model files. Please run 'ptgaze download' first.")
    exit(1)

# ===============================
# 6. 웹캠 캘리브레이션 루프
# ===============================

# results 폴더 생성
if not os.path.exists("results"):
    os.makedirs("results")
    print("[INFO] Created 'results' directory")

cap = cv2.VideoCapture(0)

# 웹캠 연결 확인
if not cap.isOpened():
    print("[ERROR] Cannot open webcam. Please check if camera is available.")
    exit(1)

cap.set(cv2.CAP_PROP_FRAME_WIDTH, WINDOW_WIDTH)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, WINDOW_HEIGHT)

# OpenCV 창 설정을 고정 크기로 설정 (WINDOW_AUTOSIZE로 크기 고정)
cv2.namedWindow("Gaze Calibration", cv2.WINDOW_AUTOSIZE)

# 캘리브레이션 모드 선택
print("=== CALIBRATION MODE SELECTION ===")
print("1. Quick mode: 9 points, 1 sample each (fast)")
print("2. Balanced mode: 9 points, 2 samples each (recommended)")  
print("3. Precise mode: 9 points, 3 samples each (accurate)")
print("4. Custom mode: 13 points, 1 sample each (full coverage)")

try:
    mode_choice = input("Select mode (1-4): ").strip()
except (EOFError, KeyboardInterrupt):
    mode_choice = "1"  # 기본값으로 Quick mode 설정
    print("\nUsing default Quick mode")

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
print("[INFO] Press SPACE to record calibration point, 'f' to flip camera, 'q' to quit.")
print("[INFO] Gaze frequency 2D array will be saved when you quit the program.")

# 첫 번째 프레임에서 실제 크기 확인 및 타겟 조정
first_frame = True
actual_targets = []

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            print("[WARNING] Failed to read frame from camera")
            break
        
        # 첫 번째 프레임에서 실제 크기에 맞게 타겟 재조정
        if first_frame:
            actual_height, actual_width = frame.shape[:2]
            print(f"[INFO] Actual frame size: {actual_width}x{actual_height}")
            
            # 프레임을 목표 크기로 리사이즈 (크기 일관성 보장)
            if actual_width != WINDOW_WIDTH or actual_height != WINDOW_HEIGHT:
                print(f"[INFO] Resizing frame from {actual_width}x{actual_height} to {WINDOW_WIDTH}x{WINDOW_HEIGHT}")
            
            # 타겟은 WINDOW 크기 기준으로 사용 (스케일링 없이)
            actual_targets = calib_targets.copy()
            
            print(f"[INFO] Using targets: {actual_targets}")
            first_frame = False
        
        # 프레임을 목표 크기로 리사이즈 (일관성 보장)
        frame = cv2.resize(frame, (WINDOW_WIDTH, WINDOW_HEIGHT))
        
        # 카메라 좌우반전 처리
        if FLIP_CAMERA:
            frame = cv2.flip(frame, 1)
        
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
            # 캘리브레이션 적용된 점 (큰 녹색)
            cv2.circle(frame, calibrated_point, 10, (0, 255, 0), -1)  # 녹색 원
            cv2.circle(frame, calibrated_point, 15, (0, 200, 0), 3)  # 어두운 녹색 테두리
            
            # 원시 점도 표시 (작은 빨간색)
            cv2.circle(frame, raw_screen_point, 5, (0, 0, 255), -1)  # 빨간색 원
            
            # 시선 데이터 기록 (캘리브레이션 완료 후에만)
            if not calibrating:
                record_gaze_data(raw_screen_point, calibrated_point, None)
            
            # 정보 표시
            # 상태 정보 표시
            status_y = frame.shape[0] - 90
            cv2.putText(frame, "GREEN: Calibrated, RED: Raw", (30, status_y), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.putText(frame, f"Raw: {raw_screen_point}, Cal: {calibrated_point}", 
                        (30, status_y + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # 응시 빈도 정보 표시 (캘리브레이션 완료 후에만)
            if not calibrating:
                total_samples = np.sum(gaze_heatmap_2d) if gaze_heatmap_2d is not None else 0
                cv2.putText(frame, f"Gaze samples: {total_samples}", 
                            (30, status_y + 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        else:
            # 캘리브레이션 전: 원시 점만 표시
            cv2.circle(frame, raw_screen_point, 8, (0, 0, 255), -1)  # 빨간색 원
            cv2.circle(frame, raw_screen_point, 12, (0, 0, 200), 2)  # 어두운 빨간색 테두리
            cv2.putText(frame, "RED: Raw gaze (not calibrated)", (30, frame.shape[0] - 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # 캘리브레이션 중에는 히트맵 기록하지 않음

        # 창 크기 유지 - AUTOSIZE 모드에서는 resizeWindow 불필요
        cv2.imshow("Gaze Calibration", frame)
        
        # 스페이스바 입력 감지
        key = cv2.waitKey(1) & 0xFF
        
        # 캘리브레이션 중에는 자동 저장하지 않음

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
                    print("[INFO] Gaze frequency 2D array will be saved when you quit. Press 'r' to recalibrate, 'f' to flip camera, 'q' to quit")
                    
                    pass  # AUTOSIZE 모드에서는 resizeWindow 불필요

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
            # 히트맵 데이터는 유지 (옵션)
            print("[INFO] Recalibrating...")
            
            pass  # AUTOSIZE 모드에서는 resizeWindow 불필요
        
        # 수동 저장 제거 - 종료 시에만 저장
        
        # 카메라 반전 토글  
        if key == ord('f'):
            FLIP_CAMERA = not FLIP_CAMERA
            print(f"[INFO] Camera flip: {'ON' if FLIP_CAMERA else 'OFF'}")
            
        if key == ord('q'):
            break

except KeyboardInterrupt:
    print("\n[INFO] Program interrupted by user")
except Exception as e:
    print(f"\n[ERROR] Unexpected error: {e}")
finally:
    print("[INFO] Cleaning up...")
    
    # 프로그램 종료 시 자동으로 결과 저장
    if (gaze_heatmap_2d is not None and np.sum(gaze_heatmap_2d) > 0) or calib_vectors:
        print("[INFO] Auto-saving results before exit...")
        try:
            save_all_results()
        except Exception as e:
            print(f"[WARNING] Failed to auto-save results: {e}")
    
    cap.release()
    cv2.destroyAllWindows()
    print("[INFO] Program ended")
