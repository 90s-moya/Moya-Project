# mediapipe_face.py
# -*- coding: utf-8 -*-
from __future__ import annotations
import cv2
import numpy as np
import mediapipe as mp
from typing import Optional, Tuple

mp_face = mp.solutions.face_detection
mp_mesh = mp.solutions.face_mesh

LM = {
    "MOUTH_LEFT": 61, "MOUTH_RIGHT": 291, "LIP_UP": 13, "LIP_DOWN": 14,
    "EYE_L_IN": 133, "EYE_L_OUT": 33, "EYE_R_IN": 362, "EYE_R_OUT": 263,
    "EYE_L_UP": 159, "EYE_L_DN": 145, "EYE_R_UP": 386, "EYE_R_DN": 374,
    "EYE_L_CORNER": 33, "EYE_R_CORNER": 263,
}

def _lm2xy(lm_list, idx: int, w: int, h: int) -> np.ndarray:
    p = lm_list[idx]
    return np.array([p.x * w, p.y * h], dtype=np.float32)

def _clip_bbox(x1, y1, x2, y2, w, h):
    x1 = max(0, min(int(x1), w - 1))
    y1 = max(0, min(int(y1), h - 1))
    x2 = max(0, min(int(x2), w - 1))
    y2 = max(0, min(int(y2), h - 1))
    if x2 <= x1: x2 = min(w - 1, x1 + 1)
    if y2 <= y1: y2 = min(h - 1, y1 + 1)
    return x1, y1, x2, y2

