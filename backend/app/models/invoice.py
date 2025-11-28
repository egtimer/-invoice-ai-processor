"""
Pydantic models for invoice data structures - v2.

Updated models with support for:
- Extraction method tracking
- Enhanced confidence scoring
- Better validation
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Literal
from datetime import date, datetime
from decimal import Decimal


class InvoiceLine(BaseModel):
    """
    Represents a single line item in an invoice.
    """
    description: str = Field(..., description="Description of the product or service")
    quantity: float = Field(default=1.0, gt=0, description="Quantity of items")
    unit_price: Decimal = Field(default=Decimal("0"), description="Price per unit")
    line_total: Decimal = Field(default=Decimal("0"), description="Total for this line")
    tax_rate: Optional[float] = Field(None, ge=0, le=100, description="Tax rate %")
    confidence: float = Field(default=1.0, ge=0, le=1, description="Extraction confidence")

    @model_validator(mode='after')
    def calculate_total_if_missing(self):
        """Calculate line_total from quantity * unit_price if not set."""
        if self.line_total == Decimal("0") and self.unit_price > 0:
            self.line_total = Decimal(str(self.quantity)) * self.unit_price
        return self

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class CompanyInfo(BaseModel):
    """
    Represents information about a company (supplier or client).
    """
    name: str = Field(default="UNKNOWN", description="Company name")
    tax_id: Optional[str] = Field(None, description="Tax ID (CIF/NIF)")
    address: Optional[str] = Field(None, description="Street address")
    postal_code: Optional[str] = Field(None, description="Postal code")
    city: Optional[str] = Field(None, description="City")
    country: str = Field(default="España", description="Country")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    confidence: float = Field(default=1.0, ge=0, le=1, description="Extraction confidence")

    @field_validator('name', mode='before')
    @classmethod
    def clean_name(cls, v):
        """Clean up extracted name."""
        if not v:
            return "UNKNOWN"
        # Remove newlines and extra whitespace
        cleaned = ' '.join(str(v).split())
        return cleaned[:200]  # Limit length

    @field_validator('tax_id', mode='before')
    @classmethod
    def clean_tax_id(cls, v):
        """Normalize tax ID format."""
        if not v:
            return None
        cleaned = str(v).upper().replace(' ', '').replace('-', '')
        if len(cleaned) == 9:
            return cleaned
        return None


class InvoiceData(BaseModel):
    """
    Complete invoice data model - v2.
    """
    # Invoice identification
    invoice_number: str = Field(..., description="Invoice number")
    invoice_date: date = Field(..., description="Issue date")
    due_date: Optional[date] = Field(None, description="Payment due date")
    
    # Company information
    supplier: CompanyInfo = Field(..., description="Supplier info")
    client: CompanyInfo = Field(..., description="Client info")
    
    # Line items
    lines: List[InvoiceLine] = Field(default_factory=list, description="Line items")
    
    # Financial totals
    subtotal: Decimal = Field(..., description="Subtotal before tax")
    tax_amount: Decimal = Field(..., description="Total tax amount")
    total: Decimal = Field(..., description="Grand total")
    
    # Metadata
    currency: str = Field(default="EUR", description="Currency code")
    payment_method: Optional[str] = Field(None, description="Payment method")
    notes: Optional[str] = Field(None, description="Additional notes")
    
    # Processing metadata
    confidence_score: float = Field(default=1.0, ge=0, le=1, description="Overall confidence")
    requires_review: bool = Field(default=False, description="Needs manual review")
    extraction_method: Literal["local", "claude", "hybrid"] = Field(
        default="local", 
        description="Method used for extraction"
    )
    extracted_at: datetime = Field(default_factory=datetime.now, description="Extraction timestamp")

    @model_validator(mode='after')
    def validate_totals(self):
        """Validate financial totals consistency."""
        expected_total = self.subtotal + self.tax_amount
        if self.total > 0:
            diff = abs(self.total - expected_total)
            # Allow 1 cent tolerance
            if diff > Decimal("0.02"):
                self.requires_review = True
                # Adjust confidence
                self.confidence_score = min(self.confidence_score, 0.7)
        return self

    @model_validator(mode='after')
    def set_review_flag(self):
        """Set requires_review based on confidence and missing data."""
        if self.confidence_score < 0.7:
            self.requires_review = True
        if self.invoice_number == "UNKNOWN":
            self.requires_review = True
        if self.supplier.name == "UNKNOWN" and self.client.name == "UNKNOWN":
            self.requires_review = True
        return self

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v),
            date: lambda v: v.isoformat(),
            datetime: lambda v: v.isoformat(),
        }


class InvoiceUploadResponse(BaseModel):
    """Response after file upload."""
    invoice_id: str
    filename: str
    file_size: int
    uploaded_at: datetime = Field(default_factory=datetime.now)
    status: str = "uploaded"


class InvoiceProcessingStatus(BaseModel):
    """Processing status response."""
    invoice_id: str
    status: Literal["pending", "processing", "completed", "error"]
    progress: float = Field(default=0.0, ge=0, le=100)
    message: Optional[str] = None
    data: Optional[InvoiceData] = None
    extraction_method: Optional[str] = None


class ExportRequest(BaseModel):
    """Request for data export."""
    invoice_ids: List[str]
    format: Literal["json", "excel", "csv"] = "json"
    include_metadata: bool = True


class ProcessingOptions(BaseModel):
    """Options for invoice processing."""
    force_llm: bool = Field(default=False, description="Force LLM extraction")
    language: str = Field(default="es", description="Primary language")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str = "2.0.0"
    extraction_mode: str
    claude_available: bool
    docling_ready: bool


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    message: str
    details: Optional[dict] = None
    timestamp: datetime = Field(default_factory=datetime.now)
