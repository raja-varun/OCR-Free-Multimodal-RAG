from transformers import AutoProcessor, AutoModelForVision2Seq
from PIL import Image
import torch
import torch.nn.functional as F
import gc

MODEL_NAME = "Qwen/Qwen2-VL-2B-Instruct"

print("Loading processor...")
processor = AutoProcessor.from_pretrained(MODEL_NAME)

print("Loading model...")
model = AutoModelForVision2Seq.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float16,
    device_map="auto",
    offload_folder="offload"
)

model.eval()

# Clear memory
torch.cuda.empty_cache()
gc.collect()

print("Loading image...")

image = Image.open("../pages/page_0.png").convert("RGB")

# VERY IMPORTANT
image = image.resize((128, 128))

messages = [
    {
        "role": "user",
        "content": [
            {"type": "image", "image": image},
            {"type": "text", "text": "Describe this page"}
        ]
    }
]

text = processor.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=True
)

inputs = processor(
    text=[text],
    images=[image],
    return_tensors="pt"
)

for k, v in inputs.items():
    if torch.is_tensor(v):
        inputs[k] = v.to(model.device)

print("\nRunning forward pass...")

with torch.inference_mode():

    outputs = model(
        **inputs,
        output_hidden_states=True,
        return_dict=True
    )

print("\nHidden states retrieved.")

# ONLY keep final layer
last_hidden = outputs.hidden_states[-1]

# Immediately free earlier layers
del outputs

torch.cuda.empty_cache()
gc.collect()

print("\nLAST HIDDEN SHAPE:")
print(last_hidden.shape)

tokens = last_hidden[0]

print("\nTOKEN MATRIX SHAPE:")
print(tokens.shape)

print("\nTOKEN COUNT:")
print(tokens.shape[0])

print("\nEMBEDDING DIM:")
print(tokens.shape[1])

# Normalize
tokens = F.normalize(tokens, p=2, dim=-1)

print("\nFIRST TOKEN:")
print(tokens[0][:10])

print("\nLAST TOKEN:")
print(tokens[-1][:10])

print("\nDONE")