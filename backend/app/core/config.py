"""
Core configuration module for Invoice AI Processor v2.

This module manages all application settings using Pydantic's BaseSettings,
supporting both Docling and Claude API configurations.
"""

from pydantic_settings import BaseSettings
from typing import Optional, Literal
from functools import lru_cache
import os


class Settings(BaseSettings):
    """
    Application settings and configuration.
    
    All settings can be overridden through environment variables.
    """
    
    # ===========================================
    # Project metadata
    # ===========================================
    PROJECT_NAME: str = "Invoice AI Processor"
    API_VERSION: str = "v2"
    DEBUG: bool = True
    
    # ===========================================
    # Server configuration
    # ===========================================
    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("PORT", "8000"))  # Railway sets PORT env var
    
    # ===========================================
    # File handling
    # ===========================================
    MAX_FILE_SIZE: int = 20 * 1024 * 1024  # 20MB (increased for Docling)
    ALLOWED_EXTENSIONS: list = [".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".docx"]
    UPLOAD_DIR: str = "uploads"
    RESULTS_DIR: str = "results"
    
    # ===========================================
    # Docling Configuration (replaces Tesseract)
    # ===========================================
    DOCLING_OCR_ENABLED: bool = True
    DOCLING_TABLE_MODE: Literal["fast", "accurate"] = "accurate"
    DOCLING_CACHE_DIR: str = ".docling_cache"
    
    # ===========================================
    # Claude API Configuration
    # ===========================================
    ANTHROPIC_API_KEY: Optional[str] = None
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    CLAUDE_MAX_TOKENS: int = 4096
    CLAUDE_TEMPERATURE: float = 0.0  # Deterministic for extraction
    
    # ===========================================
    # Extraction Mode
    # ===========================================
    # "hybrid" = Docling + regex first, Claude as fallback
    # "llm_only" = Always use Claude (more accurate, costs money)
    # "local_only" = Only Docling + regex (free, less accurate)
    EXTRACTION_MODE: Literal["hybrid", "llm_only", "local_only"] = "hybrid"
    
    # Confidence threshold below which we escalate to LLM
    LLM_ESCALATION_THRESHOLD: float = 0.7
    
    # ===========================================
    # Validation
    # ===========================================
    VALIDATE_CIF_NIF: bool = True
    VALIDATE_TOTALS: bool = True
    CONFIDENCE_THRESHOLD: float = 0.7
    
    # ===========================================
    # Processing
    # ===========================================
    MAX_WORKERS: int = 4
    PROCESSING_TIMEOUT: int = 120  # seconds
    
    # ===========================================
    # Logging
    # ===========================================
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: Literal["json", "console"] = "console"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Create necessary directories
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)
        os.makedirs(self.RESULTS_DIR, exist_ok=True)
        os.makedirs(self.DOCLING_CACHE_DIR, exist_ok=True)
    
    @property
    def has_claude_api(self) -> bool:
        """Check if Claude API is configured."""
        return bool(self.ANTHROPIC_API_KEY)
    
    @property
    def effective_extraction_mode(self) -> str:
        """
        Return the actual extraction mode based on configuration.
        Falls back to local_only if Claude API is not configured.
        """
        if self.EXTRACTION_MODE in ["hybrid", "llm_only"] and not self.has_claude_api:
            return "local_only"
        return self.EXTRACTION_MODE


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to ensure settings are loaded only once.
    """
    return Settings()


# Global settings instance
settings = get_settings()
