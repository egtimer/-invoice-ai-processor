// API Service for Invoice AI Processor v2

import axios, { AxiosInstance } from 'axios';
import type {
  UploadResponse,
  ProcessingStatus,
  ProcessingOptions,
  InvoiceData,
  HealthStatus,
} from '../types/invoice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class InvoiceApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/v2`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Health check
  async getHealth(): Promise<HealthStatus> {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  }

  // Upload invoice file
  async uploadInvoice(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // Start processing
  async startProcessing(
    invoiceId: string,
    options: ProcessingOptions = { force_llm: false }
  ): Promise<ProcessingStatus> {
    const response = await this.client.post(`/process/${invoiceId}`, options);
    return response.data;
  }

  // Get processing status
  async getProcessingStatus(invoiceId: string): Promise<ProcessingStatus> {
    const response = await this.client.get(`/process/${invoiceId}`);
    return response.data;
  }

  // Get results
  async getResults(invoiceId: string): Promise<InvoiceData> {
    const response = await this.client.get(`/results/${invoiceId}`);
    return response.data;
  }

  // Reprocess with LLM
  async reprocessWithLLM(invoiceId: string): Promise<ProcessingStatus> {
    const response = await this.client.post(`/reprocess/${invoiceId}`);
    return response.data;
  }

  // Poll for completion
  async pollUntilComplete(
    invoiceId: string,
    onProgress?: (status: ProcessingStatus) => void,
    maxAttempts = 60,
    intervalMs = 2000
  ): Promise<ProcessingStatus> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.getProcessingStatus(invoiceId);

      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'completed' || status.status === 'error') {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      attempts++;
    }

    throw new Error('Processing timeout');
  }
}

export const invoiceApi = new InvoiceApiService();
export default invoiceApi;
