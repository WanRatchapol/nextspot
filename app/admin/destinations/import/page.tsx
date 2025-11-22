'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileDropzone } from '@/components/FileDropzone';
import { ImportPreview } from '@/components/ImportPreview';
import type {
  ImportResult,
  ImportOptions,
  AdminImportState,
  CSVProcessingState,
  ImportAnalyticsEvent
} from '@/types/csv-import';
import { CSV_CONSTRAINTS } from '@/types/csv-import';

export default function AdminImportPage() {
  // State management
  const [state, setState] = useState<AdminImportState>({
    file: null,
    importResult: null,
    processingState: {
      status: 'idle',
      progress: 0,
      currentStep: '',
      errors: [],
      warnings: []
    },
    previewMode: true,
    showAdvancedOptions: false,
    importOptions: {
      validateOnly: true,
      overwrite: false,
      skipDuplicates: true,
      batchSize: 100
    }
  });

  const [uploadError, setUploadError] = useState<string | null>(null);

  // File selection handler
  const handleFileSelect = useCallback(async (file: File) => {
    setUploadError(null);
    setState(prev => ({
      ...prev,
      file,
      importResult: null,
      processingState: {
        status: 'parsing',
        progress: 10,
        currentStep: 'กำลังอ่านไฟล์ CSV...',
        errors: [],
        warnings: []
      }
    }));

    try {
      // Update progress
      setState(prev => ({
        ...prev,
        processingState: {
          ...prev.processingState,
          status: 'validating',
          progress: 30,
          currentStep: 'กำลังตรวจสอบข้อมูล...'
        }
      }));

      // Prepare form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify({
        ...state.importOptions,
        validateOnly: true // Always validate first
      }));

      // Update progress
      setState(prev => ({
        ...prev,
        processingState: {
          ...prev.processingState,
          progress: 60,
          currentStep: 'กำลังประมวลผลข้อมูล...'
        }
      }));

      // Call import API
      const response = await fetch('/api/admin/destinations/import', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.errors?.[0]?.message || 'การอัปโหลดไฟล์ล้มเหลว');
      }

      // Update with results
      setState(prev => ({
        ...prev,
        importResult: {
          summary: {
            totalRows: result.processed || 0,
            successfulRows: result.processed || 0,
            errorRows: result.errors?.length || 0,
            warningRows: result.warnings?.length || 0,
            duplicateRows: result.duplicates?.length || 0,
            skippedRows: 0,
            processingTimeMs: 1000 // Mock value
          },
          errors: result.errors || [],
          warnings: result.warnings || [],
          duplicates: result.duplicates || [],
          preview: result.preview,
          importId: result.importId
        },
        processingState: {
          status: 'completed',
          progress: 100,
          currentStep: 'เสร็จสิ้น',
          errors: result.errors || [],
          warnings: result.warnings || []
        }
      }));

    } catch (error) {
      console.error('Import validation failed:', error);

      setState(prev => ({
        ...prev,
        processingState: {
          status: 'error',
          progress: 0,
          currentStep: 'เกิดข้อผิดพลาด',
          errors: [{
            row: 0,
            field: 'file',
            message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
            value: file.name,
            severity: 'error'
          }],
          warnings: []
        }
      }));
    }
  }, [state.importOptions]);

  // File error handler
  const handleFileError = useCallback((error: string) => {
    setUploadError(error);
    setState(prev => ({
      ...prev,
      file: null,
      importResult: null,
      processingState: {
        status: 'error',
        progress: 0,
        currentStep: 'ข้อผิดพลาด',
        errors: [{
          row: 0,
          field: 'file',
          message: error,
          value: null,
          severity: 'error'
        }],
        warnings: []
      }
    }));
  }, []);

  // Confirm import handler
  const handleConfirmImport = useCallback(async () => {
    if (!state.file || !state.importResult) return;

    setState(prev => ({
      ...prev,
      processingState: {
        status: 'uploading',
        progress: 0,
        currentStep: 'กำลังนำเข้าข้อมูล...',
        errors: [],
        warnings: []
      }
    }));

    try {
      // Prepare form data for actual import
      const formData = new FormData();
      formData.append('file', state.file);
      formData.append('options', JSON.stringify({
        ...state.importOptions,
        validateOnly: false // Actual import
      }));

      // Update progress
      setState(prev => ({
        ...prev,
        processingState: {
          ...prev.processingState,
          progress: 50,
          currentStep: 'กำลังบันทึกข้อมูล...'
        }
      }));

      // Call import API
      const response = await fetch('/api/admin/destinations/import', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.errors?.[0]?.message || 'การนำเข้าข้อมูลล้มเหลว');
      }

      // Update with final results
      setState(prev => ({
        ...prev,
        importResult: {
          ...prev.importResult!,
          importId: result.importId
        },
        processingState: {
          status: 'completed',
          progress: 100,
          currentStep: `นำเข้าเสร็จสิ้น ${result.processed} รายการ`,
          errors: [],
          warnings: []
        }
      }));

      // Track analytics
      console.log('[Analytics] destinations_imported:', {
        event: 'destinations_imported',
        sessionId: 'admin-session',
        importId: result.importId,
        filename: state.file.name,
        totalRows: state.importResult.summary.totalRows,
        successfulRows: result.processed,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Import failed:', error);

      setState(prev => ({
        ...prev,
        processingState: {
          status: 'error',
          progress: 0,
          currentStep: 'การนำเข้าล้มเหลว',
          errors: [{
            row: 0,
            field: 'import',
            message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล',
            value: null,
            severity: 'error'
          }],
          warnings: []
        }
      }));
    }
  }, [state.file, state.importResult, state.importOptions]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    setState(prev => ({
      ...prev,
      file: null,
      importResult: null,
      processingState: {
        status: 'idle',
        progress: 0,
        currentStep: '',
        errors: [],
        warnings: []
      }
    }));
    setUploadError(null);
  }, []);

  // Retry handler
  const handleRetry = useCallback(() => {
    if (state.file) {
      handleFileSelect(state.file);
    }
  }, [state.file, handleFileSelect]);

  // Options change handler
  const handleOptionsChange = useCallback((newOptions: Partial<ImportOptions>) => {
    setState(prev => ({
      ...prev,
      importOptions: {
        ...prev.importOptions,
        ...newOptions
      }
    }));
  }, []);

  // Download template handler
  const handleDownloadTemplate = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/destinations/export?template=true');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'destinations_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  }, []);

  const isProcessing = ['parsing', 'validating', 'processing', 'uploading'].includes(state.processingState.status);

  return (
    <div className="admin-import-page max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-gray-900"
        >
          นำเข้าข้อมูลสถานที่ท่องเที่ยว
        </motion.h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          อัปโหลดไฟล์ CSV เพื่อนำเข้าข้อมูลสถานที่ท่องเที่ยวใหม่ ระบบจะตรวจสอบความถูกต้องและแสดงตัวอย่างก่อนนำเข้าจริง
        </p>

        {/* Quick actions */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>ดาวน์โหลดเทมเพลต</span>
          </button>

          <button
            onClick={() => setState(prev => ({ ...prev, showAdvancedOptions: !prev.showAdvancedOptions }))}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            <span>ตัวเลือกขั้นสูง</span>
          </button>
        </div>
      </div>

      {/* Advanced options */}
      <AnimatePresence>
        {state.showAdvancedOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 rounded-lg p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">ตัวเลือกการนำเข้า</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={state.importOptions.overwrite}
                    onChange={(e) => handleOptionsChange({ overwrite: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">เขียนทับข้อมูลที่มีอยู่</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={state.importOptions.skipDuplicates}
                    onChange={(e) => handleOptionsChange({ skipDuplicates: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">ข้ามข้อมูลซ้ำ</span>
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ขนาด Batch
                  </label>
                  <select
                    value={state.importOptions.batchSize}
                    onChange={(e) => handleOptionsChange({ batchSize: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={50}>50 รายการ</option>
                    <option value={100}>100 รายการ</option>
                    <option value={200}>200 รายการ</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="space-y-6">
        {/* File upload section */}
        {!state.importResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <FileDropzone
              onFileSelect={handleFileSelect}
              onFileError={handleFileError}
              acceptedTypes={['.csv']}
              maxSizeBytes={CSV_CONSTRAINTS.MAX_FILE_SIZE_MB * 1024 * 1024}
              disabled={isProcessing}
              className="w-full"
            />

            {/* Error display */}
            {uploadError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-red-800">เกิดข้อผิดพลาด</h4>
                    <p className="text-sm text-red-700 mt-1">{uploadError}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Processing progress */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">กำลังประมวลผล</h3>
                <span className="text-sm text-gray-500">{state.processingState.progress}%</span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-blue-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${state.processingState.progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <p className="text-sm text-gray-600">{state.processingState.currentStep}</p>
            </div>
          </motion.div>
        )}

        {/* Import preview */}
        {state.importResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ImportPreview
              result={state.importResult}
              onConfirm={handleConfirmImport}
              onCancel={handleCancel}
              onRetry={handleRetry}
              isProcessing={state.processingState.status === 'uploading'}
            />
          </motion.div>
        )}
      </div>

      {/* Help section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-blue-50 rounded-lg p-6"
      >
        <h3 className="text-lg font-medium text-blue-900 mb-3">คำแนะนำการใช้งาน</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">รูปแบบไฟล์ CSV</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>ไฟล์ต้องเป็นนามสกุล .csv</li>
              <li>ขนาดไฟล์ไม่เกิน {CSV_CONSTRAINTS.MAX_FILE_SIZE_MB} MB</li>
              <li>จำนวนแถวไม่เกิน {CSV_CONSTRAINTS.MAX_ROWS.toLocaleString()} รายการ</li>
              <li>ใช้ UTF-8 encoding</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">ข้อมูลที่จำเป็น</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>ชื่อสถานที่ (ไทย/อังกฤษ)</li>
              <li>พิกัดละติจูด/ลองจิจูด</li>
              <li>หมวดหมู่และเขต</li>
              <li>ช่วงงบประมาณและ mood tags</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}