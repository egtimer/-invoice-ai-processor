/**
 * Main App Component
 * 
 * Orchestrates the complete invoice processing flow:
 * 1. File upload
 * 2. Processing with status polling
 * 3. Results display
 * 
 * Manages application state and coordinates between child components.
 */

import { useState } from 'react';
import FileUpload from './components/FileUpload';
import ProcessingStatus from './components/ProcessingStatus';
import ResultsView from './components/ResultsView';
import { startProcessing } from './services/api';
import { FileText, ArrowLeft } from 'lucide-react';

function App() {
  // Application state management
  const [currentStep, setCurrentStep] = useState('upload'); // 'upload', 'processing', 'results'
  const [invoiceId, setInvoiceId] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Handle successful file upload
   * Automatically starts processing after upload completes
   */
  const handleUploadSuccess = async (uploadResult) => {
    console.log('Upload successful:', uploadResult);
    setInvoiceId(uploadResult.invoice_id);
    setCurrentStep('processing');
    setError(null);

    try {
      // Start processing automatically after upload
      await startProcessing(uploadResult.invoice_id);
    } catch (err) {
      console.error('Failed to start processing:', err);
      setError('Failed to start processing. Please try again.');
      setCurrentStep('upload');
    }
  };

  /**
   * Handle processing completion
   * Receives the complete invoice data and transitions to results view
   */
  const handleProcessingComplete = (result) => {
    console.log('Processing complete:', result);
    setInvoiceData(result.data);
    setCurrentStep('results');
  };

  /**
   * Reset application to initial state
   * Allows user to process another invoice
   */
  const handleReset = () => {
    setCurrentStep('upload');
    setInvoiceId(null);
    setInvoiceData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Invoice AI Processor
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Intelligent invoice data extraction using OCR and NLP
                </p>
              </div>
            </div>
            {currentStep !== 'upload' && (
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Process Another</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="mb-6 max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {currentStep === 'upload' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Upload Your Invoice
              </h2>
              <p className="text-gray-600">
                Drag and drop a PDF invoice or click to select a file
              </p>
            </div>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        )}

        {currentStep === 'processing' && invoiceId && (
          <ProcessingStatus
            invoiceId={invoiceId}
            onComplete={handleProcessingComplete}
          />
        )}

        {currentStep === 'results' && invoiceData && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Invoice Processing Complete
              </h2>
              <p className="text-gray-600">
                Review the extracted data below. You can export to JSON or Excel.
              </p>
            </div>
            <ResultsView data={invoiceData} invoiceId={invoiceId} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p className="text-sm">
              Built with FastAPI, React, spaCy, and Tesseract OCR
            </p>
            <p className="text-xs mt-2 text-gray-500">
              © 2025 Invoice AI Processor. Advanced document processing technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
