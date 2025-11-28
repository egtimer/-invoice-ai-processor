"""
Upload endpoint - handles file uploads for invoice processing.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, status
from fastapi.responses import JSONResponse
import aiofiles
import uuid
from pathlib import Path
import structlog

from app.core.config import settings
from app.models.invoice import InvoiceUploadResponse

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post(
    "/upload",
    response_model=InvoiceUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload invoice file",
    description="Upload a PDF or image file for invoice processing."
)
async def upload_invoice(file: UploadFile = File(...)):
    """
    Upload an invoice file for processing.
    
    Supports: PDF, PNG, JPG, JPEG, TIFF, DOCX
    Max size: 20MB
    """
    try:
        # Validate filename
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No filename provided"
            )
        
        # Check extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )
        
        # Read file
        content = await file.read()
        file_size = len(content)
        
        # Check size
        if file_size > settings.MAX_FILE_SIZE:
            max_mb = settings.MAX_FILE_SIZE / (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum: {max_mb}MB"
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty"
            )
        
        # Generate ID and save
        invoice_id = str(uuid.uuid4())
        safe_filename = f"{invoice_id}_{Path(file.filename).name}"
        file_path = Path(settings.UPLOAD_DIR) / safe_filename
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        logger.info(
            "File uploaded",
            invoice_id=invoice_id,
            filename=file.filename,
            size=file_size
        )
        
        return InvoiceUploadResponse(
            invoice_id=invoice_id,
            filename=file.filename,
            file_size=file_size,
            status="uploaded"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Upload failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )


@router.post(
    "/upload/batch",
    summary="Upload multiple invoices",
    description="Upload multiple invoice files at once."
)
async def upload_batch(files: list[UploadFile] = File(...)):
    """Batch upload multiple invoice files."""
    results = {"successful": [], "failed": []}
    
    for file in files:
        try:
            response = await upload_invoice(file)
            results["successful"].append(response.model_dump())
        except HTTPException as e:
            results["failed"].append({
                "filename": file.filename or "unknown",
                "error": e.detail
            })
        except Exception as e:
            results["failed"].append({
                "filename": file.filename or "unknown",
                "error": str(e)
            })
    
    if results["failed"] and not results["successful"]:
        status_code = status.HTTP_400_BAD_REQUEST
    elif results["failed"]:
        status_code = status.HTTP_207_MULTI_STATUS
    else:
        status_code = status.HTTP_201_CREATED
    
    return JSONResponse(content=results, status_code=status_code)
