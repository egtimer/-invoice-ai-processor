import {
  FileText,
  Building2,
  User,
  Calendar,
  AlertTriangle,
  Sparkles,
  Cpu,
} from 'lucide-react';
import type { InvoiceData } from '../types/invoice';

interface InvoiceResultsProps {
  data: InvoiceData;
  onReprocess?: () => void;
}

export const InvoiceResults: React.FC<InvoiceResultsProps> = ({
  data,
  onReprocess,
}) => {
  const confidenceColor =
    data.confidence_score >= 0.9
      ? 'text-green-600 bg-green-100'
      : data.confidence_score >= 0.7
        ? 'text-yellow-600 bg-yellow-100'
        : 'text-red-600 bg-red-100';

  const methodIcon =
    data.extraction_method === 'claude' ? (
      <Sparkles className="w-4 h-4" />
    ) : (
      <Cpu className="w-4 h-4" />
    );

  const methodLabel =
    data.extraction_method === 'claude'
      ? 'Extracted with AI (Claude)'
      : 'Extracted locally';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">
                {data.invoice_number}
              </h2>
              <p className="text-blue-100 text-sm flex items-center gap-1">
                {methodIcon}
                {methodLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${confidenceColor}`}
            >
              {(data.confidence_score * 100).toFixed(0)}% confidence
            </span>
            {data.requires_review && (
              <span className="px-3 py-1 rounded-full text-sm font-medium text-orange-600 bg-orange-100 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Review
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-700">Supplier</h3>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-900">{data.supplier.name}</p>
              {data.supplier.tax_id && (
                <p className="text-sm text-gray-600">
                  Tax ID: {data.supplier.tax_id}
                </p>
              )}
              {data.supplier.address && (
                <p className="text-sm text-gray-600">{data.supplier.address}</p>
              )}
              {data.supplier.city && (
                <p className="text-sm text-gray-600">
                  {data.supplier.postal_code} {data.supplier.city}
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-700">Client</h3>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-900">{data.client.name}</p>
              {data.client.tax_id && (
                <p className="text-sm text-gray-600">
                  Tax ID: {data.client.tax_id}
                </p>
              )}
              {data.client.address && (
                <p className="text-sm text-gray-600">{data.client.address}</p>
              )}
              {data.client.city && (
                <p className="text-sm text-gray-600">
                  {data.client.postal_code} {data.client.city}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Date:</span>
            <span className="font-medium">{data.invoice_date}</span>
          </div>
          {data.due_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Due:</span>
              <span className="font-medium">{data.due_date}</span>
            </div>
          )}
        </div>

        {data.lines.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Line Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">
                      Description
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">
                      Qty
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">
                      Price
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 px-2">{line.description}</td>
                      <td className="text-right py-2 px-2">{line.quantity}</td>
                      <td className="text-right py-2 px-2">
                        {line.unit_price.toFixed(2)} €
                      </td>
                      <td className="text-right py-2 px-2 font-medium">
                        {line.line_total.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span>{data.subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax:</span>
                <span>{data.tax_amount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2">
                <span>TOTAL:</span>
                <span className="text-blue-600">{data.total.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>

        {data.confidence_score < 0.9 && onReprocess && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-yellow-800">
                  Low confidence extraction. You can reprocess with AI for better accuracy.
                </p>
                <button
                  onClick={onReprocess}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  Reprocess with Claude
                </button>
              </div>
            </div>
          </div>
        )}

        {data.notes && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            <strong>Notes:</strong> {data.notes}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceResults;
