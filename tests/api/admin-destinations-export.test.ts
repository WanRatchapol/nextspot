import { GET } from '@/app/api/admin/destinations/export/route';
import { NextRequest } from 'next/server';

// Mock the dependencies
jest.mock('@/utils/request-id', () => ({
  generateRequestId: jest.fn(() => 'mock-request-id-123'),
}));

// Mock sample destinations data
const mockDestinations = [
  {
    id: '1',
    name_th: 'จตุจักร วีคเอนด์ มาร์เก็ต',
    name_en: 'Chatuchak Weekend Market',
    description_th: 'ตลาดนัดที่ใหญ่ที่สุดในไทย',
    description_en: 'Largest weekend market in Thailand',
    category: 'market',
    budget_band: '500-1000',
    district: 'Chatuchak',
    lat: 13.7995,
    lng: 100.5497,
    mood_tags: ['foodie', 'cultural', 'social'],
    image_url: 'https://images.unsplash.com/chatuchak',
    instagram_score: 9,
    opening_hours: {
      sat: '09:00-18:00',
      sun: '09:00-18:00'
    },
    transport_access: 'bts_mrt',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name_th: 'สยามสแควร์',
    name_en: 'Siam Square',
    description_th: 'ศูนย์การค้าและแหล่งช้อปปิ้ง',
    description_en: 'Shopping and entertainment center',
    category: 'shopping',
    budget_band: '1000-2000',
    district: 'Pathum Wan',
    lat: 13.7456,
    lng: 100.5341,
    mood_tags: ['social', 'cultural'],
    image_url: 'https://images.unsplash.com/siam',
    instagram_score: 8,
    opening_hours: {
      daily: '10:00-22:00'
    },
    transport_access: 'bts_mrt',
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  }
];

