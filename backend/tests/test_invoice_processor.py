"""
Tests for Invoice AI Processor v2.

Tests the new Docling + Claude architecture.
"""

import pytest
from datetime import date
from decimal import Decimal
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch

from app.models.invoice import InvoiceData, InvoiceLine, CompanyInfo
from app.services.local_extraction_service import LocalExtractionService
from app.core.config import Settings


# ===========================================
# Test Data Fixtures
# ===========================================

@pytest.fixture
def sample_invoice_text():
    """Sample invoice text as Docling would produce."""
    return """
# FACTURA

**Factura Nº:** F2024-00123
**Fecha:** 15/01/2024

## Emisor
**Empresa Ejemplo S.L.**
CIF: B12345678
Calle Principal 123
28001 Madrid

## Cliente
**Cliente Test S.A.**
NIF: A87654321
Avenida Secundaria 456
08001 Barcelona

## Detalle

| Descripción | Cantidad | Precio | Total |
|-------------|----------|--------|-------|
| Consultoría | 10 | 100,00 € | 1.000,00 € |
| Desarrollo | 5 | 200,00 € | 1.000,00 € |

**Base Imponible:** 2.000,00 €
**IVA (21%):** 420,00 €
**TOTAL:** 2.420,00 €
"""


@pytest.fixture
def sample_tables():
    """Sample table data as Docling would extract."""
    return [
        {
            "headers": ["Descripción", "Cantidad", "Precio", "Total"],
            "rows": [
                ["Consultoría", "10", "100,00", "1.000,00"],
                ["Desarrollo", "5", "200,00", "1.000,00"]
            ],
            "raw_text": "| Descripción | Cantidad | Precio | Total |..."
        }
    ]


@pytest.fixture
def sample_invoice_data():
    """Sample InvoiceData object."""
    return InvoiceData(
        invoice_number="F2024-00123",
        invoice_date=date(2024, 1, 15),
        supplier=CompanyInfo(
            name="Empresa Ejemplo S.L.",
            tax_id="B12345678",
            confidence=0.9
        ),
        client=CompanyInfo(
            name="Cliente Test S.A.",
            tax_id="A87654321",
            confidence=0.9
        ),
        lines=[
            InvoiceLine(
                description="Consultoría",
                quantity=10,
                unit_price=Decimal("100.00"),
                line_total=Decimal("1000.00"),
                confidence=0.85
            )
        ],
        subtotal=Decimal("2000.00"),
        tax_amount=Decimal("420.00"),
        total=Decimal("2420.00"),
        confidence_score=0.88,
        extraction_method="local"
    )


# ===========================================
# Model Tests
# ===========================================

class TestInvoiceModels:
    """Tests for Pydantic models."""
    
    def test_invoice_line_calculation(self):
        """Test automatic line total calculation."""
        line = InvoiceLine(
            description="Test",
            quantity=5,
            unit_price=Decimal("10.00"),
            line_total=Decimal("0")
        )
        assert line.line_total == Decimal("50.00")
    
    def test_company_info_tax_id_validation(self):
        """Test tax ID normalization."""
        company = CompanyInfo(
            name="Test Company",
            tax_id="b-1234-5678"
        )
        assert company.tax_id == "B12345678"
    
    def test_invoice_data_total_validation(self, sample_invoice_data):
        """Test total validation logic."""
        # Valid totals
        assert not sample_invoice_data.requires_review
        
        # Invalid totals should trigger review
        invalid = InvoiceData(
            invoice_number="TEST",
            invoice_date=date.today(),
            supplier=CompanyInfo(name="Test"),
            client=CompanyInfo(name="Test"),
            lines=[],
            subtotal=Decimal("100.00"),
            tax_amount=Decimal("21.00"),
            total=Decimal("200.00"),  # Wrong!
            confidence_score=0.9
        )
        assert invalid.requires_review
    
    def test_invoice_requires_review_on_low_confidence(self):
        """Test review flag on low confidence."""
        invoice = InvoiceData(
            invoice_number="TEST",
            invoice_date=date.today(),
            supplier=CompanyInfo(name="Test"),
            client=CompanyInfo(name="Test"),
            lines=[],
            subtotal=Decimal("100.00"),
            tax_amount=Decimal("21.00"),
            total=Decimal("121.00"),
            confidence_score=0.5  # Low confidence
        )
        assert invoice.requires_review


# ===========================================
# Local Extraction Tests
# ===========================================

