#!/usr/bin/env python3
import os
import numpy as np
from omegaconf import OmegaConf
from ptgaze.gaze_estimator import GazeEstimator
from ptgaze.head_pose_estimation import LandmarkEstimator

print("Testing ptgaze setup...")

# Test config
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

print("Config created successfully")

try:
    print("Testing LandmarkEstimator...")
    landmark_estimator = LandmarkEstimator(config)
    print("[OK] LandmarkEstimator created successfully")
    
    print("Testing GazeEstimator...")
    gaze_estimator = GazeEstimator(config)
    print("[OK] GazeEstimator created successfully")
    
    print("[OK] All tests passed! The setup is working correctly.")
    
except FileNotFoundError as e:
    print(f"[ERROR] Missing file: {e}")
    if "eth-xgaze_resnet18.pth" in str(e):
        print("Need to download the ETH-XGaze model.")
        print("Run: python -c \"from ptgaze.utils import download_ethxgaze_model; download_ethxgaze_model()\"")
except Exception as e:
    print(f"[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()