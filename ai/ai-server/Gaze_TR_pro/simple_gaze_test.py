#!/usr/bin/env python3
import cv2
import numpy as np
import os
from omegaconf import OmegaConf
from ptgaze.gaze_estimator import GazeEstimator
from ptgaze.head_pose_estimation import LandmarkEstimator

# 매우 단순한 캘리브레이션 테스트
print("=== SIMPLE CALIBRATION TEST ===")

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

# 캘리브레이션 데이터
calib_data = []
test_points = [(200, 150), (600, 150), (400, 300), (200, 450), (600, 450)]  # 5개 점
current_point = 0
collecting = False

print("Instructions:")
print("1. Look at the YELLOW dot")
print("2. Press SPACE to record (do this 10 times per dot)")
print("3. Move to next dot automatically")

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    if current_point < len(test_points):
        target = test_points[current_point]
        cv2.circle(frame, target, 20, (0, 255, 255), -1)  # 노란색 점
        cv2.putText(frame, f"Point {current_point+1}/5 - Press SPACE (need {10-len([d for d in calib_data if d['target']==target])} more)", 
                   (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    # 얼굴 검출
    faces = landmark_estimator.detect_faces(frame)
    if len(faces) > 0:
        face = faces[0]
        try:
            gaze_estimator.estimate_gaze(frame, face)
            gaze_vector = face.gaze_vector
            
            if gaze_vector is not None:
                # 간단한 화면 좌표 변환
                yaw = np.arctan2(-gaze_vector[0], -gaze_vector[2])
                pitch = np.arcsin(-gaze_vector[1])
                
                screen_x = int(np.tan(yaw) * 300 + frame.shape[1]/2)
                screen_y = int(np.tan(pitch) * 300 + frame.shape[0]/2)
                screen_x = max(0, min(screen_x, frame.shape[1]-1))
                screen_y = max(0, min(screen_y, frame.shape[0]-1))
                
                cv2.circle(frame, (screen_x, screen_y), 8, (0, 255, 0), -1)
                
                key = cv2.waitKey(1) & 0xFF
                
                # 데이터 수집
                if key == 32 and current_point < len(test_points):  # SPACE
                    target = test_points[current_point]
                    calib_data.append({
                        'target': target,
                        'gaze_angles': (yaw, pitch),
                        'screen_pos': (screen_x, screen_y)
                    })
                    print(f"Recorded: target={target}, angles=({np.degrees(yaw):.1f}, {np.degrees(pitch):.1f}), screen=({screen_x}, {screen_y})")
                    
                    # 해당 점의 10개 데이터가 모이면 다음 점으로
                    target_data = [d for d in calib_data if d['target'] == target]
                    if len(target_data) >= 10:
                        current_point += 1
                        print(f"Moving to next point...")
                
                if key == ord('q'):
                    break
                    
        except Exception as e:
            print(f"Error: {e}")
    
    cv2.imshow("Simple Test", frame)
    
    # 모든 점 완료 시 분석
    if current_point >= len(test_points):
        print("\n=== CALIBRATION ANALYSIS ===")
        
        for i, target in enumerate(test_points):
            target_data = [d for d in calib_data if d['target'] == target]
            if target_data:
                yaws = [d['gaze_angles'][0] for d in target_data]
                pitches = [d['gaze_angles'][1] for d in target_data]
                
                print(f"Point {i+1} {target}:")
                print(f"  Yaw: {np.degrees(np.mean(yaws)):.1f}° ± {np.degrees(np.std(yaws)):.1f}°")
                print(f"  Pitch: {np.degrees(np.mean(pitches)):.1f}° ± {np.degrees(np.std(pitches)):.1f}°")
        
        # 단순한 캘리브레이션 테스트
        print("\n=== SIMPLE CALIBRATION ===")
        
        # 각 타겟별 평균 각도 계산
        target_angles = {}
        for target in test_points:
            target_data = [d for d in calib_data if d['target'] == target]
            if target_data:
                yaws = [d['gaze_angles'][0] for d in target_data]
                pitches = [d['gaze_angles'][1] for d in target_data]
                target_angles[target] = (np.mean(yaws), np.mean(pitches))
        
        # 보정 테스트
        cv2.putText(frame, "Calibration done! Look around to test", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
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
                        yaw = np.arctan2(-gaze_vector[0], -gaze_vector[2])
                        pitch = np.arcsin(-gaze_vector[1])
                        
                        # 원시 위치
                        raw_x = int(np.tan(yaw) * 300 + frame.shape[1]/2)
                        raw_y = int(np.tan(pitch) * 300 + frame.shape[0]/2)
                        raw_x = max(0, min(raw_x, frame.shape[1]-1))
                        raw_y = max(0, min(raw_y, frame.shape[0]-1))
                        
                        cv2.circle(frame, (raw_x, raw_y), 8, (0, 0, 255), -1)  # 빨간색
                        
                        # 가장 가까운 캘리브레이션 점 찾기
                        if target_angles:
                            best_target = None
                            min_dist = float('inf')
                            
                            for target, (t_yaw, t_pitch) in target_angles.items():
                                dist = np.sqrt((yaw - t_yaw)**2 + (pitch - t_pitch)**2)
                                if dist < min_dist:
                                    min_dist = dist
                                    best_target = target
                            
                            if best_target:
                                cv2.circle(frame, best_target, 12, (0, 255, 0), -1)  # 녹색
                                cv2.putText(frame, f"Closest: {best_target}", (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                        
                except Exception as e:
                    print(f"Error: {e}")
            
            cv2.imshow("Simple Test", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        break

cap.release()
cv2.destroyAllWindows()