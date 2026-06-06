from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from models.schemas import ClientRequest
from utils.prepare_bot_utils import generate_unique_id
from typing import Annotated, Dict, List, Optional
from datetime import datetime
from models.tables import Company, Chatbot_stats
from config.db import SessionLocal
from sqlalchemy.orm import Session
import pika
import json
import logging
import os
from dotenv import load_dotenv
from constants.prompts import user_message
from fastapi.responses import JSONResponse
from routers.auth import get_current_user, get_current_user_with_token
from models.tables import Chatbot_stats, Company, Queries, QueryUsers,Users
from models.schemas import QueryUserResponse
from pydantic import HttpUrl, BaseModel, Field, EmailStr
import logging
import pymupdf4llm
import pathlib
from models.schemas import UpdatePromptRequest
from sqlalchemy.exc import NoResultFound
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client.models import Distance, VectorParams
from qdrant_client import QdrantClient
from uuid import uuid4
import asyncio
from langchain_text_splitters import RecursiveCharacterTextSplitter
import time
from langchain_core.documents import Document
from typing import Optional, List, Dict, Any


load_dotenv()

router = APIRouter(tags=['prepare'])

shared_folder_path = os.getenv("UPLOAD_DIR", "/shareduploadfolder")
# When false (single-container deploys like HF Spaces), documents are ingested
# synchronously in-process instead of being queued to RabbitMQ.
USE_RABBITMQ = os.getenv("USE_RABBITMQ", "true").lower() == "true"
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

def chunk_text(text, chunk_size=600, chunk_overlap=60):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    chunks = text_splitter.split_documents([text])
    return chunks


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db 
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

@router.get("/status/{company_key}")
def check_processing_status(company_key: str, db: db_dependency):
    company = db.query(Company).filter(Company.company_key == company_key).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    try:
        client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=5)
        if not client.collection_exists(company_key):
            return {"status": "processing", "message": "Collection not yet created"}
        info = client.get_collection(company_key)
        if info.points_count > 0:
            return {"status": "ready", "message": "Processing complete", "points": info.points_count}
        return {"status": "processing", "message": "Collection created, indexing in progress"}
    except Exception as e:
        return {"status": "processing", "message": f"Checking: {str(e)}"}

