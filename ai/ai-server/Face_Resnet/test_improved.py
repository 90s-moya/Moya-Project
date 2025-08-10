# test_improved.py
# -*- coding: utf-8 -*-
"""
개선된 면접 감정 분석 - 개인별 캘리브레이션 적용 버전
미소를 짓고 있는데 화남으로 인식되는 문제를 해결
"""

import os, cv2, time, json, argparse, numpy as np, torch
import torchvision.transforms as T
from collections import deque, Counter

from model import load_model
from mediapipe_face import FaceMeshDetector
from utils import softmax_temperature, compute_tension
from emotion_calibration import EmotionCalibrator

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

# ---------- 품질 필터 ----------
def face_quality_ok(bgr, min_brightness=60, min_sharpness=80):
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

# ---------- 강화된 미소 기반 보정 ----------
def enhanced_smile_correction(probs, smile_score, eye_open, curvature=None):
    """강화된 미소 기반 보정"""
    if smile_score is None or eye_open is None:
        return probs
    
    # 미소 신뢰도 계산 (여러 지표 종합)
    smile_confidence = smile_score
    if curvature is not None:
        smile_confidence = 0.6 * smile_score + 0.4 * curvature
    
    # 눈이 너무 작으면 (찡그림) 미소 신뢰도 감소
    if eye_open < 0.15:
        smile_confidence *= 0.5
    
    # 미소 신뢰도가 높을 때만 보정 적용
    if smile_confidence < 0.3:
        return probs
    
    p = probs.copy()
    idx = CLASS_NAMES.index
    
    # 미소 강도에 따른 보정 강도 결정
    correction_strength = min(1.0, smile_confidence * 1.5)
    
    # 목표 확률 설정
    target_happy = 0.15 + 0.25 * correction_strength
    target_neutral = 0.25 + 0.35 * correction_strength
    
    # 현재 긍정 감정이 너무 낮으면 보정
    current_positive = p[idx("happy")] + p[idx("neutral")]
    target_positive = target_happy + target_neutral
    
    if current_positive < target_positive:
        # 부정 감정에서 확률을 가져와서 긍정 감정에 분배
        need = target_positive - current_positive
        
        # 우선순위: anger > disgust > fear > sad
        donors = ["anger", "disgust", "fear", "sad"]
        taken = 0.0
        
        for donor in donors:
            if taken >= need:
                break
            donor_idx = idx(donor)
            take_amount = min(p[donor_idx] * 0.8, need - taken)  # 최대 80%까지만 가져옴
            p[donor_idx] -= take_amount
            taken += take_amount
        
        # 가져온 확률을 happy와 neutral에 분배
        if taken > 0:
            happy_ratio = target_happy / target_positive
            p[idx("happy")] += taken * happy_ratio
            p[idx("neutral")] += taken * (1 - happy_ratio)
    
    # 정규화
    p = p / (p.sum() + 1e-6)
    return p

