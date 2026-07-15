import torch
from transformers import AutoProcessor, AutoModelForVision2Seq

MODEL_NAME = "Qwen/Qwen2-VL-2B-Instruct"

print("🚀 Loading Qwen2-VL (low memory mode)...")

model = AutoModelForVision2Seq.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float16,
    device_map="auto",
    offload_folder="offload",   # 🔥 important
    offload_state_dict=True
)

processor = AutoProcessor.from_pretrained(MODEL_NAME)

model.eval()

print("✅ Model loaded (optimized)")