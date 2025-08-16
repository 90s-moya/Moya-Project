# model.py
# -*- coding: utf-8 -*-
import torch
import torch.nn as nn
from torchvision.models import resnet18

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

def load_model(ckpt_path: str | None, device="cuda", num_classes=7):
    """Tesla T4 최적화 모델 로드"""
    # Tesla T4 GPU 최적화 설정
    if device == "cuda" and torch.cuda.is_available():
        # cuDNN 최적화
        torch.backends.cudnn.benchmark = True
        torch.backends.cudnn.deterministic = False
        
        # GPU 메모리 효율적 로드
        model = ResNet18_Emotion(num_classes=num_classes, pretrained=True)
        model = model.to(device)
        
        if ckpt_path:
            # GPU 메모리 효율적 체크포인트 로드
            state = torch.load(ckpt_path, map_location=device, weights_only=False)
            sd = state.get("state_dict", state)
            new_sd = {}
            for k, v in sd.items():
                new_sd[k[7:]] = v if k.startswith("module.") else v
            model.load_state_dict(new_sd, strict=False)
            print(f"[INFO] Tesla T4 - Loaded checkpoint: {ckpt_path}")
        
        # Tesla T4 최적화: 컴파일 (PyTorch 2.0+)
        try:
            model = torch.compile(model, mode="reduce-overhead")
            print("[INFO] Tesla T4 - Model compiled for optimization")
        except Exception:
            print("[INFO] Tesla T4 - Model compilation not available, using standard mode")
            
    else:
        # CPU 모드
        model = ResNet18_Emotion(num_classes=num_classes, pretrained=True).to(device)
        if ckpt_path:
            state = torch.load(ckpt_path, map_location=device, weights_only=False)
            sd = state.get("state_dict", state)
            new_sd = {}
            for k, v in sd.items():
                new_sd[k[7:]] = v if k.startswith("module.") else v
            model.load_state_dict(new_sd, strict=False)
            print(f"[INFO] CPU - Loaded checkpoint: {ckpt_path}")
    
    model.eval()
    return model
