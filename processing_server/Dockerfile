# 
FROM python:3.9

# 
WORKDIR /app

COPY . /app


# 
RUN pip install --no-cache-dir --upgrade -r requirements.txt

ENV MYSQL_URI=mysql+pymysql://root:12345678@mysql:3306/chatbotserver
ENV OPENAI_API_KEY=sk-proj-4KvmEIU2qTT9LCcG8VHFT3BlbkFJwz6Jum3cwZaGq4PxBXVG
ENV LANGCHAIN_API_KEY=REDACTED_LANGCHAIN_API_KEY
ENV SENDER="REDACTED_EMAIL"
ENV MAILJET_API_KEY=REDACTED_MAILJET_API_KEY
ENV MAILJET_SECRET_KEY=REDACTED_MAILJET_SECRET_KEY
ENV RABBITMQ_HOST="rabbitmq-server"
ENV QDRANT_URL="qDrant-server:6333"
CMD ["uvicorn", "main:app", "--host","0.0.0.0", "--port", "9000"]
