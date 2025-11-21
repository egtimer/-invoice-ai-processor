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
      {/* Header mejorado con botones siempre visibles */}
      <header className="bg-header shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            {/* Logo y título */}
            <div className="flex items-center space-x-3">
              <div className="text-4xl sm:text-5xl">📄</div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Invoice AI Processor</h1>
                <p className="text-blue-100 text-xs sm:text-sm">Intelligent Document Processing</p>
              </div>
            </div>

            {/* Botones de navegación y tema - siempre visibles con texto */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Botón de cambio de tema - siempre con texto visible */}
              <button
                onClick={toggleTheme}
                className="theme-toggle px-3 py-2 rounded-lg font-medium text-white flex items-center gap-2 shadow-lg text-sm"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                <span className="text-xl">{theme === 'light' ? '🌙' : '☀️'}</span>
                <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>

              {/* Botón API Docs - siempre visible */}
              <a 
                href="https://invoice-ai-processor-production.up.railway.app/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-purple-600 px-3 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition-all shadow-lg text-sm flex items-center gap-1"
              >
                <span>📚</span>
                <span>API</span>
              </a>

              {/* Botón GitHub - siempre visible */}
              <a 
                href="https://github.com/egtimer/-invoice-ai-processor" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gray-900 text-white px-3 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-all shadow-lg text-sm flex items-center gap-1"
              >
                <span>💻</span>
                <span>Code</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero section con colores que se adaptan al tema */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-primary mb-4">
            Extract Invoice Data
            <span className="block text-gradient mt-2">
              Instantly with AI
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-secondary max-w-3xl mx-auto leading-relaxed">
            🚀 Powered by advanced OCR and NLP • ⚡ Fast and accurate • 🎯 Enterprise-grade quality
          </p>
        </div>

        {/* Área de upload con emoji grande y colores que cambian con el tema */}
        {!invoiceData ? (
          <div className="max-w-3xl mx-auto mb-16">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-2xl p-12 sm:p-16 border-4 border-dashed transition-all duration-300 ${
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
                {/* Emoji grande que cambia según el estado */}
                <div className={`text-8xl sm:text-9xl mb-6 sm:mb-8 transition-transform duration-300 ${
                  isDragging ? 'scale-110' : 'hover:scale-105'
                }`}>
                  {isProcessing ? '⏳' : isDragging ? '📥' : '☁️'}
                </div>
                
                {/* Título con color que se adapta al tema */}
                <h3 className="text-2xl sm:text-3xl font-bold text-primary mb-3">
                  {isProcessing ? '🔄 Processing Your Invoice...' : 
                   isDragging ? '📥 Drop it here!' : 
                   '📄 Upload Your Invoice'}
                </h3>
                
                {/* Texto instructivo con color que se adapta */}
                <p className="text-base sm:text-lg text-secondary mb-6">
                  {isDragging ? 'Release to upload!' : 'Drag & drop your PDF or click to browse'}
                </p>
                
                {/* Indicador de archivo seleccionado */}
                {file && !isProcessing && (
                  <div className="bg-green-500 rounded-xl p-4 mb-6 inline-block shadow-lg">
                    <p className="text-white font-bold text-base sm:text-lg">✅ {file.name}</p>
                  </div>
                )}
                
                {/* Barra de progreso durante procesamiento */}
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
                
                {/* Mensaje de error */}
                {error && (
                  <div className="bg-red-500 rounded-xl p-4 mt-6 shadow-lg">
                    <p className="text-white font-bold text-sm sm:text-base">❌ {error}</p>
                  </div>
                )}
                
                {/* Requisitos del archivo con color adaptable */}
                <p className="text-light mt-6 text-sm">
                  📊 Maximum: 10MB • 📑 Format: PDF only
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto mb-16">
            <div className="result-card rounded-2xl p-6 sm:p-8 shadow-2xl">
              {/* Encabezado de resultados */}
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <h3 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                  ✅ Extraction Complete!
                </h3>
                <button
                  onClick={resetApp}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all transform hover:scale-105 w-full sm:w-auto"
                >
                  🔄 Process Another
                </button>
              </div>
              
              {/* Grid de tarjetas de información */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Tarjeta de información del emisor */}
                {invoiceData.issuer && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 shadow-md">
                    <h4 className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                      <span>🏢</span>
                      <span>Issuer Information</span>
                    </h4>
                    <div className="space-y-3 text-sm sm:text-base text-gray-700 dark:text-gray-200">
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
                
                {/* Tarjeta de información del receptor */}
                {invoiceData.receiver && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800 shadow-md">
                    <h4 className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100 mb-4 flex items-center gap-2">
                      <span>👤</span>
                      <span>Receiver Information</span>
                    </h4>
                    <div className="space-y-3 text-sm sm:text-base text-gray-700 dark:text-gray-200">
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
                
                {/* Tarjeta de detalles de la factura */}
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800 shadow-md">
                  <h4 className="text-xl sm:text-2xl font-bold text-yellow-900 dark:text-yellow-100 mb-4 flex items-center gap-2">
                    <span>📋</span>
                    <span>Invoice Details</span>
                  </h4>
                  <div className="space-y-3 text-sm sm:text-base text-gray-700 dark:text-gray-200">
                    {invoiceData.invoice_number && (
                      <p><span className="font-semibold text-gray-900 dark:text-white">Number:</span> {invoiceData.invoice_number}</p>
                    )}
                    {invoiceData.date && (
                      <p><span className="font-semibold text-gray-900 dark:text-white">Date:</span> {invoiceData.date}</p>
                    )}
                  </div>
                </div>
                
                {/* Tarjeta de resumen financiero */}
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl p-6 border border-pink-200 dark:border-pink-800 shadow-md">
                  <h4 className="text-xl sm:text-2xl font-bold text-pink-900 dark:text-pink-100 mb-4 flex items-center gap-2">
                    <span>💰</span>
                    <span>Financial Summary</span>
                  </h4>
                  <div className="space-y-3 text-sm sm:text-base text-gray-700 dark:text-gray-200">
                    {invoiceData.subtotal && (
                      <p><span className="font-semibold text-gray-900 dark:text-white">Subtotal:</span> {invoiceData.subtotal}</p>
                    )}
                    {invoiceData.tax && (
                      <p><span className="font-semibold text-gray-900 dark:text-white">Tax:</span> {invoiceData.tax}</p>
                    )}
                    {invoiceData.total && (
                      <p className="text-xl sm:text-2xl font-bold text-pink-700 dark:text-pink-300 mt-4 pt-4 border-t-2 border-pink-200 dark:border-pink-700">
                        <span className="font-semibold">Total:</span> {invoiceData.total}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Tabla de artículos de línea */}
              {invoiceData.line_items && invoiceData.line_items.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800 shadow-md">
                  <h4 className="text-xl sm:text-2xl font-bold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center gap-2">
                    <span>📦</span>
                    <span>Line Items</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm sm:text-base">
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

        {/* Tarjetas de características - mantienen gradientes vibrantes en ambos temas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-16">
          <div className="feature-card-blue rounded-3xl p-6 sm:p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <div className="text-6xl sm:text-7xl mb-4">👁️</div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">Advanced OCR</h3>
            <p className="text-blue-50 text-sm sm:text-base leading-relaxed">
              Tesseract-powered optical character recognition extracts text from PDFs with exceptional accuracy
            </p>
          </div>
          
          <div className="feature-card-purple rounded-3xl p-6 sm:p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <div className="text-6xl sm:text-7xl mb-4">🧠</div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">NLP Intelligence</h3>
            <p className="text-purple-50 text-sm sm:text-base leading-relaxed">
              spaCy-powered natural language processing identifies entities and relationships automatically
            </p>
          </div>
          
          <div className="feature-card-green rounded-3xl p-6 sm:p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
            <div className="text-6xl sm:text-7xl mb-4">✅</div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">Smart Validation</h3>
            <p className="text-green-50 text-sm sm:text-base leading-relaxed">
              Cross-validation of financial calculations with confidence scoring for quality assurance
            </p>
          </div>
        </div>
      </main>

      {/* Footer profesional */}
      <footer className="bg-gray-50 dark:bg-gray-900/50 mt-20 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm sm:text-base">
                © 2025 Invoice AI Processor
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1">
                Built with FastAPI • React • spaCy • Tesseract OCR
              </p>
            </div>
            <div className="flex gap-4 sm:gap-6">
              <a 
                href="https://invoice-ai-processor-production.up.railway.app/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors text-sm"
              >
                📚 API Documentation
              </a>
              <a 
                href="https://github.com/egtimer/-invoice-ai-processor" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors text-sm"
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