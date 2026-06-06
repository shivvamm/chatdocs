"""Synchronous, in-process document ingestion.

Used for single-container deployments (e.g. Hugging Face Spaces) where the
RabbitMQ + processing_server worker is not available. Mirrors the PDF path of
processing_server/consumer.py but reads Qdrant connection details from env so
it can talk to a managed Qdrant Cloud cluster.
"""

import os
import logging
from uuid import uuid4

import pymupdf4llm
from langchain_core.documents import Document
from langchain_pinecone import PineconeEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

logger = logging.getLogger(__name__)

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")  # None for a local Qdrant
EMBEDDING_DIM = 1024  # multilingual-e5-large


def get_qdrant_client(timeout: int = 120) -> QdrantClient:
    return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=timeout)


def _chunk(document: Document, chunk_size: int = 600, chunk_overlap: int = 60):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap
    )
    return splitter.split_documents([document])


def ingest_pdf_files(file_paths, collection_name: str) -> int:
    """Extract, chunk, embed and upsert PDFs into a per-company Qdrant collection.

    Returns the total number of chunks stored. Deletes each source file after
    a successful ingest (the disk is ephemeral on HF Spaces).
    """
    embeddings = PineconeEmbeddings(model="multilingual-e5-large")
    client = get_qdrant_client()

    if not client.collection_exists(collection_name):
        logger.info("Creating Qdrant collection: %s", collection_name)
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )

    vector_store = QdrantVectorStore(
        client=client, collection_name=collection_name, embedding=embeddings
    )

    total_chunks = 0
    for path in file_paths:
        logger.info("Ingesting file: %s", path)
        markdown = pymupdf4llm.to_markdown(path)
        document = Document(page_content=markdown, metadata={"source": "Documents"})
        chunks = _chunk(document)
        logger.info("Generated %d chunks from %s", len(chunks), path)

        for i in range(0, len(chunks), 100):
            batch = chunks[i : i + 100]
            ids = [str(uuid4()) for _ in batch]
            vector_store.add_documents(documents=batch, ids=ids)

        total_chunks += len(chunks)
        try:
            os.remove(path)
        except OSError:
            pass

    logger.info("Ingested %d total chunks into '%s'", total_chunks, collection_name)
    return total_chunks
