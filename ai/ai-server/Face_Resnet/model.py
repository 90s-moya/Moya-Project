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
        model = ResNet18_Emotion(num_classes=num_classes, pretrained=True).to(device)
        if ckpt_path:
            state = torch.load(ckpt_path, map_location=device, weights_only=False)
            sd = state.get("state_dict", state)
            new_sd = {}
            for k, v in sd.items():
                new_sd[k[7:]] = v if k.startswith("module.") else v
            model.load_state_dict(new_sd, strict=False)
            print(f"[INFO] Loaded checkpoint: {ckpt_path}")
        model.eval()
        return model
