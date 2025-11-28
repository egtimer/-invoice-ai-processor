"""
Processing endpoint - handles invoice data extraction.

This endpoint orchestrates the complete extraction pipeline using
the new Docling + Claude architecture.
"""

from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from pathlib import Path
import structlog
from typing import Dict
import json
import asyncio

from app.core.config import settings
from app.models.invoice import (
    InvoiceProcessingStatus, 
    InvoiceData, 
    ProcessingOptions
)
from app.services.invoice_processor import invoice_processor

logger = structlog.get_logger(__name__)
router = APIRouter()

# In-memory status storage (use Redis in production)
processing_status: Dict[str, dict] = {}


async def process_invoice_task(invoice_id: str, file_path: str, options: ProcessingOptions):
    """
    Background task for invoice processing.
    """
    try:
        processing_status[invoice_id] = {
            "status": "processing",
            "progress": 10.0,
            "message": "Parsing document with Docling..."
        }
        
        logger.info(f"Processing started for {invoice_id}")
        
        # Update progress
        processing_status[invoice_id]["progress"] = 30.0
        processing_status[invoice_id]["message"] = "Extracting data..."
        
        # Process with the new pipeline
        result = await invoice_processor.process_invoice(
            file_path=file_path,
            force_llm=options.force_llm
        )
        
        processing_status[invoice_id]["progress"] = 90.0
        processing_status[invoice_id]["message"] = "Saving results..."
        
        # Save results
        results_path = Path(settings.RESULTS_DIR) / f"{invoice_id}.json"
        with open(results_path, "w", encoding="utf-8") as f:
            json.dump(result.model_dump(), f, indent=2, ensure_ascii=False, default=str)
        
        # Update status to completed
        processing_status[invoice_id] = {
            "status": "completed",
            "progress": 100.0,
            "message": "Processing completed successfully",
            "data": result,
            "extraction_method": result.extraction_method
        }
        
        logger.info(
            f"Processing completed for {invoice_id}",
            method=result.extraction_method,
            confidence=result.confidence_score
        )
        
    except Exception as e:
        logger.error(f"Processing failed for {invoice_id}: {str(e)}")
        processing_status[invoice_id] = {
            "status": "error",
            "progress": 0.0,
            "message": f"Processing failed: {str(e)}"
        }


@router.post(
    "/process/{invoice_id}",
    response_model=InvoiceProcessingStatus,
    summary="Start invoice processing",
    description="Start processing an uploaded invoice with optional LLM mode."
)
async def start_processing(
    invoice_id: str,
    background_tasks: BackgroundTasks,
    options: ProcessingOptions = ProcessingOptions()
):
    """
    Start processing an uploaded invoice.
    
    Options:
    - force_llm: Force LLM extraction for higher accuracy (costs money)
    """
    # Find uploaded file
    upload_dir = Path(settings.UPLOAD_DIR)
    matching_files = list(upload_dir.glob(f"{invoice_id}_*"))
    
    if not matching_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice {invoice_id} not found. Upload first."
        )
    
    file_path = str(matching_files[0])
    
    # Check if already processing
    if invoice_id in processing_status:
        current = processing_status[invoice_id]["status"]
        if current == "processing":
            return InvoiceProcessingStatus(
                invoice_id=invoice_id,
                status="processing",
                progress=processing_status[invoice_id]["progress"],
                message="Processing already in progress"
            )
        elif current == "completed":
            return InvoiceProcessingStatus(
                invoice_id=invoice_id,
                status="completed",
                progress=100.0,
                message="Already processed",
                data=processing_status[invoice_id].get("data"),
                extraction_method=processing_status[invoice_id].get("extraction_method")
            )
    
    # Initialize status
    processing_status[invoice_id] = {
        "status": "processing",
        "progress": 0.0,
        "message": "Processing started"
    }
    
    # Start background processing
    background_tasks.add_task(process_invoice_task, invoice_id, file_path, options)
    
    return InvoiceProcessingStatus(
        invoice_id=invoice_id,
        status="processing",
        progress=0.0,
        message=f"Processing started (mode: {'LLM' if options.force_llm else 'hybrid'})"
    )


@router.get(
    "/process/{invoice_id}",
    response_model=InvoiceProcessingStatus,
    summary="Get processing status",
    description="Check current processing status and get results when complete."
)
async def get_processing_status(invoice_id: str):
    """Get the current processing status of an invoice."""
    if invoice_id not in processing_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No processing info for invoice {invoice_id}"
        )
    
    info = processing_status[invoice_id]
    
    return InvoiceProcessingStatus(
        invoice_id=invoice_id,
        status=info["status"],
        progress=info["progress"],
        message=info.get("message"),
        data=info.get("data"),
        extraction_method=info.get("extraction_method")
    )


@router.get(
    "/results/{invoice_id}",
    response_model=InvoiceData,
    summary="Get invoice data",
    description="Get the complete extracted data for a processed invoice."
)
async def get_invoice_results(invoice_id: str):
    """Get extracted invoice data."""
    if invoice_id not in processing_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice {invoice_id} not found"
        )
    
    info = processing_status[invoice_id]
    
    if info["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invoice not yet processed. Status: {info['status']}"
        )
    
    if "data" in info:
        return info["data"]
    
    # Load from file
    results_path = Path(settings.RESULTS_DIR) / f"{invoice_id}.json"
    if not results_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Results file not found"
        )
    
    with open(results_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return InvoiceData(**data)


@router.post(
    "/reprocess/{invoice_id}",
    response_model=InvoiceProcessingStatus,
    summary="Reprocess with LLM",
    description="Force reprocessing using Claude for higher accuracy."
)
async def reprocess_with_llm(invoice_id: str, background_tasks: BackgroundTasks):
    """
    Force reprocessing with LLM for better accuracy.
    
    Useful when initial extraction has low confidence.
    """
    options = ProcessingOptions(force_llm=True)
    
    # Clear previous status
    if invoice_id in processing_status:
        del processing_status[invoice_id]
    
    return await start_processing(invoice_id, background_tasks, options)