def main():
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=False)
    src.add_argument("--video", type=str, default=None, help="video path (optional)")
    src.add_argument("--camera", type=int, default=0, help="camera index (default 0)")
    ap.add_argument("--ckpt", type=str, default=None, help="checkpoint .pt (optional)")
    ap.add_argument("--calibration", type=str, default=None, help="personal calibration file")
    ap.add_argument("--fps", type=int, default=10)
    ap.add_argument("--temp", type=float, default=2.0)
    ap.add_argument("--calib_sec", type=float, default=2.0)
    ap.add_argument("--no-draw", action="store_true", help="do not show window")
    ap.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    args = ap.parse_args()

    os.makedirs(SAVE_DIR, exist_ok=True)

    # ---- 개인별 캘리브레이션 로드
    calibrator = None
    if args.calibration:
        calibrator = EmotionCalibrator(args.ckpt, args.device)
        if calibrator.load_calibration(args.calibration):
            print(f"[INFO] 개인별 캘리브레이션 적용: {args.calibration}")
        else:
            print(f"[WARNING] 캘리브레이션 로드 실패: {args.calibration}")
            calibrator = None

    # ---- 소스 열기
    cap = cv2.VideoCapture(args.video if args.video else args.camera)
    if not cap.isOpened():
        raise RuntimeError("카메라/비디오를 열 수 없습니다. 인덱스나 경로를 확인하세요.")
    if args.video is None:
        cap.set(cv2.CAP_PROP_FPS, args.fps)

    # ---- 모델/검출기
    model = load_model(args.ckpt, device=args.device, num_classes=len(CLASS_NAMES))
    det = FaceMeshDetector()

    # ---- 캘리브레이션(입 벌어짐 기준)
    t0 = time.time(); base_opens = []
    print(f"[INFO] 캘리브레이션 {args.calib_sec:.1f}s 진행중...")
    while time.time() - t0 < args.calib_sec:
        ret, frm = cap.read()
        if not ret: break
        crop, lm, _ = det.extract_face(frm)
        if crop is None or lm is None:
            if not args.no_draw:
                cv2.imshow("Improved Interview Analysis", frm)
                if (cv2.waitKey(1) & 0xFF) == ord('q'): break
            continue
        h,w = frm.shape[:2]
        up = np.array([lm.landmark[13].x*w, lm.landmark[13].y*h])
        dn = np.array([lm.landmark[14].x*w, lm.landmark[14].y*h])
        base_opens.append(np.linalg.norm(up-dn))
        if not args.no_draw:
            cv2.putText(frm, "Calibrating...", (10,30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,255), 2)
            cv2.imshow("Improved Interview Analysis", frm)
            if (cv2.waitKey(1) & 0xFF) == ord('q'): break
    mouth_open_base = float(np.median(base_opens)) if base_opens else None
    print(f"[CALIB] mouth_open_base={mouth_open_base}")

    # ---- 루프
    frames = 0
    hist = {k:0 for k in CLASS_NAMES}
    probs_acc, smile_acc, eye_sq_acc, lip_acc = [], [], [], []
    start = time.time()
    print("[INFO] 개선된 실시간 분석 시작 (종료: q)")

    label_window = deque(maxlen=10)
    stable_label = None

    while True:
        ret, frame = cap.read()
        if not ret: break

        crop, lm, bbox = det.extract_face(frame)
        if crop is None or lm is None:
            if not args.no_draw:
                cv2.putText(frame, "No face detected", (10,30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)
                try:
                    cv2.imshow("Improved Interview Analysis", frame)
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
                    cv2.imshow("Improved Interview Analysis", frame)
                except cv2.error:
                    pass
                if (cv2.waitKey(1) & 0xFF) == ord('q'): break
            continue

        # ---- 추론 (TTA)
        crop_rgb = enhance_for_model(crop)
        inp = to_tensor(crop_rgb).unsqueeze(0).to(args.device)
        probs = model_probs_tta(model, inp, args.temp)

        # ---- 메쉬 기반 피처
        eye_open = det.eye_open_ratio(frame, lm)
        smile = det.smile_score(frame, lm)
        lip = det.lip_press_score(frame, lm, scale=0.6, smile_score_hint=smile, mouth_open_base=mouth_open_base)
        curvature = det.mouth_corner_curvature(frame, lm)

        # 미소일 때 lip 과대평가 감쇠
        if lip is not None and smile is not None:
            lip = float(lip * (1.0 - 0.35*smile))

        # ---- 개선된 보정 적용 ----
        # 1. 개인별 캘리브레이션 보정
        if calibrator:
            probs = calibrator.apply_personal_correction(probs, smile or 0.0)
        
        # 2. 강화된 미소 기반 보정
        probs = enhanced_smile_correction(probs, smile, eye_open, curvature)

        # 라벨 결정(저신뢰 억제 + 다수결)
        maxp = float(np.max(probs))
        pred = CLASS_NAMES[int(np.argmax(probs))]
        
        # 신뢰도 기반 안정화
        if maxp < 0.45 and stable_label is not None:
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

        # 오버레이 & 창 표시
        if not args.no_draw:
            x1,y1,x2,y2 = bbox
            cv2.rectangle(frame,(x1,y1),(x2,y2),(0,255,0),2)
            pos = (probs[CLASS_NAMES.index("happy")] + probs[CLASS_NAMES.index("neutral")]) * 100.0
            
            # 개선된 정보 표시
            txt1 = f"{stable_label} (conf:{maxp:.2f})"
            txt2 = f"Smile:{(smile or 0):.2f} Curv:{(curvature or 0):.2f}"
            txt3 = f"Happy:{probs[CLASS_NAMES.index('happy')]:.2f} Neutral:{probs[CLASS_NAMES.index('neutral')]:.2f}"
            txt4 = f"Positive:{pos:.0f}% Tension:{tension*100:.0f}%"
            
            # 개인 캘리브레이션 적용 여부 표시
            calib_status = "Personal Calib: ON" if calibrator else "Personal Calib: OFF"

            y0 = max(25, y1-10)
            cv2.putText(frame, txt1, (x1, y0), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
            cv2.putText(frame, txt2, (x1, y0+22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,0), 1)
            cv2.putText(frame, txt3, (x1, y0+38), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,255), 1)
            cv2.putText(frame, txt4, (x1, y0+54), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,255), 2)
            cv2.putText(frame, calib_status, (10, frame.shape[0]-20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1)

            try:
                cv2.imshow("Improved Interview Analysis", frame)
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
            "personal_calibration_used": calibrator is not None,
            "calibration_file": args.calibration if calibrator else None
        }
    }

    path = os.path.join(SAVE_DIR, f"improved_interview_report_{time.strftime('%Y%m%d_%H%M%S')}.json")
    with open(path,"w",encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"[INFO] 개선된 리포트 저장: {path}")
    
    # 면접 특화 분석도 함께 수행
    from interview_analyzer import InterviewEmotionAnalyzer
    analyzer = InterviewEmotionAnalyzer()
    interview_result = analyzer.analyze(report)
    
    enhanced_path = path.replace('.json', '_enhanced.json')
    with open(enhanced_path, 'w', encoding='utf-8') as f:
        json.dump({
            "original_report": report,
            "interview_analysis": interview_result
        }, f, ensure_ascii=False, indent=2)
    
    print(f"[INFO] 면접 특화 분석 결과: {enhanced_path}")
    print(f"[RESULT] 등급: {interview_result['summary']['grade']}, 준비도: {interview_result['summary']['interview_readiness']}")

if __name__ == "__main__":
    main()