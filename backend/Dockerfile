# Dockerfile for Invoice AI Processor v2
# Uses Docling instead of Tesseract for better PDF understanding

FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
# Note: Docling handles its own OCR, but we keep poppler for PDF rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Download spaCy Spanish model
RUN python -m spacy download es_core_news_sm

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads results logs .docling_cache

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DOCLING_CACHE_DIR=/app/.docling_cache

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
