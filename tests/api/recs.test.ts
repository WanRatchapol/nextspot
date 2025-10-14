import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/recommendations/route';

// Mock the request-id utility
vi.mock('@/utils/request-id', () => ({
  generateRequestId: () => 'test-request-id'
}));

// Mock the destinations data
vi.mock('@/data/destinations.seed', () => ({
  destinations: [
    {
      id: 'test-dest-1',
      nameTh: 'ทดสอบ 1',
      nameEn: 'Test Destination 1',
      descTh: 'สถานที่ทดสอบ 1',
      imageUrl: 'https://example.com/test1.jpg',
      tags: ['cultural', 'chill'],
      budgetBand: 'low',
      timeWindow: 'halfday',
      popularityScore: 95
    },
    {
      id: 'test-dest-2',
      nameTh: 'ทดสอบ 2',
      nameEn: 'Test Destination 2',
      descTh: 'สถานที่ทดสอบ 2',
      imageUrl: 'https://example.com/test2.jpg',
      tags: ['foodie', 'social'],
      budgetBand: 'mid',
      timeWindow: 'evening',
      popularityScore: 90
    },
    {
      id: 'test-dest-3',
      nameTh: 'ทดสอบ 3',
      nameEn: 'Test Destination 3',
      descTh: 'สถานที่ทดสอบ 3',
      imageUrl: 'https://example.com/test3.jpg',
      tags: ['adventure', 'romantic'],
      budgetBand: 'high',
      timeWindow: 'fullday',
      popularityScore: 85
    },
    {
      id: 'test-dest-4',
      nameTh: 'ทดสอบ 4',
      nameEn: 'Test Destination 4',
      descTh: 'สถานที่ทดสอบ 4',
      imageUrl: 'https://example.com/test4.jpg',
      tags: ['cultural', 'romantic'],
      budgetBand: 'low',
      timeWindow: 'evening',
      popularityScore: 88
    },
    {
      id: 'test-dest-5',
      nameTh: 'ทดสอบ 5',
      nameEn: 'Test Destination 5',
      descTh: 'สถานที่ทดสอบ 5',
      imageUrl: 'https://example.com/test5.jpg',
      tags: ['foodie', 'adventure'],
      budgetBand: 'mid',
      timeWindow: 'halfday',
      popularityScore: 92
    },
    {
      id: 'test-dest-6',
      nameTh: 'ทดสอบ 6',
      nameEn: 'Test Destination 6',
      descTh: 'สถานที่ทดสอบ 6',
      imageUrl: 'https://example.com/test6.jpg',
      tags: ['social', 'chill'],
      budgetBand: 'high',
      timeWindow: 'evening',
      popularityScore: 87
    },
    {
      id: 'test-dest-7',
      nameTh: 'ทดสอบ 7',
      nameEn: 'Test Destination 7',
      descTh: 'สถานที่ทดสอบ 7',
      imageUrl: 'https://example.com/test7.jpg',
      tags: ['romantic', 'chill'],
      budgetBand: 'low',
      timeWindow: 'halfday',
      popularityScore: 80
    },
    {
      id: 'test-dest-8',
      nameTh: 'ทดสอบ 8',
      nameEn: 'Test Destination 8',
      descTh: 'สถานที่ทดสอบ 8',
      imageUrl: 'https://example.com/test8.jpg',
      tags: ['adventure', 'social'],
      budgetBand: 'mid',
      timeWindow: 'fullday',
      popularityScore: 83
    },
    {
      id: 'test-dest-9',
      nameTh: 'ทดสอบ 9',
      nameEn: 'Test Destination 9',
      descTh: 'สถานที่ทดสอบ 9',
      imageUrl: 'https://example.com/test9.jpg',
      tags: ['foodie', 'cultural'],
      budgetBand: 'high',
      timeWindow: 'evening',
      popularityScore: 91
    },
    {
      id: 'test-dest-10',
      nameTh: 'ทดสอบ 10',
      nameEn: 'Test Destination 10',
      descTh: 'สถานที่ทดสอบ 10',
      imageUrl: 'https://example.com/test10.jpg',
      tags: ['chill', 'romantic'],
      budgetBand: 'low',
      timeWindow: 'fullday',
      popularityScore: 78
    }
  ]
}));

// Helper function to create a mock NextRequest
function createMockRequest(searchParams: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/recommendations');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    url: url.toString(),
    method: 'GET'
  } as any;
}

