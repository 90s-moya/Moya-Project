# test.py
# -*- coding: utf-8 -*-
"""
Interview-focused real-time facial analysis (window ON by default)
- 창 표시 + 실시간 추론 + JSON 리포트 저장
- 품질 필터(밝기/선명도) → 오탐 프레임 스킵
- TTA(수평 플립) 평균 → fear/sad 과쏠림 완화
- 미소/입꼬리 곡률 기반 재분배 → sad→happy/neutral 바닥 보정
- 저신뢰 프레임 보류 + 1초 다수결 → 라벨 안정화
- 눈/입 가중치로 긴장 스코어 보정(eye 0.6 / lip 0.25 / blink 0.15)
"""

import os, cv2, time, json, argparse, numpy as np, torch
import torchvision.transforms as T
from collections import deque, Counter

from model import load_model
from mediapipe_face import FaceMeshDetector
from utils import softmax_temperature, compute_tension

CLASS_NAMES = ["anger","disgust","fear","happy","neutral","sad","surprise"]
SAVE_DIR = "./report"

# ---------- 전처리 ----------
def enhance_for_model(crop_bgr):
    ycrcb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2YCrCb)
    y, cr, cb = cv2.split(ycrcb)
    y = cv2.createCLAHE(2.0, (8,8)).apply(y)
    img = cv2.cvtColor(cv2.merge([y, cr, cb]), cv2.COLOR_YCrCb2BGR)
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

to_tensor = T.Compose([
    T.ToPILImage(), T.Resize((224,224)), T.ToTensor(),
    T.Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225]),
])

# ---------- 품질 필터 (캘리브레이션 완화) ----------
def face_quality_ok(bgr, min_brightness=30, min_sharpness=15):
    """테스트 비디오 캘리브레이션 결과를 반영한 완화된 품질 기준"""
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    brightness = gray.mean()
    sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
    return (brightness >= min_brightness) and (sharpness >= min_sharpness), brightness, sharpness

# ---------- 모델 추론(TTA) ----------
def model_probs_tta(model, tensor, temp):
    with torch.no_grad():
        logits1 = model(tensor)
        logits2 = model(torch.flip(tensor, dims=[3]))  # horizontal flip
        probs1 = softmax_temperature(logits1, temp)
        probs2 = softmax_temperature(logits2, temp)
        probs = (probs1 + probs2) * 0.5
    return probs.cpu().numpy()[0]

# ---------- 웹캠 최적화 감정 보정 (테스트 비디오 캘리브레이션 기반) ----------
def webcam_optimized_correction(probs, smile_score, eye_open, curvature=None):
    """test_video_optimized.py의 성공한 캘리브레이션을 웹캠용으로 적용"""
    p = probs.copy()
    idx = CLASS_NAMES.index
    
    # 미소와 눈 상태 기반으로 상황 분류
    has_smile = smile_score is not None and smile_score > 0.3
    has_open_eyes = eye_open is not None and eye_open > 0.2
    is_neutral_face = (smile_score is None or smile_score < 0.1) and has_open_eyes
    
    # 1. 확실한 미소가 있는 경우 - Happy 감정 강화
    if has_smile:
        target_happy = max(0.3, smile_score * 0.8)
        if p[idx("happy")] < target_happy:
            need = target_happy - p[idx("happy")]
            donors = ["anger", "disgust", "fear", "sad"]
            taken = 0.0
            
            for donor in donors:
                if taken >= need: break
                donor_idx = idx(donor)
                take_amount = min(p[donor_idx] * 0.9, need - taken)
                p[donor_idx] -= take_amount
                taken += take_amount
            
            p[idx("happy")] += taken
        
        # surprise를 happy로 일부 변환
        if p[idx("surprise")] > 0.1:
            convert = min(p[idx("surprise")] * 0.5, 0.15)
            p[idx("surprise")] -= convert
            p[idx("happy")] += convert
    
    # 2. 무표정한 중립 상태 - Neutral 강화
    elif is_neutral_face:
        target_neutral = 0.4  # 중립 목표값
        if p[idx("neutral")] < target_neutral:
            need = target_neutral - p[idx("neutral")]
            donors = ["anger", "disgust", "fear", "happy", "sad", "surprise"]
            taken = 0.0
            
            for donor in donors:
                if taken >= need: break
                donor_idx = idx(donor)
                take_amount = min(p[donor_idx] * 0.4, (need - taken) / len(donors))
                p[donor_idx] -= take_amount
                taken += take_amount
            
            p[idx("neutral")] += taken
    
    # 3. 기타 부정적 감정 과도 억제
    if p[idx("disgust")] > 0.4:
        disgust_excess = p[idx("disgust")] - 0.4
        p[idx("disgust")] = 0.4
        p[idx("neutral")] += disgust_excess * 0.7
        p[idx("fear")] += disgust_excess * 0.3
    
    if p[idx("anger")] > 0.5:
        anger_excess = p[idx("anger")] - 0.5
        p[idx("anger")] = 0.5
        p[idx("neutral")] += anger_excess * 0.8
        p[idx("sad")] += anger_excess * 0.2
    
    # 정규화
    p = p / (p.sum() + 1e-6)
    return p

