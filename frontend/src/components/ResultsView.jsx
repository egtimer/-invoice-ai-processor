/**
 * ResultsView Component
 * 
 * Displays extracted invoice data in a beautiful, organized layout.
 * Shows confidence scores, allows data export, and highlights fields
 * that may need review.
 */

import { Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { exportInvoiceData } from '../services/api';

const ResultsView = ({ data, invoiceId }) => {
  const handleExport = async (format) => {
    try {
      const blob = await exportInvoiceData(invoiceId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoiceId}.${format === 'excel' ? 'xlsx' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export data');
    }
  };

  const confidenceColor = (score) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const confidenceLabel = (score) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header with confidence score */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-gray-800">Extracted Data</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleExport('json')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Overall Confidence:</span>
            <span className={`font-bold text-lg ${confidenceColor(data.confidence_score)}`}>
              {(data.confidence_score * 100).toFixed(1)}% ({confidenceLabel(data.confidence_score)})
            </span>
          </div>
          {data.requires_review && (
            <div className="flex items-center space-x-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Manual Review Recommended</span>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Header Info */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Invoice Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoField label="Invoice Number" value={data.invoice_number} />
          <InfoField label="Invoice Date" value={data.invoice_date} />
          <InfoField label="Due Date" value={data.due_date || 'Not specified'} />
        </div>
      </div>

      {/* Supplier and Client Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <CompanyCard title="Supplier" company={data.supplier} />
        <CompanyCard title="Client" company={data.client} />
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Line Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-3 text-gray-600">Description</th>
                <th className="text-right p-3 text-gray-600">Quantity</th>
                <th className="text-right p-3 text-gray-600">Unit Price</th>
                <th className="text-right p-3 text-gray-600">Total</th>
                <th className="text-center p-3 text-gray-600">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((line, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="p-3">{line.description}</td>
                  <td className="text-right p-3">{line.quantity}</td>
                  <td className="text-right p-3">{line.unit_price} {data.currency}</td>
                  <td className="text-right p-3 font-medium">{line.line_total} {data.currency}</td>
                  <td className="text-center p-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      line.confidence >= 0.7 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {(line.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Totals */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Financial Summary</h3>
        <div className="space-y-3">
          <TotalRow label="Subtotal" value={data.subtotal} currency={data.currency} />
          <TotalRow label="Tax Amount" value={data.tax_amount} currency={data.currency} />
          <div className="border-t-2 border-gray-300 pt-3">
            <TotalRow 
              label="Total" 
              value={data.total} 
              currency={data.currency}
              bold={true}
            />
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Extracted at: {new Date(data.extracted_at).toLocaleString()}</p>
        <p>Invoice ID: <code className="bg-gray-100 px-2 py-1 rounded">{invoiceId}</code></p>
      </div>
    </div>
  );
};

// Helper components
const InfoField = ({ label, value }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
    <p className="text-lg font-semibold text-gray-800">{value}</p>
  </div>
);

const CompanyCard = ({ title, company }) => (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xl font-bold text-gray-800">{title}</h3>
      <span className={`text-sm font-medium ${
        company.confidence >= 0.8 ? 'text-green-600' : 'text-yellow-600'
      }`}>
        {(company.confidence * 100).toFixed(0)}% confidence
      </span>
    </div>
    <div className="space-y-2">
      <InfoField label="Name" value={company.name} />
      {company.tax_id && <InfoField label="Tax ID" value={company.tax_id} />}
      {company.address && <InfoField label="Address" value={company.address} />}
      {company.city && (
        <InfoField 
          label="Location" 
          value={`${company.city}${company.postal_code ? `, ${company.postal_code}` : ''}`} 
        />
      )}
    </div>
  </div>
);

const TotalRow = ({ label, value, currency, bold = false }) => (
  <div className="flex justify-between items-center">
    <span className={`${bold ? 'text-lg font-bold' : 'text-base'} text-gray-700`}>
      {label}:
    </span>
    <span className={`${bold ? 'text-2xl font-bold' : 'text-lg font-semibold'} text-gray-900`}>
      {value} {currency}
    </span>
  </div>
);

export default ResultsView;
