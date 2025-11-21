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
    <div className="bg-app">
      {/* Professional header with gradient and theme toggle */}
      <header className="bg-header shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Logo and title */}
            <div className="flex items-center space-x-4">
              <div className="text-5xl">📄</div>
              <div>
                <h1 className="text-3xl font-bold text-white">Invoice AI Processor</h1>
                <p className="text-blue-100 text-sm">Intelligent Document Processing</p>
              </div>
            </div>

            {/* Navigation and theme toggle */}
            <div className="flex items-center space-x-3">
              {/* Theme toggle button with professional design */}
              <button
                onClick={toggleTheme}
                className="theme-toggle px-4 py-2 rounded-lg font-medium text-white flex items-center space-x-2 shadow-lg"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                <span className="text-2xl">{theme === 'light' ? '🌙' : '☀️'}</span>
                <span className="hidden sm:inline text-sm">{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>

              {/* API Docs link */}
              <a 
                href="https://invoice-ai-processor-production.up.railway.app/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition-all shadow-lg text-sm"
              >
                📚 <span className="hidden sm:inline">API Docs</span>
              </a>

              {/* GitHub link */}
              <a 
                href="https://github.com/egtimer/-invoice-ai-processor" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-all shadow-lg text-sm"
              >
                💻 <span className="hidden sm:inline">GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero section with clear value proposition */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-extrabold text-primary mb-4">
            Extract Invoice Data
            <span className="block text-gradient mt-2">
              Instantly with AI
            </span>
          </h2>
          <p className="text-xl text-secondary max-w-3xl mx-auto leading-relaxed">
            🚀 Powered by advanced OCR and NLP • ⚡ Fast and accurate • 🎯 Enterprise-grade quality
          </p>
        </div>

        {/* Upload section - prominent and inviting */}
        {!invoiceData ? (
          <div className="max-w-3xl mx-auto mb-16">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-2xl p-16 border-3 border-dashed transition-all duration-300 ${
                isDragging
                  ? 'bg-upload-drag scale-105 shadow-2xl'
                  : 'bg-upload hover:scale-102 shadow-xl'
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
                {/* Large, expressive icon */}
                <div className={`text-9xl mb-8 transition-transform duration-300 ${
                  isDragging ? 'scale-110' : 'hover:scale-105'
                }`}>
                  {isProcessing ? '⏳' : isDragging ? '📥' : '☁️'}
                </div>
                
                {/* Clear, actionable heading */}
                <h3 className="text-3xl font-bold text-primary mb-3">
                  {isProcessing ? '🔄 Processing Your Invoice...' : 
                   isDragging ? '📥 Drop it here!' : 
                   '📄 Upload Your Invoice'}
                </h3>
                
                {/* Instructional text */}
                <p className="text-lg text-secondary mb-6">
                  {isDragging ? 'Release to upload!' : 'Drag & drop your PDF or click to browse'}
                </p>
                
                {/* File selected indicator */}
                {file && !isProcessing && (
                  <div className="bg-green-500 rounded-xl p-4 mb-6 inline-block shadow-lg animate-fadeIn">
                    <p className="text-white font-bold text-lg">✅ {file.name}</p>
                  </div>
                )}
                
                {/* Progress bar during processing */}
                {isProcessing && (
                  <div className="mt-8">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
                      <div 
                        className="progress-bar h-full transition-all duration-500 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-primary font-semibold text-base">
                      ⏳ Processing... {uploadProgress}%
                    </p>
                  </div>
                )}
                
                {/* Error message */}
                {error && (
                  <div className="bg-red-500 rounded-xl p-4 mt-6 shadow-lg animate-fadeIn">
                    <p className="text-white font-bold">❌ {error}</p>
                  </div>
                )}
                
                {/* File requirements */}
                <p className="text-light mt-6 text-sm">
                  📊 Maximum: 10MB • 📑 Format: PDF only
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Results section - clear and organized */
          <div className="max-w-5xl mx-auto mb-16 animate-fadeIn">
            <div className="result-card rounded-2xl p-8 shadow-2xl">
              {/* Results header with action button */}
              <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <h3 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                  ✅ Extraction Complete!
                </h3>
                <button
                  onClick={resetApp}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all transform hover:scale-105"
                >
                  🔄 Process Another
                </button>
              </div>
              
              {/* Data cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Issuer information card */}
                {invoiceData.issuer && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 shadow-md">
                    <h4 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
                      <span className="mr-2">🏢</span>
                      Issuer Information
                    </h4>
                    <div className="space-y-3 text-gray-700 dark:text-gray-200">
                      {invoiceData.issuer.name && (
                        <p><span className="font-semibold text-gray-900 dark:text-white">Name:</span> {invoiceData.issuer.name}</p>
                      )}
                      {invoiceData.issuer.tax_id && (
                        <p><span className="font-semibold text-gray-900 dark:text-white">Tax ID:</span> {invoiceData.issuer.tax_id}</p>
                      )}
                      {invoiceData.issuer.address && (
                        <p><span className="font-semibold text-gray-900 dark:text-white">Address:</span> {invoiceData.issuer.address}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Receiver information card */}
                {invoiceData.receiver && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800 shadow-md">
                    <h4 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-4 flex items-center">
                      <span className="mr-2">👤</span>
                      Receiver Information
                    </h4>
                    <div className="space-y-3 text-gray-700 dark:text-gray-200">
                      {invoiceData.receiver.name && (
                        <p><span className="font-semibold text-gray-900 dark:text-white">Name:</span> {invoiceData.receiver.name}</p>
                      )}
                      {invoiceData.receiver.tax_id && (
                        <p><span className="font-semibold text-gray-900 dark:text-white">Tax ID:</span> {invoiceData.receiver.tax_id}</p>
                      )}
                      {invoiceData.receiver.address && (
                        <p><span className="font-semibold text-gray-900 dark:text-white">Address:</span> {invoiceData.receiver.address}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Invoice details card */}
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800 shadow-md">
                  <h4 className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mb-4 flex items-center">
                    <span className="mr-2">📋</span>
                    Invoice Details
                  </h4>
                  <div className="space-y-3 text-gray-700 dark:text-gray-200">
                    {invoiceData.invoice_number && (
                      <p><span className="font-semibold text-gray-900 dark:text-white">Number:</span> {invoiceData.invoice_number}</p>
                    )}
                    {invoiceData.date && (
                      <p><span className="font-semibold text-gray-900 dark:text-white">Date:</span> {invoiceData.date}</p>
                    )}
                  </div>
                </div>
                
                {/* Financial summary card */}
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl p-6 border border-pink-200 dark:border-pink-800 shadow-md">
                  <h4 className="text-2xl font-bold text-pink-900 dark:text-pink-100 mb-4 flex items-center">
                    <span className="mr-2">💰</span>
                    Financial Summary
                  </h4>
                  <div className="space-y-3 text-gray-700 dark:text-gray-200">
                    {invoiceData.subtotal && (
                      <p><span className="font-semibold text-gray-900 dark:text-white">Subtotal:</span> {invoiceData.subtotal}</p>
                    )}
                    {invoiceData.tax && (
                      <p><span className="font-semibold text-gray-900 dark:text-white">Tax:</span> {invoiceData.tax}</p>
                    )}
                    {invoiceData.total && (
                      <p className="text-2xl font-bold text-pink-700 dark:text-pink-300 mt-4 pt-4 border-t-2 border-pink-200 dark:border-pink-700">
                        <span className="font-semibold">Total:</span> {invoiceData.total}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Line items table */}
              {invoiceData.line_items && invoiceData.line_items.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800 shadow-md">
                  <h4 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center">
                    <span className="mr-2">📦</span>
                    Line Items
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-indigo-200 dark:border-indigo-700">
                          <th className="text-left text-indigo-900 dark:text-indigo-100 pb-3 font-bold">Description</th>
                          <th className="text-right text-indigo-900 dark:text-indigo-100 pb-3 font-bold">Qty</th>
                          <th className="text-right text-indigo-900 dark:text-indigo-100 pb-3 font-bold">Price</th>
                          <th className="text-right text-indigo-900 dark:text-indigo-100 pb-3 font-bold">Total</th>
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

        {/* Feature cards - vibrant and eye-catching */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="feature-card-blue rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <div className="text-7xl mb-4">👁️</div>
            <h3 className="text-2xl font-bold text-white mb-3">Advanced OCR</h3>
            <p className="text-blue-50 text-base leading-relaxed">
              Tesseract-powered optical character recognition extracts text from PDFs with exceptional accuracy
            </p>
          </div>
          
          <div className="feature-card-purple rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <div className="text-7xl mb-4">🧠</div>
            <h3 className="text-2xl font-bold text-white mb-3">NLP Intelligence</h3>
            <p className="text-purple-50 text-base leading-relaxed">
              spaCy-powered natural language processing identifies entities and relationships automatically
            </p>
          </div>
          
          <div className="feature-card-green rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <div className="text-7xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-white mb-3">Smart Validation</h3>
            <p className="text-green-50 text-base leading-relaxed">
              Cross-validation of financial calculations with confidence scoring for quality assurance
            </p>
          </div>
        </div>
      </main>

      {/* Professional footer */}
      <footer className="bg-gray-50 dark:bg-gray-900/50 mt-20 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-gray-900 dark:text-gray-100 font-semibold">
                © 2025 Invoice AI Processor
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Built with FastAPI • React • spaCy • Tesseract OCR
              </p>
            </div>
            <div className="flex space-x-6">
              <a 
                href="https://invoice-ai-processor-production.up.railway.app/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
              >
                📚 API Documentation
              </a>
              <a 
                href="https://github.com/egtimer/-invoice-ai-processor" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
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