# ---------- 개선된 시간적 스무딩 클래스 ----------
class EmotionSmoother:
    def __init__(self, window_size=8):
        self.window_size = window_size
        self.emotion_history = []
        self.confidence_history = []
    
    def smooth_probabilities(self, current_probs):
        """확률 분포를 시간적으로 스무딩 (신뢰도 가중)"""
        confidence = float(np.max(current_probs))  # 현재 프레임 신뢰도
        
        self.emotion_history.append(current_probs.copy())
        self.confidence_history.append(confidence)
        
        if len(self.emotion_history) > self.window_size:
            self.emotion_history.pop(0)
            self.confidence_history.pop(0)
        
        if len(self.emotion_history) == 1:
            return current_probs
        
        # 신뢰도와 시간 기반 가중평균
        history_len = len(self.emotion_history)
        time_weights = np.linspace(0.3, 1.0, history_len)  # 시간 가중치
        conf_weights = np.array(self.confidence_history)  # 신뢰도 가중치
        
        # 복합 가중치 (시간 × 신뢰도)
        combined_weights = time_weights * (0.5 + conf_weights * 0.5)
        combined_weights = combined_weights / combined_weights.sum()
        
        smoothed = np.zeros_like(current_probs)
        for i, prob in enumerate(self.emotion_history):
            smoothed += prob * combined_weights[i]
        
        return smoothed

# ---------- 보정: 미소+눈 기반 바닥 깔기 ----------
def bias_with_smile_eye(probs, smile, eye_open, happy_floor=0.08, neutral_floor=0.10, eye_thr=0.23):
    if smile is None or eye_open is None:
        return probs
    import numpy as np
    relax = float(np.clip((smile - 0.50) / 0.35, 0.0, 1.0))  # 0~1
    if relax <= 0.0 or eye_open < (eye_thr * 0.95):
        return probs
    p = probs.copy()
    idx = CLASS_NAMES.index
    add_h = max(0.0, happy_floor*relax - p[idx("happy")])
    add_n = max(0.0, neutral_floor*relax - p[idx("neutral")])
    need = add_h + add_n
    if need <= 1e-6: return p
    # fear에서 우선 차감, 부족하면 sad/disgust
    donors = ["fear","sad","disgust"]
    take_sum = 0.0
    for d in donors:
        di = idx(d)
        take = min(p[di], need - take_sum)
        p[di] -= take
        take_sum += take
        if take_sum >= need - 1e-8: break
    p[idx("happy")]  += min(add_h, take_sum)
    p[idx("neutral")] += max(0.0, take_sum - add_h)
    p = p / (p.sum() + 1e-6)
    return p

