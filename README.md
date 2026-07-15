# OCR-Free Multimodal RAG

An OCR-Free Multimodal Document Retrieval and Question Answering System built using Vision-Language Models, FAISS, MaxSim Retrieval, FastAPI, and React.

## Overview

This project enables users to upload PDF documents, index them without using OCR, retrieve relevant pages using semantic search, and generate answers using Multimodal Retrieval-Augmented Generation (RAG).

Unlike traditional OCR-based systems, this project preserves the visual layout and structure of documents by directly processing page images with a Vision-Language Model.

## Features

- OCR-Free document understanding
- PDF upload and indexing
- Semantic document retrieval
- MaxSim late interaction reranking
- FAISS vector indexing
- Multimodal RAG question answering
- FastAPI backend
- React frontend
- Multi-document support

## Tech Stack

### Frontend
- React.js
- CSS

### Backend
- FastAPI
- Python

### AI / Machine Learning
- Qwen2-VL
- PyTorch
- Hugging Face Transformers
- FAISS

### Other Libraries
- pdf2image
- Pillow
- NumPy

## Project Structure

```
OCR-Free-Multimodal-RAG
│
├── backend/
│   ├── api.py
│   ├── indexer.py
│   ├── search.py
│   ├── rag.py
│   └── ...
│
├── frontend/
│
├── sample_data/
│
├── README.md
└── .gitignore
```

## Installation

Clone the repository:

```bash
git clone https://github.com/raja-varun/OCR-Free-Multimodal-RAG.git
```

Go to the project directory:

```bash
cd OCR-Free-Multimodal-RAG
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

## Running the Project

### Backend

```bash
cd backend
..\colpali-env\Scripts\activate
uvicorn api:app --reload
```

### Frontend

```bash
cd frontend
npm start
```

Open your browser:

```
http://localhost:3000
```

## Sample Workflow

1. Upload a PDF document.
2. The document is converted into page images.
3. Vision-language embeddings are generated.
4. FAISS indexes the document embeddings.
5. Enter a search query.
6. Relevant pages are retrieved using MaxSim.
7. Ask questions about the document using Multimodal RAG.
8. The system generates grounded answers based on the retrieved pages.

## Future Improvements

- Better UI/UX
- Cloud deployment
- Multi-turn conversational memory
- Evidence highlighting
- Support for more document formats
- Enterprise-scale indexing

## Author

**Raja Varun**

B.Tech Computer Science & Engineering (Data Science)

---

This project was developed for learning and research purposes in OCR-Free Document Intelligence and Multimodal Retrieval-Augmented Generation (RAG).