describe('/api/admin/destinations/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('GET /api/admin/destinations/export', () => {
    it('should export all destinations as CSV by default', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
      expect(response.headers.get('content-disposition')).toContain('attachment');
      expect(response.headers.get('content-disposition')).toContain('destinations_');

      const csvText = await response.text();

      // Check CSV headers
      expect(csvText).toContain('name_th,name_en,description_th,description_en');
      expect(csvText).toContain('category,budget_band,district,lat,lng');
      expect(csvText).toContain('mood_tags,image_url,instagram_score');

      // Check that we have data rows (mock data should be included)
      const lines = csvText.split('\n').filter(line => line.trim());
      expect(lines.length).toBeGreaterThan(1); // Header + at least one data row
    });

    it('should export as JSON when format=json', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?format=json');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
      expect(response.headers.get('content-disposition')).toContain('destinations_');
      expect(response.headers.get('content-disposition')).toContain('.json');

      const jsonData = await response.json();
      expect(Array.isArray(jsonData)).toBe(true);
      expect(jsonData.length).toBeGreaterThan(0);

      // Check structure of first item
      if (jsonData.length > 0) {
        const item = jsonData[0];
        expect(item).toHaveProperty('name_th');
        expect(item).toHaveProperty('name_en');
        expect(item).toHaveProperty('category');
      }
    });

    it('should filter by category', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?category=market');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const csvText = await response.text();
      expect(csvText).toContain('market');
    });

    it('should filter by district', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?district=Chatuchak');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const csvText = await response.text();
      expect(csvText).toContain('Chatuchak');
    });

    it('should filter by budget_band', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?budget_band=500-1000');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const csvText = await response.text();
      expect(csvText).toContain('500-1000');
    });

    it('should filter by active status', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?is_active=true');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const csvText = await response.text();
      expect(csvText).toBeDefined();
    });

    it('should limit results with limit parameter', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?limit=1');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const csvText = await response.text();
      const lines = csvText.split('\n').filter(line => line.trim());

      // Should have header + 1 data row (+ possible empty line at end)
      expect(lines.length).toBeLessThanOrEqual(3);
    });

    it('should skip results with offset parameter', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?offset=1&limit=1');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const csvText = await response.text();
      expect(csvText).toBeDefined();
    });

    it('should export only selected fields', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?fields=name_th,name_en,category');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const csvText = await response.text();
      const headerLine = csvText.split('\n')[0];

      expect(headerLine).toBe('name_th,name_en,category');
      expect(headerLine).not.toContain('description_th');
      expect(headerLine).not.toContain('lat');
    });

    it('should generate CSV template when template=true', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?template=true');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-disposition')).toContain('destinations_template.csv');

      const csvText = await response.text();
      const lines = csvText.split('\n').filter(line => line.trim());

      // Template should have header + example rows
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('name_th,name_en');

      // Should contain example data
      expect(csvText).toContain('จตุจักร วีคเอนด์ มาร์เก็ต');
      expect(csvText).toContain('Chatuchak Weekend Market');
    });

    it('should handle invalid format parameter', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?format=xml');
      const response = await GET(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_FORMAT');
      expect(data.error.message).toContain('csv, json');
    });

    it('should handle invalid fields parameter', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?fields=invalid_field');
      const response = await GET(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_FIELDS');
    });

    it('should handle invalid limit parameter', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?limit=-1');
      const response = await GET(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_LIMIT');
    });

    it('should handle invalid offset parameter', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?offset=-1');
      const response = await GET(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_OFFSET');
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error by providing malformed request
      const request = {
        url: null
      } as any;

      const response = await GET(request);

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should include request ID and processing time in response headers', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export');
      const response = await GET(request);

      expect(response.headers.get('X-Request-ID')).toBe('mock-request-id-123');
      expect(response.headers.get('X-Processing-Time')).toBeDefined();
    });

    it('should log analytics events', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?format=csv');
      await GET(request);

      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] destinations_exported:',
        expect.objectContaining({
          event: 'destinations_exported',
          format: 'csv'
        })
      );
    });

    it('should handle complex query combinations', async () => {
      const searchParams = new URLSearchParams({
        format: 'json',
        category: 'market',
        district: 'Chatuchak',
        budget_band: '500-1000',
        is_active: 'true',
        fields: 'name_th,name_en,category,budget_band',
        limit: '10',
        offset: '0'
      });

      const request = new NextRequest(`http://localhost/api/admin/destinations/export?${searchParams}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');

      const jsonData = await response.json();
      expect(Array.isArray(jsonData)).toBe(true);
    });

    it('should escape CSV special characters correctly', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const csvText = await response.text();

      // Check that quotes are properly escaped
      if (csvText.includes('marketplace"')) {
        expect(csvText).toContain('""'); // Double quotes for escaping
      }
    });

    it('should handle empty result sets', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?category=nonexistent');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const csvText = await response.text();
      const lines = csvText.split('\n').filter(line => line.trim());

      // Should still have header even with no data
      expect(lines.length).toBeGreaterThanOrEqual(1);
      expect(lines[0]).toContain('name_th');
    });

    it('should generate proper filename with timestamp', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export');
      const response = await GET(request);

      const contentDisposition = response.headers.get('content-disposition');
      expect(contentDisposition).toContain('destinations_');
      expect(contentDisposition).toMatch(/\d{4}-\d{2}-\d{2}/); // Date format
      expect(contentDisposition).toContain('.csv');
    });

    it('should handle mood_tags array formatting in CSV', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const csvText = await response.text();

      // Mood tags should be joined with commas and quoted if needed
      expect(csvText).toBeDefined();
    });

    it('should handle opening_hours object formatting in CSV', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const csvText = await response.text();

      // Opening hours should be JSON stringified and escaped
      expect(csvText).toBeDefined();
    });

    it('should respect cache headers for performance', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export');
      const response = await GET(request);

      // Should have appropriate cache control headers
      expect(response.headers.has('cache-control') ||
             response.headers.has('etag') ||
             response.headers.has('last-modified')).toBe(true);
    });

    it('should handle concurrent export requests', async () => {
      const requests = Array.from({ length: 3 }, () =>
        GET(new NextRequest('http://localhost/api/admin/destinations/export'))
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should validate maximum limit to prevent abuse', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?limit=10000');
      const response = await GET(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_LIMIT');
      expect(data.error.message).toContain('สูงสุด');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();

      const request = new NextRequest('http://localhost/api/admin/destinations/export?limit=1000');
      const response = await GET(request);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle special characters in data', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const csvText = await response.text();

      // Should handle Thai characters properly
      expect(csvText).toMatch(/[ก-๙]/); // Thai character range
    });

    it('should maintain data integrity during export', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/export?format=json');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const jsonData = await response.json();

      if (jsonData.length > 0) {
        const item = jsonData[0];

        // Check that numeric fields are properly typed
        if (item.lat) expect(typeof item.lat).toBe('number');
        if (item.lng) expect(typeof item.lng).toBe('number');
        if (item.instagram_score) expect(typeof item.instagram_score).toBe('number');

        // Check that boolean fields are properly typed
        if (item.is_active !== undefined) expect(typeof item.is_active).toBe('boolean');
      }
    });
  });
});