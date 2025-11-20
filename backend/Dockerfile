# Dockerfile for Invoice AI Processor Backend

FROM python:3.12-slim

WORKDIR /app

# Install system dependencies required for Tesseract OCR and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-spa \
    libtesseract-dev \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies with updated versions
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

# Install spaCy Spanish model compatible with spaCy 3.8
RUN pip install --no-cache-dir --break-system-packages \
    https://github.com/explosion/spacy-models/releases/download/es_core_news_lg-3.8.0/es_core_news_lg-3.8.0-py3-none-any.whl

# Copy the entire application code
COPY . .

# Create necessary directories for uploads, results, and logs
RUN mkdir -p uploads results logs

# Expose port 8000 where FastAPI will listen
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Command to run when container starts
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
