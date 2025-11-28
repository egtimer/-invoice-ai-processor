"""
Invoice AI Processor v2 - Main Application.

Upgraded architecture featuring:
- Docling for advanced document parsing (replaces Tesseract)
- Claude API for intelligent extraction
- Hybrid mode for cost-effective accuracy

Author: Eduardo García Tímermans
Version: 2.0.0
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from app.core.config import settings
from app.api.endpoints import upload, process
from app.models.invoice import HealthResponse

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.dev.ConsoleRenderer() if settings.LOG_FORMAT == "console" 
        else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles startup and shutdown events.
    """
    # Startup
    logger.info(
        "Starting Invoice AI Processor v2",
        mode=settings.effective_extraction_mode,
        claude_configured=settings.has_claude_api
    )
    
    # Pre-warm Docling (optional, downloads models)
    if settings.DEBUG:
        logger.info("Debug mode enabled, skipping Docling pre-warm")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Invoice AI Processor v2")


# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
## Invoice AI Processor v2

Sistema avanzado de extracción de datos de facturas usando IA.

### Características principales:
- 📄 **Docling** para parsing avanzado de PDFs (mejor que Tesseract)
- 🤖 **Claude API** para extracción inteligente
- ⚡ **Modo híbrido** para balance costo/precisión
- 📊 Soporte para tablas complejas
- 🌍 Multi-idioma (español, inglés)

### Modos de extracción:
- `local_only`: Solo Docling + patrones (gratis, ~80% precisión)
- `hybrid`: Local primero, escala a LLM si es necesario (recomendado)
- `llm_only`: Siempre usa Claude (~95% precisión, tiene costo)

### Endpoints principales:
- `POST /api/v2/upload` - Subir factura
- `POST /api/v2/process/{id}` - Procesar factura
- `GET /api/v2/process/{id}` - Ver estado
- `POST /api/v2/reprocess/{id}` - Reprocesar con LLM
    """,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://invoice-ai-processor.vercel.app",
        "*"  # Remove in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router, prefix="/api/v2", tags=["upload"])
app.include_router(process.router, prefix="/api/v2", tags=["process"])

# Also support v1 prefix for backward compatibility
app.include_router(upload.router, prefix="/api/v1", tags=["upload-legacy"])
app.include_router(process.router, prefix="/api/v1", tags=["process-legacy"])


@app.get("/", tags=["root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Invoice AI Processor",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
        "features": {
            "docling": "Enabled - Advanced PDF parsing",
            "claude": "Available" if settings.has_claude_api else "Not configured",
            "mode": settings.effective_extraction_mode
        }
    }


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    """
    Health check endpoint.
    
    Returns system status and configuration.
    """
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        extraction_mode=settings.effective_extraction_mode,
        claude_available=settings.has_claude_api,
        docling_ready=True
    )


@app.get("/api/v2/stats", tags=["stats"])
async def get_stats():
    """Get extraction statistics and configuration."""
    from app.services.invoice_processor import invoice_processor
    
    return {
        **invoice_processor.get_extraction_stats(),
        "version": "2.0.0",
        "supported_formats": settings.ALLOWED_EXTENSIONS,
        "max_file_size_mb": settings.MAX_FILE_SIZE / (1024 * 1024)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
