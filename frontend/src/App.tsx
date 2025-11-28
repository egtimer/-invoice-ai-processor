// Invoice AI Processor v2 - Main App Component

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

  // Check API health on mount
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

    // Automatically start processing
    try {
      setState('processing');
      setStatusMessage('Iniciando procesamiento...');
      setProgress(0);

      await invoiceApi.startProcessing(response.invoice_id, {
        force_llm: useLLM,
      });

      // Poll for completion
      const finalStatus = await invoiceApi.pollUntilComplete(
        response.invoice_id,
        (status: ProcessingStatus) => {
          setProgress(status.progress);
          setStatusMessage(status.message || 'Procesando...');
        }
      );

      if (finalStatus.status === 'completed' && finalStatus.data) {
        setInvoiceData(finalStatus.data);
        setState('completed');
      } else if (finalStatus.status === 'error') {
        setError(finalStatus.message || 'Error desconocido');
        setState('error');
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar la factura');
      setState('error');
    }
  };

  const handleReprocess = async () => {
    if (!invoiceId) return;

    setState('processing');
    setProgress(0);
    setStatusMessage('Reprocesando con Claude...');

    try {
      await invoiceApi.reprocessWithLLM(invoiceId);

      const finalStatus = await invoiceApi.pollUntilComplete(
        invoiceId,
        (status: ProcessingStatus) => {
          setProgress(status.progress);
          setStatusMessage(status.message || 'Procesando con IA...');
        }
      );

      if (finalStatus.status === 'completed' && finalStatus.data) {
        setInvoiceData(finalStatus.data);
        setState('completed');
      } else {
        setError(finalStatus.message || 'Error al reprocesar');
        setState('error');
      }
    } catch (err: any) {
      setError(err.message || 'Error al reprocesar');
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Invoice AI Processor
                </h1>
                <p className="text-sm text-gray-500">v2.0 - Docling + Claude</p>
              </div>
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

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* State: Idle - Show Upload */}
        {state === 'idle' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Extrae datos de tus facturas con IA
              </h2>
              <p className="text-gray-600">
                Sube una factura en PDF o imagen y obtén los datos estructurados
                en segundos
              </p>
            </div>

            <InvoiceUpload
              onUploadComplete={handleUploadComplete}
              onError={(err) => {
                setError(err);
                setState('error');
              }}
            />

            {/* LLM Toggle */}
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
                    Usar Claude para máxima precisión
                  </span>
                </label>
              </div>
            )}

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl mb-2">📄</div>
                <h3 className="font-semibold text-gray-800">Multi-formato</h3>
                <p className="text-sm text-gray-600">
                  PDF, PNG, JPG, DOCX - incluso escaneados
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl mb-2">🎯</div>
                <h3 className="font-semibold text-gray-800">Alta precisión</h3>
                <p className="text-sm text-gray-600">
                  Hasta 95% de precisión con Claude AI
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="font-semibold text-gray-800">Rápido</h3>
                <p className="text-sm text-gray-600">
                  Resultados en segundos, no minutos
                </p>
              </div>
            </div>
          </div>
        )}

        {/* State: Processing */}
        {state === 'processing' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <h2 className="text-xl font-semibold text-gray-800">
                Procesando factura...
              </h2>
              <p className="text-gray-600">{statusMessage}</p>

              {/* Progress bar */}
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

        {/* State: Completed */}
        {state === 'completed' && invoiceData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Extracción completada</span>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Nueva factura
              </button>
            </div>

            <InvoiceResults data={invoiceData} onReprocess={handleReprocess} />
          </div>
        )}

        {/* State: Error */}
        {state === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">
                  Error al procesar
                </h3>
                <p className="text-red-600 mt-1">{error}</p>
                <button
                  onClick={handleReset}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Intentar de nuevo
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <p className="text-sm text-gray-500 text-center">
            Invoice AI Processor v2.0 • Powered by Docling + Claude •{' '}
            <a
              href="https://github.com/egtimer/invoice-ai-processor"
              className="text-blue-600 hover:underline"
            >
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
