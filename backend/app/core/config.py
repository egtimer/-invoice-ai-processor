"""
Core configuration module for the Invoice AI Processor.

This module manages all application settings using Pydantic's BaseSettings,
which allows configuration through environment variables for different environments
(development, staging, production).
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """
    Application settings and configuration.
    
    These settings can be overridden through environment variables.
    For example, setting PROJECT_NAME in .env will override the default value.
    """
    
    # Project metadata
    PROJECT_NAME: str = "Invoice AI Processor"
    API_VERSION: str = "v1"
    DEBUG: bool = True
    
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # File upload configuration
    # Maximum file size in bytes (default: 10MB)
    MAX_FILE_SIZE: int = 10 * 1024 * 1024
    # Allowed file extensions for upload
    ALLOWED_EXTENSIONS: list = [".pdf"]
    # Directory where uploaded files are temporarily stored
    UPLOAD_DIR: str = "uploads"
    # Directory where processed results are stored
    RESULTS_DIR: str = "results"
    
    # OCR configuration
    # Path to Tesseract executable (system-dependent)
    # On Ubuntu: /usr/bin/tesseract
    # On macOS: /usr/local/bin/tesseract
    # On Windows: C:\\Program Files\\Tesseract-OCR\\tesseract.exe
    TESSERACT_PATH: Optional[str] = None
    # Languages for OCR (comma-separated: "eng,spa" for English and Spanish)
    OCR_LANGUAGES: str = "spa"
    
    # NLP/NER configuration
    # SpaCy model to use for entity recognition
    # Options: es_core_news_sm, es_core_news_md, es_core_news_lg
    SPACY_MODEL: str = "es_core_news_lg"
    
    # Hugging Face model for advanced NER
    # This model is specifically trained for invoice entity extraction
    HF_MODEL: str = "dslim/bert-base-NER"
    
    # Processing configuration
    # Confidence threshold for entity extraction (0.0 to 1.0)
    # Entities with confidence below this will be flagged for manual review
    CONFIDENCE_THRESHOLD: float = 0.7
    # Maximum number of concurrent processing jobs
    MAX_WORKERS: int = 4
    
    # Database configuration (for future implementation)
    DATABASE_URL: Optional[str] = None
    
    # Redis configuration (for caching, optional)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    USE_REDIS: bool = False
    
    # Logging configuration
    LOG_LEVEL: str = "INFO"
    LOG_FILE: Optional[str] = "app.log"
    
    class Config:
        """
        Pydantic configuration class.
        
        This tells Pydantic to read values from a .env file
        if it exists in the project root.
        """
        env_file = ".env"
        case_sensitive = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Create necessary directories on initialization
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)
        os.makedirs(self.RESULTS_DIR, exist_ok=True)


# Create a global settings instance that can be imported throughout the app
# This ensures all modules use the same configuration
settings = Settings()
