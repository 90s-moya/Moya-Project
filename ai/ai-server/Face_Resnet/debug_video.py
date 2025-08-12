# debug_video.py
# 비디오 분석 문제 진단용 스크립트

import os
import cv2
import numpy as np
from mediapipe_face import FaceMeshDetector

def debug_video_analysis(video_path):
    """비디오 분석 문제를 진단"""
    print(f"🔍 디버깅: {os.path.basename(video_path)}")
    
    # 1. 비디오 파일 열기 테스트
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("❌ 비디오 파일을 열 수 없습니다.")
        return
    
    # 2. 비디오 정보 확인
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    print(f"  📹 비디오 정보: {width}x{height}, {fps:.1f}fps, {frame_count}프레임")
    
    # 3. 첫 몇 프레임 읽기 테스트
    det = FaceMeshDetector()
    
    frame_read_count = 0
    face_detected_count = 0
    quality_pass_count = 0
    
    for i in range(min(100, frame_count)):  # 처음 100프레임만 테스트
        ret, frame = cap.read()
        if not ret:
            break
            
        frame_read_count += 1
        
        # 4. 얼굴 감지 테스트
        crop, lm, bbox = det.extract_face(frame)
        if crop is not None and lm is not None:
            face_detected_count += 1
            
            # 5. 품질 체크 테스트
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            brightness = gray.mean()
            sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            if brightness >= 40 and sharpness >= 60:  # 완화된 기준
                quality_pass_count += 1
            
            if i < 5:  # 첫 5개 프레임 상세 정보
                print(f"    프레임 {i}: 얼굴✅ 밝기={brightness:.1f} 선명도={sharpness:.1f}")
        else:
            if i < 5:
                print(f"    프레임 {i}: 얼굴❌")
    
    cap.release()
    
    # 6. 결과 요약
    print(f"  📊 결과:")
    print(f"    - 읽은 프레임: {frame_read_count}")
    print(f"    - 얼굴 감지됨: {face_detected_count} ({face_detected_count/max(frame_read_count,1)*100:.1f}%)")
    print(f"    - 품질 통과: {quality_pass_count} ({quality_pass_count/max(face_detected_count,1)*100:.1f}%)")
    
    if face_detected_count == 0:
        print("  ⚠️  얼굴이 전혀 감지되지 않았습니다!")
        print("  💡 해결책: 비디오에 얼굴이 명확히 나오는지 확인하세요.")
    elif quality_pass_count == 0:
        print("  ⚠️  품질 필터를 통과한 프레임이 없습니다!")
        print("  💡 해결책: 품질 기준을 더 완화해야 합니다.")
    else:
        print("  ✅ 정상적으로 처리될 것으로 예상됩니다.")
    
    print()

def main():
    videos_dir = "./videos"
    
    if not os.path.exists(videos_dir):
        print("❌ videos/ 폴더가 없습니다.")
        return
    
    video_files = [f for f in os.listdir(videos_dir) if f.endswith('.mov')]
    
    if not video_files:
        print("❌ videos/ 폴더에 .mov 파일이 없습니다.")
        return
    
    print("🚨 비디오 분석 문제 진단 시작\n")
    
    for video_file in video_files:
        video_path = os.path.join(videos_dir, video_file)
        debug_video_analysis(video_path)
    
    print("📋 권장 해결책:")
    print("1. 얼굴 감지 실패 → 비디오에 얼굴이 명확히 보이는지 확인")
    print("2. 품질 필터 실패 → 품질 기준을 더 완화 (brightness<40, sharpness<60)")
    print("3. 코덱 문제 → 다른 형식(.mp4)으로 변환 시도")

if __name__ == "__main__":
    main()