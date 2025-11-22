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

  const isDark = theme === 'dark'

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
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0a0f]' : 'bg-white'}`}>
      {/* Header */}
      <header className={`border-b ${isDark ? 'border-[#2a2a36] bg-[#0a0a0f]' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${isDark ? 'bg-[#1a1a24] text-[#6b6b74]' : 'bg-gray-100 text-gray-500'}`}>
              AI
            </div>
            <span className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Invoice AI Processor
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* User icon - simple outline style like reference */}
            <button
              className={`p-2 transition-all hover:opacity-70 ${isDark ? 'text-[#6b6b74]' : 'text-gray-400'}`}
              title="User profile"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
              </svg>
            </button>
            {/* Hamburger menu - simple lines like reference */}
            <button
              className={`p-2 transition-all hover:opacity-70 ${isDark ? 'text-[#6b6b74]' : 'text-gray-400'}`}
              title="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className={`text-5xl md:text-6xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Extract invoice data<br />in seconds
          </h1>
          <p className={`text-lg mb-8 ${isDark ? 'text-[#a0a0a8]' : 'text-gray-600'}`}>
            Process your invoices with AI to quickly extract key information
          </p>
          
          {/* Pills */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all duration-300 cursor-pointer ${
              isDark ? 'bg-[#1a1a24] hover:bg-[#1f1f2a]' : 'bg-gray-100 hover:bg-gray-200'
            } hover:scale-105`}>
              <span style={{fontSize: '14px'}}>👁️</span>
              <span className={`font-medium whitespace-nowrap ${isDark ? 'text-white' : 'text-gray-900'}`}>Advanced OCR</span>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all duration-300 cursor-pointer ${
              isDark ? 'bg-[#1a1a24] hover:bg-[#1f1f2a]' : 'bg-gray-100 hover:bg-gray-200'
            } hover:scale-105`}>
              <span style={{fontSize: '14px'}} className="animate-pulse">⚡</span>
              <span className={`font-medium whitespace-nowrap ${isDark ? 'text-white' : 'text-gray-900'}`}>Smart extraction</span>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all duration-300 cursor-pointer ${
              isDark ? 'bg-[#1a1a24] hover:bg-[#1f1f2a]' : 'bg-gray-100 hover:bg-gray-200'
            } hover:scale-105`}>
              <span style={{fontSize: '14px'}}>✨</span>
              <span className={`font-medium whitespace-nowrap ${isDark ? 'text-white' : 'text-gray-900'}`}>Export to JSON/CSV</span>
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
                  ? 'border-blue-500 bg-blue-500/5 scale-[1.02] shadow-lg shadow-blue-500/20'
                  : isDark ? 'border-[#2a2a36] bg-[#16161e] hover:border-[#3a3a46]' : 'border-gray-300 bg-gray-50 hover:border-gray-400'
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
                <div className={`mx-auto w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all ${
                  isDark ? 'bg-[#1a1a24]' : 'bg-gray-100'
                } ${!isProcessing && 'hover:scale-110'}`}>
                  {isProcessing ? (
                    <span className="text-2xl animate-spin">⏳</span>
                  ) : (
                    <span className={`text-3xl ${isDark ? 'text-[#a0a0a8]' : 'text-gray-400'}`}>↓</span>
                  )}
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {isProcessing ? 'Processing...' : 'Upload your PDF'}
                </h3>
                <p className={`mb-2 ${isDark ? 'text-[#a0a0a8]' : 'text-gray-600'}`}>
                  {isDragging ? 'Release to upload' : 'Drag and drop or click to upload'}
                </p>
                <p className={`text-sm ${isDark ? 'text-[#6b6b74]' : 'text-gray-400'}`}>
                  PDF up to 10 MB
                </p>
                
                {file && !isProcessing && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <span className="text-green-400">✓</span>
                    <span className="text-green-400 text-sm font-medium">{file.name}</span>
                  </div>
                )}
                
                {isProcessing && (
                  <div className="mt-6">
                    <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#1a1a24]' : 'bg-gray-200'}`}>
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className={`mt-2 text-sm ${isDark ? 'text-[#a0a0a8]' : 'text-gray-600'}`}>
                      Processing... {uploadProgress}%
                    </p>
                  </div>
                )}
                
                {error && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <span className="text-red-400">✕</span>
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Results */
          <div className="max-w-4xl mx-auto mb-16">
            <div className={`rounded-2xl p-8 border ${isDark ? 'border-[#2a2a36] bg-[#1a1a24]' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#2a2a36]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <span className="text-green-400">✓</span>
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Extraction Complete</h3>
                    <p className={`text-sm ${isDark ? 'text-[#a0a0a8]' : 'text-gray-600'}`}>Invoice data extracted successfully</p>
                  </div>
                </div>
                <button
                  onClick={resetApp}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all hover:scale-105 active:scale-95"
                >
                  Process Another
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {invoiceData.issuer && (
                  <div className={`p-5 rounded-xl border ${isDark ? 'border-[#2a2a36] bg-[#16161e]' : 'border-gray-200 bg-gray-50'}`}>
                    <h4 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <span className="text-blue-400">🏢</span> Issuer
                    </h4>
                    <div className={`space-y-2 text-sm ${isDark ? 'text-[#a0a0a8]' : 'text-gray-600'}`}>
                      {invoiceData.issuer.name && <p>Name: {invoiceData.issuer.name}</p>}
                      {invoiceData.issuer.tax_id && <p>Tax ID: {invoiceData.issuer.tax_id}</p>}
                      {invoiceData.issuer.address && <p>Address: {invoiceData.issuer.address}</p>}
                    </div>
                  </div>
                )}
                
                {invoiceData.receiver && (
                  <div className={`p-5 rounded-xl border ${isDark ? 'border-[#2a2a36] bg-[#16161e]' : 'border-gray-200 bg-gray-50'}`}>
                    <h4 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <span className="text-green-400">👤</span> Receiver
                    </h4>
                    <div className={`space-y-2 text-sm ${isDark ? 'text-[#a0a0a8]' : 'text-gray-600'}`}>
                      {invoiceData.receiver.name && <p>Name: {invoiceData.receiver.name}</p>}
                      {invoiceData.receiver.tax_id && <p>Tax ID: {invoiceData.receiver.tax_id}</p>}
                      {invoiceData.receiver.address && <p>Address: {invoiceData.receiver.address}</p>}
                    </div>
                  </div>
                )}
                
                <div className={`p-5 rounded-xl border ${isDark ? 'border-[#2a2a36] bg-[#16161e]' : 'border-gray-200 bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <span className="text-yellow-400">📋</span> Invoice Details
                  </h4>
                  <div className={`space-y-2 text-sm ${isDark ? 'text-[#a0a0a8]' : 'text-gray-600'}`}>
                    {invoiceData.invoice_number && <p>Number: {invoiceData.invoice_number}</p>}
                    {invoiceData.date && <p>Date: {invoiceData.date}</p>}
                  </div>
                </div>
                
                <div className={`p-5 rounded-xl border ${isDark ? 'border-[#2a2a36] bg-[#16161e]' : 'border-gray-200 bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <span className="text-purple-400">💰</span> Financial Summary
                  </h4>
                  <div className={`space-y-2 text-sm ${isDark ? 'text-[#a0a0a8]' : 'text-gray-600'}`}>
                    {invoiceData.subtotal && <p>Subtotal: {invoiceData.subtotal}</p>}
                    {invoiceData.tax && <p>Tax: {invoiceData.tax}</p>}
                    {invoiceData.total && (
                      <p className={`text-lg font-semibold pt-2 mt-2 border-t ${isDark ? 'text-white border-[#2a2a36]' : 'text-gray-900 border-gray-200'}`}>
                        Total: {invoiceData.total}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-3 gap-6 mt-16">
          <div className={`p-6 rounded-2xl transition-all duration-200 ${
            isDark ? 'bg-[#1a1a24] hover:bg-[#1f1f2a]' : 'bg-gray-50 hover:bg-gray-100'
          } hover:shadow-xl`}>
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#16161e]' : 'bg-white'}`}>
                <span style={{fontSize: '24px'}}>👁️</span>
              </div>
              <div>
                <h3 className={`font-semibold mb-2 text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Advanced OCR</h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-[#a0a0a8]' : 'text-gray-600'}`}>Accurate text extraction from invoices</p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-2xl transition-all duration-200 ${
            isDark ? 'bg-[#1a1a24] hover:bg-[#1f1f2a]' : 'bg-gray-50 hover:bg-gray-100'
          } hover:shadow-xl`}>
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#16161e]' : 'bg-white'}`}>
                <span style={{fontSize: '24px'}}>🎯</span>
              </div>
              <div>
                <h3 className={`font-semibold mb-2 text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Smart Field Extraction</h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-[#a0a0a8]' : 'text-gray-600'}`}>Capture invoice fields such as date and total</p>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-2xl transition-all duration-200 ${
            isDark ? 'bg-[#1a1a24] hover:bg-[#1f1f2a]' : 'bg-gray-50 hover:bg-gray-100'
          } hover:shadow-xl`}>
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#16161e]' : 'bg-white'}`}>
                <span style={{fontSize: '24px'}}>📤</span>
              </div>
              <div>
                <h3 className={`font-semibold mb-2 text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Export in Multiple Formats</h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-[#a0a0a8]' : 'text-gray-600'}`}>Download extracted data as JSON or CSV</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`border-t mt-20 ${isDark ? 'border-[#2a2a36]' : 'border-gray-200'}`}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className={`text-sm ${isDark ? 'text-[#6b6b74]' : 'text-gray-400'}`}>
            © 2025 Invoice AI Processor. Built with FastAPI, React, spaCy & Tesseract OCR.
          </p>
          <div className="flex items-center gap-8">
            <a href="https://invoice-ai-processor-production.up.railway.app/docs" target="_blank" rel="noopener noreferrer"
              className={`text-sm flex items-center gap-2 transition-all hover:scale-105 ${isDark ? 'text-[#a0a0a8] hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <span>📄</span>
              <span>API Docs</span>
            </a>
            <a href="https://github.com/egtimer/-invoice-ai-processor" target="_blank" rel="noopener noreferrer"
              className={`text-sm flex items-center gap-2 transition-all hover:scale-105 ${isDark ? 'text-[#a0a0a8] hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <span>💻</span>
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App