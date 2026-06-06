# Deploying ChatDocs (demo) on a free Hugging Face Space

This guide deploys the **main server** as a single Docker Space, backed by free
managed cloud services. Document ingestion runs **synchronously in-process**
(no RabbitMQ / processing worker), so PDF upload + RAG chat both work in one
container.

> The admin dashboard (`front-end/`) and the widget (`Chatbotquery/script.js`)
> are separate frontends — deploy them later on Vercel/Netlify or another Space.
> This guide gets the **API + chatbot** live.

---

## 1. Create the free backing services

| Service | Provider (free tier) | What you copy |
|---------|----------------------|---------------|
| Vector DB | **Qdrant Cloud** (1 GB cluster) | cluster URL + API key |
| Cache / chat history | **Upstash Redis** | the `rediss://...` connection URL |
| Relational DB | **TiDB Serverless** (MySQL-compatible) | host, user, password, db name |
| LLM | **Groq** | API key |
| Embeddings | **Pinecone** | API key |

Sign up for each, create a free instance, and keep the credentials handy.

> TiDB/Aiven require TLS. With the `python:3.9` (Debian) image, append
> `?ssl_ca=/etc/ssl/certs/ca-certificates.crt` to the MySQL URI (see below).

---

## 2. Create the Space

1. https://huggingface.co/new-space → **SDK: Docker**, **Blank**, visibility Public.
2. Clone it locally:
   ```bash
   git clone https://huggingface.co/spaces/<you>/chatdocs-api
   ```
3. Copy the **contents of `main_server/`** into the Space repo, then rename the
   HF-specific files so HF picks them up:
   ```bash
   cp -r main_server/* chatdocs-api/
   cd chatdocs-api
   mv Dockerfile.hf Dockerfile      # HF builds the file named exactly "Dockerfile"
   mv README.hf.md README.md        # HF reads Space metadata from README front-matter
   ```
4. Push:
   ```bash
   git add . && git commit -m "ChatDocs main server" && git push
   ```

---

## 3. Set secrets

Space → **Settings → Variables and secrets** → add (as *Secrets*):

```
GROQ_API_KEY        = gsk_...
PINECONE_API_KEY    = pcsk_...
QDRANT_URL          = https://<cluster>.cloud.qdrant.io:6333
QDRANT_API_KEY      = <qdrant key>
REDIS_URL           = rediss://default:<pwd>@<host>.upstash.io:6379
MYSQL_URI           = mysql+pymysql://<user>:<pwd>@<host>.tidbcloud.com:4000/<db>?ssl_ca=/etc/ssl/certs/ca-certificates.crt
JWT_SECRET_KEY      = <random 64-char hex>
```

`USE_RABBITMQ=false`, `UPLOAD_DIR=/tmp/uploads`, `DISABLE_ORIGIN_CHECK=true`
are already baked into the Dockerfile — no need to add them unless you want to
change them. The Space rebuilds automatically; watch the **Logs** tab.

---

## 4. Try it (Swagger UI)

Open `https://<you>-chatdocs-api.hf.space/docs`.

1. **`POST /init_company/`** — fill `company_name`, `chatbot_name`, `email`,
   `deployment_url` (any URL), and attach a **PDF**. Response returns
   `company` (your API key) and `chatbot_id`. Ingestion runs inline — large PDFs
   take a few seconds.
2. **`POST /query`** — click **Authorize**, paste the `company` key as the
   Bearer token, then call with body:
   ```json
   { "query": "Summarize the proposal", "session_id": "demo-1", "chatbot_id": "<chatbot_id>" }
   ```
   You get a grounded answer from the uploaded PDF.

---

## Limitations of this free demo

- **Ephemeral disk** — uploaded PDFs reset on restart, but their *embeddings*
  persist in Qdrant Cloud and chat history in Upstash, so the bot keeps working.
- **Website crawling is disabled** in synchronous mode (it needs the
  `processing_server` worker + RabbitMQ). Upload PDFs instead.
- **Free Spaces sleep** after ~48h idle and cold-start on the next request.
- `DISABLE_ORIGIN_CHECK=true` turns off the per-domain widget lock — fine for a
  demo, set it to `false` for any real embedding.

## What changed in the code (all backward-compatible / env-gated)

- `utils/ingest.py` — new synchronous PDF→Qdrant ingestion.
- `routers/prepare.py` — `USE_RABBITMQ`, `UPLOAD_DIR`, `QDRANT_URL/API_KEY`
  env-driven; synchronous ingest when the queue is disabled.
- `utils/query_utils.py` — Qdrant retriever reads `QDRANT_URL` / `QDRANT_API_KEY`.
- `routers/query.py` — `DISABLE_ORIGIN_CHECK` to bypass the domain lock for demos.
- `main.py` — LangSmith tracing only enabled when `LANGCHAIN_API_KEY` is set.
- `Dockerfile.hf`, `README.hf.md` — HF Space build + metadata.

Defaults preserve the original RabbitMQ/local-Qdrant behavior, so your existing
`deploy.sh` Docker stack is unaffected.