@router.post("/append_documents/{company_key}")
async def append_documents(company_key: str, db: db_dependency, files: List[UploadFile] = File(...)):
    uploaded_files = []
    try:
        company = db.query(Company).filter(Company.company_key == company_key).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        company_folder_path = os.path.join(shared_folder_path, f"{company.company_name}-{company_key}")
        os.makedirs(company_folder_path, exist_ok=True)

        for file in files:
            if not file.filename:
                raise ValueError("File must have a valid filename")
            file_path = os.path.join(company_folder_path, file.filename)
            with open(file_path, "wb") as buffer:
                buffer.write(await file.read())
            uploaded_files.append(os.path.join(f"{company.company_name}-{company_key}", file.filename))
            logger.info(f"Wrote file {file.filename}")

        chatbot = db.query(Chatbot_stats).filter(Chatbot_stats.company_id == company.id).first()
        chatbot_id = chatbot.chatbot_id if chatbot else ""

        message_body = {
            "company_key": company_key,
            "chatbot_id": chatbot_id,
            "upload_files": uploaded_files
        }
        QUEUE_NAME = "COMPANY_INIT"
        connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
        channel = connection.channel()
        channel.queue_declare(queue=QUEUE_NAME, durable=True)
        channel.basic_publish(
            exchange='',
            routing_key=QUEUE_NAME,
            body=json.dumps(message_body),
            properties=pika.BasicProperties(delivery_mode=pika.DeliveryMode.Persistent)
        )
        connection.close()
        logger.info("Append message sent to RabbitMQ for company: %s", company_key)

        return {"status": "ok", "message": f"{len(uploaded_files)} files queued for processing"}
    except Exception as e:
        logger.error("Error appending documents: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))


def retry_upsert(client, collection_name, text_chunks, uuids, embeddings, retries=3):
    
    for attempt in range(retries):
        try:
            logger.info(f"Upsert attempt {attempt + 1}")
            vector_store = QdrantVectorStore(
                client=client,
                collection_name=collection_name,
                embedding=embeddings,
            )
            vector_store.add_documents(documents=text_chunks, ids=uuids)
            logger.info(f"Successfully upserted {len(text_chunks)} documents.")
            break
        except Exception as e:
            logger.error(f"Error during upsert attempt {attempt + 1}: {str(e)}")
            if attempt < retries - 1:
                logger.info(f"Retrying in {2 ** attempt} seconds...")
                time.sleep(2 ** attempt)
            else:
                logger.error("Max retries reached. Failing the upsert operation.")
                raise

@router.post("/init_company/")
async def add_company(db: db_dependency, 
                company_name : str = Form(...),
                chatbot_name: str =  Form(...),
                email:str = Form(...),
                deployment_url:Optional[HttpUrl] = Form(...),
                base_url : Optional[HttpUrl] = Form(None),
                files: List[UploadFile] = File([])):
    
    uploaded_files = []
    uploaded_abs_paths = []
    company_folder_path = None

    try:
        # Validate input first
        if not base_url and not files:
            return JSONResponse(status_code=400, content={'detail': "Either provide base_url or files for creation"})
        
        logger.info("Received request to add company")
        logger.info(f"Params received: company_name: {company_name}, chatbot_name: {chatbot_name}, email: {email}, deployment_url: {deployment_url}, base_url: {base_url}, files: {files}")

        # Check if company already exists
        company = db.query(Company).filter(Company.email == email).first()
        if company:
            logger.warning("Company with this email already exists: %s", email)
            return JSONResponse(status_code=400, content={"detail": "Company with this email already exists."})

        # Generate unique IDs
        company_key_id = generate_unique_id()
        chatbot_id = generate_unique_id()
        
        # Set up company folder path for file uploads
        company_folder_path = os.path.join(shared_folder_path, f"{company_name}-{company_key_id}")
        
        # Process files first (before any DB operations)
        if len(files) > 0: 
            logger.info("File detected")
            os.makedirs(company_folder_path, exist_ok=True)
            
            for file in files:
                if not file.filename:
                    raise ValueError("File must have a valid filename")
                    
                file_path = os.path.join(company_folder_path, file.filename)
                with open(file_path, "wb") as buffer:
                    buffer.write(await file.read())

                uploaded_files.append(os.path.join(f"{company_name}-{company_key_id}", file.filename))
                uploaded_abs_paths.append(file_path)
                logger.info(f"Wrote file {file.filename}")
            logger.info("All the provided files are written") 

        # Prepare message body for RabbitMQ
        message_body = {
            "company_key": company_key_id,
            "chatbot_id": chatbot_id,
            "upload_files": uploaded_files
        }
        message_body_json = json.dumps(message_body)
        QUEUE_NAME = "COMPANY_INIT"

        # Test RabbitMQ connection first (only when async processing is enabled)
        if USE_RABBITMQ:
            logger.info("Testing RabbitMQ connection...")
            connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
            channel = connection.channel()
            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            connection.close()
            logger.info("RabbitMQ connection successful")

        # Now start database transaction (only after all validations pass)
        logger.info("Starting database transaction...")
        
        # Create company record
        create_company_model = Company(
            company_key=company_key_id,
            base_url=base_url,
            email=email,
            input_tokens=0,
            output_tokens=0,
            company_name=company_name,
            created_date=datetime.now()
        )
        db.add(create_company_model)
        db.flush()  # Flush to get the ID without committing
        
        company_id = create_company_model.id

        # Create chatbot record
        create_chatbot_model = Chatbot_stats(
            chatbot_id=chatbot_id,
            chatbot_name=chatbot_name,
            chatbot_prompt=user_message,
            company_id=company_id,
            origin_url=deployment_url,
            company_name=company_name,
            total_input_tokens=0,
            total_output_tokens=0,
            total_queries=0,
            last_query_time=datetime.now(),
        )
        db.add(create_chatbot_model)
        
        # Send message to RabbitMQ (async processing path)
        if USE_RABBITMQ:
            logger.info("Sending message to RabbitMQ...")
            connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
            channel = connection.channel()
            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            channel.basic_publish(
                exchange='',
                routing_key=QUEUE_NAME,
                body=message_body_json,
                properties=pika.BasicProperties(
                    delivery_mode=pika.DeliveryMode.Persistent
                )
            )
            connection.close()
            logger.info("Message sent to RabbitMQ: %s", message_body_json)

        # Commit transaction only after everything succeeds
        db.commit()
        logger.info("Database transaction committed successfully")

        # Synchronous ingestion path (single-container deploys, no RabbitMQ).
        # PDF uploads are processed inline; website crawling still requires the
        # processing_server worker and is skipped in this mode.
        if not USE_RABBITMQ:
            if uploaded_abs_paths:
                from utils.ingest import ingest_pdf_files
                try:
                    chunks = ingest_pdf_files(uploaded_abs_paths, company_key_id)
                    logger.info("Synchronous ingestion complete: %d chunks", chunks)
                except Exception as ingest_error:
                    logger.error("Synchronous ingestion failed: %s", str(ingest_error))
            if base_url is not None:
                logger.warning(
                    "base_url provided but website crawling is unavailable in "
                    "synchronous mode (requires the processing_server worker)."
                )

        return {"company": company_key_id, "chatbot_id": chatbot_id}

    except Exception as e:
        logger.error("An error occurred: %s", str(e))
        
        # Rollback database transaction
        db.rollback()
        logger.info("Database transaction rolled back")
        
        # Clean up uploaded files if any error occurs
        if company_folder_path and os.path.exists(company_folder_path):
            try:
                import shutil
                shutil.rmtree(company_folder_path)
                logger.info(f"Cleaned up uploaded files in {company_folder_path}")
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup uploaded files: {cleanup_error}")
        
        raise HTTPException(status_code=500, detail=str(e))




