"""
Upload endpoint for receiving invoice PDF files.

This endpoint handles file uploads, validates them, stores them temporarily,
and returns an invoice ID that can be used to track processing status.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, status
from fastapi.responses import JSONResponse
import shutil
import uuid
from pathlib import Path
import logging

from app.core.config import settings
from app.models.invoice import InvoiceUploadResponse, ErrorResponse

# Configure logging
logger = logging.getLogger(__name__)

# Create router for upload endpoints
router = APIRouter()


@router.post(
    "/upload",
    response_model=InvoiceUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload invoice PDF",
    description="Upload a PDF invoice for processing. Returns an invoice ID for tracking."
)
async def upload_invoice(file: UploadFile = File(...)):
    """
    Upload an invoice PDF file for processing.
    
    This endpoint validates the uploaded file, saves it to the uploads directory,
    and returns a unique invoice ID that can be used to check processing status
    and retrieve results.
    
    Args:
        file: The uploaded PDF file
        
    Returns:
        InvoiceUploadResponse with invoice_id and upload metadata
        
    Raises:
        HTTPException: If file validation fails or upload encounters an error
    """
    try:
        # Validate file type
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No filename provided"
            )
        
        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed types: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )
        
        # Read file to check size
        # We need to read the file to get its size and validate it
        file_content = await file.read()
        file_size = len(file_content)
        
        # Validate file size
        if file_size > settings.MAX_FILE_SIZE:
            max_size_mb = settings.MAX_FILE_SIZE / (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size: {max_size_mb}MB"
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty"
            )
        
        # Generate unique invoice ID
        invoice_id = str(uuid.uuid4())
        
        # Create filename with invoice ID to avoid collisions
        safe_filename = f"{invoice_id}_{Path(file.filename).name}"
        file_path = Path(settings.UPLOAD_DIR) / safe_filename
        
        # Save file to disk
        # We already have the content in memory, so write it directly
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        logger.info(f"File uploaded successfully: {safe_filename} ({file_size} bytes)")
        
        # Return upload response
        return InvoiceUploadResponse(
            invoice_id=invoice_id,
            filename=file.filename,
            file_size=file_size,
            status="uploaded"
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions without modification
        raise
    
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )


@router.post(
    "/upload/batch",
    summary="Upload multiple invoices",
    description="Upload multiple PDF invoices at once for batch processing."
)
async def upload_batch_invoices(files: list[UploadFile] = File(...)):
    """
    Upload multiple invoice PDF files for batch processing.
    
    This endpoint allows uploading several invoices at once, which is useful
    for bulk processing scenarios. Each file is validated and saved independently.
    
    Args:
        files: List of uploaded PDF files
        
    Returns:
        Dict with list of successfully uploaded invoices and any errors
    """
    results = {
        "successful": [],
        "failed": []
    }
    
    for file in files:
        try:
            # Use the single upload logic for each file
            response = await upload_invoice(file)
            results["successful"].append(response.dict())
        
        except HTTPException as e:
            results["failed"].append({
                "filename": file.filename if file.filename else "unknown",
                "error": e.detail
            })
        
        except Exception as e:
            results["failed"].append({
                "filename": file.filename if file.filename else "unknown",
                "error": str(e)
            })
    
    # Determine appropriate status code
    if results["failed"] and not results["successful"]:
        # All failed
        status_code = status.HTTP_400_BAD_REQUEST
    elif results["failed"]:
        # Some failed (partial success)
        status_code = status.HTTP_207_MULTI_STATUS
    else:
        # All succeeded
        status_code = status.HTTP_201_CREATED
    
    return JSONResponse(content=results, status_code=status_code)
