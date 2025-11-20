/**
 * API Service - Centralized HTTP client configuration
 * 
 * This module provides a configured Axios instance for all API calls
 * to the FastAPI backend. It handles base URL configuration, error
 * handling, and provides convenience methods for all API operations.
 */

import axios from 'axios';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 60000, // 60 seconds for file processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and adding auth tokens if needed
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error('Network Error: No response from server');
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Upload a PDF invoice file
 * @param {File} file - PDF file to upload
 * @returns {Promise} Response with invoice_id
 */
export const uploadInvoice = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/api/v1/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

/**
 * Start processing an uploaded invoice
 * @param {string} invoiceId - UUID of the invoice to process
 * @returns {Promise} Response with processing status
 */
export const startProcessing = async (invoiceId) => {
  const response = await api.post(`/api/v1/process/${invoiceId}`);
  return response.data;
};

/**
 * Get processing status and results for an invoice
 * @param {string} invoiceId - UUID of the invoice
 * @returns {Promise} Response with status and data
 */
export const getProcessingStatus = async (invoiceId) => {
  const response = await api.get(`/api/v1/process/${invoiceId}`);
  return response.data;
};

/**
 * Get complete invoice data
 * @param {string} invoiceId - UUID of the invoice
 * @returns {Promise} Response with complete invoice data
 */
export const getInvoiceData = async (invoiceId) => {
  const response = await api.get(`/api/v1/results/${invoiceId}`);
  return response.data;
};

/**
 * Export invoice data in specified format
 * @param {string} invoiceId - UUID of the invoice
 * @param {string} format - 'json' or 'excel'
 * @returns {Promise} Blob response for download
 */
export const exportInvoiceData = async (invoiceId, format = 'json') => {
  const response = await api.get(`/api/v1/export/${invoiceId}`, {
    params: { format },
    responseType: 'blob',
  });
  return response.data;
};

export default api;
