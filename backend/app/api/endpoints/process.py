"""
Processing endpoint for extracting data from uploaded invoices.

This endpoint orchestrates the complete pipeline: retrieves the uploaded file,
performs OCR to extract text, applies NLP to identify entities, and returns
the structured invoice data.
"""

from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from pathlib import Path
import logging
from typing import Dict
import json

from app.core.config import settings
from app.models.invoice import InvoiceProcessingStatus, InvoiceData
from app.services.ocr_service import ocr_service
from app.services.nlp_service import nlp_service

# Configure logging
logger = logging.getLogger(__name__)

# Create router for processing endpoints
router = APIRouter()

# In-memory storage for processing status
# In production, use a database or Redis
processing_status: Dict[str, dict] = {}


async def process_invoice_task(invoice_id: str, file_path: str):
    """
    Background task that processes an invoice.
    
    This function runs the complete processing pipeline in the background
    so the API can return immediately while processing continues.
    
    Args:
        invoice_id: Unique identifier for the invoice
        file_path: Path to the uploaded PDF file
    """
    try:
        # Update status to processing
        processing_status[invoice_id] = {
            "status": "processing",
            "progress": 0.0,
            "message": "Starting OCR extraction..."
        }
        
        logger.info(f"Starting processing for invoice {invoice_id}")
        
        # Step 1: Extract text with OCR (40% of progress)
        text, ocr_confidence = ocr_service.extract_text_from_pdf(file_path)
        processing_status[invoice_id]["progress"] = 40.0
        processing_status[invoice_id]["message"] = "OCR completed, extracting entities..."
        
        if not text or len(text) < 50:
            raise Exception("Insufficient text extracted from PDF")
        
        logger.info(f"OCR completed for invoice {invoice_id}, confidence: {ocr_confidence:.2f}")
        
        # Step 2: Extract structured data with NLP (80% of progress)
        invoice_data = nlp_service.extract_invoice_data(text, ocr_confidence)
        processing_status[invoice_id]["progress"] = 80.0
        processing_status[invoice_id]["message"] = "Validating extracted data..."
        
        logger.info(f"NLP extraction completed for invoice {invoice_id}")
        
        # Step 3: Save results (100% of progress)
        results_path = Path(settings.RESULTS_DIR) / f"{invoice_id}.json"
        with open(results_path, "w", encoding="utf-8") as f:
            json.dump(invoice_data.dict(), f, indent=2, ensure_ascii=False, default=str)
        
        # Update status to completed
        processing_status[invoice_id] = {
            "status": "completed",
            "progress": 100.0,
            "message": "Processing completed successfully",
            "data": invoice_data
        }
        
        logger.info(f"Processing completed for invoice {invoice_id}")
    
    except Exception as e:
        logger.error(f"Processing failed for invoice {invoice_id}: {str(e)}")
        processing_status[invoice_id] = {
            "status": "error",
            "progress": 0.0,
            "message": f"Processing failed: {str(e)}"
        }


@router.post(
    "/process/{invoice_id}",
    response_model=InvoiceProcessingStatus,
    summary="Start invoice processing",
    description="Initiates processing of an uploaded invoice. Returns immediately with processing status."
)
async def start_processing(invoice_id: str, background_tasks: BackgroundTasks):
    """
    Start processing an uploaded invoice.
    
    This endpoint initiates the processing pipeline for an invoice that was
    previously uploaded. Processing happens in the background, and you can
    check progress using the GET /process/{invoice_id} endpoint.
    
    Args:
        invoice_id: The unique identifier returned from the upload endpoint
        background_tasks: FastAPI background tasks handler
        
    Returns:
        InvoiceProcessingStatus with initial status
        
    Raises:
        HTTPException: If invoice_id is not found or processing fails to start
    """
    # Find the uploaded file
    upload_dir = Path(settings.UPLOAD_DIR)
    matching_files = list(upload_dir.glob(f"{invoice_id}_*"))
    
    if not matching_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice {invoice_id} not found. Please upload the file first."
        )
    
    file_path = str(matching_files[0])
    
    # Check if already processing or completed
    if invoice_id in processing_status:
        current_status = processing_status[invoice_id]["status"]
        if current_status == "processing":
            return InvoiceProcessingStatus(
                invoice_id=invoice_id,
                status="processing",
                progress=processing_status[invoice_id]["progress"],
                message="Processing already in progress"
            )
        elif current_status == "completed":
            return InvoiceProcessingStatus(
                invoice_id=invoice_id,
                status="completed",
                progress=100.0,
                message="Already processed",
                data=processing_status[invoice_id]["data"]
            )
    
    # Initialize processing status
    processing_status[invoice_id] = {
        "status": "processing",
        "progress": 0.0,
        "message": "Processing started"
    }
    
    # Start background processing
    background_tasks.add_task(process_invoice_task, invoice_id, file_path)
    
    return InvoiceProcessingStatus(
        invoice_id=invoice_id,
        status="processing",
        progress=0.0,
        message="Processing started"
    )


@router.get(
    "/process/{invoice_id}",
    response_model=InvoiceProcessingStatus,
    summary="Get processing status",
    description="Check the current status and progress of invoice processing."
)
async def get_processing_status(invoice_id: str):
    """
    Get the current processing status of an invoice.
    
    Use this endpoint to check if processing is complete and retrieve
    the extracted data. You should poll this endpoint periodically
    after starting processing.
    
    Args:
        invoice_id: The unique identifier of the invoice
        
    Returns:
        InvoiceProcessingStatus with current status and data (if completed)
        
    Raises:
        HTTPException: If invoice_id is not found
    """
    if invoice_id not in processing_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No processing information found for invoice {invoice_id}"
        )
    
    status_info = processing_status[invoice_id]
    
    return InvoiceProcessingStatus(
        invoice_id=invoice_id,
        status=status_info["status"],
        progress=status_info["progress"],
        message=status_info.get("message"),
        data=status_info.get("data")
    )


@router.get(
    "/results/{invoice_id}",
    response_model=InvoiceData,
    summary="Get invoice data",
    description="Retrieve the complete extracted data for a processed invoice."
)
async def get_invoice_results(invoice_id: str):
    """
    Get the extracted invoice data.
    
    This endpoint returns the complete structured data extracted from
    an invoice after processing is complete.
    
    Args:
        invoice_id: The unique identifier of the invoice
        
    Returns:
        InvoiceData with all extracted information
        
    Raises:
        HTTPException: If invoice is not found or not yet processed
    """
    # Check processing status
    if invoice_id not in processing_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice {invoice_id} not found"
        )
    
    status_info = processing_status[invoice_id]
    
    if status_info["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invoice {invoice_id} is not yet processed. Status: {status_info['status']}"
        )
    
    # Return the data from memory
    if "data" in status_info:
        return status_info["data"]
    
    # Fallback: Load from file
    results_path = Path(settings.RESULTS_DIR) / f"{invoice_id}.json"
    if not results_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Results file not found for invoice {invoice_id}"
        )
    
    with open(results_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return InvoiceData(**data)
