import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/swipe-events/route';
import type { SwipeEventRequest, SwipeEventResponse, ErrorResponse } from '@/types/swipe-events';

// Mock the analytics aggregator
vi.mock('@/utils/analytics-aggregator', () => ({
  analyticsAggregator: {
    recordEvent: vi.fn()
  }
}));

// Mock the request ID generator
vi.mock('@/utils/request-id', () => ({
  generateRequestId: vi.fn(() => 'test-request-id-123')
}));

describe('/api/swipe-events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console.log mocks
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST endpoint', () => {
    it('should successfully record a valid swipe event', async () => {
      const validSwipeEvent: SwipeEventRequest = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'like',
        direction: 'right',
        velocity: 1.5,
        durationMs: 250,
        viewDurationMs: 5000,
        clientTimestamp: '2024-01-15T10:30:00.000Z'
      };

      const request = new NextRequest('http://localhost:3000/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validSwipeEvent),
      });

      const response = await POST(request);
      const data = await response.json() as SwipeEventResponse;

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        eventId: expect.any(String),
        request_id: 'test-request-id-123',
        recorded: true
      });
    });

    it('should validate session ID format', async () => {
      const invalidSwipeEvent = {
        sessionId: 'invalid-uuid',
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'like',
        direction: 'right'
      };

      const request = new NextRequest('http://localhost:3000/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidSwipeEvent),
      });

      const response = await POST(request);
      const data = await response.json() as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid session ID format');
    });

    it('should validate destination ID format', async () => {
      const invalidSwipeEvent = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        destinationId: 'invalid-uuid',
        action: 'like',
        direction: 'right'
      };

      const request = new NextRequest('http://localhost:3000/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidSwipeEvent),
      });

      const response = await POST(request);
      const data = await response.json() as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid destination ID format');
    });

    it('should validate action enum values', async () => {
      const invalidSwipeEvent = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'invalid_action',
        direction: 'right'
      };

      const request = new NextRequest('http://localhost:3000/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidSwipeEvent),
      });

      const response = await POST(request);
      const data = await response.json() as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid option');
    });

    it('should validate direction enum values', async () => {
      const invalidSwipeEvent = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'like',
        direction: 'invalid_direction'
      };

      const request = new NextRequest('http://localhost:3000/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidSwipeEvent),
      });

      const response = await POST(request);
      const data = await response.json() as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid option');
    });

    it('should validate action/direction consistency for like', async () => {
      const inconsistentEvent = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'like',
        direction: 'left' // Should be 'right' for like
      };

      const request = new NextRequest('http://localhost:3000/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inconsistentEvent),
      });

      const response = await POST(request);
      const data = await response.json() as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_ACTION_DIRECTION');
      expect(data.error.message).toBe('Like action must have right direction');
    });

    it('should validate action/direction consistency for skip', async () => {
      const inconsistentEvent = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'skip',
        direction: 'right' // Should be 'left' for skip
      };

      const request = new NextRequest('http://localhost:3000/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inconsistentEvent),
      });

      const response = await POST(request);
      const data = await response.json() as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_ACTION_DIRECTION');
      expect(data.error.message).toBe('Skip action must have left direction');
    });

    it('should validate action/direction consistency for detail_tap', async () => {
      const inconsistentEvent = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'detail_tap',
        direction: 'right' // Should be 'tap' for detail_tap
      };

      const request = new NextRequest('http://localhost:3000/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inconsistentEvent),
      });

      const response = await POST(request);
      const data = await response.json() as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_ACTION_DIRECTION');
      expect(data.error.message).toBe('Detail tap action must have tap direction');
    });

    it('should validate optional numeric fields', async () => {
      const invalidEvent = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'like',
        direction: 'right',
        velocity: -1, // Should be >= 0
        durationMs: -100, // Should be >= 0
      };

      const request = new NextRequest('http://localhost:3000/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidEvent),
      });

      const response = await POST(request);
      const data = await response.json() as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle missing required fields', async () => {
      const incompleteEvent = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        // Missing destinationId, action, direction
      };

      const request = new NextRequest('http://localhost:3000/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incompleteEvent),
      });

      const response = await POST(request);
      const data = await response.json() as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{ invalid json',
      });

      const response = await POST(request);
      const data = await response.json() as ErrorResponse;

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should include correct response headers', async () => {
      const validSwipeEvent: SwipeEventRequest = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'like',
        direction: 'right'
      };

      const request = new NextRequest('http://localhost:3000/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validSwipeEvent),
      });

      const response = await POST(request);

      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    });
  });

  describe('GET endpoint (health check)', () => {
    it('should return batch processing status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        batchQueue: {
          length: expect.any(Number),
          maxSize: 100,
          timeoutMs: 5000,
          hasPendingTimeout: expect.any(Boolean)
        },
        system: {
          timestamp: expect.any(String),
          status: 'healthy'
        }
      });
    });

    it('should include no-cache headers for health check', async () => {
      const response = await GET();

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    });
  });

  describe('Performance requirements', () => {
    it('should respond within 100ms for successful requests', async () => {
      const validSwipeEvent: SwipeEventRequest = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'like',
        direction: 'right'
      };

      const request = new NextRequest('http://localhost:3000/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validSwipeEvent),
      });

      const startTime = performance.now();
      await POST(request);
      const endTime = performance.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(100); // S-08 requirement: <100ms
    });
  });
});