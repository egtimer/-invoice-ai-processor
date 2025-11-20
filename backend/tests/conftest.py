"""
Test fixtures and configuration for pytest.

This module provides reusable fixtures that set up test clients,
sample data, and other common test dependencies.
"""

import pytest
import os
import shutil
from fastapi.testclient import TestClient
from pathlib import Path

# Import your FastAPI app
from app.main import app


@pytest.fixture(scope="session")
def test_client():
    """
    Create a TestClient for making requests to the FastAPI app.
    
    Scope is 'session' which means this client is created once
    for the entire test session and reused across all tests.
    """
    return TestClient(app)


@pytest.fixture(scope="session")
def test_data_dir():
    """
    Path to directory containing test data files.
    
    Returns the absolute path to tests/test_data where we'll
    store sample PDFs and other test files.
    """
    return Path(__file__).parent / "test_data"


@pytest.fixture(scope="session")
def sample_invoice_pdf(test_data_dir):
    """
    Path to a sample invoice PDF for testing.
    
    This fixture ensures the test data directory exists and
    returns the path to where a sample PDF should be located.
    """
    # Create test_data directory if it doesn't exist
    test_data_dir.mkdir(exist_ok=True)
    
    # Path to sample PDF
    pdf_path = test_data_dir / "sample_invoice.pdf"
    
    # If you have a sample PDF, copy it here
    # For now, we'll just return the path
    return pdf_path


@pytest.fixture(scope="function")
def clean_uploads():
    """
    Fixture that cleans up uploaded files after each test.
    
    Scope is 'function' which means this runs before and after
    each individual test function that uses it.
    """
    # Setup: nothing to do before test runs
    yield
    
    # Teardown: clean up after test completes
    uploads_dir = Path("uploads")
    if uploads_dir.exists():
        for file in uploads_dir.glob("*.pdf"):
            try:
                file.unlink()
            except Exception as e:
                print(f"Warning: Could not delete {file}: {e}")


@pytest.fixture(scope="function")
def clean_results():
    """
    Fixture that cleans up result files after each test.
    """
    yield
    
    results_dir = Path("results")
    if results_dir.exists():
        for file in results_dir.glob("*.json"):
            try:
                file.unlink()
            except Exception as e:
                print(f"Warning: Could not delete {file}: {e}")
