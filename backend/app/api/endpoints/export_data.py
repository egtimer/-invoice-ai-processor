"""
Export endpoint for downloading invoice data in various formats.
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pathlib import Path
import json
import io
import pandas as pd
from datetime import datetime

from app.core.config import settings
from app.models.invoice import ExportRequest

router = APIRouter()


@router.post(
    "/export",
    summary="Export invoice data",
    description="Export processed invoice data in JSON or Excel format."
)
async def export_invoices(request: ExportRequest):
    """Export invoice data in the requested format."""
    if request.format not in ["json", "excel"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format: {request.format}"
        )
    
    all_data = []
    results_dir = Path(settings.RESULTS_DIR)
    
    for invoice_id in request.invoice_ids:
        result_file = results_dir / f"{invoice_id}.json"
        
        if not result_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Results not found for invoice {invoice_id}"
            )
        
        with open(result_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            all_data.append(data)
    
    if request.format == "json":
        json_content = json.dumps(all_data, indent=2, ensure_ascii=False)
        
        return StreamingResponse(
            io.BytesIO(json_content.encode("utf-8")),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=invoices_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            }
        )
    
    elif request.format == "excel":
        flat_data = []
        for invoice in all_data:
            flat_data.append({
                "Invoice Number": invoice.get("invoice_number"),
                "Date": invoice.get("invoice_date"),
                "Supplier": invoice.get("supplier", {}).get("name"),
                "Client": invoice.get("client", {}).get("name"),
                "Subtotal": invoice.get("subtotal"),
                "Tax": invoice.get("tax_amount"),
                "Total": invoice.get("total"),
                "Currency": invoice.get("currency"),
                "Confidence": invoice.get("confidence_score")
            })
        
        df = pd.DataFrame(flat_data)
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Invoices')
        
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=invoices_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            }
        )
