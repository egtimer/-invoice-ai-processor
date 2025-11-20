"""
Integration tests for API endpoints.

These tests verify that the main API endpoints work correctly
by making actual HTTP requests and checking the responses.
"""

import pytest
import time
from pathlib import Path


class TestUploadEndpoint:
    """Tests for the file upload endpoint."""
    
    def test_upload_valid_pdf(self, test_client, sample_invoice_pdf, clean_uploads):
        """
        Test uploading a valid PDF invoice.
        
        This test verifies that:
        1. The upload endpoint accepts PDF files
        2. Returns a 201 Created status code
        3. Response includes a valid invoice_id
        4. Response includes correct metadata
        """
        # Check if sample PDF exists
        if not sample_invoice_pdf.exists():
            pytest.skip("Sample invoice PDF not found")
        
        # Open the PDF file in binary mode
        with open(sample_invoice_pdf, 'rb') as pdf_file:
            # Make POST request to upload endpoint
            response = test_client.post(
                "/api/v1/upload",
                files={"file": ("test_invoice.pdf", pdf_file, "application/pdf")}
            )
        
        # Assert response status code
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        
        # Parse response JSON
        data = response.json()
        
        # Assert response structure
        assert "invoice_id" in data, "Response missing invoice_id"
        assert "filename" in data, "Response missing filename"
        assert "file_size" in data, "Response missing file_size"
        assert "uploaded_at" in data, "Response missing uploaded_at"
        assert "status" in data, "Response missing status"
        
        # Assert data types and values
        assert isinstance(data["invoice_id"], str), "invoice_id should be string"
        assert len(data["invoice_id"]) == 36, "invoice_id should be valid UUID"
        assert data["status"] == "uploaded", "Initial status should be 'uploaded'"
        assert data["file_size"] > 0, "File size should be greater than 0"
    
    def test_upload_non_pdf_file(self, test_client, clean_uploads):
        """
        Test uploading a non-PDF file.
        
        The endpoint should reject files that aren't PDFs.
        """
        # Create a fake text file
        fake_file_content = b"This is not a PDF"
        
        response = test_client.post(
            "/api/v1/upload",
            files={"file": ("test.txt", fake_file_content, "text/plain")}
        )
        
        # Should return error status
        assert response.status_code in [400, 422], "Should reject non-PDF files"
    
    def test_upload_oversized_file(self, test_client, clean_uploads):
        """
        Test uploading a file that exceeds size limit.
        
        Files larger than 10MB should be rejected.
        """
        # Create fake large file (11MB of zeros)
        large_file_content = b"\x00" * (11 * 1024 * 1024)
        
        response = test_client.post(
            "/api/v1/upload",
            files={"file": ("large.pdf", large_file_content, "application/pdf")}
        )
        
        # Should return error status
        assert response.status_code in [400, 413, 422], "Should reject oversized files"


