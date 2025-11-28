# Invoice AI Processor v2 - Backend Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir uvicorn[standard] fastapi && \
    pip install --no-cache-dir -r requirements.txt && \
    python -m spacy download es_core_news_sm || true

# Copy application code
COPY app/ ./app/

# Create necessary directories
RUN mkdir -p uploads results logs .docling_cache

# Environment
ENV PYTHONUNBUFFERED=1
ENV DOCLING_CACHE_DIR=/app/.docling_cache
ENV PATH="/usr/local/bin:$PATH"

EXPOSE 8000

# Run the application using python -m to ensure it's found
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
