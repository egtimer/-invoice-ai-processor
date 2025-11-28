"""
Docling Service - Advanced Document Processing.

This service replaces Tesseract+pdfplumber with IBM's Docling library,
providing superior PDF understanding including:
- Advanced OCR for scanned documents
- Table structure recognition
- Reading order detection
- Layout understanding
"""

import structlog
from pathlib import Path
from typing import Tuple, Optional, Dict, Any, List
from dataclasses import dataclass

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions,
    TableFormerMode,
    OcrOptions,
)
from docling_core.types.doc import DoclingDocument, TableItem

from app.core.config import settings

logger = structlog.get_logger(__name__)


@dataclass
class DoclingResult:
    """Result from Docling document processing."""
    markdown: str
    text: str
    tables: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    confidence: float
    

class DoclingService:
    """
    Service for processing documents using IBM's Docling library.
    
    Docling provides state-of-the-art PDF understanding including:
    - Layout analysis with reading order
    - Table structure extraction
    - OCR for scanned documents
    - Multi-format support (PDF, DOCX, images)
    """
    
    def __init__(self):
        """Initialize the Docling converter with optimal settings for invoices."""
        self._converter: Optional[DocumentConverter] = None
        self._initialized = False
        logger.info("DoclingService created, will initialize on first use")
    
    def _get_converter(self) -> DocumentConverter:
        """
        Lazy initialization of DocumentConverter.
        This is done lazily because model loading takes time.
        """
        if self._converter is None:
            logger.info("Initializing Docling converter (first-time setup)...")
            
            # Configure pipeline options for invoice processing
            pipeline_options = PdfPipelineOptions()
            
            # Enable OCR for scanned documents
            if settings.DOCLING_OCR_ENABLED:
                pipeline_options.do_ocr = True
                pipeline_options.ocr_options = OcrOptions(
                    lang=["es", "en"],  # Spanish and English
                )
            
            # Configure table extraction mode
            if settings.DOCLING_TABLE_MODE == "accurate":
                pipeline_options.table_structure_options.mode = TableFormerMode.ACCURATE
            else:
                pipeline_options.table_structure_options.mode = TableFormerMode.FAST
            
            # Create converter with PDF options
            self._converter = DocumentConverter(
                format_options={
                    InputFormat.PDF: PdfFormatOption(
                        pipeline_options=pipeline_options
                    )
                }
            )
            
            self._initialized = True
            logger.info("Docling converter initialized successfully")
        
        return self._converter
    
    def process_document(self, file_path: str) -> DoclingResult:
        """
        Process a document and extract structured content.
        
        Args:
            file_path: Path to the document file
            
        Returns:
            DoclingResult with extracted content
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Document not found: {file_path}")
        
        logger.info("Processing document with Docling", file=file_path)
        
        try:
            converter = self._get_converter()
            result = converter.convert(str(path))
            doc = result.document
            
            # Extract markdown (best for LLM processing)
            markdown = doc.export_to_markdown()
            
            # Extract plain text
            text = self._extract_text(doc)
            
            # Extract tables
            tables = self._extract_tables(doc)
            
            # Extract metadata
            metadata = self._extract_metadata(doc, result)
            
            # Calculate confidence based on extraction quality
            confidence = self._calculate_confidence(doc, tables)
            
            logger.info(
                "Document processed successfully",
                text_length=len(text),
                table_count=len(tables),
                confidence=confidence
            )
            
            return DoclingResult(
                markdown=markdown,
                text=text,
                tables=tables,
                metadata=metadata,
                confidence=confidence
            )
            
        except Exception as e:
            logger.error("Docling processing failed", error=str(e))
            raise
    
    def _extract_text(self, doc: DoclingDocument) -> str:
        """Extract plain text from document maintaining reading order."""
        try:
            # Use the built-in text export
            return doc.export_to_text()
        except Exception:
            # Fallback to markdown without formatting
            return doc.export_to_markdown()
    
    def _extract_tables(self, doc: DoclingDocument) -> List[Dict[str, Any]]:
        """
        Extract tables from document with structure preservation.
        
        This is crucial for invoice line items.
        """
        tables = []
        
        try:
            for element in doc.iterate_items():
                if isinstance(element, TableItem):
                    table_data = {
                        "headers": [],
                        "rows": [],
                        "raw_text": "",
                    }
                    
                    # Try to get table as DataFrame
                    try:
                        df = element.export_to_dataframe()
                        if df is not None and not df.empty:
                            table_data["headers"] = df.columns.tolist()
                            table_data["rows"] = df.values.tolist()
                    except Exception:
                        pass
                    
                    # Also get raw markdown representation
                    try:
                        table_data["raw_text"] = element.export_to_markdown()
                    except Exception:
                        pass
                    
                    if table_data["rows"] or table_data["raw_text"]:
                        tables.append(table_data)
                        
        except Exception as e:
            logger.warning("Table extraction partial failure", error=str(e))
        
        return tables
    
    def _extract_metadata(self, doc: DoclingDocument, result) -> Dict[str, Any]:
        """Extract document metadata."""
        metadata = {
            "page_count": 0,
            "has_images": False,
            "has_tables": False,
            "languages": [],
        }
        
        try:
            # Get page count
            if hasattr(result, 'pages'):
                metadata["page_count"] = len(result.pages)
            
            # Check for tables
            for element in doc.iterate_items():
                if isinstance(element, TableItem):
                    metadata["has_tables"] = True
                    break
                    
        except Exception as e:
            logger.warning("Metadata extraction partial failure", error=str(e))
        
        return metadata
    
    def _calculate_confidence(
        self, 
        doc: DoclingDocument, 
        tables: List[Dict]
    ) -> float:
        """
        Calculate confidence score for the extraction.
        
        Based on:
        - Amount of text extracted
        - Table detection success
        - OCR quality indicators
        """
        score = 0.5  # Base score
        
        try:
            text = doc.export_to_text()
            
            # Text length contribution
            if len(text) > 500:
                score += 0.2
            elif len(text) > 200:
                score += 0.1
            
            # Table detection contribution
            if tables:
                score += 0.15
                # Bonus for tables with structure
                structured_tables = [t for t in tables if t.get("rows")]
                if structured_tables:
                    score += 0.1
            
            # Check for common invoice patterns
            text_lower = text.lower()
            invoice_patterns = ["factura", "invoice", "total", "iva", "nif", "cif"]
            matches = sum(1 for p in invoice_patterns if p in text_lower)
            score += min(0.05 * matches, 0.15)
            
        except Exception:
            pass
        
        return min(score, 1.0)
    
    def extract_text_simple(self, file_path: str) -> Tuple[str, float]:
        """
        Simple text extraction interface for backward compatibility.
        
        Returns:
            Tuple of (text, confidence_score)
        """
        result = self.process_document(file_path)
        return result.text, result.confidence
    
    def get_structured_content(self, file_path: str) -> Dict[str, Any]:
        """
        Get fully structured content for LLM processing.
        
        Returns a dict optimized for sending to Claude/GPT.
        """
        result = self.process_document(file_path)
        
        return {
            "markdown": result.markdown,
            "tables": result.tables,
            "metadata": result.metadata,
            "confidence": result.confidence,
        }


# Singleton instance
_docling_service: Optional[DoclingService] = None


def get_docling_service() -> DoclingService:
    """Get or create the DoclingService singleton."""
    global _docling_service
    if _docling_service is None:
        _docling_service = DoclingService()
    return _docling_service


# Convenience alias
docling_service = get_docling_service()
