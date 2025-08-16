# model.py
# -*- coding: utf-8 -*-
import os, shutil
import torch
import torch.nn as nn
from torchvision.models import resnet18
from contextlib import suppress

class ResNet18_Emotion(nn.Module):
    def __init__(self, num_classes=7, pretrained=True):
        super().__init__()
        try:
            self.backbone = resnet18(weights="IMAGENET1K_V1" if pretrained else None)
        except Exception:
            self.backbone = resnet18(pretrained=pretrained)
        in_feat = self.backbone.fc.in_features
        self.backbone.fc = nn.Linear(in_feat, num_classes)

    def forward(self, x):
        return self.backbone(x)

def _can_torch_compile() -> bool:
    """Triton JIT에 필요한 조건이 될 때만 compile 사용."""
    if os.getenv("DISABLE_TORCH_COMPILE", "0") == "1":
        return False
    if not torch.cuda.is_available():
        return False
    # triton import 가능?
    with suppress(Exception):
        import triton  # noqa: F401
    try:
        import triton  # type: ignore # noqa: F401
    except Exception:
        return False
    # 호스트 C 컴파일러와 ptxas 필요
    cc = os.getenv("CC")
    has_cc = (shutil.which(cc) if cc else None) or shutil.which("cc") or shutil.which("gcc") or shutil.which("clang")
    has_ptxas = shutil.which("ptxas") is not None
    return bool(has_cc and has_ptxas)

def load_model(ckpt_path: str | None, device="cuda", num_classes=7):
    """Tesla T4 최적화 모델 로드 (컴파일러 없으면 eager로 자동 폴백)"""
    use_cuda = (device == "cuda" and torch.cuda.is_available())

    if use_cuda:
        torch.backends.cudnn.benchmark = True
        torch.backends.cudnn.deterministic = False

    model = ResNet18_Emotion(num_classes=num_classes, pretrained=True)
    model = model.to(device if use_cuda else "cpu")

    if ckpt_path:
        state = torch.load(ckpt_path, map_location=(device if use_cuda else "cpu"), weights_only=False)
        sd = state.get("state_dict", state)
        new_sd = { (k[7:] if k.startswith("module.") else k): v for k, v in sd.items() }
        model.load_state_dict(new_sd, strict=False)
        print(f"[INFO] Loaded checkpoint: {ckpt_path}")

    if use_cuda and _can_torch_compile():
        try:
            model = torch.compile(model, mode="reduce-overhead")
            print("[INFO] torch.compile enabled (Inductor/Triton)")
        except Exception as e:
            print(f"[WARN] torch.compile disabled: {e}")
    else:
        print("[INFO] torch.compile skipped (no compiler/PTXAS or disabled)")

    model.eval()
    return model
