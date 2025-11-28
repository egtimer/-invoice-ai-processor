"""
Claude Extraction Service - LLM-powered invoice data extraction.

This service uses Claude API for intelligent, context-aware extraction
of invoice data. It's more accurate than regex patterns and can handle
diverse invoice formats without template configuration.
"""

import json
import structlog
from typing import Optional, Dict, Any, List
from datetime import datetime
from decimal import Decimal

from anthropic import Anthropic
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.models.invoice import InvoiceData, InvoiceLine, CompanyInfo

logger = structlog.get_logger(__name__)


# Extraction prompt optimized for Spanish invoices
EXTRACTION_PROMPT = """Eres un experto en extracción de datos de facturas españolas. 
Analiza el siguiente contenido de factura y extrae TODOS los datos estructurados.

INSTRUCCIONES CRÍTICAS:
1. Extrae EXACTAMENTE lo que aparece en el documento, no inventes datos
2. Para campos que no encuentres, usa null
3. Los importes deben ser números decimales (usa punto como separador decimal)
4. Las fechas deben estar en formato YYYY-MM-DD
5. El CIF/NIF debe incluir la letra
6. Extrae TODAS las líneas de productos/servicios que encuentres

CONTENIDO DE LA FACTURA:
```
{document_content}
```

{tables_section}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{{
    "invoice_number": "string o null",
    "invoice_date": "YYYY-MM-DD o null",
    "due_date": "YYYY-MM-DD o null",
    "supplier": {{
        "name": "string o null",
        "tax_id": "CIF/NIF o null",
        "address": "string o null",
        "city": "string o null",
        "postal_code": "string o null",
        "email": "string o null",
        "phone": "string o null"
    }},
    "client": {{
        "name": "string o null",
        "tax_id": "CIF/NIF o null",
        "address": "string o null",
        "city": "string o null",
        "postal_code": "string o null",
        "email": "string o null",
        "phone": "string o null"
    }},
    "lines": [
        {{
            "description": "string",
            "quantity": number,
            "unit_price": number,
            "line_total": number,
            "tax_rate": number o null
        }}
    ],
    "subtotal": number o null,
    "tax_rate": number o null,
    "tax_amount": number o null,
    "total": number,
    "currency": "EUR",
    "payment_method": "string o null",
    "notes": "string o null"
}}

JSON:"""


