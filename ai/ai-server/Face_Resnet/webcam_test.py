# webcam_test.py (전체 수정본)

import cv2
import torch
from PIL import Image
import json
from datetime import datetime
from collections import Counter
from transformers import ResNetForImageClassification, ResNetConfig, AutoImageProcessor
import os

# FER-2013 감정 레이블
CLASS_NAMES = ["anger", "disgust", "fear", "happy", "sad", "surprise", "neutral"]

# 💡 Hugging Face에서 모델과 전처리기를 자동으로 불러옵니다.
try:
    # 모델 불러오기
    model_name = "Celal11/resnet-50-finetuned-FER2013-0.001"
    model = ResNetForImageClassification.from_pretrained(model_name)
    
    # 💡 전처리기를 불러오는 방식을 'AutoImageProcessor'로 변경합니다.
    processor = AutoImageProcessor.from_pretrained(model_name)
    print("모델과 전처리기를 성공적으로 불러왔습니다.")
except Exception as e:
    print(f"오류: 모델을 불러오는 데 실패했습니다. {e}")
    print("인터넷 연결을 확인하거나, transformers 라이브러리 설치를 다시 확인해주세요.")
    exit()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)
model.eval()

# 웹캠 설정
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("웹캠을 열 수 없습니다.")
    exit()

all_frames_emotions = []
detailed_logs = []
current_emotion = None
start_frame = None
frame_count = 0

print("웹캠을 시작합니다. 'q'를 누르면 종료됩니다.")

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # 좌우 반전
    frame = cv2.flip(frame, 1)

    frame_count += 1
    
    pil_image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    
    # Hugging Face 전처리기로 이미지 변환
    inputs = processor(images=pil_image, return_tensors="pt")
    inputs = {key: value.to(device) for key, value in inputs.items()}

    predicted_emotion = "불확실"
    top_emotions = []

    with torch.no_grad():
        outputs = model(**inputs)
        probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)[0]
        
        # 가장 높은 확률의 감정 3가지 추출
        top_probs, top_indices = torch.topk(probabilities, 3)
        
        for prob, idx in zip(top_probs, top_indices):
            emotion = model.config.id2label[idx.item()]
            top_emotions.append((emotion, prob.item()))
            
        main_emotion_idx = top_indices[0].item()
        main_emotion_prob = top_probs[0].item()

        if main_emotion_prob > 0.2:
            predicted_emotion = model.config.id2label[main_emotion_idx]
        else:
            predicted_emotion = "불확실"

    all_frames_emotions.append(predicted_emotion)
    
    if current_emotion is None:
        current_emotion = predicted_emotion
        start_frame = frame_count
    elif predicted_emotion != current_emotion:
        end_frame = frame_count - 1
        detailed_logs.append({
            "label": current_emotion,
            "start_frame": start_frame,
            "end_frame": end_frame
        })
        current_emotion = predicted_emotion
        start_frame = frame_count
    
    y_offset = 50
    for i, (emotion, prob) in enumerate(top_emotions):
        text = f"{emotion}: {prob:.2f}"
        cv2.putText(frame, text, (50, y_offset + i * 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2, cv2.LINE_AA)

    cv2.imshow('Emotion Recognition', frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        if current_emotion:
            end_frame = frame_count
            detailed_logs.append({
                "label": current_emotion,
                "start_frame": start_frame,
                "end_frame": end_frame
            })
        break

cap.release()
cv2.destroyAllWindows()

if frame_count > 0:
    emotion_counts = Counter(all_frames_emotions)
    frame_distribution = {}
    for emotion, count in emotion_counts.items():
        frame_distribution[emotion] = count

    report = {
        "timestamp": datetime.now().isoformat(),
        "total_frames": frame_count,
        "frame_distribution": frame_distribution,
        "detailed_logs": detailed_logs
    }

    report_filename = "emotion_report.json"
    with open(report_filename, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=4)
        
    print(f"감정 변화 리포트가 '{report_filename}' 파일로 저장되었습니다.")
else:
    print("감지된 프레임이 없어 리포트를 생성하지 않습니다.")