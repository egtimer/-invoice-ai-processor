"""
Pydantic models for invoice data structures.

These models define the structure of invoice data and provide automatic
validation, serialization, and documentation for the API.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


class InvoiceLine(BaseModel):
    """
    Represents a single line item in an invoice.
    
    Each line contains information about a product or service,
    including description, quantity, price, and calculated total.
    """
    description: str = Field(..., description="Description of the product or service")
    quantity: float = Field(..., gt=0, description="Quantity of items")
    unit_price: Decimal = Field(..., description="Price per unit")
    line_total: Decimal = Field(..., description="Total for this line (quantity × unit_price)")
    tax_rate: Optional[float] = Field(None, ge=0, le=100, description="Tax rate as percentage")
    confidence: float = Field(default=1.0, ge=0, le=1, description="Confidence score for extraction")

    @validator('line_total', always=True)
    def validate_line_total(cls, v, values):
        """
        Validates that the line total matches quantity × unit_price.
        
        This catches potential extraction errors where the total
        doesn't match the calculated value.
        """
        if 'quantity' in values and 'unit_price' in values:
            expected = Decimal(str(values['quantity'])) * values['unit_price']
            # Allow small rounding differences (0.01)
            if abs(v - expected) > Decimal('0.01'):
                # Flag as low confidence if totals don't match
                values['confidence'] = min(values.get('confidence', 1.0), 0.5)
        return v


class CompanyInfo(BaseModel):
    """
    Represents information about a company (supplier or client).
    
    Contains identification and contact details extracted from the invoice.
    """
    name: str = Field(..., description="Company name")
    tax_id: Optional[str] = Field(None, description="Tax identification number (CIF/NIF in Spain)")
    address: Optional[str] = Field(None, description="Complete address")
    postal_code: Optional[str] = Field(None, description="Postal code")
    city: Optional[str] = Field(None, description="City")
    country: Optional[str] = Field(default="España", description="Country")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    confidence: float = Field(default=1.0, ge=0, le=1, description="Confidence score for extraction")


class InvoiceData(BaseModel):
    """
    Complete invoice data model.
    
    This is the main model that represents all extracted information
    from an invoice, including header data, line items, and totals.
    """
    # Invoice identification
    invoice_number: str = Field(..., description="Unique invoice number")
    invoice_date: date = Field(..., description="Date when the invoice was issued")
    due_date: Optional[date] = Field(None, description="Payment due date")
    
    # Company information
    supplier: CompanyInfo = Field(..., description="Supplier/vendor information")
    client: CompanyInfo = Field(..., description="Client/customer information")
    
    # Line items
    lines: List[InvoiceLine] = Field(default_factory=list, description="Invoice line items")
    
    # Financial totals
    subtotal: Decimal = Field(..., description="Subtotal before tax")
    tax_amount: Decimal = Field(..., description="Total tax amount")
    total: Decimal = Field(..., description="Grand total including tax")
    
    # Metadata
    currency: str = Field(default="EUR", description="Currency code")
    payment_method: Optional[str] = Field(None, description="Payment method")
    notes: Optional[str] = Field(None, description="Additional notes or comments")
    
    # Processing metadata
    confidence_score: float = Field(default=1.0, ge=0, le=1, description="Overall confidence score")
    extracted_at: datetime = Field(default_factory=datetime.now, description="When data was extracted")
    requires_review: bool = Field(default=False, description="Whether manual review is needed")

    @validator('total', always=True)
    def validate_total(cls, v, values):
        """
        Validates that the total matches subtotal + tax_amount.
        
        This is a critical validation that helps catch extraction errors
        in the financial summary of the invoice.
        """
        if 'subtotal' in values and 'tax_amount' in values:
            expected = values['subtotal'] + values['tax_amount']
            # Allow small rounding differences (0.01)
            if abs(v - expected) > Decimal('0.01'):
                # Flag for review if totals don't match
                values['requires_review'] = True
                values['confidence_score'] = min(values.get('confidence_score', 1.0), 0.6)
        return v

    @validator('requires_review', always=True)
    def check_confidence(cls, v, values):
        """
        Automatically flag invoice for review if confidence is low.
        
        If the overall confidence score is below threshold (0.7),
        the invoice should be manually reviewed.
        """
        if 'confidence_score' in values and values['confidence_score'] < 0.7:
            return True
        return v


class InvoiceUploadResponse(BaseModel):
    """
    Response model for invoice upload endpoint.
    
    Returned immediately after file upload, before processing begins.
    """
    invoice_id: str = Field(..., description="Unique identifier for the uploaded invoice")
    filename: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")
    uploaded_at: datetime = Field(default_factory=datetime.now, description="Upload timestamp")
    status: str = Field(default="uploaded", description="Current status")


class InvoiceProcessingStatus(BaseModel):
    """
    Response model for processing status checks.
    
    Used to inform clients about the current state of invoice processing.
    """
    invoice_id: str
    status: str = Field(..., description="Current status: uploaded, processing, completed, error")
    progress: float = Field(default=0.0, ge=0, le=100, description="Processing progress percentage")
    message: Optional[str] = Field(None, description="Status message or error description")
    data: Optional[InvoiceData] = Field(None, description="Extracted data (only when completed)")


class ExportRequest(BaseModel):
    """
    Request model for data export endpoint.
    
    Allows clients to specify export format and which invoices to export.
    """
    invoice_ids: List[str] = Field(..., description="List of invoice IDs to export")
    format: str = Field(default="json", description="Export format: json, excel, csv")
    include_metadata: bool = Field(default=True, description="Include processing metadata")


class ErrorResponse(BaseModel):
    """
    Standard error response model.
    
    Used consistently across all endpoints to communicate errors to clients.
    """
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.now)
