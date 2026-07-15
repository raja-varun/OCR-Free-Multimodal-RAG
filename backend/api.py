from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import shutil
import os

from indexer import index_pdf
from search import search
from rag import generate_answer

# -----------------------------
# APP
# -----------------------------
app = FastAPI()

# -----------------------------
# CORS
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# BASE PATHS
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(BASE_DIR, "..", "data")

DOCUMENTS_DIR = os.path.join(DATA_DIR, "documents")
INDICES_DIR = os.path.join(DATA_DIR, "indices")
EMBEDDINGS_DIR = os.path.join(DATA_DIR, "embeddings")

os.makedirs(DOCUMENTS_DIR, exist_ok=True)
os.makedirs(INDICES_DIR, exist_ok=True)
os.makedirs(EMBEDDINGS_DIR, exist_ok=True)

# -----------------------------
# SERVE DOCUMENT FILES
# -----------------------------
app.mount(
    "/documents",
    StaticFiles(directory=DOCUMENTS_DIR),
    name="documents"
)

# -----------------------------
# HOME
# -----------------------------
@app.get("/")
def home():

    return {
        "message": "🔥 Multimodal RAG API Running"
    }

# -----------------------------
# GENERATE DOC ID
# -----------------------------
def generate_doc_id():

    existing = [
        d for d in os.listdir(DOCUMENTS_DIR)
        if d.startswith("doc_")
    ]

    if not existing:
        return "doc_1"

    nums = [
        int(d.split("_")[1])
        for d in existing
    ]

    return f"doc_{max(nums) + 1}"

# -----------------------------
# LIST DOCUMENTS
# -----------------------------
@app.get("/documents")
def list_documents():

    documents = {}

    for doc_id in os.listdir(DOCUMENTS_DIR):

        doc_path = os.path.join(DOCUMENTS_DIR, doc_id)

        if not os.path.isdir(doc_path):
            continue

        pages_dir = os.path.join(doc_path, "pages")

        num_pages = 0

        if os.path.exists(pages_dir):

            num_pages = len([
                f for f in os.listdir(pages_dir)
                if f.endswith(".png")
            ])

        documents[doc_id] = {
            "filename": "original.pdf",
            "num_pages": num_pages
        }

    return {
        "documents": documents
    }

# -----------------------------
# DELETE DOCUMENT
# -----------------------------
@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):

    doc_path = os.path.join(DOCUMENTS_DIR, doc_id)

    if os.path.exists(doc_path):

        shutil.rmtree(doc_path)

        return {
            "message": f"{doc_id} deleted"
        }

    return {
        "message": "Document not found"
    }

# -----------------------------
# UPLOAD PDF
# -----------------------------
@app.post("/upload")
def upload_pdf(file: UploadFile = File(...)):

    # Generate unique document ID
    doc_id = generate_doc_id()

    # Create document folder
    doc_dir = os.path.join(DOCUMENTS_DIR, doc_id)

    os.makedirs(doc_dir, exist_ok=True)

    # Create pages folder
    pages_dir = os.path.join(doc_dir, "pages")

    os.makedirs(pages_dir, exist_ok=True)

    # Save original PDF
    pdf_path = os.path.join(doc_dir, "original.pdf")

    with open(pdf_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Index document
    index_pdf(
        pdf_path=pdf_path,
        doc_id=doc_id
    )

    return {
        "message": "✅ PDF indexed successfully",
        "doc_id": doc_id
    }

# -----------------------------
# SEARCH
# -----------------------------
@app.get("/search")
def search_docs(query: str):

    results = search(query)

    formatted_results = []

    for r in results:

        image_path = r["image"]

        relative_path = os.path.relpath(
            image_path,
            DOCUMENTS_DIR
        )

        image_url = (
            f"http://127.0.0.1:8000/documents/"
            f"{relative_path.replace(os.sep, '/')}"
        )

        formatted_results.append({
            "doc_id": r["doc_id"],
            "page": r["page"],
            "score": r["score"],
            "image_url": image_url
        })

    return {
        "query": query,
        "results": formatted_results
    }

# -----------------------------
# MULTIMODAL RAG
# -----------------------------
@app.get("/ask")
def ask_docs(query: str):

    output = generate_answer(query)

    formatted_results = []

    for r in output["results"]:

        image_path = r["image"]

        relative_path = os.path.relpath(
            image_path,
            DOCUMENTS_DIR
        )

        image_url = (
            f"http://127.0.0.1:8000/documents/"
            f"{relative_path.replace(os.sep, '/')}"
        )

        formatted_results.append({
            "doc_id": r["doc_id"],
            "page": r["page"],
            "score": r["score"],
            "image_url": image_url
        })

    return {
        "query": query,
        "answer": output["answer"],
        "results": formatted_results
    }