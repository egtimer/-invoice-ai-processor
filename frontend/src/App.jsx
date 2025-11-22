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

  // Dynamic styles based on theme
  const styles = {
    bg: theme === 'dark' ? 'bg-[#0a0a0f]' : 'bg-white',
    bgSecondary: theme === 'dark' ? 'bg-[#12121a]' : 'bg-gray-50',
    bgCard: theme === 'dark' ? 'bg-[#1a1a24]' : 'bg-white',
    bgCardHover: theme === 'dark' ? 'hover:bg-[#22222e]' : 'hover:bg-gray-50',
    bgInput: theme === 'dark' ? 'bg-[#16161e]' : 'bg-gray-50',
    textPrimary: theme === 'dark' ? 'text-white' : 'text-gray-900',
    textSecondary: theme === 'dark' ? 'text-[#a0a0a8]' : 'text-gray-600',
    textMuted: theme === 'dark' ? 'text-[#6b6b74]' : 'text-gray-400',
    border: theme === 'dark' ? 'border-[#2a2a36]' : 'border-gray-200',
    borderLight: theme === 'dark' ? 'border-[#3a3a46]' : 'border-gray-300',
  }

  return (
    <div className={`min-h-screen ${styles.bg} transition-colors duration-300`}>
      {/* Header - Minimal and clean */}
      <header className={`${styles.bg} border-b ${styles.border} transition-colors duration-300`}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center`}>
                <span className="text-white text-xs font-bold">AI</span>
              </div>
              <span className={`text-lg font-semibold ${styles.textPrimary}`}>Invoice AI Processor</span>
            </div>

            {/* Right side - Theme toggle and menu */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${styles.bgCard} ${styles.border} border ${styles.bgCardHover} transition-all`}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </button>

              {/* API Docs Link */}
              <a
                href="https://invoice-ai-processor-production.up.railway.app/docs"
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 rounded-lg ${styles.bgCard} ${styles.border} border ${styles.bgCardHover} transition-all`}
                title="API Documentation"
              >
                <svg className={`w-5 h-5 ${styles.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </a>

              {/* GitHub Link */}
              <a
                href="https://github.com/egtimer/-invoice-ai-processor"
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 rounded-lg ${styles.bgCard} ${styles.border} border ${styles.bgCardHover} transition-all`}
                title="View on GitHub"
              >
                <svg className={`w-5 h-5 ${styles.textSecondary}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-bold ${styles.textPrimary} mb-6 leading-tight`}>
            Extract invoice data
            <br />
            in seconds
          </h1>
          <p className={`text-lg ${styles.textSecondary} max-w-xl mx-auto mb-8`}>
            Process your invoices with AI to quickly extract key information
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${styles.bgCard} border ${styles.border}`}>
              <svg className={`w-4 h-4 ${styles.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className={`text-sm font-medium ${styles.textPrimary}`}>Advanced OCR</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${styles.bgCard} border ${styles.border}`}>
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              <span className={`text-sm font-medium ${styles.textPrimary}`}>Smart extraction</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${styles.bgCard} border ${styles.border}`}>
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span className={`text-sm font-medium ${styles.textPrimary}`}>Export to JSON/CSV</span>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        {!invoiceData ? (
          <div className="max-w-2xl mx-auto mb-16">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-2xl p-12 border-2 border-dashed transition-all duration-300 ${
                isDragging
                  ? `${styles.bgCard} border-blue-500 scale-[1.02]`
                  : `${styles.bgInput} ${styles.border} hover:border-blue-500/50`
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
                {/* Upload Icon */}
                <div className={`mx-auto w-12 h-12 rounded-xl ${styles.bgCard} border ${styles.border} flex items-center justify-center mb-6`}>
                  {isProcessing ? (
                    <svg className={`w-6 h-6 ${styles.textSecondary} animate-spin`} fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className={`w-6 h-6 ${styles.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  )}
                </div>
                
                <h3 className={`text-xl font-semibold ${styles.textPrimary} mb-2`}>
                  {isProcessing ? 'Processing...' : 'Upload your PDF'}
                </h3>
                <p className={`${styles.textSecondary} mb-2`}>
                  {isDragging ? 'Release to upload' : 'Drag and drop or click to upload'}
                </p>
                <p className={`text-sm ${styles.textMuted}`}>
                  PDF up to 10 MB
                </p>
                
                {/* File selected indicator */}
                {file && !isProcessing && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-400 text-sm font-medium">{file.name}</span>
                  </div>
                )}
                
                {/* Progress bar */}
                {isProcessing && (
                  <div className="mt-6">
                    <div className={`h-1.5 rounded-full ${styles.bgCard} overflow-hidden`}>
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className={`mt-2 text-sm ${styles.textSecondary}`}>Processing... {uploadProgress}%</p>
                  </div>
                )}
                
                {/* Error message */}
                {error && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Results Section */
          <div className="max-w-4xl mx-auto mb-16">
            <div className={`${styles.bgCard} rounded-2xl p-8 border ${styles.border}`}>
              {/* Results Header */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#2a2a36] dark:border-[#2a2a36]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold ${styles.textPrimary}`}>Extraction Complete</h3>
                    <p className={`text-sm ${styles.textSecondary}`}>Invoice data extracted successfully</p>
                  </div>
                </div>
                <button
                  onClick={resetApp}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                >
                  Process Another
                </button>
              </div>
              
              {/* Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Issuer */}
                {invoiceData.issuer && (
                  <div className={`p-5 rounded-xl ${styles.bgInput} border ${styles.border}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h4 className={`font-semibold ${styles.textPrimary}`}>Issuer</h4>
                    </div>
                    <div className="space-y-2">
                      {invoiceData.issuer.name && <p className={`text-sm ${styles.textSecondary}`}><span className={styles.textMuted}>Name:</span> {invoiceData.issuer.name}</p>}
                      {invoiceData.issuer.tax_id && <p className={`text-sm ${styles.textSecondary}`}><span className={styles.textMuted}>Tax ID:</span> {invoiceData.issuer.tax_id}</p>}
                      {invoiceData.issuer.address && <p className={`text-sm ${styles.textSecondary}`}><span className={styles.textMuted}>Address:</span> {invoiceData.issuer.address}</p>}
                    </div>
                  </div>
                )}
                
                {/* Receiver */}
                {invoiceData.receiver && (
                  <div className={`p-5 rounded-xl ${styles.bgInput} border ${styles.border}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h4 className={`font-semibold ${styles.textPrimary}`}>Receiver</h4>
                    </div>
                    <div className="space-y-2">
                      {invoiceData.receiver.name && <p className={`text-sm ${styles.textSecondary}`}><span className={styles.textMuted}>Name:</span> {invoiceData.receiver.name}</p>}
                      {invoiceData.receiver.tax_id && <p className={`text-sm ${styles.textSecondary}`}><span className={styles.textMuted}>Tax ID:</span> {invoiceData.receiver.tax_id}</p>}
                      {invoiceData.receiver.address && <p className={`text-sm ${styles.textSecondary}`}><span className={styles.textMuted}>Address:</span> {invoiceData.receiver.address}</p>}
                    </div>
                  </div>
                )}
                
                {/* Invoice Details */}
                <div className={`p-5 rounded-xl ${styles.bgInput} border ${styles.border}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className={`font-semibold ${styles.textPrimary}`}>Invoice Details</h4>
                  </div>
                  <div className="space-y-2">
                    {invoiceData.invoice_number && <p className={`text-sm ${styles.textSecondary}`}><span className={styles.textMuted}>Number:</span> {invoiceData.invoice_number}</p>}
                    {invoiceData.date && <p className={`text-sm ${styles.textSecondary}`}><span className={styles.textMuted}>Date:</span> {invoiceData.date}</p>}
                  </div>
                </div>
                
                {/* Financial Summary */}
                <div className={`p-5 rounded-xl ${styles.bgInput} border ${styles.border}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className={`font-semibold ${styles.textPrimary}`}>Financial Summary</h4>
                  </div>
                  <div className="space-y-2">
                    {invoiceData.subtotal && <p className={`text-sm ${styles.textSecondary}`}><span className={styles.textMuted}>Subtotal:</span> {invoiceData.subtotal}</p>}
                    {invoiceData.tax && <p className={`text-sm ${styles.textSecondary}`}><span className={styles.textMuted}>Tax:</span> {invoiceData.tax}</p>}
                    {invoiceData.total && (
                      <p className={`text-lg font-semibold ${styles.textPrimary} pt-2 mt-2 border-t ${styles.border}`}>
                        Total: {invoiceData.total}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Line Items */}
              {invoiceData.line_items && invoiceData.line_items.length > 0 && (
                <div className={`mt-6 p-5 rounded-xl ${styles.bgInput} border ${styles.border}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <h4 className={`font-semibold ${styles.textPrimary}`}>Line Items</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`border-b ${styles.border}`}>
                          <th className={`text-left pb-3 font-medium ${styles.textMuted}`}>Description</th>
                          <th className={`text-right pb-3 font-medium ${styles.textMuted}`}>Qty</th>
                          <th className={`text-right pb-3 font-medium ${styles.textMuted}`}>Price</th>
                          <th className={`text-right pb-3 font-medium ${styles.textMuted}`}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceData.line_items.map((item, index) => (
                          <tr key={index} className={`border-b ${styles.border} last:border-0`}>
                            <td className={`py-3 ${styles.textSecondary}`}>{item.description}</td>
                            <td className={`py-3 text-right ${styles.textSecondary}`}>{item.quantity}</td>
                            <td className={`py-3 text-right ${styles.textSecondary}`}>{item.unit_price}</td>
                            <td className={`py-3 text-right font-medium ${styles.textPrimary}`}>{item.total}</td>
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

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className={`p-6 rounded-2xl ${styles.bgCard} border ${styles.border}`}>
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${styles.bgInput} flex items-center justify-center`}>
                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>OCR</span>
              </div>
              <div>
                <h3 className={`font-semibold ${styles.textPrimary} mb-1`}>Advanced OCR</h3>
                <p className={`text-sm ${styles.textSecondary}`}>Accurate text extraction from invoices</p>
              </div>
            </div>
          </div>
          
          <div className={`p-6 rounded-2xl ${styles.bgCard} border ${styles.border}`}>
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${styles.bgInput} flex items-center justify-center`}>
                <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <h3 className={`font-semibold ${styles.textPrimary} mb-1`}>Smart Field Extraction</h3>
                <p className={`text-sm ${styles.textSecondary}`}>Capture invoice fields such as date and total</p>
              </div>
            </div>
          </div>
          
          <div className={`p-6 rounded-2xl ${styles.bgCard} border ${styles.border}`}>
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${styles.bgInput} flex items-center justify-center`}>
                <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h3 className={`font-semibold ${styles.textPrimary} mb-1`}>Export in Multiple Formats</h3>
                <p className={`text-sm ${styles.textSecondary}`}>Download extracted data as JSON or CSV</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`border-t ${styles.border} mt-20`}>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className={`text-sm ${styles.textMuted}`}>
              © 2025 Invoice AI Processor. Built with FastAPI, React, spaCy & Tesseract OCR.
            </p>
            <div className="flex items-center gap-6">
              <a 
                href="https://invoice-ai-processor-production.up.railway.app/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-sm ${styles.textSecondary} hover:${styles.textPrimary} transition-colors`}
              >
                API Docs
              </a>
              <a 
                href="https://github.com/egtimer/-invoice-ai-processor" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-sm ${styles.textSecondary} hover:${styles.textPrimary} transition-colors`}
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App