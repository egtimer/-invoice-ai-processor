// Types for Invoice AI Processor v2

export interface CompanyInfo {
  name: string;
  tax_id?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  confidence: number;
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  tax_rate?: number;
  confidence: number;
}

export interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  supplier: CompanyInfo;
  client: CompanyInfo;
  lines: InvoiceLine[];
  subtotal: number;
  tax_amount: number;
  total: number;
  currency: string;
  payment_method?: string;
  notes?: string;
  confidence_score: number;
  requires_review: boolean;
  extraction_method: 'local' | 'claude' | 'hybrid';
  extracted_at: string;
}

export interface UploadResponse {
  invoice_id: string;
  filename: string;
  file_size: number;
  uploaded_at: string;
  status: string;
}

export interface ProcessingStatus {
  invoice_id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
  data?: InvoiceData;
  extraction_method?: string;
}

export interface ProcessingOptions {
  force_llm: boolean;
  language?: string;
}

export interface HealthStatus {
  status: string;
  version: string;
  extraction_mode: string;
  claude_available: boolean;
  docling_ready: boolean;
}
