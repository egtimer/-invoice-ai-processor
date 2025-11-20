/**
 * ProcessingStatus Component
 * 
 * Shows real-time processing status with progress bar and polling.
 * Automatically polls the backend every 2 seconds until processing completes.
 */

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getProcessingStatus } from '../services/api';

const ProcessingStatus = ({ invoiceId, onComplete }) => {
  const [status, setStatus] = useState('processing');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Starting processing...');
  const [error, setError] = useState(null);

  useEffect(() => {
    let pollInterval;

    const checkStatus = async () => {
      try {
        const result = await getProcessingStatus(invoiceId);
        
        setStatus(result.status);
        setProgress(result.progress || 0);
        setMessage(result.message || 'Processing...');

        if (result.status === 'completed') {
          clearInterval(pollInterval);
          onComplete(result);
        } else if (result.status === 'error') {
          clearInterval(pollInterval);
          setError(result.message || 'Processing failed');
        }
      } catch (err) {
        console.error('Status check error:', err);
        setError('Failed to check processing status');
        clearInterval(pollInterval);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 2 seconds
    pollInterval = setInterval(checkStatus, 2000);

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [invoiceId, onComplete]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center mb-6">
          {status === 'processing' && (
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
          )}
          {status === 'completed' && (
            <CheckCircle className="h-12 w-12 text-green-500" />
          )}
          {status === 'error' && (
            <AlertCircle className="h-12 w-12 text-red-500" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-center mb-4">
          {status === 'processing' && 'Processing Your Invoice'}
          {status === 'completed' && 'Processing Complete!'}
          {status === 'error' && 'Processing Failed'}
        </h2>

        <p className="text-center text-gray-600 mb-6">{message}</p>

        {status === 'processing' && (
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className="bg-blue-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          Invoice ID: <code className="bg-gray-100 px-2 py-1 rounded">{invoiceId}</code>
        </p>
      </div>
    </div>
  );
};

export default ProcessingStatus;
