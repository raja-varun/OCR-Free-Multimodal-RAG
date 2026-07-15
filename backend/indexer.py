from transformers import AutoProcessor, AutoModelForVision2Seq
from pdf2image import convert_from_path
import torch
import torch.nn.functional as F
import faiss
import numpy as np
import pickle
import os
import gc
import json

MODEL_NAME = "Qwen/Qwen2-VL-2B-Instruct"

print("Loading model...")

processor = AutoProcessor.from_pretrained(MODEL_NAME)

model = AutoModelForVision2Seq.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float16,
    device_map="auto",
    offload_folder="offload"
)

model.eval()

# -----------------------------
# PATHS
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(BASE_DIR, "..", "data")

DOCUMENTS_DIR = os.path.join(DATA_DIR, "documents")

INDICES_DIR = os.path.join(DATA_DIR, "indices")

EMBEDDINGS_DIR = os.path.join(DATA_DIR, "embeddings")

FAISS_PATH = os.path.join(INDICES_DIR, "faiss.index")

METADATA_PATH = os.path.join(DATA_DIR, "metadata.json")

TOKEN_PATH = os.path.join(
    EMBEDDINGS_DIR,
    "token_embeddings.pkl"
)

# -----------------------------
# TOKEN EXTRACTION
# -----------------------------
def extract_page_tokens(image):

    image = image.convert("RGB")

    image = image.resize((128, 128))

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": "Represent this document page"}
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

    with torch.inference_mode():

        outputs = model(
            **inputs,
            output_hidden_states=True,
            return_dict=True
        )

    all_tokens = outputs.hidden_states[-1][0]

    grid_thw = inputs["image_grid_thw"][0]

    t, h, w = grid_thw

    vision_token_count = int(t * h * w)

    print(f"Vision tokens: {vision_token_count}")

    tokens = all_tokens[:vision_token_count]

    tokens = F.normalize(tokens, p=2, dim=-1)

    tokens = tokens.cpu()

    del outputs
    torch.cuda.empty_cache()
    gc.collect()

    return tokens

# -----------------------------
# LOAD / CREATE FAISS
# -----------------------------
def load_or_create_index(embedding_dim=1536):

    if os.path.exists(FAISS_PATH):

        print("Loading existing FAISS index...")

        return faiss.read_index(FAISS_PATH)

    print("Creating new FAISS index...")

    return faiss.IndexFlatIP(embedding_dim)

# -----------------------------
# LOAD / CREATE METADATA
# -----------------------------
def load_metadata():

    if os.path.exists(METADATA_PATH):

        with open(METADATA_PATH, "r") as f:
            return json.load(f)

    return []

# -----------------------------
# LOAD / CREATE TOKEN STORAGE
# -----------------------------
def load_token_storage():

    if os.path.exists(TOKEN_PATH):

        with open(TOKEN_PATH, "rb") as f:
            return pickle.load(f)

    return {}

# -----------------------------
# GET NEXT GLOBAL ID
# -----------------------------
def get_next_global_id(metadata):

    if not metadata:
        return 0

    ids = [m["global_id"] for m in metadata]

    return max(ids) + 1

# -----------------------------
# INDEX PDF
# -----------------------------
def index_pdf(pdf_path, doc_id):

    print(f"\nConverting PDF: {pdf_path}")

    pages = convert_from_path(pdf_path)

    # Document folder
    doc_dir = os.path.join(
        DOCUMENTS_DIR,
        doc_id
    )

    pages_dir = os.path.join(
        doc_dir,
        "pages"
    )

    os.makedirs(pages_dir, exist_ok=True)

    # Load global storage
    index = load_or_create_index()

    metadata = load_metadata()

    token_storage = load_token_storage()

    global_id = get_next_global_id(metadata)

    for i, page in enumerate(pages):

        print(f"\nProcessing page {i}")

        image_path = os.path.join(
            pages_dir,
            f"page_{i}.png"
        )

        page.save(image_path)

        tokens = extract_page_tokens(page)

        print(f"Token shape: {tokens.shape}")

        token_storage[global_id] = tokens.numpy()

        pooled = tokens.mean(dim=0).numpy()

        index.add(
            np.array([pooled]).astype("float32")
        )

        metadata.append({
            "global_id": global_id,
            "doc_id": doc_id,
            "page": i,
            "image": image_path,
            "pdf": pdf_path
        })

        global_id += 1

    # Save global index
    print("\nSaving FAISS index...")
    faiss.write_index(index, FAISS_PATH)

    # Save metadata
    print("Saving metadata...")

    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f)

    # Save token embeddings
    print("Saving token embeddings...")

    with open(TOKEN_PATH, "wb") as f:
        pickle.dump(token_storage, f)

    print("\nINDEXING COMPLETE")

# -----------------------------
# MAIN
# -----------------------------
if __name__ == "__main__":

    index_pdf(
        pdf_path="Assignment.pdf.pdf",
        doc_id="doc_test"
    )