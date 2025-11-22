import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileDropzone, CompactFileDropzone } from '@/components/FileDropzone';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('FileDropzone Component', () => {
  const mockOnFileSelect = jest.fn();
  const mockOnFileError = jest.fn();

  beforeEach(() => {
    mockOnFileSelect.mockClear();
    mockOnFileError.mockClear();
  });

  describe('FileDropzone', () => {
    it('renders with default props', () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
        />
      );

      expect(screen.getByText('อัปโหลดไฟล์ CSV')).toBeInTheDocument();
      expect(screen.getByText('ลากไฟล์มาวางหรือคลิกเพื่อเลือกไฟล์')).toBeInTheDocument();
      expect(screen.getByText('รองรับไฟล์: .csv')).toBeInTheDocument();
    });

    it('renders with custom props', () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
          title="Custom Title"
          description="Custom Description"
          acceptedTypes={['.csv', '.xlsx']}
          maxSizeBytes={5 * 1024 * 1024}
        />
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom Description')).toBeInTheDocument();
      expect(screen.getByText('รองรับไฟล์: .csv, .xlsx')).toBeInTheDocument();
      expect(screen.getByText('ขนาดสูงสุด: 5 MB')).toBeInTheDocument();
    });

    it('handles file selection via click', async () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
        />
      );

      const csvContent = 'name,value\ntest,123';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const dropzone = screen.getByRole('button', { hidden: true }).parentElement;
      const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

      // Simulate file selection
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file);
      });
    });

    it('validates file type', async () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
          acceptedTypes={['.csv']}
        />
      );

      const txtContent = 'This is not a CSV file';
      const file = new File([txtContent], 'test.txt', { type: 'text/plain' });

      const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockOnFileError).toHaveBeenCalledWith(
          expect.stringContaining('.csv')
        );
        expect(mockOnFileSelect).not.toHaveBeenCalled();
      });
    });

    it('validates file size', async () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
          maxSizeBytes={1024} // 1KB limit
        />
      );

      const largeContent = 'a'.repeat(2048); // 2KB content
      const file = new File([largeContent], 'large.csv', { type: 'text/csv' });

      const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockOnFileError).toHaveBeenCalledWith(
          expect.stringContaining('ใหญ่เกินไป')
        );
        expect(mockOnFileSelect).not.toHaveBeenCalled();
      });
    });

    it('validates empty file', async () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
        />
      );

      const emptyFile = new File([''], 'empty.csv', { type: 'text/csv' });

      const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [emptyFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockOnFileError).toHaveBeenCalledWith('ไฟล์ว่างเปล่า');
        expect(mockOnFileSelect).not.toHaveBeenCalled();
      });
    });

    it('handles drag and drop', async () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
        />
      );

      const csvContent = 'name,value\ntest,123';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const dropzone = screen.getByText('อัปโหลดไฟล์ CSV').closest('div');

      // Simulate drag enter
      fireEvent.dragEnter(dropzone!, {
        dataTransfer: {
          files: [file],
        },
      });

      // Simulate drop
      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [file],
        },
      });

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file);
      });
    });

    it('shows drag over state', () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
        />
      );

      const dropzone = screen.getByText('อัปโหลดไฟล์ CSV').closest('div');

      fireEvent.dragEnter(dropzone!);

      expect(dropzone).toHaveClass('border-blue-400', 'bg-blue-50');
    });

    it('clears drag over state on drag leave', () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
        />
      );

      const dropzone = screen.getByText('อัปโหลดไฟล์ CSV').closest('div');

      fireEvent.dragEnter(dropzone!);
      expect(dropzone).toHaveClass('border-blue-400');

      fireEvent.dragLeave(dropzone!, {
        clientX: 0,
        clientY: 0,
      });

      expect(dropzone).not.toHaveClass('border-blue-400');
    });

    it('displays selected file information', async () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
          showFileInfo={true}
        />
      );

      const csvContent = 'name,value\ntest,123';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument();
        expect(screen.getByText(/text\/csv/)).toBeInTheDocument();
      });
    });

    it('allows clearing selected file', async () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
          showFileInfo={true}
        />
      );

      const csvContent = 'name,value\ntest,123';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument();
      });

      // Click clear button
      const clearButton = screen.getByTitle('ลบไฟล์');
      fireEvent.click(clearButton);

      expect(screen.queryByText('test.csv')).not.toBeInTheDocument();
    });

    it('respects disabled state', () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
          disabled={true}
        />
      );

      const dropzone = screen.getByText('อัปโหลดไฟล์ CSV').closest('div');
      expect(dropzone).toHaveClass('opacity-50', 'cursor-not-allowed');

      // Try to interact - should not trigger callbacks
      fireEvent.click(dropzone!);
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('shows loading state during processing', async () => {
      const slowOnFileSelect = jest.fn(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      render(
        <FileDropzone
          onFileSelect={slowOnFileSelect}
          onFileError={mockOnFileError}
        />
      );

      const csvContent = 'name,value\ntest,123';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Should show loading state
      expect(screen.getByText('กำลังประมวลผล...')).toBeInTheDocument();

      // Wait for processing to complete
      await waitFor(() => {
        expect(slowOnFileSelect).toHaveBeenCalledWith(file);
      });
    });

    it('formats file sizes correctly', async () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
          showFileInfo={true}
        />
      );

      // Test different file sizes
      const testCases = [
        { size: 500, expected: '500 B' },
        { size: 1536, expected: '2 KB' }, // 1.5 KB rounded up
        { size: 1048576, expected: '1 MB' },
      ];

      for (const testCase of testCases) {
        const content = 'a'.repeat(testCase.size);
        const file = new File([content], 'test.csv', { type: 'text/csv' });

        const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });

        fireEvent.change(fileInput);

        await waitFor(() => {
          expect(screen.getByText(new RegExp(testCase.expected))).toBeInTheDocument();
        });

        // Clear for next test
        const clearButton = screen.getByTitle('ลบไฟล์');
        fireEvent.click(clearButton);
      }
    });
  });

  describe('CompactFileDropzone', () => {
    it('renders compact version correctly', () => {
      render(
        <CompactFileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
        />
      );

      expect(screen.getByText('เลือกไฟล์ CSV')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('border-dashed');
    });

    it('handles file selection in compact mode', async () => {
      render(
        <CompactFileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
        />
      );

      const csvContent = 'name,value\ntest,123';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file);
        expect(screen.getByText('test.csv')).toBeInTheDocument();
      });
    });

    it('respects disabled state in compact mode', () => {
      render(
        <CompactFileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('shows selected file name in compact mode', async () => {
      render(
        <CompactFileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
        />
      );

      const csvContent = 'name,value\ntest,123';
      const file = new File([csvContent], 'destinations.csv', { type: 'text/csv' });

      const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('destinations.csv')).toBeInTheDocument();
      });

      // Button should have green styling for selected state
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-green-400', 'bg-green-50');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
        />
      );

      const fileInput = screen.getByRole('button', { hidden: true });
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', '.csv');
    });

    it('supports keyboard navigation', () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
        />
      );

      const dropzone = screen.getByText('อัปโหลดไฟล์ CSV').closest('div');

      // Should be focusable
      fireEvent.focus(dropzone!);
      expect(dropzone).toHaveFocus();

      // Enter key should trigger file selection
      fireEvent.keyDown(dropzone!, { key: 'Enter' });
      // File input should be triggered (though we can't easily test this)
    });
  });

  describe('Error Handling', () => {
    it('handles file reader errors gracefully', async () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
        />
      );

      // Create a file that might cause reading issues
      const problematicFile = new File([''], 'test.csv', { type: 'text/csv' });

      const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [problematicFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockOnFileError).toHaveBeenCalledWith('ไฟล์ว่างเปล่า');
      });
    });

    it('handles multiple file selection by taking only the first', async () => {
      render(
        <FileDropzone
          onFileSelect={mockOnFileSelect}
          onFileError={mockOnFileError}
        />
      );

      const file1 = new File(['content1'], 'test1.csv', { type: 'text/csv' });
      const file2 = new File(['content2'], 'test2.csv', { type: 'text/csv' });

      const fileInput = screen.getByRole('button', { hidden: true }) as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [file1, file2],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(file1);
        expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
      });
    });
  });
});