import { useState, useEffect } from 'react';
import {
  FileText,
  Loader2,
  AlertCircle,
  Sparkles,
  Cpu,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { InvoiceUpload } from './components/InvoiceUpload';
import { InvoiceResults } from './components/InvoiceResults';
import { invoiceApi } from './services/api';
import type {
  UploadResponse,
  ProcessingStatus,
  InvoiceData,
  HealthStatus,
} from './types/invoice';

type AppState = 'idle' | 'uploaded' | 'processing' | 'completed' | 'error';

function App() {
  const [state, setState] = useState<AppState>('idle');
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [useLLM, setUseLLM] = useState(false);

  useEffect(() => {
    invoiceApi
      .getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const handleUploadComplete = async (response: UploadResponse) => {
    setInvoiceId(response.invoice_id);
    setState('uploaded');
    setError(null);

    try {
      setState('processing');
      setStatusMessage('Starting processing...');
      setProgress(0);

      await invoiceApi.startProcessing(response.invoice_id, {
        force_llm: useLLM,
      });

      const finalStatus = await invoiceApi.pollUntilComplete(
        response.invoice_id,
        (status: ProcessingStatus) => {
          setProgress(status.progress);
          setStatusMessage(status.message || 'Processing...');
        }
      );

      if (finalStatus.status === 'completed' && finalStatus.data) {
        setInvoiceData(finalStatus.data);
        setState('completed');
      } else if (finalStatus.status === 'error') {
        setError(finalStatus.message || 'Unknown error');
        setState('error');
      }
    } catch (err: any) {
      setError(err.message || 'Error processing invoice');
      setState('error');
    }
  };

  const handleReprocess = async () => {
    if (!invoiceId) return;

    setState('processing');
    setProgress(0);
    setStatusMessage('Reprocessing with Claude...');

    try {
      await invoiceApi.reprocessWithLLM(invoiceId);

      const finalStatus = await invoiceApi.pollUntilComplete(
        invoiceId,
        (status: ProcessingStatus) => {
          setProgress(status.progress);
          setStatusMessage(status.message || 'Processing with AI...');
        }
      );

      if (finalStatus.status === 'completed' && finalStatus.data) {
        setInvoiceData(finalStatus.data);
        setState('completed');
      } else {
        setError(finalStatus.message || 'Error reprocessing');
        setState('error');
      }
    } catch (err: any) {
      setError(err.message || 'Error reprocessing');
      setState('error');
    }
  };

  const handleReset = () => {
    setState('idle');
    setInvoiceId(null);
    setInvoiceData(null);
    setProgress(0);
    setStatusMessage('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/landing.html" className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Invoice AI Processor
                  </h1>
                  <p className="text-sm text-gray-500">v2.0 - Docling + Claude</p>
                </div>
              </a>
            </div>

            {health && (
              <div className="flex items-center gap-4 text-sm">
                <div
                  className={`flex items-center gap-1.5 ${
                    health.claude_available ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Claude {health.claude_available ? 'OK' : 'N/A'}
                </div>
                <div className="flex items-center gap-1.5 text-green-600">
                  <Cpu className="w-4 h-4" />
                  Docling OK
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {state === 'idle' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Extract data from your invoices with AI
              </h2>
              <p className="text-gray-600">
                Upload an invoice in PDF or image format and get structured data in seconds
              </p>
            </div>

            <InvoiceUpload
              onUploadComplete={handleUploadComplete}
              onError={(err) => {
                setError(err);
                setState('error');
              }}
            />

            {health?.claude_available && (
              <div className="flex items-center justify-center gap-3 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLLM}
                    onChange={(e) => setUseLLM(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-gray-600">
                    Use Claude for maximum accuracy
                  </span>
                </label>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl mb-2">📄</div>
                <h3 className="font-semibold text-gray-800">Multi-format</h3>
                <p className="text-sm text-gray-600">
                  PDF, PNG, JPG, DOCX - even scanned documents
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl mb-2">🎯</div>
                <h3 className="font-semibold text-gray-800">High Accuracy</h3>
                <p className="text-sm text-gray-600">
                  Up to 95% accuracy with Claude AI
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="font-semibold text-gray-800">Fast</h3>
                <p className="text-sm text-gray-600">
                  Results in seconds, not minutes
                </p>
              </div>
            </div>
          </div>
        )}

        {state === 'processing' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <h2 className="text-xl font-semibold text-gray-800">
                Processing invoice...
              </h2>
              <p className="text-gray-600">{statusMessage}</p>

              <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mt-4">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">{progress.toFixed(0)}%</p>
            </div>
          </div>
        )}

        {state === 'completed' && invoiceData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Extraction completed</span>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                New invoice
              </button>
            </div>

            <InvoiceResults data={invoiceData} onReprocess={handleReprocess} />
          </div>
        )}

        {state === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">
                  Processing error
                </h3>
                <p className="text-red-600 mt-1">{error}</p>
                <button
                  onClick={handleReset}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <p className="text-sm text-gray-500 text-center">
            Invoice AI Processor v2.0 - Powered by Docling + Claude
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
