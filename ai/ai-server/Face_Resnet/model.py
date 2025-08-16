# model.py (교체/패치)
import os, torch, torch.nn as nn
from torchvision.models import resnet18
from contextlib import suppress
import shutil

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

def _can_compile_when_opted_in() -> bool:
    if os.getenv("USE_TORCH_COMPILE", "0") != "1":
        return False
    if not torch.cuda.is_available():
        return False
    # triton + C compiler + ptxas 체크
    with suppress(Exception):
        import triton  # noqa
    try:
        import triton  # noqa
    except Exception:
        return False
    cc = os.getenv("CC")
    has_cc = (shutil.which(cc) if cc else None) or shutil.which("cc") or shutil.which("gcc") or shutil.which("clang")
    has_ptxas = shutil.which("ptxas") is not None
    return bool(has_cc and has_ptxas)

def load_model(ckpt_path: str | None, device="cuda", num_classes=7):
    use_cuda = (device == "cuda" and torch.cuda.is_available())
    if use_cuda:
        torch.backends.cudnn.benchmark = True
        torch.backends.cudnn.deterministic = False

    model = ResNet18_Emotion(num_classes=num_classes, pretrained=True).to(device if use_cuda else "cpu")

    if ckpt_path:
        state = torch.load(ckpt_path, map_location=(device if use_cuda else "cpu"), weights_only=False)
        sd = state.get("state_dict", state)
        sd = { (k[7:] if k.startswith("module.") else k): v for k, v in sd.items() }
        model.load_state_dict(sd, strict=False)
        print(f"[INFO] Loaded checkpoint: {ckpt_path}")

    if use_cuda and _can_compile_when_opted_in():
        try:
            model = torch.compile(model, mode="reduce-overhead")  # 옵트인일 때만
            print("[INFO] torch.compile enabled")
        except Exception as e:
            print(f"[WARN] torch.compile failed → using eager: {e}")
    else:
        print("[INFO] using eager (no torch.compile)")

    model.eval()
    return model