class FaceMeshDetector:
    def __init__(self, max_faces=1, min_detection_conf=0.6, min_tracking_conf=0.6, pad_ratio=0.18):
        self.pad_ratio = float(pad_ratio)
        self.detector = mp_face.FaceDetection(model_selection=0, min_detection_confidence=min_detection_conf)
        self.mesh = mp_mesh.FaceMesh(
            static_image_mode=False, max_num_faces=max_faces, refine_landmarks=True,
            min_detection_confidence=min_detection_conf, min_tracking_confidence=min_tracking_conf
        )

    def _detect_bbox(self, frame_bgr) -> Optional[Tuple[int,int,int,int]]:
        h, w = frame_bgr.shape[:2]
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        res = self.detector.process(rgb)
        if not res.detections:
            return None
        det = sorted(res.detections, key=lambda d: d.score[0], reverse=True)[0]
        bbox = det.location_data.relative_bounding_box
        x, y, bw, bh = bbox.xmin, bbox.ymin, bbox.width, bbox.height
        x1 = x*w; y1 = y*h; x2 = (x+bw)*w; y2 = (y+bh)*h
        side = max(x2-x1, y2-y1); pad = self.pad_ratio * side
        cx, cy = (x1+x2)/2.0, (y1+y2)/2.0
        x1, x2 = cx - side/2 - pad, cx + side/2 + pad
        y1, y2 = cy - side/2 - pad, cy + side/2 + pad
        return _clip_bbox(x1, y1, x2, y2, w, h)

    def _mesh_full(self, frame_bgr):
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        return self.mesh.process(rgb)

    def extract_face(self, frame_bgr):
        """
        Returns: (face_crop_bgr, face_landmarks, bbox)
        - landmarks는 원본 프레임 좌표계 기준
        """
        h, w = frame_bgr.shape[:2]
        bbox = self._detect_bbox(frame_bgr)
        mesh_res = self._mesh_full(frame_bgr)
        if not mesh_res.multi_face_landmarks:
            return None, None, None
        lm = mesh_res.multi_face_landmarks[0].landmark

        if bbox is None:
            xs = [int(p.x * w) for p in lm]; ys = [int(p.y * h) for p in lm]
            x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)
            side = max(x2-x1, y2-y1); pad = self.pad_ratio * side
            cx, cy = (x1+x2)/2.0, (y1+y2)/2.0
            x1, x2 = cx - side/2 - pad, cx + side/2 + pad
            y1, y2 = cy - side/2 - pad, cy + side/2 + pad
            bbox = _clip_bbox(x1, y1, x2, y2, w, h)

        x1, y1, x2, y2 = bbox
        face_crop = frame_bgr[y1:y2, x1:x2].copy()
        return face_crop, mesh_res.multi_face_landmarks[0], bbox

    # ====== Helpers ======
    def eye_open_ratio(self, frame_bgr, face_landmarks) -> Optional[float]:
        if face_landmarks is None: return None
        h, w = frame_bgr.shape[:2]; lm = face_landmarks.landmark
        P = lambda i: _lm2xy(lm, i, w, h)
        L_in, L_out = P(LM["EYE_L_IN"]), P(LM["EYE_L_OUT"])
        R_in, R_out = P(LM["EYE_R_IN"]), P(LM["EYE_R_OUT"])
        L_up, L_dn  = P(LM["EYE_L_UP"]), P(LM["EYE_L_DN"])
        R_up, R_dn  = P(LM["EYE_R_UP"]), P(LM["EYE_R_DN"])
        L_w = np.linalg.norm(L_out-L_in); R_w = np.linalg.norm(R_out-R_in)
        L_o = np.linalg.norm(L_up-L_dn);  R_o = np.linalg.norm(R_up-R_dn)
        return float(((L_o/(L_w+1e-6)) + (R_o/(R_w+1e-6))) * 0.5)

    def smile_score(self, frame_bgr, face_landmarks) -> Optional[float]:
        if face_landmarks is None: return None
        h, w = frame_bgr.shape[:2]; lm = face_landmarks.landmark
        P = lambda i: _lm2xy(lm, i, w, h)
        left_mouth, right_mouth = P(LM["MOUTH_LEFT"]), P(LM["MOUTH_RIGHT"])
        upper_lip, lower_lip    = P(LM["LIP_UP"]), P(LM["LIP_DOWN"])
        left_eye, right_eye     = P(LM["EYE_L_CORNER"]), P(LM["EYE_R_CORNER"])
        mouth_w = np.linalg.norm(right_mouth-left_mouth)
        mouth_o = np.linalg.norm(upper_lip-lower_lip)
        eye_d   = np.linalg.norm(right_eye-left_eye)+1e-6
        smile_raw = (mouth_w/eye_d) - 0.5*(mouth_o/eye_d)
        return float(np.clip((smile_raw - 0.3)/0.4, 0.0, 1.0))

    def lip_press_score(self, frame_bgr, face_landmarks, scale=0.6, smile_score_hint=None, mouth_open_base=None):
        if face_landmarks is None: return None
        h, w = frame_bgr.shape[:2]; lm = face_landmarks.landmark
        P = lambda i: _lm2xy(lm, i, w, h)
        left_mouth, right_mouth = P(LM["MOUTH_LEFT"]), P(LM["MOUTH_RIGHT"])
        upper_lip, lower_lip    = P(LM["LIP_UP"]), P(LM["LIP_DOWN"])
        left_eye, right_eye     = P(LM["EYE_L_CORNER"]), P(LM["EYE_R_CORNER"])
        mouth_w = np.linalg.norm(right_mouth-left_mouth)
        mouth_o = np.linalg.norm(upper_lip-lower_lip)+1e-6
        eye_d   = np.linalg.norm(right_eye-left_eye)+1e-6
        if mouth_open_base and mouth_open_base>0:
            mouth_o = max(mouth_o, 0.6*mouth_open_base)
        raw_ratio = (mouth_w/mouth_o) / (eye_d/50.0)
        ratio_smooth = np.log1p(max(0.0, raw_ratio - 0.8))
        base = np.clip(ratio_smooth/1.6, 0.0, 1.0)
        smile = float(np.clip(smile_score_hint if smile_score_hint is not None else 0.0, 0.0, 1.0))
        base *= (1.0 - 0.5*smile)
        if base < 0.12: base = 0.0
        return float(np.clip(base*scale, 0.0, 1.0))

    def mouth_corner_curvature(self, frame_bgr, face_landmarks) -> float | None:
        # 입꼬리 곡률: 입 중앙 높이 대비 입꼬리 평균 높이 (정규화). 미소↑, 슬픔↓
        if face_landmarks is None: return None
        h, w = frame_bgr.shape[:2]
        lm = face_landmarks.landmark
        P = lambda i: _lm2xy(lm, i, w, h)
        left_c, right_c = P(LM["MOUTH_LEFT"]), P(LM["MOUTH_RIGHT"])
        up, dn = P(LM["LIP_UP"]), P(LM["LIP_DOWN"])
        center = 0.5 * (up + dn)
        eye_l, eye_r = P(LM["EYE_L_CORNER"]), P(LM["EYE_R_CORNER"])
        eye_dist = np.linalg.norm(eye_r - eye_l) + 1e-6
        corners_y_mean = 0.5 * (left_c[1] + right_c[1])
        delta = (center[1] - corners_y_mean) / eye_dist  # y축 아래가 +이므로 center-corners
        curv = float(np.clip((delta + 0.10) / 0.20, 0.0, 1.0))  # [-0.10, +0.10] → [0,1]
        return curv

    def close(self):
        if self.mesh: self.mesh.close()
        if self.detector: self.detector.close()
