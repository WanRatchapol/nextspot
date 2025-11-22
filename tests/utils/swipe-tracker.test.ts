import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SwipeTracker } from '@/utils/swipe-tracker';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => 1000) // Fixed timestamp for consistent testing
  }
});

describe('SwipeTracker', () => {
  let tracker: SwipeTracker;

  beforeEach(() => {
    vi.clearAllMocks();
    tracker = new SwipeTracker();

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Session Management', () => {
    it('should set and get session ID', () => {
      const sessionId = '123e4567-e89b-12d3-a456-426614174000';

      tracker.setSessionId(sessionId);

      expect(tracker.getSessionId()).toBe(sessionId);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('nextspot-session-id', sessionId);
    });

    it('should load session ID from localStorage on initialization', () => {
      const sessionId = '123e4567-e89b-12d3-a456-426614174000';
      mockLocalStorage.getItem.mockReturnValue(sessionId);

      const newTracker = new SwipeTracker();

      expect(newTracker.getSessionId()).toBe(sessionId);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('nextspot-session-id');
    });

    it('should return null when no session ID is set', () => {
      expect(tracker.getSessionId()).toBeNull();
    });
  });

  describe('Event Recording', () => {
    beforeEach(() => {
      tracker.setSessionId('123e4567-e89b-12d3-a456-426614174000');

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          eventId: 'event-123',
          request_id: 'req-123',
          recorded: true
        })
      });
    });

    it('should record a basic swipe event', async () => {
      const eventData = {
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'like' as const,
        direction: 'right' as const
      };

      await tracker.recordSwipe(eventData);

      expect(mockFetch).toHaveBeenCalledWith('/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventData,
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          clientTimestamp: expect.any(String)
        })
      });
    });

    it('should record a swipe event with gesture data', async () => {
      const eventData = {
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'skip' as const,
        direction: 'left' as const,
        velocity: 2.5,
        durationMs: 300,
        viewDurationMs: 5000
      };

      await tracker.recordSwipe(eventData);

      expect(mockFetch).toHaveBeenCalledWith('/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventData,
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          clientTimestamp: expect.any(String)
        })
      });
    });

    it('should not record event when no session ID is set', async () => {
      const trackerWithoutSession = new SwipeTracker();

      await trackerWithoutSession.recordSwipe({
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'like',
        direction: 'right'
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        '[SwipeTracker] No session ID set, cannot record swipe event'
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await tracker.recordSwipe({
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'like',
        direction: 'right'
      });

      expect(console.error).toHaveBeenCalledWith(
        '[SwipeTracker] Failed to record swipe event:',
        expect.any(Error)
      );
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid data'
          },
          request_id: 'req-123'
        })
      });

      await expect(tracker.recordSwipe({
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'like',
        direction: 'right'
      })).rejects.toThrow('API Error: Invalid data (VALIDATION_ERROR)');
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      tracker.setSessionId('123e4567-e89b-12d3-a456-426614174000');

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          eventId: 'event-123',
          request_id: 'req-123',
          recorded: true
        })
      });
    });

    it('should record like action', async () => {
      await tracker.recordLike('987fcdeb-51a2-43e5-a123-987654321000', {
        velocity: 1.5,
        durationMs: 250,
        viewDurationMs: 3000
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
          action: 'like',
          direction: 'right',
          velocity: 1.5,
          durationMs: 250,
          viewDurationMs: 3000,
          clientTimestamp: expect.any(String)
        })
      });
    });

    it('should record skip action', async () => {
      await tracker.recordSkip('987fcdeb-51a2-43e5-a123-987654321000', {
        velocity: 2.0,
        durationMs: 200,
        viewDurationMs: 2500
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
          action: 'skip',
          direction: 'left',
          velocity: 2.0,
          durationMs: 200,
          viewDurationMs: 2500,
          clientTimestamp: expect.any(String)
        })
      });
    });

    it('should record detail tap action', async () => {
      await tracker.recordDetailTap('987fcdeb-51a2-43e5-a123-987654321000', {
        viewDurationMs: 4000
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/swipe-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
          action: 'detail_tap',
          direction: 'tap',
          viewDurationMs: 4000,
          clientTimestamp: expect.any(String)
        })
      });
    });
  });

  describe('Gesture Metrics Calculation', () => {
    it('should calculate gesture metrics correctly', () => {
      const metrics = SwipeTracker.calculateGestureMetrics(
        1000, // startTime
        1250, // endTime (250ms duration)
        100,  // startX
        200,  // startY
        300,  // endX (moved 200px right)
        220   // endY (moved 20px down)
      );

      expect(metrics.durationMs).toBe(250);
      expect(metrics.distance).toBeCloseTo(201.246, 2); // sqrt((200)^2 + (20)^2)
      expect(metrics.velocity).toBeCloseTo(0.805, 2); // distance / duration
      expect(metrics.direction).toBe('right'); // Horizontal movement, positive deltaX
    });

    it('should detect left swipe direction', () => {
      const metrics = SwipeTracker.calculateGestureMetrics(
        1000, 1200, // 200ms
        300, 200,   // start position
        100, 220    // end position (moved 200px left)
      );

      expect(metrics.direction).toBe('left');
    });

    it('should detect tap when movement is below threshold', () => {
      const metrics = SwipeTracker.calculateGestureMetrics(
        1000, 1100, // 100ms
        200, 200,   // start position
        220, 210    // end position (moved 20px - below 50px threshold)
      );

      expect(metrics.direction).toBe('tap');
    });

    it('should handle zero duration gracefully', () => {
      const metrics = SwipeTracker.calculateGestureMetrics(
        1000, 1000, // Same time
        100, 100,
        200, 100
      );

      expect(metrics.durationMs).toBe(0);
      expect(metrics.velocity).toBe(0);
    });
  });

  describe('Action From Direction Helper', () => {
    it('should return correct action for right direction', () => {
      expect(SwipeTracker.getActionFromDirection('right')).toBe('like');
    });

    it('should return correct action for left direction', () => {
      expect(SwipeTracker.getActionFromDirection('left')).toBe('skip');
    });

    it('should return correct action for tap direction', () => {
      expect(SwipeTracker.getActionFromDirection('tap')).toBe('detail_tap');
    });
  });

  describe('Health Check', () => {
    it('should return true for healthy API', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const isHealthy = await tracker.checkHealth();

      expect(isHealthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/swipe-events', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should return false for unhealthy API', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const isHealthy = await tracker.checkHealth();

      expect(isHealthy).toBe(false);
    });

    it('should return false when API throws error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const isHealthy = await tracker.checkHealth();

      expect(isHealthy).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        '[SwipeTracker] Health check failed:',
        expect.any(Error)
      );
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      tracker.setSessionId('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should warn about slow responses', async () => {
      // Mock performance.now to simulate slow response
      let callCount = 0;
      vi.mocked(window.performance.now).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 1000 : 1150; // 150ms response time
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          eventId: 'event-123',
          request_id: 'req-123',
          recorded: true
        })
      });

      await tracker.recordSwipe({
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'like',
        direction: 'right'
      });

      expect(console.warn).toHaveBeenCalledWith(
        '[SwipeTracker] Slow event recording: 150.00ms'
      );
    });

    it('should not warn for fast responses', async () => {
      // Mock performance.now to simulate fast response
      let callCount = 0;
      vi.mocked(window.performance.now).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 1000 : 1050; // 50ms response time
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          eventId: 'event-123',
          request_id: 'req-123',
          recorded: true
        })
      });

      await tracker.recordSwipe({
        destinationId: '987fcdeb-51a2-43e5-a123-987654321000',
        action: 'like',
        direction: 'right'
      });

      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});