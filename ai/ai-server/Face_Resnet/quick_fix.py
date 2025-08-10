# quick_fix.py  
# -*- coding: utf-8 -*-
"""
빠른 수정: 미소 짓는데 화남으로 나오는 문제 임시 해결
기존 test.py에 추가적인 보정 로직을 적용한 간단한 버전
"""

import cv2
import numpy as np
import torch
import time
from collections import deque, Counter

from model import load_model
from mediapipe_face import FaceMeshDetector
from utils import softmax_temperature

CLASS_NAMES = ["anger","disgust","fear","happy","neutral","sad","surprise"]

def quick_emotion_fix(probs, smile_score, eye_open_ratio):
    """빠른 감정 보정 - 미소 감지시 강제 보정"""
    if smile_score is None or eye_open_ratio is None:
        return probs
    
    # 미소 점수와 눈 열림 정도를 종합하여 실제 미소 여부 판단
    is_really_smiling = (smile_score > 0.4) and (eye_open_ratio > 0.2)
    
    if is_really_smiling:
        fixed_probs = probs.copy()
        
        # anger, disgust가 높으면 강제로 줄임
        if fixed_probs[0] > 0.3:  # anger
            excess = fixed_probs[0] - 0.1
            fixed_probs[0] = 0.1
            fixed_probs[3] += excess * 0.7  # happy에 70% 전달
            fixed_probs[4] += excess * 0.3  # neutral에 30% 전달
            
        if fixed_probs[1] > 0.3:  # disgust  
            excess = fixed_probs[1] - 0.1
            fixed_probs[1] = 0.1
            fixed_probs[3] += excess * 0.7
            fixed_probs[4] += excess * 0.3
        
        # happy/neutral 최소 보장
        if fixed_probs[3] < 0.2:  # happy
            needed = 0.2 - fixed_probs[3]
            # fear, sad에서 가져오기
            if fixed_probs[2] > needed:  # fear
                fixed_probs[2] -= needed
                fixed_probs[3] += needed
            elif fixed_probs[5] > needed:  # sad
                fixed_probs[5] -= needed  
                fixed_probs[3] += needed
                
        if fixed_probs[4] < 0.3:  # neutral
            needed = 0.3 - fixed_probs[4]
            if fixed_probs[2] > needed:
                fixed_probs[2] -= needed
                fixed_probs[4] += needed
        
        # 정규화
        fixed_probs = fixed_probs / (fixed_probs.sum() + 1e-6)
        return fixed_probs
    
    return probs

def main():
    print("=== 빠른 감정 인식 수정 테스트 ===")
    print("미소를 지으면 보정이 적용됩니다.")
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = load_model(None, device=device, num_classes=len(CLASS_NAMES))
    detector = FaceMeshDetector()
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("카메라를 열 수 없습니다.")
        return
    
    label_history = deque(maxlen=5)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        # 얼굴 검출
        crop, landmarks, bbox = detector.extract_face(frame)
        if crop is None or landmarks is None:
            cv2.putText(frame, "No face detected", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            cv2.imshow("Quick Fix Test", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
            continue
        
        # 전처리
        import torchvision.transforms as T
        transform = T.Compose([
            T.ToPILImage(),
            T.Resize((224, 224)),
            T.ToTensor(), 
            T.Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])
        ])
        
        crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        tensor = transform(crop_rgb).unsqueeze(0).to(device)
        
        # 예측
        with torch.no_grad():
            logits = model(tensor)
            original_probs = softmax_temperature(logits, 2.0).cpu().numpy()[0]
        
        # 얼굴 특징 추출
        smile_score = detector.smile_score(frame, landmarks) or 0.0
        eye_open = detector.eye_open_ratio(frame, landmarks) or 0.0
        
        # 보정 적용
        fixed_probs = quick_emotion_fix(original_probs, smile_score, eye_open)
        
        # 결과 비교
        original_emotion = CLASS_NAMES[np.argmax(original_probs)]
        fixed_emotion = CLASS_NAMES[np.argmax(fixed_probs)]
        
        # 안정화
        label_history.append(fixed_emotion)
        stable_emotion = Counter(label_history).most_common(1)[0][0]
        
        # 화면 출력
        if bbox:
            x1, y1, x2, y2 = bbox
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        
        # 정보 표시
        y_pos = 30
        cv2.putText(frame, f"Original: {original_emotion} ({original_probs[CLASS_NAMES.index(original_emotion)]:.2f})", 
                   (10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        
        y_pos += 25
        cv2.putText(frame, f"Fixed: {fixed_emotion} ({fixed_probs[CLASS_NAMES.index(fixed_emotion)]:.2f})", 
                   (10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        y_pos += 25  
        cv2.putText(frame, f"Stable: {stable_emotion}", 
                   (10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        
        y_pos += 25
        cv2.putText(frame, f"Smile: {smile_score:.2f}, Eye: {eye_open:.2f}", 
                   (10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # 보정 적용 여부 표시
        if smile_score > 0.4 and eye_open > 0.2:
            cv2.putText(frame, "CORRECTION APPLIED", (10, frame.shape[0]-20), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        
        cv2.imshow("Quick Fix Test", frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    detector.close()
    
    print("테스트 완료!")

if __name__ == "__main__":
    main()