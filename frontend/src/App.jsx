import { useState } from 'react'
import { uploadInvoice, startProcessing, getProcessingStatus } from './services/api'
import { useThemeContext } from './contexts/ThemeContext'

function App() {
  const { theme, toggleTheme } = useThemeContext()
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
    <div className="bg-gradient-app">
      {/* Header con gradiente vibrante */}
      <header className="bg-gradient-header shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="text-5xl">📄</div>
              <div>
                <h1 className="text-3xl font-bold text-white">Invoice AI Processor</h1>
                <p className="text-blue-100">Intelligent Document Processing</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Theme toggle button */}
              <button
                onClick={toggleTheme}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-lg backdrop-blur-sm flex items-center space-x-2"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                <span className="text-2xl">{theme === 'light' ? '🌙' : '☀️'}</span>
                <span className="hidden sm:inline">{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>
              <a 
                href="https://invoice-ai-processor-production.up.railway.app/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
              >
                📚 API Docs
              </a>
              <a 
                href="https://github.com/egtimer/-invoice-ai-processor" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors shadow-lg"
              >
                💻 GitHub
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Sección principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero section */}
        <div className="text-center mb-12">
          <h2 className="text-5xl md:text-6xl font-extrabold text-theme-primary mb-4 drop-shadow-lg">
            Extract Invoice Data
            <span className="block text-gradient mt-2">
              Instantly with AI
            </span>
          </h2>
          <p className="text-xl text-theme-secondary max-w-3xl mx-auto">
            🚀 Powered by advanced OCR and NLP • ⚡ Fast and accurate • 🎯 Enterprise-grade quality
          </p>
        </div>

        {/* Área de upload */}
        {!invoiceData ? (
          <div className="max-w-3xl mx-auto mb-12">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-3xl p-12 border-4 border-dashed transition-all duration-300 transform ${
                isDragging
                  ? 'border-yellow-400 bg-gradient-upload-drag scale-105 shadow-2xl'
                  : 'border-blue-300 bg-gradient-upload hover:bg-gradient-upload-hover hover:scale-102'
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
                <div className={`text-9xl mb-6 transition-all duration-300 ${
                  isDragging ? 'scale-110' : 'hover:scale-105'
                }`}>
                  {isProcessing ? '⏳' : isDragging ? '📥' : '☁️'}
                </div>
                
                <h3 className="text-3xl font-bold text-theme-primary mb-3">
                  {isProcessing ? '🔄 Processing Your Invoice...' : isDragging ? '📥 Drop it here!' : '📄 Upload Your Invoice'}
                </h3>
                <p className="text-xl text-theme-secondary mb-6">
                  {isDragging ? 'Release to upload!' : 'Drag & drop your PDF or click to browse'}
                </p>
                
                {file && !isProcessing && (
                  <div className="bg-green-500 rounded-xl p-4 mb-6 inline-block shadow-lg">
                    <p className="text-white font-bold text-lg">✅ {file.name}</p>
                  </div>
                )}
                
                {isProcessing && (
                  <div className="mt-8">
                    <div className="bg-gray-300 dark:bg-gray-700 rounded-full h-4 mb-3 overflow-hidden shadow-inner">
                      <div 
                        className="progress-bar h-full transition-all duration-500 ease-out shadow-lg"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-theme-primary font-semibold text-lg">⏳ Processing... {uploadProgress}%</p>
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-500 rounded-xl p-4 mt-6 shadow-lg">
                    <p className="text-white font-bold">❌ {error}</p>
                  </div>
                )}
                
                <p className="text-theme-light mt-6 text-lg">
                  📊 Maximum: 10MB • 📑 Format: PDF only
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto mb-12">
            <div className="results-card rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <h3 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
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
                  <div className="card-blue rounded-2xl p-6 shadow-lg">
                    <h4 className="text-2xl font-bold text-blue-800 dark:text-blue-300 mb-4">
                      🏢 Issuer Information
                    </h4>
                    <div className="space-y-2 text-gray-700 dark:text-gray-200">
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
                  <div className="card-green rounded-2xl p-6 shadow-lg">
                    <h4 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-4">
                      👤 Receiver Information
                    </h4>
                    <div className="space-y-2 text-gray-700 dark:text-gray-200">
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
                
                <div className="card-yellow rounded-2xl p-6 shadow-lg">
                  <h4 className="text-2xl font-bold text-orange-800 dark:text-orange-300 mb-4">
                    📋 Invoice Details
                  </h4>
                  <div className="space-y-2 text-gray-700 dark:text-gray-200">
                    {invoiceData.invoice_number && (
                      <p><span className="font-semibold">Number:</span> {invoiceData.invoice_number}</p>
                    )}
                    {invoiceData.date && (
                      <p><span className="font-semibold">Date:</span> {invoiceData.date}</p>
                    )}
                  </div>
                </div>
                
                <div className="card-pink rounded-2xl p-6 shadow-lg">
                  <h4 className="text-2xl font-bold text-pink-800 dark:text-pink-300 mb-4">
                    💰 Financial Summary
                  </h4>
                  <div className="space-y-2 text-gray-700 dark:text-gray-200">
                    {invoiceData.subtotal && (
                      <p><span className="font-semibold">Subtotal:</span> {invoiceData.subtotal}</p>
                    )}
                    {invoiceData.tax && (
                      <p><span className="font-semibold">Tax:</span> {invoiceData.tax}</p>
                    )}
                    {invoiceData.total && (
                      <p className="text-2xl font-bold text-pink-600 dark:text-pink-400 mt-3 pt-3 border-t-2 border-pink-200 dark:border-pink-700">
                        Total: {invoiceData.total}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {invoiceData.line_items && invoiceData.line_items.length > 0 && (
                <div className="mt-6 card-indigo rounded-2xl p-6 shadow-lg">
                  <h4 className="text-2xl font-bold text-indigo-800 dark:text-indigo-300 mb-4">📦 Line Items</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-indigo-200 dark:border-indigo-700">
                          <th className="text-left text-indigo-700 dark:text-indigo-300 pb-3 font-bold">Description</th>
                          <th className="text-right text-indigo-700 dark:text-indigo-300 pb-3 font-bold">Qty</th>
                          <th className="text-right text-indigo-700 dark:text-indigo-300 pb-3 font-bold">Price</th>
                          <th className="text-right text-indigo-700 dark:text-indigo-300 pb-3 font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceData.line_items.map((item, index) => (
                          <tr key={index} className="border-b border-indigo-100 dark:border-indigo-800">
                            <td className="py-3 text-gray-700 dark:text-gray-200">{item.description}</td>
                            <td className="py-3 text-right text-gray-700 dark:text-gray-200">{item.quantity}</td>
                            <td className="py-3 text-right text-gray-700 dark:text-gray-200">{item.unit_price}</td>
                            <td className="py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{item.total}</td>
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

        {/* Tarjetas de características */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="feature-card-blue rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <div className="text-7xl mb-4">👁️</div>
            <h3 className="text-2xl font-bold text-white mb-3">Advanced OCR</h3>
            <p className="text-blue-50 text-lg">Tesseract-powered optical character recognition extracts text from PDFs with exceptional accuracy</p>
          </div>
          
          <div className="feature-card-purple rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <div className="text-7xl mb-4">🧠</div>
            <h3 className="text-2xl font-bold text-white mb-3">NLP Intelligence</h3>
            <p className="text-purple-50 text-lg">spaCy-powered natural language processing identifies entities and relationships automatically</p>
          </div>
          
          <div className="feature-card-green rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <div className="text-7xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-white mb-3">Smart Validation</h3>
            <p className="text-green-50 text-lg">Cross-validation of financial calculations with confidence scoring for quality assurance</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-900 mt-16 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-gray-800 dark:text-gray-300 font-semibold text-lg">
                © 2025 Invoice AI Processor
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Built with FastAPI • React • spaCy • Tesseract OCR
              </p>
            </div>
            <div className="flex space-x-6">
              <a 
                href="https://invoice-ai-processor-production.up.railway.app/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-semibold transition-colors"
              >
                📚 API Documentation
              </a>
              <a 
                href="https://github.com/egtimer/-invoice-ai-processor" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 font-semibold transition-colors"
              >
                💻 View on GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App