class ClaudeExtractionService:
    """
    Service for extracting invoice data using Claude API.
    
    This provides intelligent, context-aware extraction that can handle:
    - Diverse invoice layouts without templates
    - Ambiguous or poorly formatted data
    - Multiple languages
    - Complex table structures
    """
    
    def __init__(self):
        """Initialize the Claude client."""
        self._client: Optional[Anthropic] = None
        
        if settings.ANTHROPIC_API_KEY:
            self._client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            logger.info("Claude extraction service initialized")
        else:
            logger.warning("Claude API key not configured, LLM extraction disabled")
    
    @property
    def is_available(self) -> bool:
        """Check if Claude API is available."""
        return self._client is not None
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    async def extract_invoice_data(
        self,
        document_content: str,
        tables: Optional[List[Dict]] = None,
        metadata: Optional[Dict] = None
    ) -> InvoiceData:
        """
        Extract structured invoice data using Claude.
        
        Args:
            document_content: Markdown or text content from Docling
            tables: Extracted tables from Docling
            metadata: Document metadata
            
        Returns:
            Structured InvoiceData object
        """
        if not self.is_available:
            raise RuntimeError("Claude API not configured")
        
        logger.info("Extracting invoice data with Claude")
        
        # Build tables section if available
        tables_section = ""
        if tables:
            tables_section = "\nTABLAS DETECTADAS EN EL DOCUMENTO:\n"
            for i, table in enumerate(tables, 1):
                tables_section += f"\nTabla {i}:\n"
                if table.get("raw_text"):
                    tables_section += table["raw_text"] + "\n"
                elif table.get("rows"):
                    if table.get("headers"):
                        tables_section += " | ".join(str(h) for h in table["headers"]) + "\n"
                    for row in table["rows"]:
                        tables_section += " | ".join(str(cell) for cell in row) + "\n"
        
        # Build the prompt
        prompt = EXTRACTION_PROMPT.format(
            document_content=document_content[:15000],  # Limit content size
            tables_section=tables_section
        )
        
        try:
            # Call Claude API
            response = self._client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=settings.CLAUDE_MAX_TOKENS,
                temperature=settings.CLAUDE_TEMPERATURE,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Parse response
            response_text = response.content[0].text.strip()
            
            # Clean up JSON if needed
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            # Parse JSON
            data = json.loads(response_text.strip())
            
            # Convert to InvoiceData
            invoice_data = self._parse_extracted_data(data)
            
            logger.info(
                "Claude extraction successful",
                invoice_number=invoice_data.invoice_number,
                total=str(invoice_data.total)
            )
            
            return invoice_data
            
        except json.JSONDecodeError as e:
            logger.error("Failed to parse Claude response as JSON", error=str(e))
            raise ValueError(f"Invalid JSON response from Claude: {e}")
        except Exception as e:
            logger.error("Claude extraction failed", error=str(e))
            raise
    
    def _parse_extracted_data(self, data: Dict[str, Any]) -> InvoiceData:
        """
        Parse the extracted JSON data into InvoiceData model.
        
        Handles type conversions and defaults.
        """
        # Parse dates
        invoice_date = self._parse_date(data.get("invoice_date"))
        due_date = self._parse_date(data.get("due_date"))
        
        # Parse supplier
        supplier_data = data.get("supplier", {}) or {}
        supplier = CompanyInfo(
            name=supplier_data.get("name") or "UNKNOWN",
            tax_id=supplier_data.get("tax_id"),
            address=supplier_data.get("address"),
            postal_code=supplier_data.get("postal_code"),
            city=supplier_data.get("city"),
            email=supplier_data.get("email"),
            phone=supplier_data.get("phone"),
            confidence=0.95  # High confidence for LLM extraction
        )
        
        # Parse client
        client_data = data.get("client", {}) or {}
        client = CompanyInfo(
            name=client_data.get("name") or "UNKNOWN",
            tax_id=client_data.get("tax_id"),
            address=client_data.get("address"),
            postal_code=client_data.get("postal_code"),
            city=client_data.get("city"),
            email=client_data.get("email"),
            phone=client_data.get("phone"),
            confidence=0.95
        )
        
        # Parse line items
        lines = []
        for line_data in data.get("lines", []):
            try:
                line = InvoiceLine(
                    description=line_data.get("description", "Item"),
                    quantity=float(line_data.get("quantity", 1)),
                    unit_price=Decimal(str(line_data.get("unit_price", 0))),
                    line_total=Decimal(str(line_data.get("line_total", 0))),
                    tax_rate=line_data.get("tax_rate"),
                    confidence=0.9
                )
                lines.append(line)
            except (ValueError, TypeError) as e:
                logger.warning("Failed to parse line item", error=str(e))
                continue
        
        # Parse financial data
        subtotal = self._parse_decimal(data.get("subtotal"))
        tax_amount = self._parse_decimal(data.get("tax_amount"))
        total = self._parse_decimal(data.get("total"))
        
        # Validate and fix totals if needed
        if total is None or total == Decimal("0"):
            if subtotal and tax_amount:
                total = subtotal + tax_amount
            elif lines:
                total = sum(line.line_total for line in lines)
        
        if subtotal is None and total and tax_amount:
            subtotal = total - tax_amount
        
        if tax_amount is None and total and subtotal:
            tax_amount = total - subtotal
        
        # Default values if still None
        if total is None:
            total = Decimal("0")
        if subtotal is None:
            subtotal = total / Decimal("1.21")  # Assume 21% IVA
        if tax_amount is None:
            tax_amount = total - subtotal
        
        return InvoiceData(
            invoice_number=data.get("invoice_number") or "UNKNOWN",
            invoice_date=invoice_date or datetime.now().date(),
            due_date=due_date,
            supplier=supplier,
            client=client,
            lines=lines if lines else [
                InvoiceLine(
                    description="Servicio/Producto",
                    quantity=1.0,
                    unit_price=subtotal,
                    line_total=subtotal,
                    confidence=0.5
                )
            ],
            subtotal=subtotal.quantize(Decimal("0.01")),
            tax_amount=tax_amount.quantize(Decimal("0.01")),
            total=total.quantize(Decimal("0.01")),
            currency=data.get("currency", "EUR"),
            payment_method=data.get("payment_method"),
            notes=data.get("notes"),
            confidence_score=0.92,  # High confidence for LLM extraction
            requires_review=False,
            extraction_method="claude"
        )
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse date string to datetime.date."""
        if not date_str:
            return None
        
        try:
            # Try ISO format first
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            pass
        
        # Try other common formats
        formats = ["%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%Y/%m/%d"]
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        
        return None
    
    def _parse_decimal(self, value: Any) -> Optional[Decimal]:
        """Parse value to Decimal."""
        if value is None:
            return None
        
        try:
            if isinstance(value, (int, float)):
                return Decimal(str(value))
            if isinstance(value, str):
                # Clean string
                cleaned = value.replace(",", ".").replace(" ", "").replace("€", "")
                return Decimal(cleaned)
            return Decimal(str(value))
        except Exception:
            return None


# Singleton instance
_claude_service: Optional[ClaudeExtractionService] = None


def get_claude_service() -> ClaudeExtractionService:
    """Get or create the ClaudeExtractionService singleton."""
    global _claude_service
    if _claude_service is None:
        _claude_service = ClaudeExtractionService()
    return _claude_service


claude_service = get_claude_service()
