import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportPreview } from '@/components/ImportPreview';
import type { ImportResult } from '@/types/csv-import';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="check-circle" />,
  AlertCircle: () => <div data-testid="alert-circle" />,
  XCircle: () => <div data-testid="x-circle" />,
  AlertTriangle: () => <div data-testid="alert-triangle" />,
  Copy: () => <div data-testid="copy" />,
  Download: () => <div data-testid="download" />,
  ChevronDown: () => <div data-testid="chevron-down" />,
  ChevronUp: () => <div data-testid="chevron-up" />,
  ExternalLink: () => <div data-testid="external-link" />,
}));

describe('ImportPreview Component', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  const createMockResult = (overrides: Partial<ImportResult> = {}): ImportResult => ({
    summary: {
      totalRows: 2,
      successfulRows: 1,
      errorRows: 1,
      warningRows: 0,
      duplicateRows: 0,
      skippedRows: 0,
      processingTimeMs: 1000,
      readyToImport: 1
    },
    errors: [
      {
        row: 2,
        field: 'name_th',
        message: 'ต้องระบุชื่อภาษาไทย',
        value: '',
        severity: 'error'
      }
    ],
    warnings: [],
    duplicates: [],
    preview: [
      {
        row: 1,
        data: {
          name_th: 'จตุจักร',
          name_en: 'Chatuchak',
          description_th: 'ตลาดนัด',
          description_en: 'Weekend market',
          category: 'market',
          budget_band: '500-1000',
          district: 'Chatuchak',
          lat: 13.7995,
          lng: 100.5497,
          mood_tags: 'foodie,cultural',
          image_url: 'https://images.unsplash.com/chatuchak',
          instagram_score: 9,
          opening_hours: '{"sat":"09:00-18:00","sun":"09:00-18:00"}',
          transport_access: 'bts_mrt',
          is_active: true
        },
        status: 'valid',
        errors: [],
        warnings: [],
        isDuplicate: false
      },
      {
        row: 2,
        data: {
          name_th: '',
          name_en: 'Invalid Place',
          description_th: '',
          description_en: '',
          category: 'restaurant',
          budget_band: '1000-2000',
          district: 'Bangkok',
          lat: 0,
          lng: 0,
          mood_tags: '',
          image_url: '',
          instagram_score: 0,
          opening_hours: '',
          transport_access: 'walk',
          is_active: true
        },
        status: 'error',
        errors: ['ต้องระบุชื่อภาษาไทย'],
        warnings: [],
        isDuplicate: false
      }
    ],
    ...overrides
  });

  beforeEach(() => {
    mockOnConfirm.mockClear();
    mockOnCancel.mockClear();
  });

  describe('Basic Rendering', () => {
    it('renders with import result data', () => {
      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('ตรวจสอบข้อมูลก่อนนำเข้า')).toBeInTheDocument();
      expect(screen.getByText('ทั้งหมด')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Total rows
      expect(screen.getByText('ถูกต้อง')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Successful rows
    });

    it('displays summary cards with correct counts', () => {
      const result = createMockResult({
        summary: {
          totalRows: 5,
          successfulRows: 3,
          errorRows: 1,
          warningRows: 1,
          duplicateRows: 0,
          skippedRows: 0,
          processingTimeMs: 2000,
          readyToImport: 3
        }
      });

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument(); // Total
      expect(screen.getByText('3')).toBeInTheDocument(); // Valid
      expect(screen.getByText('1')).toBeInTheDocument(); // Errors
      expect(screen.getByText('1')).toBeInTheDocument(); // Warnings
    });

    it('shows processing time', () => {
      const result = createMockResult({
        summary: {
          ...createMockResult().summary,
          processingTimeMs: 1500
        }
      });

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/เวลาประมวลผล: 1.5 วินาที/)).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders all tab options', () => {
      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('ตัวอย่างข้อมูล')).toBeInTheDocument();
      expect(screen.getByText('ข้อผิดพลาด')).toBeInTheDocument();
      expect(screen.getByText('คำเตือน')).toBeInTheDocument();
      expect(screen.getByText('ข้อมูลซ้ำ')).toBeInTheDocument();
    });

    it('switches between tabs correctly', () => {
      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Initially should show preview tab
      expect(screen.getByText('จตุจักร')).toBeInTheDocument();

      // Click errors tab
      fireEvent.click(screen.getByText('ข้อผิดพลาด'));
      expect(screen.getByText('ต้องระบุชื่อภาษาไทย')).toBeInTheDocument();

      // Click back to preview
      fireEvent.click(screen.getByText('ตัวอย่างข้อมูล'));
      expect(screen.getByText('จตุจักร')).toBeInTheDocument();
    });

    it('disables tabs with no content', () => {
      const result = createMockResult({
        warnings: [],
        duplicates: []
      });

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const warningsTab = screen.getByText('คำเตือน').closest('button');
      const duplicatesTab = screen.getByText('ข้อมูลซ้ำ').closest('button');

      expect(warningsTab).toHaveClass('opacity-50', 'cursor-not-allowed');
      expect(duplicatesTab).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Preview Data Display', () => {
    it('displays preview data in table format', () => {
      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Check table headers
      expect(screen.getByText('แถว')).toBeInTheDocument();
      expect(screen.getByText('ชื่อ (ไทย)')).toBeInTheDocument();
      expect(screen.getByText('ชื่อ (อังกฤษ)')).toBeInTheDocument();
      expect(screen.getByText('หมวดหมู่')).toBeInTheDocument();
      expect(screen.getByText('สถานะ')).toBeInTheDocument();

      // Check data rows
      expect(screen.getByText('จตุจักร')).toBeInTheDocument();
      expect(screen.getByText('Chatuchak')).toBeInTheDocument();
      expect(screen.getByText('market')).toBeInTheDocument();
    });

    it('shows row status indicators', () => {
      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('ถูกต้อง')).toBeInTheDocument();
      expect(screen.getByText('ข้อผิดพลาด')).toBeInTheDocument();
    });

    it('expands row details when clicked', async () => {
      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Click details button for first row
      const detailsButton = screen.getAllByText('รายละเอียด')[0];
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByText('ละติจูด:')).toBeInTheDocument();
        expect(screen.getByText('ลองจิจูด:')).toBeInTheDocument();
        expect(screen.getByText('13.7995')).toBeInTheDocument();
        expect(screen.getByText('100.5497')).toBeInTheDocument();
      });
    });

    it('collapses row details when clicked again', async () => {
      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Expand details
      const detailsButton = screen.getAllByText('รายละเอียด')[0];
      fireEvent.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByText('ละติจูด:')).toBeInTheDocument();
      });

      // Collapse details
      const hideButton = screen.getByText('ซ่อน');
      fireEvent.click(hideButton);

      await waitFor(() => {
        expect(screen.queryByText('ละติจูด:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Display', () => {
    it('displays error details in errors tab', () => {
      const result = createMockResult({
        errors: [
          {
            row: 2,
            field: 'name_th',
            message: 'ต้องระบุชื่อภาษาไทย',
            value: '',
            severity: 'error'
          },
          {
            row: 3,
            field: 'image_url',
            message: 'URL ไม่ถูกต้อง',
            value: 'invalid-url',
            severity: 'error'
          }
        ]
      });

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Switch to errors tab
      fireEvent.click(screen.getByText('ข้อผิดพลาด'));

      expect(screen.getByText('ต้องระบุชื่อภาษาไทย')).toBeInTheDocument();
      expect(screen.getByText('URL ไม่ถูกต้อง')).toBeInTheDocument();
      expect(screen.getByText('แถว 2')).toBeInTheDocument();
      expect(screen.getByText('แถว 3')).toBeInTheDocument();
    });

    it('groups errors by row', () => {
      const result = createMockResult({
        errors: [
          {
            row: 2,
            field: 'name_th',
            message: 'ต้องระบุชื่อภาษาไทย',
            value: '',
            severity: 'error'
          },
          {
            row: 2,
            field: 'name_en',
            message: 'ต้องระบุชื่อภาษาอังกฤษ',
            value: '',
            severity: 'error'
          }
        ]
      });

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('ข้อผิดพลาด'));

      // Should show both errors under the same row
      const rowSections = screen.getAllByText(/แถว \d+/);
      expect(rowSections).toHaveLength(1); // Only one row section

      expect(screen.getByText('ต้องระบุชื่อภาษาไทย')).toBeInTheDocument();
      expect(screen.getByText('ต้องระบุชื่อภาษาอังกฤษ')).toBeInTheDocument();
    });
  });

  describe('Warning Display', () => {
    it('displays warnings when present', () => {
      const result = createMockResult({
        warnings: [
          {
            row: 1,
            field: 'image_url',
            message: 'ขนาดรูปภาพใหญ่เกินไป',
            value: 'https://example.com/large.jpg',
            severity: 'warning'
          }
        ],
        summary: {
          ...createMockResult().summary,
          warningRows: 1
        }
      });

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('คำเตือน'));

      expect(screen.getByText('ขนาดรูปภาพใหญ่เกินไป')).toBeInTheDocument();
      expect(screen.getByText('แถว 1')).toBeInTheDocument();
    });
  });

  describe('Duplicate Display', () => {
    it('displays duplicates when present', () => {
      const result = createMockResult({
        duplicates: [
          {
            row: 3,
            field: 'name_th',
            message: 'ชื่อซ้ำกับแถว 1',
            value: 'จตุจักร',
            severity: 'warning'
          }
        ],
        summary: {
          ...createMockResult().summary,
          duplicateRows: 1
        }
      });

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('ข้อมูลซ้ำ'));

      expect(screen.getByText('ชื่อซ้ำกับแถว 1')).toBeInTheDocument();
      expect(screen.getByText('แถว 3')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('enables confirm button when there are no errors', () => {
      const result = createMockResult({
        errors: [],
        summary: {
          ...createMockResult().summary,
          errorRows: 0,
          readyToImport: 2
        }
      });

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByText('ยืนยันนำเข้า');
      expect(confirmButton).toBeEnabled();
      expect(screen.getByText('พร้อมนำเข้า 2 รายการ')).toBeInTheDocument();
    });

    it('disables confirm button when there are errors', () => {
      const result = createMockResult(); // Has errors by default

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByText('ยืนยันนำเข้า');
      expect(confirmButton).toBeDisabled();
    });

    it('calls onConfirm when confirm button is clicked', () => {
      const result = createMockResult({
        errors: [],
        summary: {
          ...createMockResult().summary,
          errorRows: 0
        }
      });

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('ยืนยันนำเข้า'));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is clicked', () => {
      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('ยกเลิก'));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('shows retry option when present', () => {
      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          onRetry={() => {}}
        />
      );

      expect(screen.getByText('ลองใหม่')).toBeInTheDocument();
    });
  });

  describe('Search and Filter', () => {
    it('filters preview data by search term', async () => {
      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const searchInput = screen.getByPlaceholderText('ค้นหาข้อมูล...');
      fireEvent.change(searchInput, { target: { value: 'จตุจักร' } });

      await waitFor(() => {
        expect(screen.getByText('จตุจักร')).toBeInTheDocument();
        expect(screen.queryByText('Invalid Place')).not.toBeInTheDocument();
      });
    });

    it('filters by status', async () => {
      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Filter to show only errors
      const statusFilter = screen.getByDisplayValue('all');
      fireEvent.change(statusFilter, { target: { value: 'error' } });

      await waitFor(() => {
        expect(screen.queryByText('จตุจักร')).not.toBeInTheDocument();
        expect(screen.getByText('Invalid Place')).toBeInTheDocument();
      });
    });
  });

  describe('Copy and Export Functions', () => {
    it('copies error details to clipboard', async () => {
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined)
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('ข้อผิดพลาด'));

      const copyButton = screen.getByTitle('คัดลอกข้อผิดพลาด');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
      });
    });

    it('exports error report', () => {
      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();

      // Mock link click
      const mockClick = jest.fn();
      const mockLink = {
        href: '',
        download: '',
        click: mockClick,
        style: {}
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('ข้อผิดพลาด'));

      const exportButton = screen.getByTitle('ดาวน์โหลดรายงานข้อผิดพลาด');
      fireEvent.click(exportButton);

      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading state during confirmation', () => {
      const result = createMockResult({
        errors: [],
        summary: {
          ...createMockResult().summary,
          errorRows: 0
        }
      });

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByText('กำลังนำเข้า...')).toBeInTheDocument();
      expect(screen.getByText('ยืนยันนำเข้า')).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for tabs', () => {
      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const previewTab = screen.getByText('ตัวอย่างข้อมูล').closest('button');
      expect(previewTab).toHaveAttribute('role', 'tab');
    });

    it('supports keyboard navigation for tabs', () => {
      const result = createMockResult();

      render(
        <ImportPreview
          result={result}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const errorsTab = screen.getByText('ข้อผิดพลาด').closest('button');

      // Should be focusable
      errorsTab?.focus();
      expect(errorsTab).toHaveFocus();

      // Enter key should activate tab
      fireEvent.keyDown(errorsTab!, { key: 'Enter' });
      expect(screen.getByText('ต้องระบุชื่อภาษาไทย')).toBeInTheDocument();
    });
  });
});