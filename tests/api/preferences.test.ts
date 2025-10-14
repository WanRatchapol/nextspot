import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT } from '@/app/api/sessions/[id]/preferences/route';

// Mock the request-id utility
vi.mock('@/utils/request-id', () => ({
  generateRequestId: () => 'test-request-id'
}));

// Helper function to create a mock NextRequest
function createMockRequest(body: any, method = 'PUT') {
  return {
    json: vi.fn().mockResolvedValue(body),
    method: () => method,
    url: 'http://localhost:3000/api/sessions/test-session-id/preferences'
  } as any;
}

describe('/api/sessions/[id]/preferences', () => {
  let mockParams: Promise<{ id: string }>;

  beforeEach(() => {
    mockParams = Promise.resolve({ id: 'test-session-id' });
  });

  describe('PUT endpoint', () => {
    it('should return 200 with valid preferences payload', async () => {
      const validPayload = {
        budgetBand: 'mid' as const,
        moodTags: ['chill', 'foodie'],
        timeWindow: 'halfday' as const
      };

      const request = createMockRequest(validPayload);
      const response = await PUT(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        sessionId: 'test-session-id',
        prefs: validPayload,
        request_id: 'test-request-id'
      });
    });

    it('should return 400 for empty moodTags array', async () => {
      const invalidPayload = {
        budgetBand: 'mid' as const,
        moodTags: [], // Empty array should fail
        timeWindow: 'halfday' as const
      };

      const request = createMockRequest(invalidPayload);
      const response = await PUT(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error.code).toBe('BAD_REQUEST');
      expect(responseData.error.message).toContain('Must select at least one mood');
      expect(responseData.request_id).toBe('test-request-id');
    });

    it('should return 400 for invalid budgetBand', async () => {
      const invalidPayload = {
        budgetBand: 'invalid' as any,
        moodTags: ['chill'],
        timeWindow: 'halfday' as const
      };

      const request = createMockRequest(invalidPayload);
      const response = await PUT(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error.code).toBe('BAD_REQUEST');
      expect(responseData.error.message).toContain('budgetBand');
      expect(responseData.request_id).toBe('test-request-id');
    });

    it('should return 400 for invalid moodTags values', async () => {
      const invalidPayload = {
        budgetBand: 'mid' as const,
        moodTags: ['invalid-mood'] as any,
        timeWindow: 'halfday' as const
      };

      const request = createMockRequest(invalidPayload);
      const response = await PUT(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error.code).toBe('BAD_REQUEST');
      expect(responseData.error.message).toContain('Invalid option');
      expect(responseData.request_id).toBe('test-request-id');
    });

    it('should return 400 for invalid timeWindow', async () => {
      const invalidPayload = {
        budgetBand: 'mid' as const,
        moodTags: ['chill'],
        timeWindow: 'invalid' as any
      };

      const request = createMockRequest(invalidPayload);
      const response = await PUT(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error.code).toBe('BAD_REQUEST');
      expect(responseData.error.message).toContain('timeWindow');
      expect(responseData.request_id).toBe('test-request-id');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidPayload = {
        budgetBand: 'mid' as const,
        // Missing moodTags and timeWindow
      };

      const request = createMockRequest(invalidPayload);
      const response = await PUT(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error.code).toBe('BAD_REQUEST');
      expect(responseData.request_id).toBe('test-request-id');
    });

    it('should handle JSON parsing errors', async () => {
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        method: () => 'PUT',
        url: 'http://localhost:3000/api/sessions/test-session-id/preferences'
      } as any;

      const response = await PUT(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(responseData.request_id).toBe('test-request-id');
    });

    it('should accept all valid enum values', async () => {
      const testCases = [
        {
          budgetBand: 'low' as const,
          moodTags: ['chill'],
          timeWindow: 'evening' as const
        },
        {
          budgetBand: 'high' as const,
          moodTags: ['adventure', 'cultural', 'social'],
          timeWindow: 'fullday' as const
        },
        {
          budgetBand: 'mid' as const,
          moodTags: ['foodie', 'romantic'],
          timeWindow: 'halfday' as const
        }
      ];

      for (const payload of testCases) {
        const request = createMockRequest(payload);

        const response = await PUT(request, { params: mockParams });
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.prefs).toEqual(payload);
      }
    });

    it('should accept all valid mood combinations', async () => {
      const allMoods = ['chill', 'adventure', 'foodie', 'cultural', 'social', 'romantic'];

      const payload = {
        budgetBand: 'mid' as const,
        moodTags: allMoods,
        timeWindow: 'halfday' as const
      };

      const request = createMockRequest(payload);

      const response = await PUT(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.prefs.moodTags).toEqual(allMoods);
    });
  });
});