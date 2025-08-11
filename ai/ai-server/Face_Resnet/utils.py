# utils.py
# -*- coding: utf-8 -*-
import numpy as np
import torch

def softmax_temperature(logits: torch.Tensor, temperature: float = 1.0) -> torch.Tensor:
    x = logits / max(temperature, 1e-6)
    x = x - x.max(dim=-1, keepdim=True).values
    return torch.softmax(x, dim=-1)

def compute_tension(eye_open_ratio: float | None,
                    lip_press_score: float | None,
                    blink_ratio: float = 0.0,
                    w_eye: float = 0.60, w_lip: float = 0.25, w_blink: float = 0.15) -> float:
    if eye_open_ratio is None:
        eye_t = 0.0
    else:
        thr = 0.23
        eye_t = float(np.clip((thr - eye_open_ratio) / max(thr, 1e-6), 0.0, 1.0))
    lip_t = float(np.clip(lip_press_score if lip_press_score is not None else 0.0, 0.0, 1.0))
    blink_t = float(np.clip(blink_ratio if blink_ratio is not None else 0.0, 0.0, 1.0))
    score = w_eye*eye_t + w_lip*lip_t + w_blink*blink_t
    return float(np.clip(score, 0.0, 1.0))
