# emotion_calibration.py
# -*- coding: utf-8 -*-
"""
개인별 감정 인식 캘리브레이션 도구
미소 짓고 있는데 화남으로 인식되는 문제를 해결하기 위한 개인화 보정
"""

import cv2
import json
import numpy as np
import time
from collections import deque, Counter
from typing import Dict, List, Optional
import torch

from model import load_model
from mediapipe_face import FaceMeshDetector
from utils import softmax_temperature

CLASS_NAMES = ["anger","disgust","fear","happy","neutral","sad","surprise"]


class EmotionCalibrator:
    """개인별 감정 인식 캘리브레이션"""
    
    def __init__(self, model_path: Optional[str] = None, device: str = "cpu"):
        self.model = load_model(model_path, device=device, num_classes=len(CLASS_NAMES))
        self.detector = FaceMeshDetector()
        self.device = device
        
        # 캘리브레이션 데이터
        self.smile_samples = []  # 미소 상태 샘플들
        self.neutral_samples = []  # 중립 상태 샘플들
        self.calibration_data = {}
        
    def _preprocess_face(self, face_crop):
        """얼굴 이미지 전처리"""
        import torchvision.transforms as T
        
        # 밝기/대비 향상
        ycrcb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2YCrCb)
        y, cr, cb = cv2.split(ycrcb)
        y = cv2.createCLAHE(2.0, (8,8)).apply(y)
        enhanced = cv2.cvtColor(cv2.merge([y, cr, cb]), cv2.COLOR_YCrCb2BGR)
        rgb = cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB)
        
        # 텐서 변환
        transform = T.Compose([
            T.ToPILImage(),
            T.Resize((224, 224)),
            T.ToTensor(),
            T.Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])
        ])
        
        return transform(rgb).unsqueeze(0).to(self.device)
    
    def _get_emotion_probs(self, face_tensor):
        """감정 확률 예측"""
        with torch.no_grad():
            logits = self.model(face_tensor)
            probs = softmax_temperature(logits, temperature=2.0)
        return probs.cpu().numpy()[0]
    
    def collect_calibration_data(self, target_emotion: str = "happy", duration: int = 10):
        """특정 감정 상태에서 캘리브레이션 데이터 수집"""
        print(f"\n=== {target_emotion.upper()} 상태 캘리브레이션 ===")
        print(f"{duration}초 동안 {target_emotion} 표정을 유지하세요.")
        print("스페이스바를 눌러 시작, ESC로 중단")
        
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("카메라를 열 수 없습니다.")
            return False
        
        # 시작 대기
        while True:
            ret, frame = cap.read()
            if not ret:
                continue
                
            cv2.putText(frame, f"Press SPACE to start {target_emotion} calibration", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            cv2.imshow("Calibration", frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord(' '):
                break
            elif key == 27:  # ESC
                cap.release()
                cv2.destroyAllWindows()
                return False
        
        # 데이터 수집
        samples = []
        start_time = time.time()
        
        while time.time() - start_time < duration:
            ret, frame = cap.read()
            if not ret:
                continue
            
            # 얼굴 검출 및 전처리
            crop, landmarks, bbox = self.detector.extract_face(frame)
            if crop is None:
                cv2.putText(frame, "No face detected", (10, 30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                cv2.imshow("Calibration", frame)
                continue
            
            # 감정 예측
            face_tensor = self._preprocess_face(crop)
            probs = self._get_emotion_probs(face_tensor)
            
            # 얼굴 특징 추출
            smile_score = self.detector.smile_score(frame, landmarks) or 0.0
            eye_open = self.detector.eye_open_ratio(frame, landmarks) or 0.0
            
            # 샘플 저장
            sample = {
                'probs': probs.tolist(),
                'smile_score': smile_score,
                'eye_open': eye_open,
                'predicted_emotion': CLASS_NAMES[np.argmax(probs)],
                'confidence': float(np.max(probs))
            }
            samples.append(sample)
            
            # 화면 표시
            remaining = duration - (time.time() - start_time)
            pred_emotion = CLASS_NAMES[np.argmax(probs)]
            
            if bbox:
                x1, y1, x2, y2 = bbox
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            cv2.putText(frame, f"Target: {target_emotion}, Detected: {pred_emotion}", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
            cv2.putText(frame, f"Time: {remaining:.1f}s, Smile: {smile_score:.2f}", 
                       (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            cv2.putText(frame, f"Confidence: {np.max(probs):.2f}", 
                       (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            
            cv2.imshow("Calibration", frame)
            
            if cv2.waitKey(1) & 0xFF == 27:  # ESC
                break
        
        cap.release()
        cv2.destroyAllWindows()
        
        # 수집된 데이터 저장
        if target_emotion == "happy":
            self.smile_samples = samples
        elif target_emotion == "neutral":
            self.neutral_samples = samples
        
        print(f"{target_emotion} 캘리브레이션 완료: {len(samples)}개 샘플 수집")
        
        # 통계 출력
        if samples:
            predictions = [s['predicted_emotion'] for s in samples]
            pred_counter = Counter(predictions)
            print("예측 분포:", dict(pred_counter))
            
            avg_confidence = np.mean([s['confidence'] for s in samples])
            print(f"평균 신뢰도: {avg_confidence:.3f}")
            
            if target_emotion == "happy":
                avg_smile = np.mean([s['smile_score'] for s in samples])
                print(f"평균 미소 점수: {avg_smile:.3f}")
        
        return True
    
    def analyze_calibration_results(self):
        """캘리브레이션 결과 분석 및 보정 파라미터 생성"""
        if not self.smile_samples or not self.neutral_samples:
            print("캘리브레이션 데이터가 부족합니다. 먼저 데이터를 수집하세요.")
            return None
        
        print("\n=== 캘리브레이션 분석 결과 ===")
        
        # 미소 상태 분석
        smile_predictions = [s['predicted_emotion'] for s in self.smile_samples]
        smile_counter = Counter(smile_predictions)
        smile_correct_rate = smile_counter.get('happy', 0) / len(self.smile_samples)
        
        print(f"미소 정확도: {smile_correct_rate:.1%}")
        print(f"미소 상태 예측 분포: {dict(smile_counter)}")
        
        # 중립 상태 분석  
        neutral_predictions = [s['predicted_emotion'] for s in self.neutral_samples]
        neutral_counter = Counter(neutral_predictions)
        neutral_correct_rate = neutral_counter.get('neutral', 0) / len(self.neutral_samples)
        
        print(f"중립 정확도: {neutral_correct_rate:.1%}")
        print(f"중립 상태 예측 분포: {dict(neutral_counter)}")
        
        # 보정 파라미터 계산
        smile_samples_array = np.array([s['probs'] for s in self.smile_samples])
        neutral_samples_array = np.array([s['probs'] for s in self.neutral_samples])
        
        # 미소 상태에서의 평균 확률 분포
        smile_mean_probs = np.mean(smile_samples_array, axis=0)
        neutral_mean_probs = np.mean(neutral_samples_array, axis=0)
        
        # 개인별 보정 계수 계산
        correction_factors = {}
        
        # 미소일 때 happy/neutral 비율이 너무 낮으면 보정
        actual_positive = smile_mean_probs[CLASS_NAMES.index('happy')] + smile_mean_probs[CLASS_NAMES.index('neutral')]
        if actual_positive < 0.6:  # 60% 미만이면 문제
            # anger, disgust, fear, sad를 줄이고 happy, neutral을 늘리는 계수
            for i, emotion in enumerate(CLASS_NAMES):
                if emotion in ['anger', 'disgust', 'fear', 'sad']:
                    correction_factors[emotion] = max(0.3, 1.0 - smile_mean_probs[i] * 2)
                elif emotion in ['happy', 'neutral']:
                    correction_factors[emotion] = min(2.0, 1.0 + (0.6 - actual_positive))
                else:
                    correction_factors[emotion] = 1.0
        
        # 캘리브레이션 데이터 저장
        self.calibration_data = {
            'smile_accuracy': smile_correct_rate,
            'neutral_accuracy': neutral_correct_rate,
            'smile_mean_probs': smile_mean_probs.tolist(),
            'neutral_mean_probs': neutral_mean_probs.tolist(),
            'correction_factors': correction_factors,
            'smile_threshold': np.mean([s['smile_score'] for s in self.smile_samples]),
            'calibration_date': time.strftime('%Y%m%d_%H%M%S')
        }
        
        print(f"보정 계수: {correction_factors}")
        
        return self.calibration_data
    
    def apply_personal_correction(self, probs: np.ndarray, smile_score: float = 0.0) -> np.ndarray:
        """개인별 보정 적용"""
        if not self.calibration_data or not self.calibration_data.get('correction_factors'):
            return probs
        
        corrected = probs.copy()
        correction_factors = self.calibration_data['correction_factors']
        smile_threshold = self.calibration_data.get('smile_threshold', 0.5)
        
        # 미소 점수가 임계값 이상일 때만 보정 적용
        if smile_score >= smile_threshold * 0.7:  # 70% 이상일 때
            for i, emotion in enumerate(CLASS_NAMES):
                if emotion in correction_factors:
                    corrected[i] *= correction_factors[emotion]
        
        # 정규화
        corrected = corrected / (corrected.sum() + 1e-6)
        
        return corrected
    
    def save_calibration(self, filepath: str):
        """캘리브레이션 데이터 저장"""
        if not self.calibration_data:
            print("저장할 캘리브레이션 데이터가 없습니다.")
            return False
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(self.calibration_data, f, ensure_ascii=False, indent=2)
            print(f"캘리브레이션 데이터 저장: {filepath}")
            return True
        except Exception as e:
            print(f"저장 실패: {e}")
            return False
    
    def load_calibration(self, filepath: str):
        """캘리브레이션 데이터 로드"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                self.calibration_data = json.load(f)
            print(f"캘리브레이션 데이터 로드: {filepath}")
            return True
        except Exception as e:
            print(f"로드 실패: {e}")
            return False


def run_calibration_wizard():
    """캘리브레이션 위저드 실행"""
    print("=== 개인별 감정 인식 캘리브레이션 위저드 ===")
    print("이 도구는 귀하의 표정에 맞춰 감정 인식을 개선합니다.")
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    calibrator = EmotionCalibrator(device=device)
    
    # 1. 중립 표정 캘리브레이션
    print("\n1단계: 중립 표정 캘리브레이션")
    input("중립적인 표정을 준비하고 엔터를 누르세요...")
    if not calibrator.collect_calibration_data("neutral", duration=8):
        print("중립 캘리브레이션이 취소되었습니다.")
        return
    
    # 2. 미소 캘리브레이션
    print("\n2단계: 미소 캘리브레이션")
    input("자연스러운 미소를 준비하고 엔터를 누르세요...")
    if not calibrator.collect_calibration_data("happy", duration=8):
        print("미소 캘리브레이션이 취소되었습니다.")
        return
    
    # 3. 분석 및 보정 파라미터 생성
    calibration_data = calibrator.analyze_calibration_results()
    if calibration_data is None:
        print("캘리브레이션 분석에 실패했습니다.")
        return
    
    # 4. 결과 저장
    save_path = f"personal_calibration_{calibration_data['calibration_date']}.json"
    if calibrator.save_calibration(save_path):
        print(f"\n캘리브레이션 완료! 설정 파일: {save_path}")
        print("이제 test.py 실행 시 --calibration 옵션으로 이 파일을 사용하세요.")
    
    calibrator.detector.close()


if __name__ == "__main__":
    run_calibration_wizard()