# ---------- 보정: 입꼬리 곡률로 sad 과쏠림 억제 ----------
def rebalance_with_smile_curvature(probs, smile, curvature, eye_open, floors=(0.10, 0.12)):
    if smile is None or curvature is None or eye_open is None:
        return probs
    import numpy as np
    conf = float(np.clip(0.5*smile + 0.5*curvature, 0.0, 1.0))
    if conf < 0.45 or eye_open < 0.20:
        return probs
    p = probs.copy()
    idx = CLASS_NAMES.index
    happy_floor, neutral_floor = floors
    add_h = max(0.0, happy_floor*conf - p[idx("happy")])
    add_n = max(0.0, neutral_floor*conf - p[idx("neutral")])
    need = add_h + add_n
    if need <= 1e-6: return p
    donors = ["sad","fear","disgust"]
    take_sum = 0.0
    for d in donors:
        di = idx(d)
        take = min(p[di], need - take_sum)
        p[di] -= take
        take_sum += take
        if take_sum >= need - 1e-8: break
    p[idx("happy")]  += min(add_h, take_sum)
    p[idx("neutral")] += max(0.0, take_sum - add_h)
    p = p / (p.sum() + 1e-6)
    return p

def main():
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=False)
    src.add_argument("--video", type=str, default=None, help="video path (optional)")
    src.add_argument("--camera", type=int, default=0, help="camera index (default 0)")
    ap.add_argument("--ckpt", type=str, default=None, help="checkpoint .pt (optional)")
    ap.add_argument("--fps", type=int, default=10)
    ap.add_argument("--temp", type=float, default=1.8)
    ap.add_argument("--calib_sec", type=float, default=2.0)
    ap.add_argument("--no-draw", action="store_true", help="do not show window")
    ap.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    ap.add_argument("--debug_drop_dir", type=str, default="./debug_drop")
    args = ap.parse_args()

    os.makedirs(SAVE_DIR, exist_ok=True)
    os.makedirs(args.debug_drop_dir, exist_ok=True)

    # ---- 소스 열기
    cap = cv2.VideoCapture(args.video if args.video else args.camera)
    if not cap.isOpened():
        raise RuntimeError("카메라/비디오를 열 수 없습니다. 인덱스나 경로를 확인하세요.")
    if args.video is None:
        cap.set(cv2.CAP_PROP_FPS, args.fps)

    # ---- 모델/검출기 및 스무더 초기화
    model = load_model(args.ckpt, device=args.device, num_classes=len(CLASS_NAMES))
    det = FaceMeshDetector()
    smoother = EmotionSmoother(window_size=8)  # 캘리브레이션된 스무딩

    # ---- 캘리브레이션(입 벌어짐 기준)
    t0 = time.time(); base_opens = []
    print(f"[INFO] 캘리브레이션 {args.calib_sec:.1f}s 진행중...")
    while time.time() - t0 < args.calib_sec:
        ret, frm = cap.read()
        if not ret: break
        crop, lm, _ = det.extract_face(frm)
        if crop is None or lm is None:
            if not args.no_draw:
                cv2.imshow("Interview Analysis - CALIBRATED", frm)
                if (cv2.waitKey(1) & 0xFF) == ord('q'): break
            continue
        h,w = frm.shape[:2]
        up = np.array([lm.landmark[13].x*w, lm.landmark[13].y*h])
        dn = np.array([lm.landmark[14].x*w, lm.landmark[14].y*h])
        base_opens.append(np.linalg.norm(up-dn))
        if not args.no_draw:
            cv2.putText(frm, "Calibrating...", (10,30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,255), 2)
            cv2.imshow("Interview Analysis - CALIBRATED", frm)
            if (cv2.waitKey(1) & 0xFF) == ord('q'): break
    mouth_open_base = float(np.median(base_opens)) if base_opens else None
    print(f"[CALIB] mouth_open_base={mouth_open_base}")

    # ---- 루프
    frames = 0
    hist = {k:0 for k in CLASS_NAMES}
    probs_acc, smile_acc, eye_sq_acc, lip_acc = [], [], [], []
    start = time.time()
    print("[INFO] 🌐 웹캠 최적화 실시간 분석 시작 (종료: q)")
    print("[OPTIMIZATION] ✅ 품질 필터 완화 + 시간적 스무딩 적용")

    label_window = deque(maxlen=12)  # 캘리브레이션된 안정화 윈도우
    stable_label = None
    drop_quota = {"fear": 10, "anger": 10, "sad": 6}  # 디버그 샘플 저장 제한

    while True:
        ret, frame = cap.read()
        if not ret: break

        crop, lm, bbox = det.extract_face(frame)
        if crop is None or lm is None:
            if not args.no_draw:
                cv2.putText(frame, "No face detected", (10,30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)
                try:
                    cv2.imshow("Interview Analysis - WEBCAM OPTIMIZED", frame)
                except cv2.error:
                    pass
                if (cv2.waitKey(1) & 0xFF) == ord('q'): break
            continue

        # 품질 필터
        ok, bright, sharp = face_quality_ok(crop)
        if not ok:
            if not args.no_draw:
                cv2.putText(frame, f"Low quality (B:{bright:.0f}, S:{sharp:.0f})",
                            (10,30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,255), 2)
                try:
                    cv2.imshow("Interview Analysis - WEBCAM OPTIMIZED", frame)
                except cv2.error:
                    pass
                if (cv2.waitKey(1) & 0xFF) == ord('q'): break
            # 품질 낮을 땐 라벨/분포 갱신하지 않음
            continue

        # ---- 추론 (TTA)
        crop_rgb = enhance_for_model(crop)
        inp = to_tensor(crop_rgb).unsqueeze(0).to(args.device)
        probs_raw = model_probs_tta(model, inp, args.temp)

        # ---- 메쉬 기반 피처
        eye_open = det.eye_open_ratio(frame, lm)
        smile = det.smile_score(frame, lm)
        lip = det.lip_press_score(frame, lm, scale=0.6, smile_score_hint=smile, mouth_open_base=mouth_open_base)
        curvature = det.mouth_corner_curvature(frame, lm)

        # 미소일 때 lip 과대평가 감쇠(보호)
        if lip is not None and smile is not None:
            lip = float(lip * (1.0 - 0.35*smile))

        # 디버그: 원본 모델 출력 확인 (매 30프레임마다)
        if frames % 30 == 0:
            raw_pred = CLASS_NAMES[np.argmax(probs_raw)]
            raw_conf = np.max(probs_raw)
            smile_str = f"{smile:.3f}" if smile is not None else "None"
            eye_str = f"{eye_open:.3f}" if eye_open is not None else "None"
            print(f"[DEBUG Frame {frames}] Raw: {raw_pred}({raw_conf:.3f}) | Smile:{smile_str} Eye:{eye_str}")

        # ---- 웹캠 최적화 보정 (캘리브레이션 기반) ----
        probs = probs_raw.copy()
        
        # 1. 캘리브레이션된 메인 보정
        probs = webcam_optimized_correction(probs, smile, eye_open, curvature)
        
        # 2. 기존 미세 조정 (test_video_optimized.py 수준)
        probs = bias_with_smile_eye(probs, smile, eye_open, happy_floor=0.08, neutral_floor=0.10, eye_thr=0.23)
        probs = rebalance_with_smile_curvature(probs, smile, curvature, eye_open, floors=(0.10, 0.12))
        
        # 3. 개선된 시간적 스무딩
        probs = smoother.smooth_probabilities(probs)

        # 라벨 결정 (캘리브레이션된 안정화 기준)
        maxp = float(np.max(probs))
        pred = CLASS_NAMES[int(np.argmax(probs))]
        
        # 신뢰도 기반 라벨 안정화 (테스트 비디오 결과 반영)
        confidence_threshold = 0.32  # 캘리브레이션된 임계값
        if maxp < confidence_threshold and stable_label is not None:
            # 저신뢰 상황에서 안정된 라벨 유지
            pred_to_use = stable_label
        else:
            pred_to_use = pred
            
        label_window.append(pred_to_use)
        stable_label = Counter(label_window).most_common(1)[0][0]

        # 기록
        hist[stable_label] += 1
        probs_acc.append(probs)

        eye_thr = 0.23
        eye_squeeze = float(np.clip((eye_thr - (eye_open or 0.0)) / eye_thr, 0.0, 1.0) * 100.0) if eye_open is not None else 0.0
        if smile is not None: smile_acc.append(smile)
        lip_acc.append((lip or 0.0)*100.0)
        eye_sq_acc.append(eye_squeeze)

        # 긴장 스코어
        tension = compute_tension(eye_open, lip, blink_ratio=0.0, w_eye=0.60, w_lip=0.25, w_blink=0.15)

        # 디버그 드롭(오탐 샘플 저장)
        if stable_label in drop_quota and drop_quota[stable_label] > 0:
            ts = time.strftime("%H%M%S")
            cv2.imwrite(os.path.join(args.debug_drop_dir, f"{stable_label}_{ts}_{frames}.jpg"), frame)
            drop_quota[stable_label] -= 1

        # 오버레이 & 창 표시
        if not args.no_draw:
            x1,y1,x2,y2 = bbox
            cv2.rectangle(frame,(x1,y1),(x2,y2),(0,255,0),2)
            pos = (probs[CLASS_NAMES.index("happy")] + probs[CLASS_NAMES.index("neutral")]) * 100.0
            
            # 상위 3개 감정 표시 
            top3_indices = np.argsort(probs)[-3:][::-1]
            top3_text = " | ".join([f"{CLASS_NAMES[i]}:{probs[i]:.2f}" for i in top3_indices])
            
            txt1 = f"🎯 {stable_label} (conf:{maxp:.2f}) - CALIBRATED"
            txt2 = f"Top3: {top3_text}"
            txt3 = f"😊 Smile:{(smile or 0):.2f} 👁 Eye:{(eye_open or 0):.2f} 😬 Curv:{(curvature or 0):.2f}"
            txt4 = f"✅ Positive:{pos:.0f}% | ⚡ Tension:{tension*100:.0f}%"

            y0 = max(25, y1-15)
            cv2.putText(frame, txt1, (x1, y0), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,0), 2)
            cv2.putText(frame, txt2, (x1, y0+20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,0), 1)
            cv2.putText(frame, txt3, (x1, y0+38), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1)
            cv2.putText(frame, txt4, (x1, y0+56), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,255), 2)
            
            # 하단에 캘리브레이션 상태 표시
            calib_status = "🎯 CALIBRATED WEBCAM (Test Video Optimized + Confidence Smoothing)"
            cv2.putText(frame, calib_status, (10, frame.shape[0]-20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,150), 1)

            try:
                cv2.imshow("Interview Analysis - WEBCAM OPTIMIZED", frame)
            except cv2.error:
                pass
            if (cv2.waitKey(1) & 0xFF) == ord('q'):
                break

        frames += 1

    cap.release()
    try:
        cv2.destroyAllWindows()
    except cv2.error:
        pass

    # ---- 리포트
    duration = max(1e-6, time.time() - start)
    fps_eff = frames / duration
    total = sum(hist.values()) or 1
    class_dist = {k: v/total for k,v in hist.items()}
    positive_series = [p[CLASS_NAMES.index("happy")] + p[CLASS_NAMES.index("neutral")] for p in probs_acc]

    report = {
        "interview_readiness_mean": round(float(np.mean(positive_series)*100) if positive_series else 0.0, 2),
        "dominant_emotion": max(hist, key=hist.get) if total>0 else None,
        "class_distribution": {k: round(v,4) for k,v in class_dist.items()},
        "tension_features": {
            "eye_squeeze_mean": round(float(np.mean(eye_sq_acc)) if eye_sq_acc else 0.0, 2),
            "lip_press_mean": round(float(np.mean(lip_acc)) if lip_acc else 0.0, 2),
        },
        "facial_metrics": {
            "smile_mean": round(float(np.mean(smile_acc)*100.0) if smile_acc else 0.0, 2),
            "positive_emotions_ratio": round(class_dist.get("happy",0.0)+class_dist.get("neutral",0.0), 4),
        },
        "details": {
            "frames_analyzed": frames,
            "fps_effective": round(fps_eff, 2),
            "analysis_duration_sec": round(duration, 1),
        }
    }

    path = os.path.join(SAVE_DIR, f"interview_report_{time.strftime('%Y%m%d_%H%M%S')}.json")
    with open(path,"w",encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print("[INFO] Report saved:", path)

if __name__ == "__main__":
    main()
