import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectDeviceType,
  fireEvent,
  fireLandingPageView,
  fireCtaClick,
  type AnalyticsEvent
} from '@/utils/analytics';
import * as requestIdModule from '@/utils/request-id';

// Mock console.log for testing
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('Analytics Utils', () => {
  beforeEach(() => {
    // Mock window object
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 390,
    });

    Object.defineProperty(window, 'navigator', {
      writable: true,
      configurable: true,
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
      },
    });

    // Reset console spy
    consoleSpy.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('detectDeviceType', () => {
    it('should detect mobile device correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 390 });
      expect(detectDeviceType()).toBe('mobile');
    });

    it('should detect tablet device correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 800 });
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)' },
      });
      expect(detectDeviceType()).toBe('tablet');
    });

    it('should detect desktop device correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920 });
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      });
      expect(detectDeviceType()).toBe('desktop');
    });

    it('should fallback to desktop when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      expect(detectDeviceType()).toBe('desktop');
      global.window = originalWindow;
    });
  });

  describe('fireEvent', () => {
    it('should log event in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const testEvent: AnalyticsEvent = {
        event: 'test_event',
        properties: { test: 'value' },
      };

      fireEvent(testEvent);

      expect(consoleSpy).toHaveBeenCalledWith('[Analytics]', expect.objectContaining({
        event: 'test_event',
        properties: { test: 'value' },
        timestamp: expect.any(Number),
      }));

      process.env.NODE_ENV = originalEnv;
    });

    it('should add timestamp if not provided', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const testEvent: AnalyticsEvent = {
        event: 'test_event',
        properties: { test: 'value' },
      };

      const beforeTime = Date.now();
      fireEvent(testEvent);
      const afterTime = Date.now();

      expect(consoleSpy).toHaveBeenCalledWith('[Analytics]', expect.objectContaining({
        timestamp: expect.any(Number),
      }));

      const loggedEvent = consoleSpy.mock.calls[0][1] as AnalyticsEvent;
      expect(loggedEvent.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(loggedEvent.timestamp).toBeLessThanOrEqual(afterTime);

      process.env.NODE_ENV = originalEnv;
    });

    it('should not log in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const testEvent: AnalyticsEvent = {
        event: 'test_event',
        properties: { test: 'value' },
      };

      fireEvent(testEvent);

      expect(consoleSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('fireLandingPageView', () => {
    it('should fire landing page view event with correct structure', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Mock generateRequestId
      const mockRequestId = 'test-request-id';
      vi.spyOn(requestIdModule, 'generateRequestId').mockReturnValue(mockRequestId);

      const sessionId = 'test-session';
      fireLandingPageView(sessionId);

      expect(consoleSpy).toHaveBeenCalledWith('[Analytics]', expect.objectContaining({
        event: 'landing_page_view',
        properties: expect.objectContaining({
          sessionId,
          deviceType: 'mobile',
          timestamp: expect.any(Number),
          userAgent: expect.any(String),
          requestId: mockRequestId,
        }),
      }));

      process.env.NODE_ENV = originalEnv;
    });

    it('should work without sessionId', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      fireLandingPageView();

      expect(consoleSpy).toHaveBeenCalledWith('[Analytics]', expect.objectContaining({
        event: 'landing_page_view',
        properties: expect.objectContaining({
          sessionId: undefined,
          deviceType: 'mobile',
        }),
      }));

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('fireCtaClick', () => {
    it('should fire CTA click event with correct structure', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Mock generateRequestId
      const mockRequestId = 'test-request-id';
      vi.spyOn(requestIdModule, 'generateRequestId').mockReturnValue(mockRequestId);

      const buttonText = 'เริ่มต้นเลือกสถานที่';
      const destination = '/prefs';
      const sessionId = 'test-session';

      fireCtaClick(buttonText, destination, sessionId);

      expect(consoleSpy).toHaveBeenCalledWith('[Analytics]', expect.objectContaining({
        event: 'cta_click',
        properties: expect.objectContaining({
          sessionId,
          buttonText,
          destination,
          timestamp: expect.any(Number),
          requestId: mockRequestId,
        }),
      }));

      process.env.NODE_ENV = originalEnv;
    });

    it('should work without sessionId', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const buttonText = 'Test Button';
      const destination = '/test';

      fireCtaClick(buttonText, destination);

      expect(consoleSpy).toHaveBeenCalledWith('[Analytics]', expect.objectContaining({
        event: 'cta_click',
        properties: expect.objectContaining({
          sessionId: undefined,
          buttonText,
          destination,
        }),
      }));

      process.env.NODE_ENV = originalEnv;
    });
  });
});