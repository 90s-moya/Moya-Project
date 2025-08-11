#!/usr/bin/env python3
import cv2
import numpy as np
import os
from omegaconf import OmegaConf
from ptgaze.gaze_estimator import GazeEstimator
from ptgaze.head_pose_estimation import LandmarkEstimator

print("=== AFFINE TRANSFORM DEBUG ===")

# Config
home = os.path.expanduser("~")
camera_params_path = os.path.join(os.path.dirname(__file__), "calib", "sample_params.yaml")
normalized_params_path = os.path.join(
    os.path.dirname(__file__), "venv", "Lib", "site-packages", "ptgaze", "data", "normalized_camera_params", "eth-xgaze.yaml"
)

config = OmegaConf.create({
    "mode": "ETH-XGaze", "device": "cpu", "model": {"name": "resnet18"},
    "face_detector": {"mode": "mediapipe", "mediapipe_max_num_faces": 1, "mediapipe_static_image_mode": False},
    "gaze_estimator": {
        "checkpoint": os.path.join(home, ".ptgaze", "models", "eth-xgaze_resnet18.pth"),
        "camera_params": camera_params_path, "normalized_camera_params": normalized_params_path,
        "use_dummy_camera_params": False, "normalized_camera_distance": 0.6, "image_size": [224, 224]
    }
})

gaze_estimator = GazeEstimator(config)
landmark_estimator = LandmarkEstimator(config)

# 웹캠
cap = cv2.VideoCapture(0)
ret, frame = cap.read()
if ret:
    height, width = frame.shape[:2]
    print(f"Frame size: {width}x{height}")

# 더 좋은 캘리브레이션 포인트 배치 (전체 화면 커버)
calib_targets = [
    (int(width*0.2), int(height*0.2)),   # 좌상단
    (int(width*0.8), int(height*0.2)),   # 우상단
    (int(width*0.2), int(height*0.8)),   # 좌하단
    (int(width*0.8), int(height*0.8)),   # 우하단
    (int(width*0.5), int(height*0.5)),   # 중앙
    (int(width*0.5), int(height*0.2)),   # 상단 중앙
    (int(width*0.5), int(height*0.8)),   # 하단 중앙
    (int(width*0.2), int(height*0.5)),   # 좌측 중앙
    (int(width*0.8), int(height*0.5)),   # 우측 중앙
]

print(f"Calibration targets: {calib_targets}")

calib_data = []
current_point = 0
collecting = False

