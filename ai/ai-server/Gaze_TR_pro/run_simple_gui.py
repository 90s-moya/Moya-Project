#!/usr/bin/env python3
"""
Simple Gaze Tracking System Launcher
간단한 시선 추적 시스템 실행기
"""

import sys
import os

def main():
    """메인 실행 함수"""
    print("=== Gaze Tracking System ===")
    print("Select interface:")
    print("1. GUI Interface (Recommended)")
    print("2. Web Server Interface")
    print("3. Command Line Interface")
    print()
    
    choice = input("Enter your choice (1-3): ").strip()
    
    if choice == "1":
        print("Starting GUI Interface...")
        try:
            from simple_gaze_interface import main as gui_main
            gui_main()
        except ImportError as e:
            print(f"Error: Failed to import GUI interface - {e}")
            print("Please install tkinter: pip install tk")
        except Exception as e:
            print(f"Error: {e}")
    
    elif choice == "2":
        print("Starting Web Server Interface...")
        try:
            from gaze_server import app
            print("Web server will start at http://localhost:5000")
            print("API endpoints available:")
            print("  - POST /api/calibration/start")
            print("  - POST /api/calibration/run")
            print("  - GET /api/calibration/list")
            print("  - POST /api/tracking/init")
            print("  - POST /api/tracking/video")
            print("  - POST /api/tracking/live")
            print("  - GET /api/tracking/results")
            print()
            app.run(host='localhost', port=5000, debug=False)
        except Exception as e:
            print(f"Error: {e}")
    
    elif choice == "3":
        print("Command Line Interface:")
        print("1. Run Calibration")
        print("2. Run Gaze Tracking")
        print("3. Manage Calibration Data")
        
        sub_choice = input("Enter choice (1-3): ").strip()
        
        if sub_choice == "1":
            try:
                from gaze_calibration import GazeCalibrator
                calibrator = GazeCalibrator()
                
                print("Select calibration mode:")
                print("1. Quick (9 points, 1 sample each)")
                print("2. Balanced (9 points, 2 samples each)")
                print("3. Precise (9 points, 3 samples each)")
                print("4. Custom (13 points, 1 sample each)")
                
                mode_choice = input("Mode (1-4): ").strip()
                mode_map = {"1": "quick", "2": "balanced", "3": "precise", "4": "custom"}
                mode = mode_map.get(mode_choice, "quick")
                
                success = calibrator.run_calibration(mode)
                if success:
                    filename = calibrator.save_calibration_data()
                    print(f"Calibration completed and saved: {filename}")
                else:
                    print("Calibration failed or was cancelled")
                    
            except Exception as e:
                print(f"Error: {e}")
        
        elif sub_choice == "2":
            try:
                from gaze_tracking import GazeTracker
                tracker = GazeTracker()
                
                calib_file = input("Enter calibration file path: ").strip()
                if not tracker.load_calibration_data(calib_file):
                    print("Failed to load calibration data")
                    return
                
                print("Select tracking mode:")
                print("1. Live webcam tracking")
                print("2. Video file processing")
                
                track_choice = input("Choice (1-2): ").strip()
                
                if track_choice == "1":
                    tracker.process_webcam_live()
                elif track_choice == "2":
                    video_file = input("Enter video file path: ").strip()
                    tracker.process_video_file(video_file)
                
            except Exception as e:
                print(f"Error: {e}")
        
        elif sub_choice == "3":
            try:
                from calibration_manager import main as manager_main
                manager_main()
            except Exception as e:
                print(f"Error: {e}")
    
    else:
        print("Invalid choice. Exiting.")

if __name__ == "__main__":
    main()