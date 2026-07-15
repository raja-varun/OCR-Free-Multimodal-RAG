from transformers import AutoProcessor, AutoModelForVision2Seq
from PIL import Image
import torch
import gc

from search import search

MODEL_NAME = "Qwen/Qwen2-VL-2B-Instruct"

print("Loading RAG model...")

processor = AutoProcessor.from_pretrained(MODEL_NAME)

model = AutoModelForVision2Seq.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float16,
    device_map="auto",
    offload_folder="offload",
    offload_buffers=True
)

model.eval()

# -----------------------------
# LOAD RETRIEVED IMAGES
# -----------------------------
def load_retrieved_images(results, max_pages=1):

    images = []

    for r in results[:max_pages]:

        image_path = r["image"]

        image = Image.open(image_path).convert("RGB")

        # Smaller image for 6GB GPU
        image = image.resize((256, 256))

        images.append(image)

    return images

# -----------------------------
# BUILD MULTIMODAL PROMPT
# -----------------------------
def build_messages(query, num_images):

    content = []

    # Add image placeholders
    for _ in range(num_images):

        content.append({
            "type": "image"
        })

    # Add query
    content.append({
        "type": "text",
        "text": f"""
You are an intelligent document assistant.

Answer ONLY using the provided document page.

If the answer is not visible in the page, say:
"I could not find the answer in the retrieved page."

Question:
{query}

Give a concise answer.
"""
    })

    return [
        {
            "role": "user",
            "content": content
        }
    ]

# -----------------------------
# GENERATE ANSWER
# -----------------------------
def generate_answer(query):

    print(f"\nGenerating answer for: {query}")

    # Retrieve only ONE page
    results = search(query, top_k=1)

    if len(results) == 0:

        return {
            "answer": "No relevant pages found.",
            "results": []
        }

    # Load retrieved image
    images = load_retrieved_images(results)

    # Build prompt
    messages = build_messages(
        query=query,
        num_images=len(images)
    )

    text = processor.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    # Process multimodal input
    inputs = processor(
        text=[text],
        images=images,
        return_tensors="pt"
    )

    for k, v in inputs.items():

        if torch.is_tensor(v):

            inputs[k] = v.to(model.device)

    print("\nRunning multimodal generation...")

    # Generate
    with torch.inference_mode():

        generated_ids = model.generate(
            **inputs,
            max_new_tokens=40,
            do_sample=False,
            use_cache=False
        )

    # Decode
    generated_text = processor.batch_decode(
        generated_ids,
        skip_special_tokens=True
    )[0]

    # -----------------------------
    # CLEAN OUTPUT
    # -----------------------------
    if "assistant" in generated_text:

        generated_text = generated_text.split("assistant")[-1].strip()

    # Cleanup
    del inputs
    del generated_ids

    torch.cuda.empty_cache()
    gc.collect()

    return {
        "answer": generated_text,
        "results": results
    }

# -----------------------------
# MAIN
# -----------------------------
if __name__ == "__main__":

    output = generate_answer(
        "What is decision intelligence?"
    )

    print("\nANSWER:\n")

    print(output["answer"])