print("Instructions:")
print("1. Look at each YELLOW dot")  
print("2. Press SPACE to record gaze data")
print("3. Need 5 recordings per dot")

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    if current_point < len(calib_targets):
        target = calib_targets[current_point]
        cv2.circle(frame, target, 20, (0, 255, 255), -1)
        cv2.circle(frame, target, 25, (255, 255, 255), 3)
        
        target_data = [d for d in calib_data if d['target'] == target]
        needed = 5 - len(target_data)
        
        cv2.putText(frame, f"Point {current_point+1}/{len(calib_targets)} - Need {needed} more", 
                   (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(frame, f"Target: {target}", (30, 80), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
    
    # 얼굴 검출 및 시선 추정
    faces = landmark_estimator.detect_faces(frame)
    if len(faces) > 0:
        face = faces[0]
        try:
            gaze_estimator.estimate_gaze(frame, face)
            gaze_vector = face.gaze_vector
            
            if gaze_vector is not None:
                # 각도 계산
                vx, vy, vz = gaze_vector[0], gaze_vector[1], gaze_vector[2]
                yaw = np.arctan2(-vx, -vz)
                pitch = np.arcsin(-vy)
                
                # 원시 화면 좌표
                scale_factor = 600
                raw_x = int(np.tan(yaw) * scale_factor + width/2)
                raw_y = int(np.tan(pitch) * scale_factor + height/2)
                raw_x = max(0, min(raw_x, width-1))
                raw_y = max(0, min(raw_y, height-1))
                
                cv2.circle(frame, (raw_x, raw_y), 8, (0, 0, 255), -1)
                
                cv2.putText(frame, f"Angles: yaw={np.degrees(yaw):.1f}°, pitch={np.degrees(pitch):.1f}°", 
                           (30, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                cv2.putText(frame, f"Raw: ({raw_x}, {raw_y})", 
                           (30, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                
                key = cv2.waitKey(1) & 0xFF
                
                # 데이터 수집
                if key == 32 and current_point < len(calib_targets):  # SPACE
                    target = calib_targets[current_point]
                    calib_data.append({
                        'target': target,
                        'angles': (yaw, pitch),
                        'raw_pos': (raw_x, raw_y)
                    })
                    print(f"Recorded: target={target}, angles=({np.degrees(yaw):.1f}°, {np.degrees(pitch):.1f}°)")
                    
                    target_data = [d for d in calib_data if d['target'] == target]
                    if len(target_data) >= 5:
                        current_point += 1
                        print(f"Moving to next point...")
                
                if key == ord('q'):
                    break
                    
        except Exception as e:
            print(f"Error: {e}")
    
    cv2.imshow("Affine Debug", frame)
    
    # 캘리브레이션 완료 후 분석
    if current_point >= len(calib_targets):
        print("\n=== CALIBRATION DATA ANALYSIS ===")
        
        # 각 타겟별 평균 계산
        avg_data = []
        for target in calib_targets:
            target_data = [d for d in calib_data if d['target'] == target]
            if target_data:
                yaws = [d['angles'][0] for d in target_data]
                pitches = [d['angles'][1] for d in target_data]
                avg_yaw = np.mean(yaws)
                avg_pitch = np.mean(pitches)
                avg_data.append([avg_yaw, avg_pitch, target[0], target[1]])
                
                print(f"Target {target}: yaw={np.degrees(avg_yaw):.1f}°±{np.degrees(np.std(yaws)):.1f}°, "
                      f"pitch={np.degrees(avg_pitch):.1f}°±{np.degrees(np.std(pitches)):.1f}°")
        
        if len(avg_data) >= 4:
            # Affine 변환 계산
            source_points = np.array([[d[0], d[1]] for d in avg_data], dtype=np.float32)
            target_points = np.array([[d[2], d[3]] for d in avg_data], dtype=np.float32)
            
            print(f"\nSource points (angles):\n{source_points}")
            print(f"Target points (screen):\n{target_points}")
            
            # 여러 방법으로 변환 매트릭스 계산
            methods = [
                ("estimateAffine2D", lambda: cv2.estimateAffine2D(source_points, target_points)),
                ("getAffineTransform", lambda: cv2.getAffineTransform(source_points[:3], target_points[:3]) if len(source_points) >= 3 else None),
                ("estimateAffinePartial2D", lambda: cv2.estimateAffinePartial2D(source_points, target_points)),
            ]
            
            best_transform = None
            best_method = None
            
            for method_name, calc_func in methods:
                try:
                    if method_name == "getAffineTransform":
                        transform = calc_func()
                        inliers = None
                    else:
                        result = calc_func()
                        if result is not None:
                            transform, inliers = result
                        else:
                            continue
                    
                    if transform is not None:
                        print(f"\n{method_name} Transform Matrix:")
                        print(transform)
                        if inliers is not None:
                            print(f"Inliers: {np.sum(inliers)}/{len(inliers)}")
                        
                        # 변환 테스트
                        print("Transform test:")
                        for i, (src, tgt) in enumerate(zip(source_points[:3], target_points[:3])):
                            vec = np.array([src[0], src[1], 1], dtype=np.float32)
                            result = np.dot(transform, vec)
                            error = np.sqrt((result[0] - tgt[0])**2 + (result[1] - tgt[1])**2)
                            print(f"  Point {i}: {src} -> {result[:2]} (target: {tgt}, error: {error:.1f})")
                        
                        if best_transform is None:
                            best_transform = transform
                            best_method = method_name
                
                except Exception as e:
                    print(f"{method_name} failed: {e}")
            
            if best_transform is not None:
                print(f"\nUsing {best_method} for real-time testing...")
                
                # 실시간 테스트
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    faces = landmark_estimator.detect_faces(frame)
                    if len(faces) > 0:
                        face = faces[0]
                        try:
                            gaze_estimator.estimate_gaze(frame, face)
                            gaze_vector = face.gaze_vector
                            
                            if gaze_vector is not None:
                                vx, vy, vz = gaze_vector[0], gaze_vector[1], gaze_vector[2]
                                yaw = np.arctan2(-vx, -vz)
                                pitch = np.arcsin(-vy)
                                
                                # 원시 좌표
                                raw_x = int(np.tan(yaw) * 600 + width/2)
                                raw_y = int(np.tan(pitch) * 600 + height/2)
                                raw_x = max(0, min(raw_x, width-1))
                                raw_y = max(0, min(raw_y, height-1))
                                
                                # 변환된 좌표
                                vec = np.array([yaw, pitch, 1], dtype=np.float32)
                                result = np.dot(best_transform, vec)
                                cal_x = int(max(0, min(result[0], width-1)))
                                cal_y = int(max(0, min(result[1], height-1)))
                                
                                # 표시
                                cv2.circle(frame, (raw_x, raw_y), 5, (0, 0, 255), -1)  # 빨간색
                                cv2.circle(frame, (cal_x, cal_y), 10, (0, 255, 0), -1)  # 녹색
                                
                                cv2.putText(frame, f"Raw: ({raw_x}, {raw_y})", (30, 30), 
                                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                                cv2.putText(frame, f"Cal: ({cal_x}, {cal_y})", (30, 60), 
                                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                                cv2.putText(frame, f"Angles: {np.degrees(yaw):.1f}°, {np.degrees(pitch):.1f}°", 
                                           (30, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                                
                        except Exception as e:
                            print(f"Error: {e}")
                    
                    cv2.imshow("Affine Debug", frame)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
        
        break

cap.release()
cv2.destroyAllWindows()