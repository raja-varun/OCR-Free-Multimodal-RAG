import torch
import torch.nn.functional as F
from transformers import AutoProcessor, PaliGemmaForConditionalGeneration
from PIL import Image

# -----------------------------
# LOAD MODEL
# -----------------------------
model = PaliGemmaForConditionalGeneration.from_pretrained(
    "google/paligemma-3b-pt-224",
    dtype=torch.float16,
    device_map="auto"
)

processor = AutoProcessor.from_pretrained("google/paligemma-3b-pt-224")
tokenizer = processor.tokenizer

print("Model loaded")

# -----------------------------
# TEXT → TOKEN EMBEDDINGS
# -----------------------------
query = "total revenue in 2022"

txt_inputs = tokenizer(query, return_tensors="pt")
txt_inputs["input_ids"] = txt_inputs["input_ids"].to(model.device)

with torch.no_grad():
    text_outputs = model.language_model(input_ids=txt_inputs["input_ids"])

token_embeddings = text_outputs.last_hidden_state

print("Text embeddings:", token_embeddings.shape)

# -----------------------------
# PROJECTION (2048 → 1152)
# -----------------------------
projection = torch.nn.Linear(2048, 1152).to(model.device, dtype=torch.float16)

projected_tokens = projection(token_embeddings)

# Normalize query once
projected_tokens = F.normalize(projected_tokens, dim=-1)
Q = projected_tokens.squeeze(0)

print("Projected tokens:", projected_tokens.shape)

# -----------------------------
# MULTI-IMAGE RETRIEVAL
# -----------------------------
image_paths = [
    r"C:\ColPali\test.jpeg",
    r"C:\ColPali\image1.jpg",
    r"C:\ColPali\image2.jpg"
]

scores = []

for path in image_paths:
    print(f"\nProcessing: {path}")

    image = Image.open(path).convert("RGB")

    img_inputs = processor(images=image, return_tensors="pt")
    img_inputs["pixel_values"] = img_inputs["pixel_values"].to(model.device, dtype=torch.float16)

    with torch.no_grad():
        vision_outputs = model.vision_tower(pixel_values=img_inputs["pixel_values"])

    patch_embeddings = vision_outputs.last_hidden_state

    print("Image embeddings:", patch_embeddings.shape)

    # Normalize
    D = F.normalize(patch_embeddings.squeeze(0), dim=-1)

    # MaxSim
    sim_matrix = torch.matmul(Q, D.T)
    max_sim = sim_matrix.max(dim=1).values
    score = max_sim.sum()

    print("Score:", score.item())

    scores.append(score.item())

# -----------------------------
# BEST MATCH
# -----------------------------
best_index = scores.index(max(scores))
best_image = image_paths[best_index]

print("\n========================")
print("BEST MATCH:", best_image)
print("ALL SCORES:", scores)