#!/usr/bin/env python3
import cv2
import numpy as np
import os
from omegaconf import OmegaConf
from ptgaze.gaze_estimator import GazeEstimator
from ptgaze.head_pose_estimation import LandmarkEstimator

# 설정
WINDOW_WIDTH = 800
WINDOW_HEIGHT = 600

# Config 구성
home = os.path.expanduser("~")
camera_params_path = os.path.join(os.path.dirname(__file__), "calib", "sample_params.yaml")
normalized_params_path = os.path.join(
    os.path.dirname(__file__),
    "venv", "Lib", "site-packages", "ptgaze", "data", "normalized_camera_params", "eth-xgaze.yaml"
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

print("=== GAZE ESTIMATION DEBUG ===")
print("Initializing models...")

gaze_estimator = GazeEstimator(config)
landmark_estimator = LandmarkEstimator(config)

# 웹캠 초기화
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, WINDOW_WIDTH)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, WINDOW_HEIGHT)

print("Press 's' to save gaze data, 'q' to quit")

frame_count = 0
gaze_data = []

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    frame_count += 1
    
    # 얼굴 탐지
    faces = landmark_estimator.detect_faces(frame)
    if len(faces) == 0:
        cv2.putText(frame, "No face detected", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        cv2.imshow("Debug", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        continue

    face = faces[0]
    
    # 시선 추정
    try:
        gaze_estimator.estimate_gaze(frame, face)
        gaze_vector = face.gaze_vector
        
        if gaze_vector is not None:
            print(f"Frame {frame_count}: Gaze vector = {gaze_vector}")
            
            # ETH-XGaze 벡터를 각도로 변환
            pitch = np.arcsin(-gaze_vector[1])
            yaw = np.arctan2(-gaze_vector[0], -gaze_vector[2])
            
            # 화면 좌표로 변환 (간단한 방식)
            screen_x = int((np.tan(yaw) * 500) + (WINDOW_WIDTH / 2))
            screen_y = int((np.tan(pitch) * 500) + (WINDOW_HEIGHT / 2))
            
            # 화면 범위 제한
            screen_x = max(0, min(screen_x, WINDOW_WIDTH - 1))
            screen_y = max(0, min(screen_y, WINDOW_HEIGHT - 1))
            
            # 화면에 표시
            cv2.circle(frame, (screen_x, screen_y), 10, (0, 255, 0), -1)
            
            # 정보 표시
            cv2.putText(frame, f"Gaze: ({gaze_vector[0]:.3f}, {gaze_vector[1]:.3f}, {gaze_vector[2]:.3f})", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.putText(frame, f"Screen: ({screen_x}, {screen_y})", 
                       (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.putText(frame, f"Angles: pitch={np.degrees(pitch):.1f}, yaw={np.degrees(yaw):.1f}", 
                       (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
        else:
            cv2.putText(frame, "Gaze estimation failed", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
            
    except Exception as e:
        cv2.putText(frame, f"Error: {str(e)[:40]}", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        print(f"Exception: {e}")
    
    cv2.imshow("Debug", frame)
    key = cv2.waitKey(1) & 0xFF
    
    if key == ord('s') and gaze_vector is not None:
        gaze_data.append({
            'frame': frame_count,
            'gaze_vector': gaze_vector.copy(),
            'screen_pos': (screen_x, screen_y)
        })
        print(f"Saved gaze data point {len(gaze_data)}")
    
    if key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

# 수집된 데이터 분석
if gaze_data:
    print(f"\n=== ANALYSIS OF {len(gaze_data)} GAZE POINTS ===")
    
    vectors = np.array([d['gaze_vector'] for d in gaze_data])
    positions = np.array([d['screen_pos'] for d in gaze_data])
    
    print(f"Gaze vectors:")
    print(f"  X range: {vectors[:,0].min():.3f} to {vectors[:,0].max():.3f}")
    print(f"  Y range: {vectors[:,1].min():.3f} to {vectors[:,1].max():.3f}")
    print(f"  Z range: {vectors[:,2].min():.3f} to {vectors[:,2].max():.3f}")
    
    print(f"Screen positions:")
    print(f"  X range: {positions[:,0].min()} to {positions[:,0].max()}")
    print(f"  Y range: {positions[:,1].min()} to {positions[:,1].max()}")
    
    # 변화량 분석
    if len(gaze_data) > 1:
        vector_changes = np.diff(vectors, axis=0)
        pos_changes = np.diff(positions, axis=0)
        
        print(f"Typical gaze vector changes:")
        print(f"  X std: {vector_changes[:,0].std():.4f}")
        print(f"  Y std: {vector_changes[:,1].std():.4f}")
        print(f"  Z std: {vector_changes[:,2].std():.4f}")
        
        print(f"Typical screen position changes:")
        print(f"  X std: {pos_changes[:,0].std():.1f} pixels")
        print(f"  Y std: {pos_changes[:,1].std():.1f} pixels")
else:
    print("No gaze data collected")