class TestLocalExtraction:
    """Tests for local pattern-based extraction."""
    
    @pytest.fixture
    def service(self):
        return LocalExtractionService()
    
    def test_extract_invoice_number(self, service, sample_invoice_text):
        """Test invoice number extraction."""
        result = service._extract_invoice_number(sample_invoice_text)
        assert result.value == "F2024-00123"
        assert result.confidence > 0.8
    
    def test_extract_invoice_date(self, service, sample_invoice_text):
        """Test date extraction."""
        result = service._extract_invoice_date(sample_invoice_text)
        assert result.value == date(2024, 1, 15)
        assert result.confidence > 0.8
    
    def test_extract_company_supplier(self, service, sample_invoice_text):
        """Test supplier extraction."""
        # This test may need adjustment based on exact text format
        supplier = service._extract_company(sample_invoice_text, "supplier")
        assert supplier is not None
        assert supplier.tax_id == "B12345678"
    
    def test_validate_tax_id_cif(self, service):
        """Test CIF validation."""
        assert service._validate_tax_id("B12345678")
        assert service._validate_tax_id("A87654321")
        assert not service._validate_tax_id("12345")
        assert not service._validate_tax_id("INVALID99")
    
    def test_validate_tax_id_nif(self, service):
        """Test NIF validation."""
        assert service._validate_tax_id("12345678A")
        assert not service._validate_tax_id("1234567AA")
    
    def test_parse_decimal_european(self, service):
        """Test European decimal parsing."""
        assert service._parse_decimal("1.234,56") == Decimal("1234.56")
        assert service._parse_decimal("100,00") == Decimal("100.00")
        assert service._parse_decimal("1.000,00 €") == Decimal("1000.00")
    
    def test_parse_decimal_american(self, service):
        """Test American decimal parsing."""
        assert service._parse_decimal("1,234.56") == Decimal("1234.56")
        assert service._parse_decimal("100.00") == Decimal("100.00")
    
    def test_full_extraction(self, service, sample_invoice_text, sample_tables):
        """Test complete extraction pipeline."""
        result = service.extract_invoice_data(
            text=sample_invoice_text,
            markdown=sample_invoice_text,
            tables=sample_tables,
            metadata={}
        )
        
        assert result.invoice_number == "F2024-00123"
        assert result.extraction_method == "local"
        assert result.confidence_score > 0


# ===========================================
# Configuration Tests
# ===========================================

class TestConfiguration:
    """Tests for configuration handling."""
    
    def test_default_settings(self):
        """Test default configuration values."""
        with patch.dict('os.environ', {}, clear=True):
            settings = Settings()
            assert settings.EXTRACTION_MODE == "hybrid"
            assert settings.LLM_ESCALATION_THRESHOLD == 0.7
            assert settings.DOCLING_OCR_ENABLED == True
    
    def test_effective_mode_without_api_key(self):
        """Test fallback to local_only without API key."""
        with patch.dict('os.environ', {'EXTRACTION_MODE': 'hybrid'}, clear=True):
            settings = Settings()
            assert settings.effective_extraction_mode == "local_only"
    
    def test_effective_mode_with_api_key(self):
        """Test hybrid mode with API key."""
        with patch.dict('os.environ', {
            'EXTRACTION_MODE': 'hybrid',
            'ANTHROPIC_API_KEY': 'sk-test-key'
        }, clear=True):
            settings = Settings()
            assert settings.effective_extraction_mode == "hybrid"
            assert settings.has_claude_api == True


# ===========================================
# Integration Tests (Mocked)
# ===========================================

class TestInvoiceProcessor:
    """Integration tests for the processor orchestrator."""
    
    @pytest.fixture
    def mock_docling_result(self, sample_invoice_text, sample_tables):
        """Mock Docling result."""
        from app.services.docling_service import DoclingResult
        return DoclingResult(
            markdown=sample_invoice_text,
            text=sample_invoice_text,
            tables=sample_tables,
            metadata={"page_count": 1},
            confidence=0.85
        )
    
    @pytest.mark.asyncio
    async def test_process_local_only(self, mock_docling_result, tmp_path):
        """Test processing in local_only mode."""
        from app.services.invoice_processor import InvoiceProcessor
        
        # Create test file
        test_file = tmp_path / "test.pdf"
        test_file.write_bytes(b"fake pdf content")
        
        with patch('app.services.invoice_processor.settings') as mock_settings:
            mock_settings.effective_extraction_mode = "local_only"
            
            with patch('app.services.invoice_processor.docling_service') as mock_docling:
                mock_docling.process_document.return_value = mock_docling_result
                
                processor = InvoiceProcessor()
                processor.mode = "local_only"
                
                result = await processor.process_invoice(str(test_file))
                
                assert result.extraction_method == "local"
                mock_docling.process_document.assert_called_once()


# ===========================================
# API Endpoint Tests
# ===========================================

class TestAPIEndpoints:
    """Tests for FastAPI endpoints."""
    
    @pytest.fixture
    def client(self):
        from fastapi.testclient import TestClient
        from app.main import app
        return TestClient(app)
    
    def test_health_endpoint(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "extraction_mode" in data
    
    def test_root_endpoint(self, client):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["version"] == "2.0.0"
    
    def test_upload_invalid_extension(self, client):
        """Test upload with invalid file type."""
        response = client.post(
            "/api/v2/upload",
            files={"file": ("test.exe", b"content", "application/octet-stream")}
        )
        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]
    
    def test_upload_empty_file(self, client):
        """Test upload with empty file."""
        response = client.post(
            "/api/v2/upload",
            files={"file": ("test.pdf", b"", "application/pdf")}
        )
        assert response.status_code == 400
    
    def test_process_not_found(self, client):
        """Test processing non-existent invoice."""
        response = client.post("/api/v2/process/non-existent-id")
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