class TestProcessingEndpoint:
    """Tests for invoice processing endpoints."""
    
    def test_start_processing(self, test_client, sample_invoice_pdf, clean_uploads, clean_results):
        """
        Test starting invoice processing.
        
        This is an integration test that:
        1. Uploads a PDF
        2. Starts processing
        3. Verifies processing starts correctly
        """
        if not sample_invoice_pdf.exists():
            pytest.skip("Sample invoice PDF not found")
        
        # First upload a file
        with open(sample_invoice_pdf, 'rb') as pdf_file:
            upload_response = test_client.post(
                "/api/v1/upload",
                files={"file": ("test_invoice.pdf", pdf_file, "application/pdf")}
            )
        
        assert upload_response.status_code == 201
        invoice_id = upload_response.json()["invoice_id"]
        
        # Now start processing
        process_response = test_client.post(f"/api/v1/process/{invoice_id}")
        
        # Assert processing started
        assert process_response.status_code == 200
        data = process_response.json()
        
        assert data["invoice_id"] == invoice_id
        assert data["status"] in ["processing", "completed"]
        assert "progress" in data
        assert "message" in data
    
    def test_get_processing_status(self, test_client, sample_invoice_pdf, clean_uploads, clean_results):
        """
        Test retrieving processing status.
        
        This test verifies we can check the status of processing.
        """
        if not sample_invoice_pdf.exists():
            pytest.skip("Sample invoice PDF not found")
        
        # Upload and start processing
        with open(sample_invoice_pdf, 'rb') as pdf_file:
            upload_response = test_client.post(
                "/api/v1/upload",
                files={"file": ("test_invoice.pdf", pdf_file, "application/pdf")}
            )
        
        invoice_id = upload_response.json()["invoice_id"]
        test_client.post(f"/api/v1/process/{invoice_id}")
        
        # Get status
        status_response = test_client.get(f"/api/v1/process/{invoice_id}")
        
        assert status_response.status_code == 200
        data = status_response.json()
        
        assert "status" in data
        assert "progress" in data
        assert data["status"] in ["processing", "completed", "error"]
    
    @pytest.mark.slow
    def test_complete_processing_flow(self, test_client, sample_invoice_pdf, clean_uploads, clean_results):
        """
        Test complete processing flow from upload to results.
        
        This is a comprehensive integration test that verifies
        the entire pipeline works end-to-end.
        
        Marked as 'slow' because it waits for actual processing.
        """
        if not sample_invoice_pdf.exists():
            pytest.skip("Sample invoice PDF not found")
        
        # Step 1: Upload
        with open(sample_invoice_pdf, 'rb') as pdf_file:
            upload_response = test_client.post(
                "/api/v1/upload",
                files={"file": ("test_invoice.pdf", pdf_file, "application/pdf")}
            )
        
        assert upload_response.status_code == 201
        invoice_id = upload_response.json()["invoice_id"]
        
        # Step 2: Start processing
        process_response = test_client.post(f"/api/v1/process/{invoice_id}")
        assert process_response.status_code == 200
        
        # Step 3: Wait for processing to complete (with timeout)
        max_wait_time = 30  # seconds
        start_time = time.time()
        processing_complete = False
        
        while time.time() - start_time < max_wait_time:
            status_response = test_client.get(f"/api/v1/process/{invoice_id}")
            data = status_response.json()
            
            if data["status"] == "completed":
                processing_complete = True
                break
            elif data["status"] == "error":
                pytest.fail(f"Processing failed: {data.get('message', 'Unknown error')}")
            
            time.sleep(2)  # Wait 2 seconds between checks
        
        assert processing_complete, "Processing did not complete within timeout"
        
        # Step 4: Verify extracted data structure
        final_data = status_response.json()
        assert "data" in final_data
        extracted = final_data["data"]
        
        # Verify all required fields are present
        required_fields = [
            "invoice_number", "invoice_date", "supplier", "client",
            "lines", "subtotal", "tax_amount", "total",
            "confidence_score", "requires_review"
        ]
        
        for field in required_fields:
            assert field in extracted, f"Missing required field: {field}"
        
        # Verify data types
        assert isinstance(extracted["confidence_score"], (int, float))
        assert isinstance(extracted["requires_review"], bool)
        assert isinstance(extracted["lines"], list)
        
        # Verify financial calculations are reasonable
        if extracted["subtotal"] and extracted["tax_amount"] and extracted["total"]:
            # Convert string decimals to float for comparison
            subtotal = float(extracted["subtotal"])
            tax = float(extracted["tax_amount"])
            total = float(extracted["total"])
            
            # Allow small floating point differences
            assert abs((subtotal + tax) - total) < 0.1, "Financial calculations don't add up"


class TestErrorHandling:
    """Tests for error handling in the API."""
    
    def test_process_nonexistent_invoice(self, test_client):
        """
        Test processing an invoice that doesn't exist.
        
        Should return appropriate error response.
        """
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = test_client.post(f"/api/v1/process/{fake_uuid}")
        
        assert response.status_code in [404, 400]
    
    def test_get_status_nonexistent_invoice(self, test_client):
        """
        Test getting status of an invoice that doesn't exist.
        """
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = test_client.get(f"/api/v1/process/{fake_uuid}")
        
        assert response.status_code in [404, 400]
