import { useState } from 'react'
import { uploadInvoice, startProcessing, getProcessingStatus } from './services/api'

function App() {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [invoiceData, setInvoiceData] = useState(null)
  const [error, setError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile)
      await processFile(droppedFile)
    } else {
      setError('Please upload a PDF file')
    }
  }

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      await processFile(selectedFile)
    }
  }

  const processFile = async (file) => {
    try {
      setIsProcessing(true)
      setError(null)
      setUploadProgress(30)
      
      // Upload file
      const uploadResponse = await uploadInvoice(file)
      const invoiceId = uploadResponse.invoice_id
      setUploadProgress(50)
      
      // Start processing
      await startProcessing(invoiceId)
      setUploadProgress(70)
      
      // Poll for results
      let attempts = 0
      const maxAttempts = 30
      const pollInterval = setInterval(async () => {
        attempts++
        const status = await getProcessingStatus(invoiceId)
        
        if (status.status === 'completed') {
          clearInterval(pollInterval)
          setInvoiceData(status.data)
          setUploadProgress(100)
          setIsProcessing(false)
        } else if (status.status === 'failed' || attempts >= maxAttempts) {
          clearInterval(pollInterval)
          setError('Processing failed. Please try again.')
          setIsProcessing(false)
        }
      }, 2000)
      
    } catch (err) {
      setError(err.message || 'An error occurred during processing')
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Invoice AI Processor</h1>
                <p className="text-sm text-purple-200">Intelligent Document Processing</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a href="https://invoice-ai-processor-production.up.railway.app/docs" target="_blank" rel="noopener noreferrer" className="text-purple-200 hover:text-white transition-colors">
                <span className="text-sm font-medium">API Docs</span>
              </a>
              <a href="https://github.com/egtimer/-invoice-ai-processor" target="_blank" rel="noopener noreferrer" className="text-purple-200 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Extract Invoice Data Instantly
            </h2>
            <p className="text-xl text-purple-200 max-w-2xl mx-auto">
              Powered by advanced OCR and Natural Language Processing to automatically extract and structure invoice data with high accuracy
            </p>
          </div>

          {/* Upload Section */}
          <div className="max-w-3xl mx-auto mb-16">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative bg-white/10 backdrop-blur-lg rounded-2xl p-12 border-2 border-dashed transition-all duration-300 ${
                isDragging
                  ? 'border-blue-400 bg-blue-500/20 scale-105'
                  : 'border-purple-400/50 hover:border-purple-400 hover:bg-white/15'
              }`}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isProcessing}
              />
              
              <div className="text-center">
                <div className="mb-6 inline-block">
                  <div className={`w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl transition-transform duration-300 ${
                    isDragging ? 'scale-110' : ''
                  }`}>
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">
                  {isProcessing ? 'Processing Your Invoice...' : 'Upload Your Invoice'}
                </h3>
                <p className="text-purple-200 mb-4">
                  Drag and drop your PDF invoice here or click to browse
                </p>
                
                {file && !isProcessing && (
                  <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-3 mb-4 inline-block">
                    <p className="text-green-300 font-medium">{file.name}</p>
                  </div>
                )}
                
                {isProcessing && (
                  <div className="mt-6">
                    <div className="bg-white/10 rounded-full h-3 mb-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-purple-300">Processing... {uploadProgress}%</p>
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-4 mt-4">
                    <p className="text-red-300">{error}</p>
                  </div>
                )}
                
                <p className="text-sm text-purple-300 mt-4">Maximum file size: 10MB • PDF format only</p>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {invoiceData && (
            <div className="max-w-4xl mx-auto mb-16 animate-fadeIn">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-purple-400/30">
                <h3 className="text-3xl font-bold text-white mb-6 flex items-center">
                  <svg className="w-8 h-8 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Extraction Complete
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Issuer Information */}
                  {invoiceData.issuer && (
                    <div className="bg-white/5 rounded-xl p-6 border border-purple-400/20">
                      <h4 className="text-lg font-semibold text-purple-300 mb-4">Issuer Information</h4>
                      <div className="space-y-2">
                        {invoiceData.issuer.name && (
                          <p className="text-white"><span className="text-purple-200">Name:</span> {invoiceData.issuer.name}</p>
                        )}
                        {invoiceData.issuer.tax_id && (
                          <p className="text-white"><span className="text-purple-200">Tax ID:</span> {invoiceData.issuer.tax_id}</p>
                        )}
                        {invoiceData.issuer.address && (
                          <p className="text-white"><span className="text-purple-200">Address:</span> {invoiceData.issuer.address}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Receiver Information */}
                  {invoiceData.receiver && (
                    <div className="bg-white/5 rounded-xl p-6 border border-purple-400/20">
                      <h4 className="text-lg font-semibold text-purple-300 mb-4">Receiver Information</h4>
                      <div className="space-y-2">
                        {invoiceData.receiver.name && (
                          <p className="text-white"><span className="text-purple-200">Name:</span> {invoiceData.receiver.name}</p>
                        )}
                        {invoiceData.receiver.tax_id && (
                          <p className="text-white"><span className="text-purple-200">Tax ID:</span> {invoiceData.receiver.tax_id}</p>
                        )}
                        {invoiceData.receiver.address && (
                          <p className="text-white"><span className="text-purple-200">Address:</span> {invoiceData.receiver.address}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Invoice Details */}
                  <div className="bg-white/5 rounded-xl p-6 border border-purple-400/20">
                    <h4 className="text-lg font-semibold text-purple-300 mb-4">Invoice Details</h4>
                    <div className="space-y-2">
                      {invoiceData.invoice_number && (
                        <p className="text-white"><span className="text-purple-200">Number:</span> {invoiceData.invoice_number}</p>
                      )}
                      {invoiceData.date && (
                        <p className="text-white"><span className="text-purple-200">Date:</span> {invoiceData.date}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Financial Summary */}
                  <div className="bg-white/5 rounded-xl p-6 border border-purple-400/20">
                    <h4 className="text-lg font-semibold text-purple-300 mb-4">Financial Summary</h4>
                    <div className="space-y-2">
                      {invoiceData.subtotal && (
                        <p className="text-white"><span className="text-purple-200">Subtotal:</span> {invoiceData.subtotal}</p>
                      )}
                      {invoiceData.tax && (
                        <p className="text-white"><span className="text-purple-200">Tax:</span> {invoiceData.tax}</p>
                      )}
                      {invoiceData.total && (
                        <p className="text-2xl font-bold text-white mt-4"><span className="text-purple-200">Total:</span> {invoiceData.total}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Line Items */}
                {invoiceData.line_items && invoiceData.line_items.length > 0 && (
                  <div className="mt-6 bg-white/5 rounded-xl p-6 border border-purple-400/20">
                    <h4 className="text-lg font-semibold text-purple-300 mb-4">Line Items</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-purple-400/20">
                            <th className="text-left text-purple-200 pb-2">Description</th>
                            <th className="text-right text-purple-200 pb-2">Quantity</th>
                            <th className="text-right text-purple-200 pb-2">Price</th>
                            <th className="text-right text-purple-200 pb-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceData.line_items.map((item, index) => (
                            <tr key={index} className="border-b border-purple-400/10">
                              <td className="text-white py-2">{item.description}</td>
                              <td className="text-white py-2 text-right">{item.quantity}</td>
                              <td className="text-white py-2 text-right">{item.unit_price}</td>
                              <td className="text-white py-2 text-right">{item.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-purple-400/20 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Advanced OCR</h3>
              <p className="text-purple-200">Tesseract-powered optical character recognition extracts text from PDFs with high accuracy</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-purple-400/20 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">NLP Intelligence</h3>
              <p className="text-purple-200">spaCy-powered natural language processing identifies entities and relationships automatically</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-purple-400/20 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Validation & Confidence</h3>
              <p className="text-purple-200">Cross-validation of financial calculations with confidence scoring for quality assurance</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-purple-400/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <p className="text-purple-200 text-sm">
                © 2025 Invoice AI Processor. Advanced document processing technology.
              </p>
              <p className="text-purple-300 text-xs mt-1">
                Built with FastAPI, React, spaCy, and Tesseract OCR
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <a href="https://invoice-ai-processor-production.up.railway.app/docs" target="_blank" rel="noopener noreferrer" className="text-purple-200 hover:text-white transition-colors text-sm">
                API Documentation
              </a>
              <a href="https://github.com/egtimer/-invoice-ai-processor" target="_blank" rel="noopener noreferrer" className="text-purple-200 hover:text-white transition-colors text-sm">
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App