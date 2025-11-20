"""
OCR Service for extracting text from PDF documents.

This service handles the optical character recognition process, combining
PDF text extraction for digital PDFs with Tesseract OCR for scanned documents.
"""

import pytesseract
from pdf2image import convert_from_path
import pdfplumber
from typing import Tuple, List, Optional
import logging
from pathlib import Path

from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)


class OCRService:
    """
    Service for extracting text from PDF invoices.
    
    This service tries multiple extraction methods to handle both
    digital PDFs (with embedded text) and scanned PDFs (images only).
    """
    
    def __init__(self):
        """
        Initialize the OCR service with configured settings.
        
        Sets up Tesseract path and language configuration from settings.
        """
        if settings.TESSERACT_PATH:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH
        
        self.languages = settings.OCR_LANGUAGES
        logger.info(f"OCR Service initialized with languages: {self.languages}")
    
    def extract_text_from_pdf(self, pdf_path: str) -> Tuple[str, float]:
        """
        Extract text from a PDF file using the best available method.
        
        Strategy:
        1. Try extracting embedded text (fast, for digital PDFs)
        2. If embedded text is minimal or empty, use OCR (for scanned PDFs)
        3. Return both text and a confidence score
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Tuple of (extracted_text, confidence_score)
            
        Raises:
            Exception: If text extraction fails completely
        """
        try:
            # First attempt: Extract embedded text using pdfplumber (fast method)
            logger.info(f"Attempting to extract embedded text from {pdf_path}")
            embedded_text, embedded_confidence = self._extract_embedded_text(pdf_path)
            
            # Check if we got meaningful text (more than 100 characters suggests real content)
            if len(embedded_text.strip()) > 100:
                logger.info("Successfully extracted embedded text")
                return embedded_text, embedded_confidence
            
            # Second attempt: Use OCR for scanned documents
            logger.info("Embedded text insufficient, switching to OCR")
            ocr_text, ocr_confidence = self._extract_with_ocr(pdf_path)
            
            # Return the better result (usually OCR if we reached this point)
            if len(ocr_text) > len(embedded_text):
                return ocr_text, ocr_confidence
            
            return embedded_text, embedded_confidence
            
        except Exception as e:
            logger.error(f"Failed to extract text from PDF: {str(e)}")
            raise Exception(f"Text extraction failed: {str(e)}")
    
    def _extract_embedded_text(self, pdf_path: str) -> Tuple[str, float]:
        """
        Extract embedded text from a digital PDF.
        
        This is the fastest method and works for PDFs that were created
        digitally (not scanned). Uses pdfplumber which preserves layout better
        than other PDF libraries.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Tuple of (text, confidence_score)
        """
        try:
            text_parts = []
            
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    # Extract text while preserving some layout structure
                    page_text = page.extract_text()
                    
                    if page_text:
                        text_parts.append(f"--- Page {page_num} ---\n{page_text}\n")
            
            full_text = "\n".join(text_parts)
            
            # Calculate confidence based on text quality
            # More text usually means better extraction
            confidence = min(len(full_text) / 1000, 1.0) if full_text else 0.0
            
            return full_text, confidence
            
        except Exception as e:
            logger.warning(f"Embedded text extraction failed: {str(e)}")
            return "", 0.0
    
    def _extract_with_ocr(self, pdf_path: str) -> Tuple[str, float]:
        """
        Extract text using OCR (Optical Character Recognition).
        
        This method converts PDF pages to images and then uses Tesseract
        to recognize text. Slower than embedded text extraction but works
        for scanned documents.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Tuple of (text, confidence_score)
        """
        try:
            # Convert PDF pages to images
            # DPI 300 provides good quality while keeping processing time reasonable
            logger.info("Converting PDF to images for OCR")
            images = convert_from_path(pdf_path, dpi=300)
            
            text_parts = []
            total_confidence = 0.0
            
            # Process each page
            for page_num, image in enumerate(images, 1):
                logger.info(f"Processing page {page_num} with OCR")
                
                # Perform OCR with detailed data to get confidence scores
                ocr_data = pytesseract.image_to_data(
                    image,
                    lang=self.languages,
                    output_type=pytesseract.Output.DICT
                )
                
                # Extract text and calculate average confidence
                page_text_parts = []
                page_confidences = []
                
                for i, conf in enumerate(ocr_data['conf']):
                    # Filter out low-confidence words (conf = -1 means no recognition)
                    if conf > 0:
                        text = ocr_data['text'][i].strip()
                        if text:
                            page_text_parts.append(text)
                            page_confidences.append(conf)
                
                # Join words into text
                page_text = " ".join(page_text_parts)
                text_parts.append(f"--- Page {page_num} ---\n{page_text}\n")
                
                # Calculate average confidence for this page
                if page_confidences:
                    page_conf = sum(page_confidences) / len(page_confidences) / 100.0
                    total_confidence += page_conf
            
            full_text = "\n".join(text_parts)
            
            # Average confidence across all pages
            avg_confidence = total_confidence / len(images) if images else 0.0
            
            logger.info(f"OCR completed with average confidence: {avg_confidence:.2f}")
            return full_text, avg_confidence
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {str(e)}")
            return "", 0.0
    
    def extract_text_from_image(self, image_path: str) -> Tuple[str, float]:
        """
        Extract text directly from an image file.
        
        Useful for processing standalone invoice images (JPG, PNG, etc.)
        without PDF conversion.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Tuple of (text, confidence_score)
        """
        try:
            # Perform OCR on the image
            ocr_data = pytesseract.image_to_data(
                image_path,
                lang=self.languages,
                output_type=pytesseract.Output.DICT
            )
            
            # Extract text and confidences
            text_parts = []
            confidences = []
            
            for i, conf in enumerate(ocr_data['conf']):
                if conf > 0:
                    text = ocr_data['text'][i].strip()
                    if text:
                        text_parts.append(text)
                        confidences.append(conf)
            
            full_text = " ".join(text_parts)
            avg_confidence = sum(confidences) / len(confidences) / 100.0 if confidences else 0.0
            
            return full_text, avg_confidence
            
        except Exception as e:
            logger.error(f"Image OCR failed: {str(e)}")
            raise Exception(f"Image text extraction failed: {str(e)}")


# Create a singleton instance for use across the application
ocr_service = OCRService()
