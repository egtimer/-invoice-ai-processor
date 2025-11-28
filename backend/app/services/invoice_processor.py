"""
Invoice Processing Orchestrator - Main extraction pipeline.

This service orchestrates the complete extraction pipeline:
1. Docling for document parsing (replaces Tesseract)
2. Local extraction as first attempt
3. Claude API for escalation (if confidence is low or configured)

The architecture follows the "hybrid" approach for optimal
cost/accuracy balance.
"""

import structlog
from typing import Optional, Dict, Any
from pathlib import Path
import asyncio

from app.core.config import settings
from app.models.invoice import InvoiceData
from app.services.docling_service import docling_service, DoclingResult
from app.services.claude_service import claude_service
from app.services.local_extraction_service import local_extraction_service

logger = structlog.get_logger(__name__)


class InvoiceProcessor:
    """
    Main orchestrator for invoice processing.
    
    This class coordinates:
    - Document parsing with Docling
    - Initial extraction with local patterns
    - LLM escalation with Claude when needed
    - Result validation and scoring
    """
    
    def __init__(self):
        """Initialize the processor."""
        self.mode = settings.effective_extraction_mode
        logger.info(
            "Invoice processor initialized",
            mode=self.mode,
            claude_available=claude_service.is_available
        )
    
    async def process_invoice(
        self, 
        file_path: str,
        force_llm: bool = False
    ) -> InvoiceData:
        """
        Process an invoice through the complete pipeline.
        
        Args:
            file_path: Path to the invoice file
            force_llm: Force LLM extraction regardless of mode
            
        Returns:
            Extracted InvoiceData
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        logger.info("Starting invoice processing", file=file_path, mode=self.mode)
        
        # Step 1: Parse document with Docling
        docling_result = await self._parse_document(file_path)
        
        # Step 2: Choose extraction strategy
        if self.mode == "llm_only" or force_llm:
            return await self._extract_with_llm(docling_result)
        
        elif self.mode == "local_only":
            return self._extract_locally(docling_result)
        
        else:  # hybrid mode
            return await self._extract_hybrid(docling_result)
    
    async def _parse_document(self, file_path: str) -> DoclingResult:
        """
        Parse document using Docling.
        
        Runs in thread pool since Docling is CPU-bound.
        """
        logger.info("Parsing document with Docling")
        
        # Run Docling in thread pool (it's CPU-bound)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            docling_service.process_document,
            file_path
        )
        
        logger.info(
            "Docling parsing complete",
            text_length=len(result.text),
            tables=len(result.tables),
            confidence=result.confidence
        )
        
        return result
    
    def _extract_locally(self, docling_result: DoclingResult) -> InvoiceData:
        """
        Extract using local patterns only.
        
        This is the free tier - no API costs.
        """
        logger.info("Using local extraction (no LLM)")
        
        return local_extraction_service.extract_invoice_data(
            text=docling_result.text,
            markdown=docling_result.markdown,
            tables=docling_result.tables,
            metadata=docling_result.metadata
        )
    
    async def _extract_with_llm(self, docling_result: DoclingResult) -> InvoiceData:
        """
        Extract using Claude API.
        
        This provides highest accuracy but costs money.
        """
        logger.info("Using Claude extraction")
        
        if not claude_service.is_available:
            logger.warning("Claude not available, falling back to local")
            return self._extract_locally(docling_result)
        
        return await claude_service.extract_invoice_data(
            document_content=docling_result.markdown,
            tables=docling_result.tables,
            metadata=docling_result.metadata
        )
    
    async def _extract_hybrid(self, docling_result: DoclingResult) -> InvoiceData:
        """
        Hybrid extraction: local first, escalate to LLM if needed.
        
        This is the recommended mode - balances cost and accuracy.
        """
        logger.info("Using hybrid extraction")
        
        # Step 1: Try local extraction first
        local_result = self._extract_locally(docling_result)
        
        # Step 2: Check if we need to escalate to LLM
        should_escalate = self._should_escalate_to_llm(local_result, docling_result)
        
        if should_escalate and claude_service.is_available:
            logger.info(
                "Escalating to Claude",
                local_confidence=local_result.confidence_score,
                reason=self._get_escalation_reason(local_result)
            )
            
            try:
                llm_result = await claude_service.extract_invoice_data(
                    document_content=docling_result.markdown,
                    tables=docling_result.tables,
                    metadata=docling_result.metadata
                )
                
                # Compare and choose better result
                if llm_result.confidence_score > local_result.confidence_score:
                    logger.info("Using LLM result (higher confidence)")
                    return llm_result
                else:
                    logger.info("Keeping local result")
                    return local_result
                    
            except Exception as e:
                logger.error("LLM extraction failed, using local result", error=str(e))
                return local_result
        
        logger.info(
            "Using local result (no escalation needed)",
            confidence=local_result.confidence_score
        )
        return local_result
    
    def _should_escalate_to_llm(
        self, 
        local_result: InvoiceData,
        docling_result: DoclingResult
    ) -> bool:
        """
        Determine if we should escalate to LLM.
        
        Escalation triggers:
        - Low confidence score
        - Missing critical fields
        - Complex document (many tables)
        - Review flag set
        """
        # Always escalate if review is required
        if local_result.requires_review:
            return True
        
        # Escalate if confidence is below threshold
        if local_result.confidence_score < settings.LLM_ESCALATION_THRESHOLD:
            return True
        
        # Escalate if critical fields are missing
        if local_result.invoice_number == "UNKNOWN":
            return True
        
        if local_result.total == 0:
            return True
        
        if local_result.supplier.name == "UNKNOWN" and local_result.client.name == "UNKNOWN":
            return True
        
        # Escalate for complex documents (many tables)
        if len(docling_result.tables) > 3:
            return True
        
        return False
    
    def _get_escalation_reason(self, result: InvoiceData) -> str:
        """Get human-readable escalation reason."""
        reasons = []
        
        if result.requires_review:
            reasons.append("requires_review")
        if result.confidence_score < settings.LLM_ESCALATION_THRESHOLD:
            reasons.append(f"low_confidence({result.confidence_score:.2f})")
        if result.invoice_number == "UNKNOWN":
            reasons.append("missing_invoice_number")
        if result.total == 0:
            reasons.append("missing_total")
        
        return ", ".join(reasons) if reasons else "unknown"
    
    async def reprocess_with_llm(
        self, 
        file_path: str
    ) -> InvoiceData:
        """
        Force reprocessing with LLM.
        
        Useful when user requests higher accuracy.
        """
        return await self.process_invoice(file_path, force_llm=True)
    
    def get_extraction_stats(self) -> Dict[str, Any]:
        """Get statistics about extraction performance."""
        return {
            "mode": self.mode,
            "claude_available": claude_service.is_available,
            "escalation_threshold": settings.LLM_ESCALATION_THRESHOLD,
        }


# Singleton instance
_processor: Optional[InvoiceProcessor] = None


def get_invoice_processor() -> InvoiceProcessor:
    """Get or create the InvoiceProcessor singleton."""
    global _processor
    if _processor is None:
        _processor = InvoiceProcessor()
    return _processor


invoice_processor = get_invoice_processor()
