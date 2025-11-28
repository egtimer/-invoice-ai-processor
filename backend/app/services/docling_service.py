"""
Docling Service for advanced document parsing.

Replaces Tesseract with IBM Docling for better accuracy.
"""

from pathlib import Path
from typing import Optional
from dataclasses import dataclass
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class DoclingResult:
    """Result from Docling processing."""
    markdown: str
    text: str
    tables: list
    metadata: dict
    confidence: float


class DoclingService:
    """Service for document parsing using Docling."""
    
    def __init__(self):
        self._converter = None
        self._initialized = False
    
    def _initialize(self):
        """Lazy initialization of Docling."""
        if self._initialized:
            return
        
        try:
            from docling.document_converter import DocumentConverter
            from docling.datamodel.pipeline_options import PdfPipelineOptions
            from docling.datamodel.base_models import InputFormat
            from docling.document_converter import PdfFormatOption
            
            pipeline_options = PdfPipelineOptions()
            pipeline_options.do_ocr = True
            pipeline_options.do_table_structure = True
            
            self._converter = DocumentConverter(
                format_options={
                    InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
                }
            )
            self._initialized = True
            logger.info("Docling initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Docling: {e}")
            # Fallback: try simpler initialization
            try:
                from docling.document_converter import DocumentConverter
                self._converter = DocumentConverter()
                self._initialized = True
                logger.info("Docling initialized with defaults")
            except Exception as e2:
                logger.error(f"Docling fallback also failed: {e2}")
                raise
    
    def process_document(self, file_path: str) -> DoclingResult:
        """
        Process a document and extract content.
        
        Args:
            file_path: Path to the document file
            
        Returns:
            DoclingResult with extracted content
        """
        self._initialize()
        
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        logger.info(f"Processing document: {path.name}")
        
        try:
            # Convert document
            result = self._converter.convert(str(path))
            
            # Extract markdown
            markdown = result.document.export_to_markdown()
            
            # Extract plain text
            text = result.document.export_to_text() if hasattr(result.document, 'export_to_text') else markdown
            
            # Extract tables
            tables = []
            if hasattr(result.document, 'tables'):
                for table in result.document.tables:
                    try:
                        table_data = {
                            "headers": [],
                            "rows": [],
                            "raw_text": str(table)
                        }
                        tables.append(table_data)
                    except:
                        pass
            
            # Calculate confidence based on content
            confidence = self._calculate_confidence(markdown, tables)
            
            logger.info(f"Document processed successfully, confidence: {confidence:.2f}")
            
            return DoclingResult(
                markdown=markdown,
                text=text,
                tables=tables,
                metadata={
                    "filename": path.name,
                    "pages": getattr(result.document, 'num_pages', 1)
                },
                confidence=confidence
            )
            
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            raise
    
    def _calculate_confidence(self, markdown: str, tables: list) -> float:
        """Calculate confidence score based on extraction quality."""
        score = 0.5  # Base score
        
        # More text = higher confidence
        if len(markdown) > 500:
            score += 0.2
        elif len(markdown) > 200:
            score += 0.1
        
        # Tables found = higher confidence for invoices
        if tables:
            score += 0.2
        
        # Check for invoice-like patterns
        invoice_patterns = ['invoice', 'total', 'amount', 'date', 'tax', 'vat']
        matches = sum(1 for p in invoice_patterns if p.lower() in markdown.lower())
        score += min(0.1 * matches, 0.2)
        
        return min(score, 1.0)


# Singleton instance
docling_service = DoclingService()
