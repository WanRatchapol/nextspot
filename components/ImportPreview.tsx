'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  ImportResult,
  ImportPreviewProps,
  DestinationPreview,
  ImportError,
  ImportWarning,
  DuplicateDestination
} from '@/types/csv-import';

export function ImportPreview({
  result,
  onConfirm,
  onCancel,
  onRetry,
  isProcessing
}: ImportPreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'errors' | 'warnings' | 'duplicates'>('preview');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showDetails, setShowDetails] = useState<number | null>(null);

  const { summary, errors, warnings, duplicates, preview } = result;

  // Tab counts for navigation
  const tabCounts = useMemo(() => ({
    preview: preview?.length || 0,
    errors: errors.length,
    warnings: warnings.length,
    duplicates: duplicates?.length || 0
  }), [preview, errors.length, warnings.length, duplicates]);

  const canConfirm = useMemo(() => {
    return errors.length === 0 && summary.successfulRows > 0 && !isProcessing;
  }, [errors.length, summary.successfulRows, isProcessing]);

  const handleRowSelect = (row: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(row)) {
      newSelected.delete(row);
    } else {
      newSelected.add(row);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === preview?.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(preview?.map(p => p.row) || []));
    }
  };

  return (
    <div className="import-preview bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header with summary */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            ตรวจสอบข้อมูลก่อนนำเข้า
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onRetry}
              disabled={isProcessing}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 rounded-full"
            >
              ลองใหม่
            </button>
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50"
            >
              ยกเลิก
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label="ทั้งหมด"
            value={summary.totalRows}
            color="gray"
          />
          <SummaryCard
            label="ถูกต้อง"
            value={summary.successfulRows}
            color="green"
          />
          <SummaryCard
            label="ข้อผิดพลาด"
            value={summary.errorRows}
            color="red"
          />
          <SummaryCard
            label="คำเตือน"
            value={summary.warningRows}
            color="yellow"
          />
        </div>

        {/* Processing time */}
        <div className="mt-4 text-sm text-gray-500">
          เวลาที่ใช้: {summary.processingTimeMs}ms
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'preview', label: 'ตัวอย่างข้อมูล', count: tabCounts.preview },
            { key: 'errors', label: 'ข้อผิดพลาด', count: tabCounts.errors },
            { key: 'warnings', label: 'คำเตือน', count: tabCounts.warnings },
            { key: 'duplicates', label: 'ข้อมูลซ้ำ', count: tabCounts.duplicates }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`
                py-4 px-3 border-b-2 font-medium text-sm transition-colors rounded-full
                ${activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`
                  ml-2 px-2 py-1 text-xs rounded-full
                  ${activeTab === tab.key
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'preview' && preview && (
              <PreviewTab
                previews={preview}
                selectedRows={selectedRows}
                onRowSelect={handleRowSelect}
                onSelectAll={handleSelectAll}
                showDetails={showDetails}
                onShowDetails={setShowDetails}
              />
            )}

            {activeTab === 'errors' && (
              <ErrorsTab errors={errors} />
            )}

            {activeTab === 'warnings' && (
              <WarningsTab warnings={warnings} />
            )}

            {activeTab === 'duplicates' && duplicates && (
              <DuplicatesTab duplicates={duplicates} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer with actions */}
      <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {canConfirm
              ? `พร้อมนำเข้า ${summary.successfulRows} รายการ`
              : errors.length > 0
              ? `กรุณาแก้ไขข้อผิดพลาด ${errors.length} รายการ`
              : 'ไม่มีข้อมูลที่ถูกต้องสำหรับนำเข้า'
            }
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50"
            >
              ยกเลิก
            </button>

            <button
              onClick={onConfirm}
              disabled={!canConfirm}
              className={`
                px-6 py-2 rounded-full font-medium transition-colors
                ${canConfirm
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังนำเข้า...</span>
                </div>
              ) : (
                'ยืนยันนำเข้า'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Summary card component
function SummaryCard({
  label,
  value,
  color
}: {
  label: string;
  value: number;
  color: 'gray' | 'green' | 'red' | 'yellow';
}) {
  const colorClasses = {
    gray: 'bg-gray-50 text-gray-900',
    green: 'bg-green-50 text-green-900',
    red: 'bg-red-50 text-red-900',
    yellow: 'bg-yellow-50 text-yellow-900'
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}

// Preview tab component
function PreviewTab({
  previews,
  selectedRows,
  onRowSelect,
  onSelectAll,
  showDetails,
  onShowDetails
}: {
  previews: DestinationPreview[];
  selectedRows: Set<number>;
  onRowSelect: (row: number) => void;
  onSelectAll: () => void;
  showDetails: number | null;
  onShowDetails: (row: number | null) => void;
}) {
  const displayedPreviews = previews.slice(0, 100); // Show first 100 rows

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onSelectAll}
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 rounded-full px-3 py-1"
          >
            <input
              type="checkbox"
              checked={selectedRows.size === previews.length}
              onChange={() => {}}
              className="rounded"
            />
            <span>เลือกทั้งหมด</span>
          </button>
          {selectedRows.size > 0 && (
            <span className="text-sm text-gray-600">
              เลือกแล้ว {selectedRows.size} รายการ
            </span>
          )}
        </div>

        {previews.length > 100 && (
          <div className="text-sm text-gray-500">
            แสดง 100 รายการแรก จากทั้งหมด {previews.length} รายการ
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                แถว
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                สถานะ
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ชื่อ (ไทย)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ชื่อ (อังกฤษ)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                หมวดหมู่
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                เขต
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                การกระทำ
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayedPreviews.map((preview) => (
              <React.Fragment key={preview.row}>
                <tr
                  className={`
                    ${preview.status === 'error' ? 'bg-red-50' :
                      preview.status === 'warning' ? 'bg-yellow-50' :
                      'hover:bg-gray-50'}
                  `}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {preview.row}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={preview.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {preview.data.name_th}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {preview.data.name_en}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {preview.data.category}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {preview.data.district}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <button
                      onClick={() => onShowDetails(showDetails === preview.row ? null : preview.row)}
                      className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded-full"
                    >
                      {showDetails === preview.row ? 'ซ่อน' : 'รายละเอียด'}
                    </button>
                  </td>
                </tr>

                {/* Expandable details row */}
                <AnimatePresence>
                  {showDetails === preview.row && (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <td colSpan={7} className="px-4 py-3 bg-gray-50">
                        <RowDetails preview={preview} />
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Status badge component
function StatusBadge({ status }: { status: 'valid' | 'warning' | 'error' }) {
  const statusConfig = {
    valid: { label: 'ถูกต้อง', color: 'bg-green-100 text-green-800' },
    warning: { label: 'คำเตือน', color: 'bg-yellow-100 text-yellow-800' },
    error: { label: 'ข้อผิดพลาด', color: 'bg-red-100 text-red-800' }
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
}

// Row details component
function RowDetails({ preview }: { preview: DestinationPreview }) {
  return (
    <div className="space-y-3">
      {/* Basic info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="font-medium text-gray-700">ละติจูด:</span>
          <span className="ml-2 text-gray-900">{preview.data.lat}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">ลองจิจูด:</span>
          <span className="ml-2 text-gray-900">{preview.data.lng}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">คะแนน IG:</span>
          <span className="ml-2 text-gray-900">{preview.data.instagram_score}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">งบประมาณ:</span>
          <span className="ml-2 text-gray-900">{preview.data.budget_band}</span>
        </div>
      </div>

      {/* Errors and warnings */}
      {(preview.errors.length > 0 || preview.warnings.length > 0) && (
        <div className="space-y-2">
          {preview.errors.map((error, index) => (
            <div key={index} className="flex items-start space-x-2 text-sm text-red-700">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span><strong>{error.field}:</strong> {error.message}</span>
            </div>
          ))}

          {preview.warnings.map((warning, index) => (
            <div key={index} className="flex items-start space-x-2 text-sm text-yellow-700">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span><strong>{warning.field}:</strong> {warning.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Errors tab component
function ErrorsTab({ errors }: { errors: ImportError[] }) {
  if (errors.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>ไม่พบข้อผิดพลาด</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errors.map((error, index) => (
        <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-medium text-red-800">
                แถว {error.row}: {error.field}
              </div>
              <div className="text-sm text-red-700 mt-1">
                {error.message}
              </div>
              {error.value && (
                <div className="text-xs text-red-600 mt-2 font-mono bg-red-100 p-2 rounded">
                  ค่าที่ผิดพลาด: {JSON.stringify(error.value)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Warnings tab component
function WarningsTab({ warnings }: { warnings: ImportWarning[] }) {
  if (warnings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>ไม่มีคำเตือน</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {warnings.map((warning, index) => (
        <div key={index} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-medium text-yellow-800">
                แถว {warning.row}: {warning.field}
              </div>
              <div className="text-sm text-yellow-700 mt-1">
                {warning.message}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Duplicates tab component
function DuplicatesTab({ duplicates }: { duplicates: DuplicateDestination[] }) {
  if (duplicates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>ไม่พบข้อมูลซ้ำ</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {duplicates.map((duplicate, index) => (
        <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-blue-800">
                แถว {duplicate.row}: {duplicate.name_th} ({duplicate.name_en})
              </div>
              <div className="text-sm text-blue-700 mt-1">
                พบข้อมูลซ้ำกับรายการที่มีอยู่แล้ว (ID: {duplicate.existingId})
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                ข้าม
              </button>
              <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded-full">
                แทนที่
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
