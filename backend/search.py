from transformers import AutoProcessor, AutoModelForVision2Seq
import torch
import torch.nn.functional as F
import faiss
import numpy as np
import pickle
import json
import gc
import os

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

INDICES_DIR = os.path.join(DATA_DIR, "indices")

EMBEDDINGS_DIR = os.path.join(DATA_DIR, "embeddings")

FAISS_PATH = os.path.join(
    INDICES_DIR,
    "faiss.index"
)

METADATA_PATH = os.path.join(
    DATA_DIR,
    "metadata.json"
)

TOKEN_PATH = os.path.join(
    EMBEDDINGS_DIR,
    "token_embeddings.pkl"
)

# -----------------------------
# DYNAMIC STORAGE LOADER
# -----------------------------
def load_storage():

    print("Loading FAISS index...")

    if os.path.exists(FAISS_PATH):

        index = faiss.read_index(FAISS_PATH)

    else:

        print("No FAISS index found yet.")

        index = faiss.IndexFlatIP(1536)

    print("Loading metadata...")

    if os.path.exists(METADATA_PATH):

        with open(METADATA_PATH, "r") as f:
            metadata = json.load(f)

    else:

        metadata = []

    print("Loading token embeddings...")

    if os.path.exists(TOKEN_PATH):

        with open(TOKEN_PATH, "rb") as f:
            token_db = pickle.load(f)

    else:

        token_db = {}

    return index, metadata, token_db

# -----------------------------
# QUERY TOKEN EXTRACTION
# -----------------------------
def extract_query_tokens(query):

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": query}
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

    # Remove approximate prompt/system tokens
    tokens = all_tokens[5:]

    # Normalize embeddings
    tokens = F.normalize(tokens, p=2, dim=-1)

    # Mean pooled embedding
    pooled = tokens.mean(dim=0)

    del outputs
    torch.cuda.empty_cache()
    gc.collect()

    return tokens.cpu(), pooled.cpu().numpy()

# -----------------------------
# MAXSIM
# -----------------------------
def maxsim_score(query_tokens, doc_tokens):

    query_tokens = query_tokens.clone().detach()

    doc_tokens = torch.from_numpy(doc_tokens)

    sim = torch.matmul(
        query_tokens,
        doc_tokens.T
    )

    max_scores = sim.max(dim=1).values

    score = max_scores.sum()

    return score.item()

# -----------------------------
# SEARCH
# -----------------------------
def search(query, top_k=3):

    # Reload latest storage every search
    index, metadata, token_db = load_storage()

    print(f"\nSearching for: {query}")

    # Empty index check
    if index.ntotal == 0:

        print("FAISS index is empty.")

        return []

    query_tokens, pooled_query = extract_query_tokens(query)

    # FAISS retrieval
    D, I = index.search(
        np.array([pooled_query]).astype("float32"),
        10
    )

    candidate_indices = I[0]

    results = []

    print("\nRunning MaxSim reranking...")

    for faiss_idx in candidate_indices:

        # Skip invalid entries
        if faiss_idx == -1:
            continue

        # Skip out-of-range indices
        if faiss_idx >= len(metadata):
            continue

        meta = metadata[faiss_idx]

        global_id = meta["global_id"]

        # Skip missing token embeddings
        if global_id not in token_db:
            continue

        doc_tokens = token_db[global_id]

        score = maxsim_score(
            query_tokens,
            doc_tokens
        )

        results.append({
            "global_id": global_id,
            "doc_id": meta["doc_id"],
            "page": meta["page"],
            "score": float(score),
            "image": meta["image"],
            "pdf": meta["pdf"]
        })

        print(
            f"{meta['doc_id']} | "
            f"Page {meta['page']} | "
            f"Score: {score}"
        )

    # Sort by MaxSim score
    results = sorted(
        results,
        key=lambda x: x["score"],
        reverse=True
    )

    return results[:top_k]

# -----------------------------
# MAIN
# -----------------------------
if __name__ == "__main__":

    results = search("decision intelligence")

    print("\nFINAL RESULTS:\n")

    for r in results:
        print(r)