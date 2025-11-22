'use client';

import React, { useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FileUploadProps } from '@/types/csv-import';
import { CSV_CONSTRAINTS } from '@/types/csv-import';

export interface FileDropzoneProps extends Omit<FileUploadProps, 'onFileSelect' | 'onFileError'> {
  onFileSelect: (file: File) => void;
  onFileError: (error: string) => void;
  title?: string;
  description?: string;
  showFileInfo?: boolean;
  className?: string;
}

export function FileDropzone({
  onFileSelect,
  onFileError,
  acceptedTypes = ['.csv'],
  maxSizeBytes = CSV_CONSTRAINTS.MAX_FILE_SIZE_MB * 1024 * 1024,
  disabled = false,
  title = 'อัปโหลดไฟล์ CSV',
  description = 'ลากไฟล์มาวางหรือคลิกเพื่อเลือกไฟล์',
  showFileInfo = true,
  className = ''
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    const fileName = file.name.toLowerCase();
    const hasValidExtension = acceptedTypes.some(type =>
      fileName.endsWith(type.replace('.', ''))
    );

    if (!hasValidExtension) {
      return `ไฟล์ต้องเป็นนามสกุล ${acceptedTypes.join(', ')} เท่านั้น`;
    }

    // Check file size
    if (file.size > maxSizeBytes) {
      const maxSizeMB = Math.round(maxSizeBytes / 1024 / 1024);
      const fileSizeMB = Math.round(file.size / 1024 / 1024);
      return `ไฟล์ใหญ่เกินไป (${fileSizeMB}MB) สูงสุด ${maxSizeMB}MB`;
    }

    // Check if file is empty
    if (file.size === 0) {
      return 'ไฟล์ว่างเปล่า';
    }

    return null;
  }, [acceptedTypes, maxSizeBytes]);

  const handleFileSelection = useCallback(async (file: File) => {
    if (disabled || isProcessing) return;

    setIsProcessing(true);

    try {
      // Validate file
      const error = validateFile(file);
      if (error) {
        onFileError(error);
        return;
      }

      // Set selected file for display
      setSelectedFile(file);

      // Call parent handler
      onFileSelect(file);

    } catch (error) {
      onFileError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการประมวลผลไฟล์');
    } finally {
      setIsProcessing(false);
    }
  }, [disabled, isProcessing, validateFile, onFileSelect, onFileError]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set drag over to false if leaving the dropzone completely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, [disabled, handleFileSelection]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, [handleFileSelection]);

  const handleClick = useCallback(() => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click();
    }
  }, [disabled, isProcessing]);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / 1024 / 1024)} MB`;
  };

  return (
    <div className={`file-dropzone ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Main dropzone area */}
      <motion.div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
          ${isDragOver
            ? 'border-blue-400 bg-blue-50'
            : selectedFile
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isProcessing ? 'pointer-events-none' : ''}
        `}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        whileHover={!disabled && !isProcessing ? { scale: 1.02 } : {}}
        whileTap={!disabled && !isProcessing ? { scale: 0.98 } : {}}
      >
        {/* Loading spinner */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-xl"
            >
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-blue-600 font-medium">กำลังประมวลผล...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {/* File icon */}
          <div className="flex justify-center">
            {selectedFile ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"
              >
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.div>
            ) : (
              <motion.div
                animate={{ scale: isDragOver ? 1.1 : 1 }}
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  isDragOver ? 'bg-blue-100' : 'bg-gray-100'
                }`}
              >
                <svg
                  className={`w-8 h-8 ${isDragOver ? 'text-blue-600' : 'text-gray-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </motion.div>
            )}
          </div>

          {/* Title and description */}
          <div>
            <h3 className={`text-lg font-semibold mb-2 ${
              selectedFile ? 'text-green-800' : isDragOver ? 'text-blue-800' : 'text-gray-800'
            }`}>
              {selectedFile ? 'ไฟล์พร้อมใช้งาน' : title}
            </h3>
            <p className={`text-sm ${
              selectedFile ? 'text-green-600' : isDragOver ? 'text-blue-600' : 'text-gray-600'
            }`}>
              {selectedFile ? 'คลิกเพื่อเปลี่ยนไฟล์ หรือลากไฟล์ใหม่มาวาง' : description}
            </p>
          </div>

          {/* File requirements */}
          {!selectedFile && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>รองรับไฟล์: {acceptedTypes.join(', ')}</p>
              <p>ขนาดสูงสุด: {Math.round(maxSizeBytes / 1024 / 1024)} MB</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Selected file info */}
      <AnimatePresence>
        {selectedFile && showFileInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-white border border-green-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type || 'text/csv'}
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearFile();
                }}
                className="p-2 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                title="ลบไฟล์"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact version for smaller spaces
export function CompactFileDropzone({
  onFileSelect,
  onFileError,
  acceptedTypes = ['.csv'],
  maxSizeBytes = CSV_CONSTRAINTS.MAX_FILE_SIZE_MB * 1024 * 1024,
  disabled = false,
  className = ''
}: FileUploadProps & { className?: string }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className={`compact-file-dropzone ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          w-full p-4 border-2 border-dashed border-gray-300 rounded-full
          text-center transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 hover:bg-gray-50'}
          ${selectedFile ? 'border-green-400 bg-green-50' : ''}
        `}
      >
        <div className="flex items-center justify-center space-x-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            {selectedFile ? selectedFile.name : 'เลือกไฟล์ CSV'}
          </span>
        </div>
      </button>
    </div>
  );
}
