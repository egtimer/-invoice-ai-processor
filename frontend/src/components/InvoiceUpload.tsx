// Invoice Upload Component with Drag & Drop

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { invoiceApi } from '../services/api';
import type { UploadResponse } from '../types/invoice';

interface InvoiceUploadProps {
  onUploadComplete: (response: UploadResponse) => void;
  onError: (error: string) => void;
}

export const InvoiceUpload: React.FC<InvoiceUploadProps> = ({
  onUploadComplete,
  onError,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setIsUploading(true);
      setUploadedFile(null);

      try {
        const response = await invoiceApi.uploadInvoice(file);
        setUploadedFile(file.name);
        onUploadComplete(response);
      } catch (error: any) {
        const message =
          error.response?.data?.detail || error.message || 'Upload failed';
        onError(message);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete, onError]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        'application/pdf': ['.pdf'],
        'image/png': ['.png'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/tiff': ['.tiff', '.tif'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          ['.docx'],
      },
      maxFiles: 1,
      maxSize: 20 * 1024 * 1024, // 20MB
      disabled: isUploading,
    });

  return (
    <div
      {...getRootProps()}
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
        transition-all duration-200 ease-in-out
        ${isDragActive && !isDragReject ? 'border-blue-500 bg-blue-50' : ''}
        ${isDragReject ? 'border-red-500 bg-red-50' : ''}
        ${!isDragActive && !isDragReject ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50' : ''}
        ${isUploading ? 'opacity-75 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-4">
        {isUploading ? (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-gray-600">Subiendo factura...</p>
          </>
        ) : uploadedFile ? (
          <>
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-green-600 font-medium">{uploadedFile}</p>
            <p className="text-sm text-gray-500">Haz clic para subir otra</p>
          </>
        ) : isDragReject ? (
          <>
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-red-600">Archivo no soportado</p>
            <p className="text-sm text-gray-500">
              Usa PDF, PNG, JPG o DOCX (máx. 20MB)
            </p>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400" />
            {isDragActive ? (
              <p className="text-blue-600 font-medium">Suelta el archivo aquí</p>
            ) : (
              <>
                <p className="text-gray-600">
                  <span className="font-medium text-blue-600">
                    Haz clic para seleccionar
                  </span>{' '}
                  o arrastra una factura
                </p>
                <p className="text-sm text-gray-500">
                  PDF, PNG, JPG, DOCX (máx. 20MB)
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InvoiceUpload;
