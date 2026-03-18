<p align="center">
  <h1 align="center">ChatDocs</h1>
  <p align="center">
    Upload documents. Ask questions. Get intelligent answers.
  </p>
  <p align="center">
    <a href="#quick-start">Quick Start</a> &middot;
    <a href="#architecture">Architecture</a> &middot;
    <a href="#api-reference">API Reference</a> &middot;
    <a href="#deployment">Deployment</a> &middot;
    <a href="#contributing">Contributing</a>
  </p>
</p>

---

ChatDocs is an open-source, multi-tenant **RAG (Retrieval-Augmented Generation) chatbot platform**. Companies upload business proposals, SOWs, RFPs, or any PDF documents, and ChatDocs creates an AI-powered assistant that can answer questions about them with full context.

## Features

- **Document Ingestion** -- Upload PDFs or provide a website URL; documents are automatically chunked, embedded, and indexed.
- **RAG-Powered Q&A** -- Retrieves relevant context from a vector database and generates grounded answers via LLM.
- **Multi-Tenant** -- Each company gets its own isolated vector collection, chat history, and usage tracking.
- **Embeddable Widget** -- A drop-in `<script>` tag that adds a chat bubble to any website.
- **Admin Dashboard** -- Monitor companies, chatbots, queries, token usage, and costs.
- **Async Processing** -- Document ingestion is queued via RabbitMQ and processed in the background.
- **Session Memory** -- Conversation history persisted in Redis for contextual follow-up questions.
- **Meeting Scheduler** -- Optional Google Calendar integration for scheduling meetings from chat.

## Architecture

```
                        +------------------+
                        |   Admin Panel    |  (React / CRA)
                        |   Port 3000     |
                        +--------+---------+
                                 |
                        +--------v---------+
  Chatbot Widget  --->  |   Main Server    |  (FastAPI / Port 8000)
  (script.js)           |  - Auth (JWT)    |
                        |  - Query (RAG)   |
                        |  - Prepare       |
                        |  - Admin         |
                        |  - VectorDB CRUD |
                        +--+----------+----+
                           |          |
              +------------+          +-------------+
              |                                     |
     +--------v--------+              +-------------v-----------+
     |    RabbitMQ      |              |        Redis            |
     | (Message Queue)  |              |   (Chat History)        |
     +--------+---------+              +-------------------------+
              |
     +--------v-----------------+
     |  Processing Server       |  (FastAPI / Port 9000)
     |  - Consumes queue msgs   |
     |  - Crawls websites       |
     |  - Extracts PDF text     |
     |  - Chunks & embeds       |
     |  - Upserts to Qdrant     |
     |  - Sends notification    |
     +--------+-----------------+
              |
     +--------v---------+         +------------------+
     |     Qdrant        |         |     MySQL        |
     | (Vector Database) |         |  (Relational DB) |
     +-------------------+         +------------------+
```

| Component | Tech | Purpose |
|-----------|------|---------|
| **Main Server** | FastAPI (Python) | REST API, auth, RAG query pipeline, admin endpoints |
| **Processing Server** | FastAPI (Python) | Async document ingestion worker |
| **Admin Dashboard** | React + MUI + Tailwind | Company/chatbot management UI |
| **Chatbot Widget** | Vanilla JS | Embeddable chat interface |
| **Qdrant** | Vector DB | Stores document embeddings for similarity search |
| **MySQL** | Relational DB | Users, companies, chatbots, queries, visitor data |
| **Redis** | In-memory store | Chat session history |
| **RabbitMQ** | Message broker | Queues document processing jobs |

### LLM & Embeddings

