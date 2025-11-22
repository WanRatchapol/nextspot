import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalyticsAggregator } from '@/utils/analytics-aggregator';
import type { SwipeEventData } from '@/types/swipe-events';

describe('AnalyticsAggregator', () => {
  let aggregator: AnalyticsAggregator;

  beforeEach(() => {
    aggregator = new AnalyticsAggregator();
    vi.clearAllMocks();

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock Date.now for consistent testing
    vi.spyOn(Date, 'now').mockReturnValue(1640995200000); // Fixed timestamp: 2022-01-01 00:00:00 UTC
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Event Recording', () => {
    it('should record a basic swipe event', () => {
      const eventData: SwipeEventData = {
        sessionId: 'session-123',
        destinationId: 'dest-456',
        action: 'like',
        direction: 'right'
      };

      aggregator.recordEvent(eventData);

      const overallMetrics = aggregator.getOverallMetrics();
      expect(overallMetrics.totalEvents).toBe(1);
      expect(overallMetrics.eventsByAction.like).toBe(1);
      expect(overallMetrics.eventsByAction.skip).toBe(0);
      expect(overallMetrics.eventsByAction.detail_tap).toBe(0);
    });

    it('should record multiple events and aggregate correctly', () => {
      const events: SwipeEventData[] = [
        {
          sessionId: 'session-123',
          destinationId: 'dest-456',
          action: 'like',
          direction: 'right',
          viewDurationMs: 5000
        },
        {
          sessionId: 'session-123',
          destinationId: 'dest-789',
          action: 'skip',
          direction: 'left',
          viewDurationMs: 3000
        },
        {
          sessionId: 'session-456',
          destinationId: 'dest-456',
          action: 'detail_tap',
          direction: 'tap',
          viewDurationMs: 8000
        }
      ];

      events.forEach(event => aggregator.recordEvent(event));

      const overallMetrics = aggregator.getOverallMetrics();
      expect(overallMetrics.totalEvents).toBe(3);
      expect(overallMetrics.eventsByAction.like).toBe(1);
      expect(overallMetrics.eventsByAction.skip).toBe(1);
      expect(overallMetrics.eventsByAction.detail_tap).toBe(1);
      expect(overallMetrics.totalSessions).toBe(2);
    });

    it('should handle events with gesture data', () => {
      const eventData: SwipeEventData = {
        sessionId: 'session-123',
        destinationId: 'dest-456',
        action: 'like',
        direction: 'right',
        velocity: 2.5,
        durationMs: 300,
        viewDurationMs: 4500
      };

      aggregator.recordEvent(eventData);

      const sessionAnalytics = aggregator.getSessionAnalytics('session-123');
      expect(sessionAnalytics).not.toBeNull();
      expect(sessionAnalytics!.totalSwipes).toBe(1);
      expect(sessionAnalytics!.likeRate).toBe(1.0);
    });
  });

  describe('Destination Analytics', () => {
    it('should aggregate destination metrics correctly', () => {
      const events: SwipeEventData[] = [
        {
          sessionId: 'session-123',
          destinationId: 'dest-456',
          action: 'like',
          direction: 'right',
          viewDurationMs: 5000
        },
        {
          sessionId: 'session-123',
          destinationId: 'dest-456',
          action: 'skip',
          direction: 'left',
          viewDurationMs: 3000
        },
        {
          sessionId: 'session-456',
          destinationId: 'dest-456',
          action: 'detail_tap',
          direction: 'tap',
          viewDurationMs: 8000
        }
      ];

      events.forEach(event => aggregator.recordEvent(event));

      const destAnalytics = aggregator.getDestinationAnalytics('dest-456');
      expect(destAnalytics).not.toBeNull();
      expect(destAnalytics!.destinationId).toBe('dest-456');
      expect(destAnalytics!.likeCount).toBe(1);
      expect(destAnalytics!.skipCount).toBe(1);
      expect(destAnalytics!.detailTapCount).toBe(1);
      expect(destAnalytics!.avgViewDuration).toBeCloseTo(5.333, 2); // (5000 + 3000 + 8000) / 3 / 1000
    });

    it('should return null for non-existent destination', () => {
      const destAnalytics = aggregator.getDestinationAnalytics('non-existent');
      expect(destAnalytics).toBeNull();
    });

    it('should calculate average view duration correctly', () => {
      const events: SwipeEventData[] = [
        {
          sessionId: 'session-123',
          destinationId: 'dest-456',
          action: 'like',
          direction: 'right',
          viewDurationMs: 2000
        },
        {
          sessionId: 'session-123',
          destinationId: 'dest-456',
          action: 'skip',
          direction: 'left',
          viewDurationMs: 4000
        }
      ];

      events.forEach(event => aggregator.recordEvent(event));

      const destAnalytics = aggregator.getDestinationAnalytics('dest-456');
      expect(destAnalytics!.avgViewDuration).toBe(3); // (2000 + 4000) / 2 / 1000 = 3 seconds
    });
  });

  describe('Session Analytics', () => {
    it('should track session metrics correctly', () => {
      const events: SwipeEventData[] = [
        {
          sessionId: 'session-123',
          destinationId: 'dest-456',
          action: 'like',
          direction: 'right',
          viewDurationMs: 3000
        },
        {
          sessionId: 'session-123',
          destinationId: 'dest-789',
          action: 'skip',
          direction: 'left',
          viewDurationMs: 2000
        },
        {
          sessionId: 'session-123',
          destinationId: 'dest-101',
          action: 'like',
          direction: 'right',
          viewDurationMs: 4000
        }
      ];

      events.forEach(event => aggregator.recordEvent(event));

      const sessionAnalytics = aggregator.getSessionAnalytics('session-123');
      expect(sessionAnalytics).not.toBeNull();
      expect(sessionAnalytics!.sessionId).toBe('session-123');
      expect(sessionAnalytics!.totalSwipes).toBe(3);
      expect(sessionAnalytics!.likeRate).toBeCloseTo(0.667, 2);
      expect(sessionAnalytics!.avgDecisionTime).toBe(3); // (3000 + 2000 + 4000) / 3 / 1000
    });

    it('should return null for non-existent session', () => {
      const sessionAnalytics = aggregator.getSessionAnalytics('non-existent');
      expect(sessionAnalytics).toBeNull();
    });

    it('should calculate session duration correctly', () => {
      // Mock Date.now to simulate session progress
      let currentTime = 1640995200000; // Start time
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const eventData: SwipeEventData = {
        sessionId: 'session-123',
        destinationId: 'dest-456',
        action: 'like',
        direction: 'right'
      };

      aggregator.recordEvent(eventData);

      // Simulate time passing
      currentTime += 30000; // 30 seconds later
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      aggregator.recordEvent({
        ...eventData,
        destinationId: 'dest-789'
      });

      const sessionAnalytics = aggregator.getSessionAnalytics('session-123');
      expect(sessionAnalytics!.sessionDuration).toBe(30); // 30 seconds
    });
  });

  describe('Overall Metrics', () => {
    it('should calculate overall system metrics', () => {
      const events: SwipeEventData[] = [
        {
          sessionId: 'session-123',
          destinationId: 'dest-456',
          action: 'like',
          direction: 'right'
        },
        {
          sessionId: 'session-123',
          destinationId: 'dest-789',
          action: 'skip',
          direction: 'left'
        },
        {
          sessionId: 'session-456',
          destinationId: 'dest-456',
          action: 'like',
          direction: 'right'
        }
      ];

      events.forEach(event => aggregator.recordEvent(event));

      const overallMetrics = aggregator.getOverallMetrics();
      expect(overallMetrics.totalEvents).toBe(3);
      expect(overallMetrics.totalSessions).toBe(2);
      expect(overallMetrics.avgLikeRate).toBe(0.75); // (1/2 + 1/1) / 2 = 0.75
      expect(overallMetrics.eventsByAction.like).toBe(2);
      expect(overallMetrics.eventsByAction.skip).toBe(1);
    });

    it('should return top destinations by engagement', () => {
      const events: SwipeEventData[] = [
        // dest-456: 3 events
        { sessionId: 'session-1', destinationId: 'dest-456', action: 'like', direction: 'right' },
        { sessionId: 'session-1', destinationId: 'dest-456', action: 'skip', direction: 'left' },
        { sessionId: 'session-1', destinationId: 'dest-456', action: 'like', direction: 'right' },
        // dest-789: 2 events
        { sessionId: 'session-2', destinationId: 'dest-789', action: 'like', direction: 'right' },
        { sessionId: 'session-2', destinationId: 'dest-789', action: 'like', direction: 'right' },
        // dest-101: 1 event
        { sessionId: 'session-3', destinationId: 'dest-101', action: 'skip', direction: 'left' }
      ];

      events.forEach(event => aggregator.recordEvent(event));

      const overallMetrics = aggregator.getOverallMetrics();
      const topDestinations = overallMetrics.topDestinations;

      expect(topDestinations).toHaveLength(3);
      expect(topDestinations[0].destinationId).toBe('dest-456');
      expect(topDestinations[0].totalEvents).toBe(3);
      expect(topDestinations[0].likeRate).toBeCloseTo(0.667, 2);
      expect(topDestinations[1].destinationId).toBe('dest-789');
      expect(topDestinations[1].totalEvents).toBe(2);
      expect(topDestinations[2].destinationId).toBe('dest-101');
      expect(topDestinations[2].totalEvents).toBe(1);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', () => {
      // Mock performance.now for timing
      let callCount = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => {
        callCount++;
        return callCount * 10; // Each call takes 10ms
      });

      const eventData: SwipeEventData = {
        sessionId: 'session-123',
        destinationId: 'dest-456',
        action: 'like',
        direction: 'right'
      };

      aggregator.recordEvent(eventData);

      // Performance logging should not throw errors
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should warn about slow aggregation', () => {
      // Mock performance.now to simulate slow processing
      let callCount = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 1000 : 1100; // 100ms processing time
      });

      const eventData: SwipeEventData = {
        sessionId: 'session-123',
        destinationId: 'dest-456',
        action: 'like',
        direction: 'right'
      };

      aggregator.recordEvent(eventData);

      expect(console.warn).toHaveBeenCalledWith(
        '[Analytics] Slow aggregation: 100.00ms'
      );
    });
  });

  describe('Memory Management', () => {
    it('should perform cleanup after processing many events', () => {
      // Record 1000 events to trigger cleanup
      for (let i = 0; i < 1000; i++) {
        aggregator.recordEvent({
          sessionId: `session-${i % 10}`,
          destinationId: `dest-${i % 5}`,
          action: i % 2 === 0 ? 'like' : 'skip',
          direction: i % 2 === 0 ? 'right' : 'left'
        });
      }

      // Should have logged cleanup
      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] Performed cleanup, total events:',
        1000
      );
    });

    it('should export metrics for persistence', () => {
      const events: SwipeEventData[] = [
        {
          sessionId: 'session-123',
          destinationId: 'dest-456',
          action: 'like',
          direction: 'right'
        },
        {
          sessionId: 'session-456',
          destinationId: 'dest-789',
          action: 'skip',
          direction: 'left'
        }
      ];

      events.forEach(event => aggregator.recordEvent(event));

      const exportedMetrics = aggregator.exportMetrics();

      expect(exportedMetrics.totalEvents).toBe(2);
      expect(exportedMetrics.eventsByAction.like).toBe(1);
      expect(exportedMetrics.eventsByAction.skip).toBe(1);
      expect(Object.keys(exportedMetrics.sessionMetrics)).toHaveLength(2);
      expect(Object.keys(exportedMetrics.eventsByDestination)).toHaveLength(2);
    });

    it('should reset all metrics', () => {
      const eventData: SwipeEventData = {
        sessionId: 'session-123',
        destinationId: 'dest-456',
        action: 'like',
        direction: 'right'
      };

      aggregator.recordEvent(eventData);
      expect(aggregator.getOverallMetrics().totalEvents).toBe(1);

      aggregator.reset();
      expect(aggregator.getOverallMetrics().totalEvents).toBe(0);
      expect(aggregator.getSessionAnalytics('session-123')).toBeNull();
      expect(aggregator.getDestinationAnalytics('dest-456')).toBeNull();
    });
  });

  describe('Health Status', () => {
    it('should report healthy status with basic metrics', () => {
      const eventData: SwipeEventData = {
        sessionId: 'session-123',
        destinationId: 'dest-456',
        action: 'like',
        direction: 'right'
      };

      aggregator.recordEvent(eventData);

      const healthStatus = aggregator.getHealthStatus();

      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.totalEvents).toBe(1);
      expect(healthStatus.activeSessions).toBe(1);
      expect(healthStatus.memoryUsage).toBeGreaterThan(0);
      expect(healthStatus.timestamp).toBeDefined();
    });

    it('should include timestamp in health status', () => {
      const healthStatus = aggregator.getHealthStatus();
      const timestamp = new Date(healthStatus.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed event data gracefully', () => {
      const invalidEventData = {
        sessionId: 'session-123',
        destinationId: 'dest-456',
        action: 'like',
        direction: 'right',
        velocity: null, // Invalid value
        viewDurationMs: undefined
      } as any;

      // Should not throw an error
      expect(() => {
        aggregator.recordEvent(invalidEventData);
      }).not.toThrow();

      const overallMetrics = aggregator.getOverallMetrics();
      expect(overallMetrics.totalEvents).toBe(1);
    });

    it('should handle missing optional fields', () => {
      const minimalEventData: SwipeEventData = {
        sessionId: 'session-123',
        destinationId: 'dest-456',
        action: 'like',
        direction: 'right'
        // No velocity, durationMs, viewDurationMs
      };

      expect(() => {
        aggregator.recordEvent(minimalEventData);
      }).not.toThrow();

      const sessionAnalytics = aggregator.getSessionAnalytics('session-123');
      expect(sessionAnalytics).not.toBeNull();
      expect(sessionAnalytics!.avgDecisionTime).toBeUndefined();
    });
  });
});