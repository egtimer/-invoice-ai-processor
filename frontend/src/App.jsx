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
      
      const uploadResponse = await uploadInvoice(file)
      const invoiceId = uploadResponse.invoice_id
      setUploadProgress(50)
      
      await startProcessing(invoiceId)
      setUploadProgress(70)
      
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

  const resetApp = () => {
    setFile(null)
    setInvoiceData(null)
    setError(null)
    setUploadProgress(0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700">
      {/* Header con gradiente vibrante */}
      <header className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-xl p-3 shadow-lg transform hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Invoice AI Processor</h1>
                <p className="text-blue-100">Intelligent Document Processing</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <a 
                href="https://invoice-ai-processor-production.up.railway.app/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
              >
                API Docs
              </a>
              <a 
                href="https://github.com/egtimer/-invoice-ai-processor" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors shadow-lg"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Sección principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero section con colores vibrantes */}
        <div className="text-center mb-12">
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-lg">
            Extract Invoice Data
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-blue-400">
              Instantly with AI
            </span>
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            🚀 Powered by advanced OCR and NLP • ⚡ Fast and accurate • 🎯 Enterprise-grade quality
          </p>
        </div>

        {/* Área de upload súper colorida */}
        {!invoiceData ? (
          <div className="max-w-3xl mx-auto mb-12">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-3xl p-12 border-4 border-dashed transition-all duration-300 transform ${
                isDragging
                  ? 'border-yellow-400 bg-yellow-500 bg-opacity-20 scale-105 shadow-2xl'
                  : 'border-blue-300 bg-white bg-opacity-10 hover:bg-opacity-20 hover:scale-102'
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
                {/* Ícono grande y colorido */}
                <div className="mb-8">
                  <div className={`w-32 h-32 mx-auto bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl transform transition-all duration-300 ${
                    isDragging ? 'scale-110 rotate-12' : 'hover:scale-105'
                  }`}>
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-3">
                  {isProcessing ? '🔄 Processing Your Invoice...' : '📄 Upload Your Invoice'}
                </h3>
                <p className="text-xl text-blue-100 mb-6">
                  {isDragging ? '📥 Drop it here!' : 'Drag & drop your PDF or click to browse'}
                </p>
                
                {file && !isProcessing && (
                  <div className="bg-green-500 rounded-xl p-4 mb-6 inline-block shadow-lg">
                    <p className="text-white font-bold text-lg">✅ {file.name}</p>
                  </div>
                )}
                
                {isProcessing && (
                  <div className="mt-8">
                    <div className="bg-gray-700 rounded-full h-4 mb-3 overflow-hidden shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 h-full transition-all duration-500 ease-out shadow-lg"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-white font-semibold">⏳ Processing... {uploadProgress}%</p>
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-500 rounded-xl p-4 mt-6 shadow-lg">
                    <p className="text-white font-bold">❌ {error}</p>
                  </div>
                )}
                
                <p className="text-blue-200 mt-6">
                  📊 Maximum: 10MB • 📑 Format: PDF only
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Resultados con colores vibrantes
          <div className="max-w-5xl mx-auto mb-12">
            <div className="bg-white rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 flex items-center">
                  ✅ Extraction Complete!
                </h3>
                <button
                  onClick={resetApp}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg transform hover:scale-105"
                >
                  🔄 Process Another
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {invoiceData.issuer && (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
                    <h4 className="text-2xl font-bold text-blue-800 mb-4 flex items-center">
                      🏢 Issuer
                    </h4>
                    <div className="space-y-2 text-gray-700">
                      {invoiceData.issuer.name && (
                        <p><span className="font-semibold">Name:</span> {invoiceData.issuer.name}</p>
                      )}
                      {invoiceData.issuer.tax_id && (
                        <p><span className="font-semibold">Tax ID:</span> {invoiceData.issuer.tax_id}</p>
                      )}
                      {invoiceData.issuer.address && (
                        <p><span className="font-semibold">Address:</span> {invoiceData.issuer.address}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {invoiceData.receiver && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 shadow-lg">
                    <h4 className="text-2xl font-bold text-green-800 mb-4 flex items-center">
                      👤 Receiver
                    </h4>
                    <div className="space-y-2 text-gray-700">
                      {invoiceData.receiver.name && (
                        <p><span className="font-semibold">Name:</span> {invoiceData.receiver.name}</p>
                      )}
                      {invoiceData.receiver.tax_id && (
                        <p><span className="font-semibold">Tax ID:</span> {invoiceData.receiver.tax_id}</p>
                      )}
                      {invoiceData.receiver.address && (
                        <p><span className="font-semibold">Address:</span> {invoiceData.receiver.address}</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-yellow-200 shadow-lg">
                  <h4 className="text-2xl font-bold text-orange-800 mb-4 flex items-center">
                    📋 Details
                  </h4>
                  <div className="space-y-2 text-gray-700">
                    {invoiceData.invoice_number && (
                      <p><span className="font-semibold">Number:</span> {invoiceData.invoice_number}</p>
                    )}
                    {invoiceData.date && (
                      <p><span className="font-semibold">Date:</span> {invoiceData.date}</p>
                    )}
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 border-2 border-pink-200 shadow-lg">
                  <h4 className="text-2xl font-bold text-pink-800 mb-4 flex items-center">
                    💰 Financial
                  </h4>
                  <div className="space-y-2 text-gray-700">
                    {invoiceData.subtotal && (
                      <p><span className="font-semibold">Subtotal:</span> {invoiceData.subtotal}</p>
                    )}
                    {invoiceData.tax && (
                      <p><span className="font-semibold">Tax:</span> {invoiceData.tax}</p>
                    )}
                    {invoiceData.total && (
                      <p className="text-2xl font-bold text-pink-600 mt-3 pt-3 border-t-2 border-pink-200">
                        Total: {invoiceData.total}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {invoiceData.line_items && invoiceData.line_items.length > 0 && (
                <div className="mt-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg">
                  <h4 className="text-2xl font-bold text-indigo-800 mb-4">📦 Line Items</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-indigo-200">
                          <th className="text-left text-indigo-700 pb-3 font-bold">Description</th>
                          <th className="text-right text-indigo-700 pb-3 font-bold">Qty</th>
                          <th className="text-right text-indigo-700 pb-3 font-bold">Price</th>
                          <th className="text-right text-indigo-700 pb-3 font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceData.line_items.map((item, index) => (
                          <tr key={index} className="border-b border-indigo-100">
                            <td className="py-3 text-gray-700">{item.description}</td>
                            <td className="py-3 text-right text-gray-700">{item.quantity}</td>
                            <td className="py-3 text-right text-gray-700">{item.unit_price}</td>
                            <td className="py-3 text-right font-semibold text-gray-900">{item.total}</td>
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

        {/* Tarjetas de características con colores vibrantes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all">
            <div className="text-6xl mb-4">👁️</div>
            <h3 className="text-2xl font-bold text-white mb-3">Advanced OCR</h3>
            <p className="text-blue-50">Tesseract-powered optical character recognition extracts text from PDFs with exceptional accuracy</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all">
            <div className="text-6xl mb-4">🧠</div>
            <h3 className="text-2xl font-bold text-white mb-3">NLP Intelligence</h3>
            <p className="text-purple-50">spaCy-powered natural language processing identifies entities and relationships automatically</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-white mb-3">Smart Validation</h3>
            <p className="text-green-50">Cross-validation of financial calculations with confidence scoring for quality assurance</p>
          </div>
        </div>
      </main>

      {/* Footer vibrante */}
      <footer className="bg-gradient-to-r from-gray-900 to-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <p className="text-gray-300 font-semibold">
                © 2025 Invoice AI Processor
              </p>
              <p className="text-gray-400 text-sm">
                Built with FastAPI • React • spaCy • Tesseract OCR
              </p>
            </div>
            <div className="flex space-x-4">
              <a 
                href="https://invoice-ai-processor-production.up.railway.app/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                API Documentation
              </a>
              <a 
                href="https://github.com/egtimer/-invoice-ai-processor" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 font-semibold"
              >
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