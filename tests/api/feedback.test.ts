import { POST, GET } from '@/app/api/feedback/route';
import { NextRequest } from 'next/server';

// Mock the generateRequestId utility
jest.mock('@/utils/request-id', () => ({
  generateRequestId: jest.fn(() => 'mock-request-id-123'),
}));

describe('/api/feedback', () => {
  beforeEach(() => {
    // Clear console mocks
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('POST /api/feedback', () => {
    const validFeedbackPayload = {
      sessionId: 'session-123',
      validationSessionId: 'validation-456',
      satisfaction: 4,
      perceivedDuration: 'faster',
      wouldRecommend: true,
      comments: 'Great experience!',
      actualDuration: 180000,
      completedAt: '2025-01-01T10:03:00.000Z',
    };

    it('successfully submits valid feedback', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(validFeedbackPayload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        feedbackId: expect.stringMatching(/^feedback_\d+_[a-z0-9]+$/),
        recorded: true,
        validationResults: {
          targetMet: true, // 180000ms (3 min) < 300000ms (5 min)
          satisfactionLevel: 'good', // rating 4
        },
        request_id: 'mock-request-id-123',
      });
    });

    it('calculates target achievement correctly', async () => {
      const slowPayload = {
        ...validFeedbackPayload,
        actualDuration: 400000, // 6 minutes 40 seconds (over 5 min limit)
      };

      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(slowPayload),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.validationResults.targetMet).toBe(false);
    });

    it('calculates satisfaction levels correctly', async () => {
      const satisfactionTests = [
        { rating: 5, expected: 'excellent' },
        { rating: 4, expected: 'good' },
        { rating: 3, expected: 'average' },
        { rating: 2, expected: 'poor' },
        { rating: 1, expected: 'poor' },
      ];

      for (const test of satisfactionTests) {
        const payload = {
          ...validFeedbackPayload,
          satisfaction: test.rating,
        };

        const request = new NextRequest('http://localhost/api/feedback', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.validationResults.satisfactionLevel).toBe(test.expected);
      }
    });

    it('handles missing required fields', async () => {
      const invalidPayload = {
        sessionId: 'session-123',
        // Missing validationSessionId
        satisfaction: 4,
        perceivedDuration: 'faster',
        wouldRecommend: true,
        actualDuration: 180000,
        completedAt: '2025-01-01T10:03:00.000Z',
      };

      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toHaveProperty('validationSessionId');
    });

    it('validates satisfaction rating range', async () => {
      const invalidPayload = {
        ...validFeedbackPayload,
        satisfaction: 6, // Invalid: must be 1-5
      };

      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('validates duration perception enum', async () => {
      const invalidPayload = {
        ...validFeedbackPayload,
        perceivedDuration: 'invalid_value',
      };

      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('validates comments length', async () => {
      const invalidPayload = {
        ...validFeedbackPayload,
        comments: 'a'.repeat(1001), // Exceeds 1000 character limit
      };

      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('validates actual duration minimum', async () => {
      const invalidPayload = {
        ...validFeedbackPayload,
        actualDuration: -100, // Negative duration
      };

      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('handles optional comments field', async () => {
      const payloadWithoutComments = {
        ...validFeedbackPayload,
        comments: undefined,
      };

      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(payloadWithoutComments),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.recorded).toBe(true);
    });

    it('handles malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('logs analytics events correctly', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(validFeedbackPayload),
      });

      await POST(request);

      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] feedback_submitted:',
        expect.objectContaining({
          sessionId: 'session-123',
          satisfaction: 4,
          perceivedDuration: 'faster',
          wouldRecommend: true,
          targetMet: true,
          satisfactionLevel: 'good',
        })
      );
    });

    it('logs target achievement analytics', async () => {
      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(validFeedbackPayload),
      });

      await POST(request);

      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] validation_target_met:',
        expect.objectContaining({
          sessionId: 'session-123',
          actualDuration: 180000,
          target: 300000,
        })
      );
    });
  });

  describe('GET /api/feedback', () => {
    beforeEach(async () => {
      // Submit some test feedback first
      const testPayloads = [
        {
          sessionId: 'session-1',
          validationSessionId: 'validation-1',
          satisfaction: 5,
          perceivedDuration: 'faster',
          wouldRecommend: true,
          actualDuration: 120000,
          completedAt: '2025-01-01T10:02:00.000Z',
        },
        {
          sessionId: 'session-2',
          validationSessionId: 'validation-2',
          satisfaction: 3,
          perceivedDuration: 'slower',
          wouldRecommend: false,
          actualDuration: 400000,
          completedAt: '2025-01-01T10:07:00.000Z',
        },
      ];

      for (const payload of testPayloads) {
        const request = new NextRequest('http://localhost/api/feedback', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        await POST(request);
      }
    });

    it('returns analytics summary', async () => {
      const request = new NextRequest('http://localhost/api/feedback?');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('metrics');
      expect(data.metrics).toMatchObject({
        avgSatisfaction: expect.any(Number),
        speedValidation: {
          fasterPerception: expect.any(Number),
          targetMet: expect.any(Number),
          avgActualDuration: expect.any(Number),
        },
        recommendationRate: expect.any(Number),
        completionRate: expect.any(Number),
        totalFeedback: expect.any(Number),
      });
    });

    it('calculates metrics correctly', async () => {
      const request = new NextRequest('http://localhost/api/feedback?');
      const response = await GET(request);
      const data = await response.json();

      expect(data.metrics.avgSatisfaction).toBe(4); // (5 + 3) / 2
      expect(data.metrics.speedValidation.fasterPerception).toBe(0.5); // 1 out of 2 felt faster
      expect(data.metrics.speedValidation.targetMet).toBe(0.5); // 1 out of 2 met target
      expect(data.metrics.recommendationRate).toBe(0.5); // 1 out of 2 would recommend
      expect(data.metrics.totalFeedback).toBe(2);
    });

    it('returns feedback for specific session', async () => {
      const request = new NextRequest('http://localhost/api/feedback?sessionId=session-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('feedback');
      expect(data.feedback).toHaveLength(1);
      expect(data.feedback[0]).toMatchObject({
        satisfaction: 5,
        perceivedDuration: 'faster',
        wouldRecommend: true,
        actualDurationMs: 120000,
      });
    });

    it('returns empty metrics when no feedback exists', async () => {
      // This test assumes a fresh store, but since we're using in-memory storage
      // and previous tests added data, we'll test the empty state logic
      const request = new NextRequest('http://localhost/api/feedback?sessionId=nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.feedback).toHaveLength(0);
    });

    it('handles server errors gracefully', async () => {
      // Mock a server error
      const originalError = console.error;
      console.error = jest.fn();

      // Create a request that will trigger an error (simulate by breaking URL parsing)
      const request = {
        url: null, // This should cause an error
      } as any;

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');

      console.error = originalError;
    });
  });

  describe('Feedback Analytics Integration', () => {
    it('tracks all required analytics events', async () => {
      const payload = validFeedbackPayload;

      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      await POST(request);

      // Should log feedback submission
      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] feedback_submitted:',
        expect.any(Object)
      );

      // Should log target achievement (since duration is under 5 min)
      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] validation_target_met:',
        expect.any(Object)
      );
    });

    it('does not log target achievement when target is not met', async () => {
      const slowPayload = {
        ...validFeedbackPayload,
        actualDuration: 400000, // Over 5 minutes
      };

      const request = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify(slowPayload),
      });

      await POST(request);

      // Should log feedback submission but not target achievement
      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] feedback_submitted:',
        expect.any(Object)
      );

      expect(console.log).not.toHaveBeenCalledWith(
        '[Analytics] validation_target_met:',
        expect.any(Object)
      );
    });
  });
});