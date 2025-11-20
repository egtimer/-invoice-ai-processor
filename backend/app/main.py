"""
Main FastAPI application entry point for the Invoice AI Processor.

This module initializes the FastAPI application, configures CORS, 
includes all API routers, and sets up middleware for the invoice processing system.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.endpoints import upload, process, export_data

# Create the FastAPI application instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Sistema inteligente de procesamiento de facturas con IA - Extracción automática de datos usando OCR y NLP",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS to allow frontend communication
# In production, replace with specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Frontend dev servers
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Include API routers with prefixes
# All endpoints will be under /api/v1/ for versioning
app.include_router(upload.router, prefix="/api/v1", tags=["upload"])
app.include_router(process.router, prefix="/api/v1", tags=["process"])
app.include_router(export_data.router, prefix="/api/v1", tags=["export"])


@app.get("/")
async def root():
    """
    Root endpoint that provides basic API information and health check.
    
    Returns:
        dict: Welcome message and API status
    """
    return {
        "message": "Invoice AI Processor API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns:
        dict: Health status of the application
    """
    return {
        "status": "healthy",
        "service": "invoice-ai-processor"
    }
