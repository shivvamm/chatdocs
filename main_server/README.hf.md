---
title: ChatDocs API
emoji: 📄
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# ChatDocs — Main Server (Hugging Face Space)

This Space runs the FastAPI main server of [ChatDocs](https://github.com/your-username/chatdocs)
in a single container, backed by free managed cloud services.

- **Interactive API docs:** `/docs`
- **Health:** `/`

## Required secrets (Space → Settings → Variables and secrets)

| Name | Example | Notes |
|------|---------|-------|
| `GROQ_API_KEY` | `gsk_...` | LLM (free tier) |
| `PINECONE_API_KEY` | `pcsk_...` | Embeddings (multilingual-e5-large) |
| `QDRANT_URL` | `https://xxxx.cloud.qdrant.io:6333` | Qdrant Cloud cluster |
| `QDRANT_API_KEY` | `...` | Qdrant Cloud key |
| `REDIS_URL` | `rediss://default:pwd@host:6379` | Upstash Redis (use the `rediss://` URL) |
| `MYSQL_URI` | `mysql+pymysql://user:pwd@gateway.tidbcloud.com:4000/db?ssl_ca=/etc/ssl/certs/ca-certificates.crt` | TiDB Serverless / Aiven |
| `JWT_SECRET_KEY` | random 64-hex | Admin login token signing |

These are preset by the Dockerfile but can be overridden:
`USE_RABBITMQ=false`, `UPLOAD_DIR=/tmp/uploads`, `DISABLE_ORIGIN_CHECK=true`.
