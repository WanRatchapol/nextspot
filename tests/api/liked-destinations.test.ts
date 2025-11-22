// API tests for liked destinations endpoints
// S-09 Liked List & Completion feature

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getLiked, POST as addLiked } from '@/app/api/sessions/[sessionId]/liked/route';
import { DELETE as removeLiked } from '@/app/api/sessions/[sessionId]/liked/[destinationId]/route';
import { POST as completeSession, GET as getCompletion } from '@/app/api/sessions/[sessionId]/complete/route';

// Mock the request ID utility
vi.mock('@/utils/request-id', () => ({
  generateRequestId: () => 'test-request-id',
}));

// Helper function to create NextRequest
function createRequest(method: string, body?: any): NextRequest {
  const url = 'http://localhost:3000/api/test';
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(url, init);
}

describe('Liked Destinations API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any in-memory storage between tests
    // In a real implementation, this would reset the database
  });

  describe('GET /api/sessions/[sessionId]/liked', () => {
    it('should return empty list for new session', async () => {
      const request = createRequest('GET');
      const params = { params: { sessionId: 'sess_test123' } };

      const response = await getLiked(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.destinations).toEqual([]);
      expect(data.count).toBe(0);
      expect(data.success).toBe(true);
    });

    it('should reject invalid session ID', async () => {
      const request = createRequest('GET');
      const params = { params: { sessionId: 'invalid_session' } };

      const response = await getLiked(request, params);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('INVALID_SESSION');
    });

    it('should return session timing data', async () => {
      const request = createRequest('GET');
      const params = { params: { sessionId: 'sess_test123' } };

      const response = await getLiked(request, params);
      const data = await response.json();

      expect(data.sessionTiming).toBeDefined();
      expect(data.sessionTiming.preferencesMs).toBeTypeOf('number');
      expect(data.sessionTiming.swipingMs).toBeTypeOf('number');
      expect(data.sessionTiming.totalMs).toBeTypeOf('number');
    });
  });

  describe('POST /api/sessions/[sessionId]/liked', () => {
    const validLikedData = {
      destinationId: 'dest_1',
      likedAt: '2023-10-01T10:00:00.000Z',
      swipeVelocity: 2.5,
      viewDurationMs: 3000,
      swipeAction: 'like',
      swipeDirection: 'right',
    };

    it('should add destination to liked list', async () => {
      const request = createRequest('POST', validLikedData);
      const params = { params: { sessionId: 'sess_test123' } };

      const response = await addLiked(request, params);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.destinationId).toBe('dest_1');
      expect(data.success).toBe(true);
      expect(data.id).toBeDefined();
    });

    it('should reject invalid session ID', async () => {
      const request = createRequest('POST', validLikedData);
      const params = { params: { sessionId: 'invalid_session' } };

      const response = await addLiked(request, params);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('INVALID_SESSION');
    });

    it('should validate request body', async () => {
      const invalidData = {
        destinationId: '', // Empty string should fail validation
        likedAt: 'invalid-date',
        swipeAction: 'invalid_action',
      };

      const request = createRequest('POST', invalidData);
      const params = { params: { sessionId: 'sess_test123' } };

      const response = await addLiked(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject non-existent destination', async () => {
      const invalidDestinationData = {
        ...validLikedData,
        destinationId: 'dest_nonexistent',
      };

      const request = createRequest('POST', invalidDestinationData);
      const params = { params: { sessionId: 'sess_test123' } };

      const response = await addLiked(request, params);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('DESTINATION_NOT_FOUND');
    });

    it('should prevent duplicate likes', async () => {
      const request1 = createRequest('POST', validLikedData);
      const request2 = createRequest('POST', validLikedData);
      const params = { params: { sessionId: 'sess_test123' } };

      // Add destination first time
      const response1 = await addLiked(request1, params);
      expect(response1.status).toBe(201);

      // Try to add same destination again
      const response2 = await addLiked(request2, params);
      const data2 = await response2.json();

      expect(response2.status).toBe(409);
      expect(data2.error.code).toBe('ALREADY_LIKED');
    });
  });

  describe('DELETE /api/sessions/[sessionId]/liked/[destinationId]', () => {
    beforeEach(async () => {
      // Add a destination to remove in tests
      const request = createRequest('POST', {
        destinationId: 'dest_1',
        likedAt: '2023-10-01T10:00:00.000Z',
        swipeAction: 'like',
        swipeDirection: 'right',
      });
      const params = { params: { sessionId: 'sess_test123' } };
      await addLiked(request, params);
    });

    it('should remove destination from liked list', async () => {
      const request = createRequest('DELETE');
      const params = { params: { sessionId: 'sess_test123', destinationId: 'dest_1' } };

      const response = await removeLiked(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.destinationId).toBe('dest_1');
      expect(data.removed).toBe(true);
      expect(data.remainingCount).toBe(0);
    });

    it('should reject invalid session ID', async () => {
      const request = createRequest('DELETE');
      const params = { params: { sessionId: 'invalid_session', destinationId: 'dest_1' } };

      const response = await removeLiked(request, params);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('INVALID_SESSION');
    });

    it('should return 404 for non-existent destination', async () => {
      const request = createRequest('DELETE');
      const params = { params: { sessionId: 'sess_test123', destinationId: 'dest_nonexistent' } };

      const response = await removeLiked(request, params);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/sessions/[sessionId]/complete', () => {
    const validCompleteData = {
      finalSelections: ['dest_1', 'dest_2'],
      sessionTiming: {
        preferencesMs: 30000,
        swipingMs: 120000,
        reviewMs: 15000,
        totalMs: 165000,
      },
      completedAt: '2023-10-01T10:15:00.000Z',
    };

    it('should complete session successfully', async () => {
      const request = createRequest('POST', validCompleteData);
      const params = { params: { sessionId: 'sess_test123' } };

      const response = await completeSession(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionId).toBe('sess_test123');
      expect(data.finalSelectionCount).toBe(2);
      expect(data.success).toBe(true);
      expect(data.metadata).toBeDefined();
    });

    it('should reject invalid session ID', async () => {
      const request = createRequest('POST', validCompleteData);
      const params = { params: { sessionId: 'invalid_session' } };

      const response = await completeSession(request, params);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('INVALID_SESSION');
    });

    it('should validate request body', async () => {
      const invalidData = {
        finalSelections: 'not-an-array',
        sessionTiming: {
          preferencesMs: -1, // Negative value should fail
        },
        completedAt: 'invalid-date',
      };

      const request = createRequest('POST', invalidData);
      const params = { params: { sessionId: 'sess_test123' } };

      const response = await completeSession(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent double completion', async () => {
      const request1 = createRequest('POST', validCompleteData);
      const request2 = createRequest('POST', validCompleteData);
      const params = { params: { sessionId: 'sess_test123' } };

      // Complete session first time
      const response1 = await completeSession(request1, params);
      expect(response1.status).toBe(200);

      // Try to complete again
      const response2 = await completeSession(request2, params);
      const data2 = await response2.json();

      expect(response2.status).toBe(409);
      expect(data2.error.code).toBe('ALREADY_COMPLETED');
    });

    it('should calculate metadata correctly', async () => {
      const request = createRequest('POST', validCompleteData);
      const params = { params: { sessionId: 'sess_test123' } };

      const response = await completeSession(request, params);
      const data = await response.json();

      expect(data.metadata.averageDecisionTime).toBe(82500); // 165000 / 2
      expect(data.metadata.completionRate).toBe(1.0);
      expect(data.metadata.sessionBreakdown).toBeDefined();
    });
  });

  describe('GET /api/sessions/[sessionId]/complete', () => {
    beforeEach(async () => {
      // Complete a session for testing
      const request = createRequest('POST', {
        finalSelections: ['dest_1'],
        sessionTiming: {
          preferencesMs: 30000,
          swipingMs: 60000,
          reviewMs: 10000,
          totalMs: 100000,
        },
        completedAt: '2023-10-01T10:10:00.000Z',
      });
      const params = { params: { sessionId: 'sess_test123' } };
      await completeSession(request, params);
    });

    it('should return completion status for completed session', async () => {
      const request = createRequest('GET');
      const params = { params: { sessionId: 'sess_test123' } };

      const response = await getCompletion(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionId).toBe('sess_test123');
      expect(data.completed).toBe(true);
      expect(data.finalSelections).toEqual(['dest_1']);
    });

    it('should return 404 for non-completed session', async () => {
      const request = createRequest('GET');
      const params = { params: { sessionId: 'sess_newSession' } };

      const response = await getCompletion(request, params);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_COMPLETED');
    });

    it('should reject invalid session ID', async () => {
      const request = createRequest('GET');
      const params = { params: { sessionId: 'invalid_session' } };

      const response = await getCompletion(request, params);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('INVALID_SESSION');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow', async () => {
      const sessionId = 'sess_workflow_test';

      // 1. Add multiple destinations
      for (let i = 1; i <= 3; i++) {
        const request = createRequest('POST', {
          destinationId: `dest_${i}`,
          likedAt: new Date().toISOString(),
          swipeAction: 'like',
          swipeDirection: 'right',
        });
        const params = { params: { sessionId } };
        const response = await addLiked(request, params);
        expect(response.status).toBe(201);
      }

      // 2. Get liked destinations
      const getLikedRequest = createRequest('GET');
      const getLikedParams = { params: { sessionId } };
      const getLikedResponse = await getLiked(getLikedRequest, getLikedParams);
      const likedData = await getLikedResponse.json();

      expect(likedData.count).toBe(3);

      // 3. Remove one destination
      const removeRequest = createRequest('DELETE');
      const removeParams = { params: { sessionId, destinationId: 'dest_2' } };
      const removeResponse = await removeLiked(removeRequest, removeParams);
      expect(removeResponse.status).toBe(200);

      // 4. Complete session
      const completeRequest = createRequest('POST', {
        finalSelections: ['dest_1', 'dest_3'],
        sessionTiming: {
          preferencesMs: 20000,
          swipingMs: 80000,
          reviewMs: 10000,
          totalMs: 110000,
        },
        completedAt: new Date().toISOString(),
      });
      const completeParams = { params: { sessionId } };
      const completeResponse = await completeSession(completeRequest, completeParams);
      const completeData = await completeResponse.json();

      expect(completeResponse.status).toBe(200);
      expect(completeData.finalSelectionCount).toBe(2);
    });
  });
});