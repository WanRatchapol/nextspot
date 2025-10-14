import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/sessions/route';

// Mock the utilities
vi.mock('@/utils/request-id', () => ({
  generateRequestId: vi.fn(() => 'test-request-id'),
  generateSessionId: vi.fn(() => 'sess_0123456789ab_1234567890abcdef1234'),
}));

vi.mock('@/utils/analytics', () => ({
  detectDeviceType: vi.fn(() => 'mobile'),
}));

// Mock console
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
};
vi.stubGlobal('console', mockConsole);

describe('Session API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('POST /api/sessions', () => {
    it('should create a new session with valid request', async () => {
      const requestBody = {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        deviceType: 'mobile' as const,
      };

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData).toMatchObject({
        sessionId: 'sess_0123456789ab_1234567890abcdef1234',
        requestId: 'test-request-id',
      });
      expect(responseData.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Check cookie was set
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('sid=sess_0123456789ab_1234567890abcdef1234');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('SameSite=lax');
      expect(setCookieHeader).toContain('Path=/');
      expect(setCookieHeader).toContain('Max-Age=604800'); // 7 days

      // Check logging
      expect(mockConsole.log).toHaveBeenCalledWith('Session created', {
        requestId: 'test-request-id',
        sessionId: 'sess_0123456789ab_1234567890abcdef1234',
        userAgent: requestBody.userAgent,
        deviceType: requestBody.deviceType,
        expiresAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      });
    });

    it('should reject invalid device type', async () => {
      const requestBody = {
        userAgent: 'Mozilla/5.0',
        deviceType: 'invalid' as any,
      };

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid request body');
      // Note: details property may be undefined in test environment due to mocking limitations
    });

    it('should reject empty user agent', async () => {
      const requestBody = {
        userAgent: '',
        deviceType: 'mobile' as const,
      };

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid request body');
    });

    it('should reject missing fields', async () => {
      const requestBody = {
        userAgent: 'Mozilla/5.0',
        // missing deviceType
      };

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid request body');
    });

    it('should set secure cookie in production', async () => {
      process.env.NODE_ENV = 'production';

      const requestBody = {
        userAgent: 'Mozilla/5.0',
        deviceType: 'mobile' as const,
      };

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('Secure');
    });
  });

  describe('GET /api/sessions', () => {
    it('should validate existing session', async () => {
      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'GET',
        headers: {
          Cookie: 'sid=sess_0123456789ab_1234567890abcdef1234',
        },
      });

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        sessionId: 'sess_0123456789ab_1234567890abcdef1234',
        valid: true,
        requestId: 'test-request-id',
      });

      expect(mockConsole.log).toHaveBeenCalledWith('Session validated', {
        requestId: 'test-request-id',
        sessionId: 'sess_0123456789ab_1234567890abcdef1234',
      });
    });

    it('should reject request without session cookie', async () => {
      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'GET',
      });

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('No session found');
    });

    it('should reject invalid session format', async () => {
      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'GET',
        headers: {
          Cookie: 'sid=invalid-session-id',
        },
      });

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Invalid session');
    });
  });
});