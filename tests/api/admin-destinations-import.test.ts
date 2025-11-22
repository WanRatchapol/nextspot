import { POST, GET, DELETE } from '@/app/api/admin/destinations/import/route';
import { NextRequest } from 'next/server';

// Mock the dependencies
jest.mock('@/utils/request-id', () => ({
  generateRequestId: jest.fn(() => 'mock-request-id-123'),
}));

jest.mock('@/utils/csv-import', () => ({
  processCSVFile: jest.fn(),
}));

describe('/api/admin/destinations/import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('POST /api/admin/destinations/import', () => {
    it('should handle valid CSV file upload', async () => {
      const { processCSVFile } = require('@/utils/csv-import');

      // Mock successful processing
      processCSVFile.mockResolvedValue({
        summary: {
          totalRows: 2,
          successfulRows: 2,
          errorRows: 0,
          warningRows: 0,
          duplicateRows: 0,
          skippedRows: 0,
          processingTimeMs: 1000
        },
        errors: [],
        warnings: [],
        duplicates: [],
        preview: [
          {
            row: 1,
            data: {
              name_th: 'จตุจักร',
              name_en: 'Chatuchak',
              category: 'market'
            },
            status: 'valid',
            errors: [],
            warnings: [],
            isDuplicate: false
          }
        ]
      });

      // Create form data
      const formData = new FormData();
      const csvContent = 'name_th,name_en,category\n"จตุจักร","Chatuchak","market"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      formData.append('file', file);
      formData.append('options', JSON.stringify({ validateOnly: true }));

      const request = new NextRequest('http://localhost/api/admin/destinations/import', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(2);
      expect(data.errors).toHaveLength(0);
      expect(data.preview).toBeDefined();
    });

    it('should reject non-CSV files', async () => {
      const formData = new FormData();
      const file = new File(['not csv'], 'test.txt', { type: 'text/plain' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost/api/admin/destinations/import', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.errors[0].message).toContain('.csv');
    });

    it('should reject files that are too large', async () => {
      const formData = new FormData();
      // Create a mock file that reports as being too large
      const largeContent = 'a'.repeat(15 * 1024 * 1024); // 15MB
      const file = new File([largeContent], 'large.csv', { type: 'text/csv' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost/api/admin/destinations/import', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.errors[0].message).toContain('ใหญ่เกินไป');
    });

    it('should return 400 for missing file', async () => {
      const formData = new FormData();
      // Don't append any file

      const request = new NextRequest('http://localhost/api/admin/destinations/import', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.errors[0].message).toContain('ไม่พบไฟล์');
    });

    it('should validate import options', async () => {
      const formData = new FormData();
      const csvContent = 'name_th,name_en\n"จตุจักร","Chatuchak"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      formData.append('file', file);
      formData.append('options', JSON.stringify({
        validateOnly: 'not-boolean', // Invalid type
        batchSize: -1 // Invalid value
      }));

      const request = new NextRequest('http://localhost/api/admin/destinations/import', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.errors.length).toBeGreaterThan(0);
    });

    it('should handle CSV processing errors', async () => {
      const { processCSVFile } = require('@/utils/csv-import');

      // Mock processing error
      processCSVFile.mockResolvedValue({
        summary: {
          totalRows: 1,
          successfulRows: 0,
          errorRows: 1,
          warningRows: 0,
          duplicateRows: 0,
          skippedRows: 0,
          processingTimeMs: 500
        },
        errors: [
          {
            row: 1,
            field: 'name_th',
            message: 'ต้องระบุชื่อภาษาไทย',
            value: '',
            severity: 'error'
          }
        ],
        warnings: [],
        duplicates: []
      });

      const formData = new FormData();
      const csvContent = 'name_th,name_en\n,"Chatuchak"'; // Missing Thai name
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      formData.append('file', file);
      formData.append('options', JSON.stringify({ validateOnly: true }));

      const request = new NextRequest('http://localhost/api/admin/destinations/import', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].field).toBe('name_th');
    });

    it('should perform actual import when validateOnly is false', async () => {
      const { processCSVFile } = require('@/utils/csv-import');

      // Mock successful import
      processCSVFile.mockResolvedValue({
        summary: {
          totalRows: 1,
          successfulRows: 1,
          errorRows: 0,
          warningRows: 0,
          duplicateRows: 0,
          skippedRows: 0,
          processingTimeMs: 1200
        },
        errors: [],
        warnings: [],
        duplicates: [],
        importId: 'import_123_abc'
      });

      const formData = new FormData();
      const csvContent = 'name_th,name_en,category\n"จตุจักร","Chatuchak","market"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      formData.append('file', file);
      formData.append('options', JSON.stringify({ validateOnly: false }));

      const request = new NextRequest('http://localhost/api/admin/destinations/import', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.importId).toBe('import_123_abc');

      // Should log import analytics
      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] destinations_imported:',
        expect.objectContaining({
          event: 'destinations_imported',
          importId: 'import_123_abc'
        })
      );
    });

    it('should handle malformed JSON in options', async () => {
      const formData = new FormData();
      const csvContent = 'name_th,name_en\n"จตุจักร","Chatuchak"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      formData.append('file', file);
      formData.append('options', 'invalid json');

      const request = new NextRequest('http://localhost/api/admin/destinations/import', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.errors[0].field).toBe('options');
    });

    it('should handle server errors gracefully', async () => {
      const { processCSVFile } = require('@/utils/csv-import');

      // Mock server error
      processCSVFile.mockRejectedValue(new Error('Database connection failed'));

      const formData = new FormData();
      const csvContent = 'name_th,name_en\n"จตุจักร","Chatuchak"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      formData.append('file', file);
      formData.append('options', JSON.stringify({ validateOnly: true }));

      const request = new NextRequest('http://localhost/api/admin/destinations/import', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.errors[0].field).toBe('system');
    });

    it('should track analytics events correctly', async () => {
      const { processCSVFile } = require('@/utils/csv-import');

      processCSVFile.mockResolvedValue({
        summary: {
          totalRows: 1,
          successfulRows: 1,
          errorRows: 0,
          warningRows: 0,
          duplicateRows: 0,
          skippedRows: 0,
          processingTimeMs: 800
        },
        errors: [],
        warnings: [],
        duplicates: []
      });

      const formData = new FormData();
      const csvContent = 'name_th,name_en\n"จตุจักร","Chatuchak"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      formData.append('file', file);
      formData.append('options', JSON.stringify({ validateOnly: true }));

      const request = new NextRequest('http://localhost/api/admin/destinations/import', {
        method: 'POST',
        body: formData,
      });

      await POST(request);

      // Verify analytics events were logged
      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] csv_upload_initiated:',
        expect.objectContaining({
          event: 'csv_upload_initiated',
          filename: 'test.csv'
        })
      );

      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] csv_validation_completed:',
        expect.objectContaining({
          event: 'csv_validation_completed',
          totalRows: 1,
          errorCount: 0
        })
      );
    });
  });

  describe('GET /api/admin/destinations/import', () => {
    // Note: The current implementation doesn't have a specific import ID route,
    // but we can test the query parameter handling

    it('should return 400 for missing importId', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/import');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('MISSING_IMPORT_ID');
    });

    it('should return 404 for non-existent import', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/import?importId=non-existent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('IMPORT_NOT_FOUND');
    });

    it('should handle server errors in GET', async () => {
      // Mock a server error scenario by providing malformed URL
      const request = {
        url: null
      } as any;

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('DELETE /api/admin/destinations/import', () => {
    it('should return 400 for missing importId', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/import');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('MISSING_IMPORT_ID');
    });

    it('should return 404 for non-existent import', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/import?importId=non-existent');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('IMPORT_NOT_FOUND');
    });
  });

  describe('Request Headers and Metadata', () => {
    it('should include request ID and processing time in response headers', async () => {
      const { processCSVFile } = require('@/utils/csv-import');

      processCSVFile.mockResolvedValue({
        summary: {
          totalRows: 1,
          successfulRows: 1,
          errorRows: 0,
          warningRows: 0,
          duplicateRows: 0,
          skippedRows: 0,
          processingTimeMs: 500
        },
        errors: [],
        warnings: [],
        duplicates: []
      });

      const formData = new FormData();
      const csvContent = 'name_th,name_en\n"จตุจักร","Chatuchak"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      formData.append('file', file);
      formData.append('options', JSON.stringify({ validateOnly: true }));

      const request = new NextRequest('http://localhost/api/admin/destinations/import', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);

      expect(response.headers.get('X-Request-ID')).toBe('mock-request-id-123');
      expect(response.headers.get('X-Processing-Time')).toBeDefined();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty FormData', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/import', {
        method: 'POST',
        body: new FormData(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle concurrent import requests', async () => {
      const { processCSVFile } = require('@/utils/csv-import');

      processCSVFile.mockResolvedValue({
        summary: {
          totalRows: 1,
          successfulRows: 1,
          errorRows: 0,
          warningRows: 0,
          duplicateRows: 0,
          skippedRows: 0,
          processingTimeMs: 300
        },
        errors: [],
        warnings: [],
        duplicates: []
      });

      const createRequest = () => {
        const formData = new FormData();
        const csvContent = 'name_th,name_en\n"จตุจักร","Chatuchak"';
        const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
        formData.append('file', file);
        formData.append('options', JSON.stringify({ validateOnly: true }));

        return new NextRequest('http://localhost/api/admin/destinations/import', {
          method: 'POST',
          body: formData,
        });
      };

      // Process multiple requests concurrently
      const requests = Array.from({ length: 3 }, () => POST(createRequest()));
      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});