| Model | Provider | Usage |
|-------|----------|-------|
| `llama-3.3-70b-versatile` | Groq | Chat completions |
| `multilingual-e5-large` | Pinecone | Document embeddings (1024-dim) |

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (required)
- [Node.js](https://nodejs.org/) >= 18 (for frontend)
- MySQL 8.0+ (local or Docker)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/chatdocs.git
cd chatdocs
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

```env
# LLM & Embeddings
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key          # Optional, for OpenAI embeddings
LANGCHAIN_API_KEY=your_langchain_api_key    # Optional, for LangSmith tracing
PINECONE_API_KEY=your_pinecone_api_key      # Required for embeddings

# Database
MYSQL_URI=mysql+pymysql://root:yourpassword@host.docker.internal:3306/chatbotserver

# Email (choose one)
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
SENDGRID_API_KEY=your_sendgrid_api_key
SENDER=your-email@example.com

# Auth
JWT_SECRET_KEY=generate_a_random_256bit_hex_string

# Redis
REDIS_URL=redis://redis-server:6379/0

# Qdrant
QDRANT_URL=http://localhost:6333
```

> **Important:** Never commit `.env` files. The `.gitignore` already excludes them.

### 3. Deploy with the deploy script

```bash
# Full deployment (infrastructure + backend + frontend)
./deploy.sh

# Backend services only
./deploy.sh --services

# Clean up all containers
./deploy.sh --clean
```

### 4. Manual setup (alternative)

If you prefer to start services individually:

```bash
# Create Docker network
docker network create chatbotnetwork

# Start infrastructure
docker run --network chatbotnetwork --name redis-server -d -p 6379:6379 redis:latest

docker run --network chatbotnetwork --name rabbitmq -d \
  -p 5672:5672 -p 15672:15672 rabbitmq:3.13-management

docker run --network chatbotnetwork --name qdrant -d \
  -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage:z qdrant/qdrant

# Build & run main server
cd main_server && docker build -t chatbotmain . && cd ..
docker run --network chatbotnetwork --name chatbotmain -d \
  --env-file .env -p 8000:8000 chatbotmain

# Build & run processing server
cd processing_server && docker build -t chatbotprocess . && cd ..
docker run --network chatbotnetwork --name chatbotprocess -d \
  --env-file .env -p 9000:9000 chatbotprocess

# Start frontend
cd front-end && npm install && npm start    # Admin panel on :3000
cd Chatbotquery && npm install && npm run dev  # Chat POC on :5173
```

### 5. Verify

| Service | URL |
|---------|-----|
| Main Server API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |
| Processing Server | http://localhost:9000 |
| Admin Dashboard | http://localhost:3000 |
| Chat POC | http://localhost:5173 |
| RabbitMQ Management | http://localhost:15672 (guest/guest) |
| Qdrant Dashboard | http://localhost:6333/dashboard |

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/signup` | Register a new user |
| `POST` | `/auth/login` | Login and receive JWT token |

### Company & Bot Setup

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/init_company/` | Create company + chatbot, upload documents |
| `POST` | `/append_documents/{company_key}` | Add more documents to an existing bot |
| `GET` | `/status/{company_key}` | Check document processing status |

### Chat

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/query` | Bearer token | Ask a question (RAG pipeline) |
| `POST` | `/send-chat/` | Bearer token | Email chat transcript |
| `POST` | `/add-visitor/` | None | Track visitor metadata |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admin/total-stats` | Bearer token | Global usage statistics |
| `GET` | `/admin/companies` | Bearer token | List all companies |
| `GET` | `/admin/companies/{id}/chatbots` | Bearer token | Chatbots for a company |
| `GET` | `/admin/chatbots/{id}/queries` | Bearer token | Query history for a chatbot |
| `PUT` | `/admin/chatbot/{id}/prompt` | Bearer token | Update chatbot system prompt |
| `POST` | `/admin/upload/` | Bearer token | Upload & index documents directly |

### Vector DB Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/dbmanipulation/add-to-collection/` | Add a document to a collection |
| `POST` | `/dbmanipulation/search-by-metadata/` | Search documents by metadata |
| `DELETE` | `/dbmanipulation/delete-from-collection/` | Delete documents by ID |

Full interactive API docs available at `/docs` (Swagger UI) when the server is running.

## Embeddable Chat Widget

Add the chatbot to any website with a single script tag:

```html
<script
  id="ai-chatdocs-bot"
  src="https://your-cdn.com/script.js"
  defer
  data-api-key="YOUR_COMPANY_KEY"
  data-bot-id="YOUR_CHATBOT_ID"
  data-company-name="Your Company"
  data-bot-name="Your Bot Name">
</script>
```

The widget supports:
- Markdown rendering in responses
- Chat history persistence (localStorage)
- Visitor information collection
- Chat transcript export via email
- Mobile-responsive design

## Project Structure

```
chatdocs/
├── main_server/               # Primary API server (FastAPI)
│   ├── main.py                # App entrypoint
│   ├── config/db.py           # SQLAlchemy database config
│   ├── models/
│   │   ├── tables.py          # SQLAlchemy ORM models
│   │   └── schemas.py         # Pydantic request/response schemas
│   ├── routers/
│   │   ├── auth.py            # Authentication endpoints
│   │   ├── query.py           # Chat/RAG endpoints
│   │   ├── prepare.py         # Company onboarding endpoints
│   │   ├── admin.py           # Admin dashboard endpoints
│   │   └── vectordb.py        # Vector DB CRUD endpoints
│   ├── utils/                 # Helper utilities
│   ├── constants/             # Prompt templates, email templates
│   └── alembic/               # Database migrations
├── processing_server/         # Async document processing worker
│   ├── main.py                # App entrypoint + RabbitMQ consumer
│   ├── consumer.py            # Message handler + ingestion pipeline
│   └── utils/                 # Scraping, chunking, email utilities
├── front-end/                 # Admin dashboard (React + CRA)
├── Chatbotquery/              # Chat POC app (React + Vite)
│   ├── script.js              # Embeddable chatbot widget
│   └── src/pages/             # Upload, Processing, Chat pages
├── deploy.sh                  # Automated deployment script
├── deploy2.sh                 # Alternative deployment script
└── .github/workflows/         # CI/CD pipeline
```

## Deployment

### Docker

Each service includes a `Dockerfile`. Use the deploy script for orchestrated deployment:

```bash
./deploy.sh              # Full deployment
./deploy.sh --services   # Backend only
./deploy.sh --clean      # Tear down everything
./deploy.sh --help       # Show all options
```

### CI/CD

A GitHub Actions workflow is configured on the `cicd` branch that:
1. Builds Docker images for main and processing servers
2. Pulls infrastructure images (Redis, MySQL, Qdrant, RabbitMQ)
3. Creates the Docker network and starts all containers

### Environment Variables Reference

| Variable | Required | Used By | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | Yes | Main Server | Groq API key for LLM inference |
| `PINECONE_API_KEY` | Yes | Both Servers | Pinecone API key for embeddings |
| `MYSQL_URI` | Yes | Both Servers | MySQL connection string |
| `REDIS_URL` | Yes | Main Server | Redis connection URL |
| `JWT_SECRET_KEY` | Yes | Main Server | Secret for JWT token signing |
| `OPENAI_API_KEY` | No | Main Server | OpenAI API key (alternative LLM) |
| `LANGCHAIN_API_KEY` | No | Main Server | LangSmith tracing |
| `MAILJET_API_KEY` | No | Processing Server | Mailjet email API key |
| `MAILJET_SECRET_KEY` | No | Processing Server | Mailjet email secret |
| `SENDGRID_API_KEY` | No | Main Server | SendGrid email API key |
| `SENDER` | No | Both Servers | Sender email address |
| `QDRANT_URL` | No | Both Servers | Qdrant server URL (default: `http://localhost:6333`) |

## Troubleshooting

### Port Conflicts

Ensure no other services are using ports `3000`, `5173`, `8000`, `9000`, `5672`, `6333`, or `6379`.

```bash
# Check what's using a port
lsof -i :8000
```

### Containers Can't Communicate

Verify all containers are on the same Docker network:

```bash
docker network inspect chatbotnetwork
```

### Database Migrations

```bash
docker exec -it chatbotmain alembic upgrade head
```

### Viewing Logs

```bash
docker logs chatbotmain        # Main server logs
docker logs chatbotprocess     # Processing server logs
docker logs -f chatbotmain     # Follow logs in real-time
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run the tests (if available)
5. Commit your changes (`git commit -m 'Add your feature'`)
6. Push to the branch (`git push origin feature/your-feature`)
7. Open a Pull Request

Please make sure to:
- Never commit API keys, secrets, or credentials
- Keep environment-specific values in `.env` files
- Follow the existing code patterns and conventions

## License

This project is open source. See the [LICENSE](LICENSE) file for details.
