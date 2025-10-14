import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateRequestId, generateSessionId } from '@/utils/request-id';

describe('Request ID Utils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('generateRequestId', () => {
    it('should generate a valid UUID when crypto.randomUUID is available', () => {
      const mockUUID = '123e4567-e89b-12d3-a456-426614174000';

      // Mock crypto.randomUUID
      Object.defineProperty(window, 'crypto', {
        value: {
          randomUUID: vi.fn().mockReturnValue(mockUUID),
        },
        writable: true,
      });

      const requestId = generateRequestId();
      expect(requestId).toBe(mockUUID);
      expect(window.crypto.randomUUID).toHaveBeenCalled();
    });

    it('should generate fallback ID when crypto.randomUUID is not available', () => {
      // Mock Math.random to return predictable values
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.123456789)
        .mockReturnValueOnce(0.987654321);

      // Remove crypto.randomUUID
      Object.defineProperty(window, 'crypto', {
        value: {},
        writable: true,
      });

      const requestId = generateRequestId();

      // Updated regex to match actual implementation (13 chars each, variable length)
      expect(requestId).toMatch(/^req-[a-z0-9]+[a-z0-9]+$/);
      expect(requestId.startsWith('req-')).toBe(true);
      expect(requestId.length).toBeGreaterThan(4); // Must be longer than just 'req-'
    });

    it('should generate fallback ID in server environment', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      // Mock Math.random for consistent testing
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.5);

      const requestId = generateRequestId();

      expect(requestId).toMatch(/^req-[a-z0-9]+$/);
      expect(requestId.startsWith('req-')).toBe(true);

      global.window = originalWindow;
    });

    it('should generate unique IDs on multiple calls', () => {
      // Remove crypto for consistent fallback testing
      Object.defineProperty(window, 'crypto', {
        value: {},
        writable: true,
      });

      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id1.startsWith('req-')).toBe(true);
      expect(id2.startsWith('req-')).toBe(true);
    });
  });

  describe('generateSessionId', () => {
    it('should generate session ID with timestamp prefix', () => {
      const mockTime = 1640995200000; // 2022-01-01 00:00:00
      vi.spyOn(Date, 'now').mockReturnValue(mockTime);

      // Mock Math.random for predictable suffix
      vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

      const sessionId = generateSessionId();

      expect(sessionId).toMatch(/^sess_[a-f0-9]+_[a-f0-9]+$/);
      expect(sessionId.startsWith('sess_')).toBe(true);
      expect(sessionId).toContain(mockTime.toString(16));
    });

    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();

      expect(id1).not.toBe(id2);
      expect(id1.startsWith('sess_')).toBe(true);
      expect(id2.startsWith('sess_')).toBe(true);
    });

    it('should include timestamp in hex format', () => {
      const mockTime = 1640995200000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTime);

      const sessionId = generateSessionId();
      const timestampHex = mockTime.toString(16);

      expect(sessionId).toContain(timestampHex);
    });
  });
});