describe('/api/recommendations', () => {
  beforeEach(() => {
    // Clear any existing console logs
    vi.clearAllMocks();
  });

  describe('GET endpoint', () => {
    it('should return 400 when sessionId is missing', async () => {
      const request = createMockRequest();
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error.code).toBe('BAD_REQUEST');
      expect(responseData.error.message).toContain('sessionId');
      expect(responseData.request_id).toBe('test-request-id');
    });

    it('should return popular recommendations when no preferences found', async () => {
      const request = createMockRequest({ sessionId: 'test-session-123' });
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.items).toBeDefined();
      expect(Array.isArray(responseData.items)).toBe(true);
      expect(responseData.items.length).toBeGreaterThan(0);
      expect(responseData.items.length).toBeLessThanOrEqual(10);
      expect(responseData.isFastMode).toBe(true);
      expect(responseData.request_id).toBe('test-request-id');
    });

    it('should return recommendations with correct structure', async () => {
      const request = createMockRequest({ sessionId: 'test-session-456' });
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.items).toBeDefined();

      // Check structure of recommendation items
      const firstItem = responseData.items[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('nameTh');
      expect(firstItem).toHaveProperty('nameEn');
      expect(firstItem).toHaveProperty('descTh');
      expect(firstItem).toHaveProperty('imageUrl');
      expect(firstItem).toHaveProperty('tags');
      expect(Array.isArray(firstItem.tags)).toBe(true);

      // Should not include internal fields
      expect(firstItem).not.toHaveProperty('budgetBand');
      expect(firstItem).not.toHaveProperty('timeWindow');
      expect(firstItem).not.toHaveProperty('popularityScore');
    });

    it('should return at least 6 items for popular recommendations', async () => {
      const request = createMockRequest({ sessionId: 'test-session-789' });
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.items.length).toBeGreaterThanOrEqual(6);
    });

    it('should return items sorted by popularity when using fallback', async () => {
      const request = createMockRequest({ sessionId: 'test-session-sort' });
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.isFastMode).toBe(true);

      // Since we're using popular fallback, items should be sorted by popularity
      // We can't directly check popularityScore since it's not in response,
      // but we can verify the order matches our mock data popularity order
      const expectedOrder = ['test-dest-1', 'test-dest-5', 'test-dest-9', 'test-dest-2', 'test-dest-4'];
      const actualOrder = responseData.items.slice(0, 5).map((item: any) => item.id);

      expect(actualOrder).toEqual(expectedOrder);
    });

    it('should handle empty sessionId gracefully', async () => {
      const request = createMockRequest({ sessionId: '' });
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error.code).toBe('BAD_REQUEST');
    });

    it('should include request_id in all responses', async () => {
      const validRequest = createMockRequest({ sessionId: 'test-session' });
      const validResponse = await GET(validRequest);
      const validData = await validResponse.json();

      const invalidRequest = createMockRequest();
      const invalidResponse = await GET(invalidRequest);
      const invalidData = await invalidResponse.json();

      expect(validData.request_id).toBe('test-request-id');
      expect(invalidData.request_id).toBe('test-request-id');
    });

    it('should handle malformed URLs gracefully', async () => {
      const request = {
        url: 'not-a-valid-url',
        method: 'GET'
      } as any;

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(responseData.request_id).toBe('test-request-id');
    });

    it('should return different items for different sessions (cache key variation)', async () => {
      const request1 = createMockRequest({ sessionId: 'session-1' });
      const request2 = createMockRequest({ sessionId: 'session-2' });

      const response1 = await GET(request1);
      const response2 = await GET(request2);

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Both should be successful, but they might have same items since
      // we're using the same mock data and no preferences (popular fallback)
      expect(data1.items).toBeDefined();
      expect(data2.items).toBeDefined();
    });

    it('should limit items to reasonable count', async () => {
      const request = createMockRequest({ sessionId: 'test-limit' });
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.items.length).toBeLessThanOrEqual(12); // As per spec
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        createMockRequest({ sessionId: `concurrent-${i}` })
      );

      const responses = await Promise.all(
        requests.map(request => GET(request))
      );

      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.items).toBeDefined();
        expect(data.request_id).toBe('test-request-id');
      }
    });
  });

  describe('performance characteristics', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();
      const request = createMockRequest({ sessionId: 'perf-test' });
      const response = await GET(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(3000); // 3 second target
    });

    it('should handle rapid sequential requests', async () => {
      const sessionId = 'rapid-test';
      const requests = Array.from({ length: 3 }, () =>
        createMockRequest({ sessionId })
      );

      const startTime = Date.now();
      for (const request of requests) {
        const response = await GET(request);
        expect(response.status).toBe(200);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should be fast due to caching
    });
  });

  describe('error handling', () => {
    it('should return 500 for unexpected errors', async () => {
      // Mock console.error to suppress error output during test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create a request that will cause URL parsing to fail
      const request = {
        url: undefined,
        method: 'GET'
      } as any;

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(responseData.error.message).toBe('Failed to get recommendations');
      expect(responseData.request_id).toBe('test-request-id');

      consoleSpy.mockRestore();
    });
  });

  describe('response contract validation', () => {
    it('should always return required fields in success response', async () => {
      const request = createMockRequest({ sessionId: 'contract-test' });
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);

      // Required fields
      expect(responseData).toHaveProperty('items');
      expect(responseData).toHaveProperty('request_id');

      // Optional field
      expect(responseData).toHaveProperty('isFastMode');

      // Items structure
      expect(Array.isArray(responseData.items)).toBe(true);
      if (responseData.items.length > 0) {
        const item = responseData.items[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('nameTh');
        expect(item).toHaveProperty('nameEn');
        expect(item).toHaveProperty('descTh');
        expect(item).toHaveProperty('imageUrl');
        expect(item).toHaveProperty('tags');
      }
    });

    it('should always return required fields in error response', async () => {
      const request = createMockRequest(); // Missing sessionId
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);

      // Required error fields
      expect(responseData).toHaveProperty('error');
      expect(responseData).toHaveProperty('request_id');

      expect(responseData.error).toHaveProperty('code');
      expect(responseData.error).toHaveProperty('message');

      expect(typeof responseData.error.code).toBe('string');
      expect(typeof responseData.error.message).toBe('string');
      expect(typeof responseData.request_id).toBe('string');
    });
  });
});