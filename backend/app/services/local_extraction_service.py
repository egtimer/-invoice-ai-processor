"""
Local Extraction Service - Pattern-based invoice extraction.

This is the fallback extractor that works without LLM.
It uses improved patterns and Docling's structured output
instead of fragile regex on raw text.
"""

import re
import structlog
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass

from app.models.invoice import InvoiceData, InvoiceLine, CompanyInfo
from app.core.config import settings

logger = structlog.get_logger(__name__)


@dataclass
class ExtractionResult:
    """Result from pattern extraction with confidence."""
    value: Any
    confidence: float
    source: str = "pattern"


class LocalExtractionService:
    """
    Pattern-based extraction service optimized for Spanish invoices.
    
    This service works with Docling's structured output (tables, markdown)
    instead of raw OCR text, which significantly improves accuracy.
    """
    
    def __init__(self):
        """Initialize patterns for Spanish invoices."""
        self._compile_patterns()
        logger.info("Local extraction service initialized")
    
    def _compile_patterns(self):
        """Compile regex patterns optimized for structured text."""
        
        # Invoice number - works on clean Docling output
        self.invoice_number_patterns = [
            # Explicit labels
            (r'(?:N[ºo°]?\s*(?:de\s+)?(?:Factura|Invoice|Fact\.?))\s*[:\-]?\s*([A-Z0-9][\w\-/]+)', 0.95),
            (r'(?:Factura|Invoice)\s+(?:N[ºo°]?\.?\s*)?([A-Z0-9][\w\-/]+)', 0.9),
            (r'(?:Número|Number)\s*[:\-]?\s*([A-Z0-9][\w\-/]+)', 0.85),
            # Table cell patterns (from Docling tables)
            (r'\|\s*(?:Factura|Invoice|Número)\s*\|\s*([A-Z0-9][\w\-/]+)\s*\|', 0.9),
        ]
        
        # Date patterns
        self.date_patterns = [
            # ISO format
            (r'(\d{4}[-/]\d{2}[-/]\d{2})', "%Y-%m-%d", 0.95),
            # European format
            (r'(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4})', "%d/%m/%Y", 0.9),
            # Text format Spanish
            (r'(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})', None, 0.95),
        ]
        
        # Spanish months mapping
        self.spanish_months = {
            'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
            'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
            'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
        }
        
        # CIF/NIF pattern with validation
        self.tax_id_pattern = re.compile(
            r'\b([A-Z]\d{8}|\d{8}[A-Z]|[A-Z]\d{7}[A-Z0-9])\b'
        )
        
        # Amount patterns (European format: 1.234,56)
        self.amount_pattern = re.compile(
            r'(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)\s*€?'
        )
        
        # Total/Subtotal keywords
        self.total_keywords = ['total', 'importe total', 'total factura', 'total a pagar']
        self.subtotal_keywords = ['subtotal', 'base imponible', 'base', 'suma']
        self.tax_keywords = ['iva', 'impuesto', 'i.v.a.', 'tax']
    
    def extract_invoice_data(
        self,
        text: str,
        markdown: str,
        tables: List[Dict],
        metadata: Dict
    ) -> InvoiceData:
        """
        Extract invoice data using pattern matching on structured content.
        
        Args:
            text: Plain text from Docling
            markdown: Markdown from Docling (better structure)
            tables: Extracted tables
            metadata: Document metadata
            
        Returns:
            InvoiceData with extracted fields
        """
        logger.info("Starting local extraction")
        
        # Use markdown as primary source (better structure)
        content = markdown if markdown else text
        
        # Extract each field
        invoice_number = self._extract_invoice_number(content)
        invoice_date = self._extract_invoice_date(content)
        supplier = self._extract_company(content, "supplier")
        client = self._extract_company(content, "client")
        lines = self._extract_line_items(tables, content)
        subtotal, tax_amount, total = self._extract_totals(content, tables)
        
        # Calculate overall confidence
        confidences = [
            invoice_number.confidence,
            supplier.confidence if supplier else 0.3,
            total.confidence if total.value else 0.3,
        ]
        overall_confidence = sum(confidences) / len(confidences)
        
        # Determine if review is needed
        requires_review = (
            overall_confidence < settings.CONFIDENCE_THRESHOLD or
            invoice_number.value == "UNKNOWN" or
            not total.value or total.value == Decimal("0")
        )
        
        logger.info(
            "Local extraction completed",
            invoice_number=invoice_number.value,
            confidence=overall_confidence,
            requires_review=requires_review
        )
        
        return InvoiceData(
            invoice_number=invoice_number.value or "UNKNOWN",
            invoice_date=invoice_date.value or datetime.now().date(),
            due_date=None,
            supplier=supplier or CompanyInfo(name="UNKNOWN", confidence=0.3),
            client=client or CompanyInfo(name="UNKNOWN", confidence=0.3),
            lines=lines,
            subtotal=subtotal.value or Decimal("0"),
            tax_amount=tax_amount.value or Decimal("0"),
            total=total.value or Decimal("0"),
            currency="EUR",
            confidence_score=overall_confidence,
            requires_review=requires_review,
            extraction_method="local"
        )
    
    def _extract_invoice_number(self, content: str) -> ExtractionResult:
        """Extract invoice number using multiple patterns."""
        for pattern, confidence in self.invoice_number_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                # Validate: should have at least one digit
                if re.search(r'\d', value) and len(value) >= 3:
                    logger.debug(f"Found invoice number: {value}")
                    return ExtractionResult(value=value, confidence=confidence)
        
        return ExtractionResult(value="UNKNOWN", confidence=0.0)
    
    def _extract_invoice_date(self, content: str) -> ExtractionResult:
        """Extract invoice date."""
        # Look for date near "fecha" keyword first
        date_context = re.search(
            r'fecha[^:]*[:\s]+(.{20})',
            content, 
            re.IGNORECASE
        )
        search_text = date_context.group(1) if date_context else content
        
        for pattern, fmt, confidence in self.date_patterns:
            match = re.search(pattern, search_text, re.IGNORECASE)
            if match:
                try:
                    if fmt:
                        # Standard format
                        date_str = match.group(1).replace('-', '/').replace('.', '/')
                        date = datetime.strptime(date_str, fmt.replace('-', '/')).date()
                    else:
                        # Spanish text format
                        day = int(match.group(1))
                        month = self.spanish_months[match.group(2).lower()]
                        year = int(match.group(3))
                        date = datetime(year, month, day).date()
                    
                    return ExtractionResult(value=date, confidence=confidence)
                except (ValueError, KeyError):
                    continue
        
        return ExtractionResult(value=datetime.now().date(), confidence=0.3)
    
    def _extract_company(
        self, 
        content: str, 
        role: str
    ) -> Optional[CompanyInfo]:
        """Extract company information (supplier or client)."""
        # Keywords to identify sections
        if role == "supplier":
            keywords = ['de:', 'from:', 'emisor:', 'proveedor:', 'vendedor:']
            stop_keywords = ['para:', 'to:', 'cliente:', 'comprador:', 'destinatario:']
        else:
            keywords = ['para:', 'to:', 'cliente:', 'comprador:', 'destinatario:']
            stop_keywords = ['concepto', 'descripción', 'detalle', 'total', 'subtotal']
        
        # Find section
        section_text = ""
        for keyword in keywords:
            pos = content.lower().find(keyword)
            if pos != -1:
                end_pos = pos + 300
                # Find stop keyword
                for stop in stop_keywords:
                    stop_pos = content.lower().find(stop, pos + len(keyword))
                    if stop_pos != -1 and stop_pos < end_pos:
                        end_pos = stop_pos
                section_text = content[pos:end_pos]
                break
        
        if not section_text:
            return None
        
        # Extract tax ID
        tax_id_match = self.tax_id_pattern.search(section_text)
        tax_id = tax_id_match.group(1) if tax_id_match else None
        
        # Validate tax ID
        if tax_id and not self._validate_tax_id(tax_id):
            tax_id = None
        
        # Extract name (first substantial line after keyword)
        lines = section_text.split('\n')
        name = None
        for line in lines[1:5]:  # Skip keyword line
            clean_line = line.strip()
            # Skip lines that look like addresses or IDs
            if (clean_line and 
                len(clean_line) > 3 and 
                not re.match(r'^[\d\-/]+$', clean_line) and
                not self.tax_id_pattern.match(clean_line)):
                name = clean_line[:100]  # Limit length
                break
        
        confidence = 0.7 if name and name != "UNKNOWN" else 0.4
        if tax_id:
            confidence += 0.15
        
        return CompanyInfo(
            name=name or "UNKNOWN",
            tax_id=tax_id,
            confidence=confidence
        )
    
    def _validate_tax_id(self, tax_id: str) -> bool:
        """Validate Spanish CIF/NIF format."""
        if not tax_id or len(tax_id) != 9:
            return False
        
        # CIF: Letter + 7 digits + control character
        cif_pattern = r'^[ABCDEFGHJNPQRSUVW]\d{7}[A-J0-9]$'
        # NIF: 8 digits + letter
        nif_pattern = r'^\d{8}[A-Z]$'
        # NIE: X/Y/Z + 7 digits + letter
        nie_pattern = r'^[XYZ]\d{7}[A-Z]$'
        
        return bool(
            re.match(cif_pattern, tax_id) or
            re.match(nif_pattern, tax_id) or
            re.match(nie_pattern, tax_id)
        )
    
    def _extract_line_items(
        self, 
        tables: List[Dict], 
        content: str
    ) -> List[InvoiceLine]:
        """Extract line items from tables or content."""
        lines = []
        
        # Try tables first (more reliable)
        for table in tables:
            if table.get("rows"):
                headers = [str(h).lower() for h in table.get("headers", [])]
                
                # Find relevant columns
                desc_col = self._find_column(headers, ["descripción", "concepto", "description", "detalle"])
                qty_col = self._find_column(headers, ["cantidad", "qty", "quantity", "uds", "unidades"])
                price_col = self._find_column(headers, ["precio", "price", "p.unit", "unitario"])
                total_col = self._find_column(headers, ["importe", "total", "subtotal", "amount"])
                
                for row in table["rows"]:
                    try:
                        line = InvoiceLine(
                            description=str(row[desc_col]) if desc_col is not None else "Item",
                            quantity=self._parse_number(row[qty_col]) if qty_col is not None else 1.0,
                            unit_price=self._parse_decimal(row[price_col]) if price_col is not None else Decimal("0"),
                            line_total=self._parse_decimal(row[total_col]) if total_col is not None else Decimal("0"),
                            confidence=0.8
                        )
                        if line.line_total > 0 or line.unit_price > 0:
                            lines.append(line)
                    except (IndexError, ValueError, TypeError):
                        continue
        
        # Fallback: create single line from totals
        if not lines:
            lines.append(InvoiceLine(
                description="Servicio/Producto",
                quantity=1.0,
                unit_price=Decimal("0"),
                line_total=Decimal("0"),
                confidence=0.3
            ))
        
        return lines
    
    def _find_column(self, headers: List[str], keywords: List[str]) -> Optional[int]:
        """Find column index by keywords."""
        for i, header in enumerate(headers):
            for keyword in keywords:
                if keyword in header:
                    return i
        return None
    
    def _extract_totals(
        self, 
        content: str, 
        tables: List[Dict]
    ) -> Tuple[ExtractionResult, ExtractionResult, ExtractionResult]:
        """Extract financial totals."""
        content_lower = content.lower()
        
        # Extract total
        total = self._extract_amount_near_keywords(content, self.total_keywords)
        
        # Extract subtotal
        subtotal = self._extract_amount_near_keywords(content, self.subtotal_keywords)
        
        # Extract tax
        tax = self._extract_amount_near_keywords(content, self.tax_keywords)
        
        # Cross-validate and fix
        if total.value and not subtotal.value and tax.value:
            subtotal = ExtractionResult(
                value=total.value - tax.value,
                confidence=0.7
            )
        elif total.value and subtotal.value and not tax.value:
            tax = ExtractionResult(
                value=total.value - subtotal.value,
                confidence=0.7
            )
        elif subtotal.value and tax.value and not total.value:
            total = ExtractionResult(
                value=subtotal.value + tax.value,
                confidence=0.7
            )
        
        # Default IVA estimation if needed
        if total.value and not subtotal.value:
            subtotal = ExtractionResult(
                value=(total.value / Decimal("1.21")).quantize(Decimal("0.01")),
                confidence=0.5
            )
            tax = ExtractionResult(
                value=total.value - subtotal.value,
                confidence=0.5
            )
        
        return subtotal, tax, total
    
    def _extract_amount_near_keywords(
        self, 
        content: str, 
        keywords: List[str]
    ) -> ExtractionResult:
        """Extract amount near given keywords."""
        content_lower = content.lower()
        
        for keyword in keywords:
            pos = content_lower.find(keyword)
            if pos != -1:
                # Look for amount within 50 chars after keyword
                search_area = content[pos:pos + 50]
                amounts = self.amount_pattern.findall(search_area)
                
                if amounts:
                    try:
                        amount = self._parse_decimal(amounts[-1])
                        if amount and amount > 0:
                            return ExtractionResult(value=amount, confidence=0.85)
                    except (ValueError, InvalidOperation):
                        continue
        
        return ExtractionResult(value=Decimal("0"), confidence=0.0)
    
    def _parse_number(self, value: Any) -> float:
        """Parse value to float."""
        if isinstance(value, (int, float)):
            return float(value)
        try:
            cleaned = str(value).replace(",", ".").replace(" ", "")
            return float(cleaned)
        except (ValueError, TypeError):
            return 1.0
    
    def _parse_decimal(self, value: Any) -> Decimal:
        """Parse value to Decimal (European format)."""
        if isinstance(value, Decimal):
            return value
        if isinstance(value, (int, float)):
            return Decimal(str(value))
        
        try:
            cleaned = str(value).strip()
            # Remove currency symbols
            cleaned = re.sub(r'[€$\s]', '', cleaned)
            
            # Handle European format: 1.234,56 -> 1234.56
            if ',' in cleaned and '.' in cleaned:
                if cleaned.rfind(',') > cleaned.rfind('.'):
                    # European: 1.234,56
                    cleaned = cleaned.replace('.', '').replace(',', '.')
                else:
                    # American: 1,234.56
                    cleaned = cleaned.replace(',', '')
            elif ',' in cleaned:
                # Could be European decimal or American thousands
                if cleaned.count(',') == 1 and cleaned.rfind(',') > len(cleaned) - 4:
                    # Likely decimal
                    cleaned = cleaned.replace(',', '.')
                else:
                    cleaned = cleaned.replace(',', '')
            
            return Decimal(cleaned).quantize(Decimal("0.01"))
        except (ValueError, InvalidOperation):
            return Decimal("0")


# Singleton
_local_service: Optional[LocalExtractionService] = None


def get_local_service() -> LocalExtractionService:
    """Get or create the LocalExtractionService singleton."""
    global _local_service
    if _local_service is None:
        _local_service = LocalExtractionService()
    return _local_service


local_extraction_service = get_local_service()
