FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create directories
RUN mkdir -p uploads results .docling_cache

ENV PYTHONUNBUFFERED=1
ENV DOCLING_CACHE_DIR=/app/.docling_cache

EXPOSE 10000

CMD python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}
