// Real-time analytics aggregation utility
// Implements in-memory counters for swipe events (S-08 requirement)
// In production, this would use Redis or a similar caching layer

import type {
  SwipeAction,
  SwipeEventData,
  SwipeAnalyticsData,
  SessionAnalyticsData
} from '@/types/swipe-events';

interface AggregatedMetrics {
  totalEvents: number;
  eventsByAction: Record<SwipeAction, number>;
  eventsByDestination: Record<string, {
    likes: number;
    skips: number;
    detailTaps: number;
    totalViewTime: number;
    eventCount: number;
  }>;
  sessionMetrics: Record<string, {
    totalSwipes: number;
    likes: number;
    startTime?: number;
    lastActivity?: number;
    viewTimes: number[];
  }>;
  dailyMetrics: Record<string, { // YYYY-MM-DD format
    totalEvents: number;
    uniqueSessions: Set<string>;
    eventsByAction: Record<SwipeAction, number>;
  }>;
}

class AnalyticsAggregator {
  private metrics: AggregatedMetrics = {
    totalEvents: 0,
    eventsByAction: {
      like: 0,
      skip: 0,
      detail_tap: 0
    },
    eventsByDestination: {},
    sessionMetrics: {},
    dailyMetrics: {}
  };

  // Performance targets from S-08
  private readonly PERFORMANCE_TARGETS = {
    maxAggregationTime: 50, // ms
    maxMemoryThreshold: 10000, // events before cleanup
    retentionDays: 7
  };

  public recordEvent(eventData: SwipeEventData): void {
    const startTime = performance.now();

    try {
      this.updateTotalMetrics(eventData);
      this.updateDestinationMetrics(eventData);
      this.updateSessionMetrics(eventData);
      this.updateDailyMetrics(eventData);

      const processingTime = performance.now() - startTime;

      // Performance monitoring
      if (processingTime > this.PERFORMANCE_TARGETS.maxAggregationTime) {
        console.warn(`[Analytics] Slow aggregation: ${processingTime.toFixed(2)}ms`);
      }

      // Memory management
      if (this.metrics.totalEvents % 1000 === 0) {
        this.performCleanup();
      }

    } catch (error) {
      console.error('[Analytics] Error recording event:', error);
    }
  }

  private updateTotalMetrics(eventData: SwipeEventData): void {
    this.metrics.totalEvents++;
    this.metrics.eventsByAction[eventData.action]++;
  }

  private updateDestinationMetrics(eventData: SwipeEventData): void {
    const { destinationId, action, viewDurationMs } = eventData;

    if (!this.metrics.eventsByDestination[destinationId]) {
      this.metrics.eventsByDestination[destinationId] = {
        likes: 0,
        skips: 0,
        detailTaps: 0,
        totalViewTime: 0,
        eventCount: 0
      };
    }

    const destMetrics = this.metrics.eventsByDestination[destinationId];
    destMetrics.eventCount++;

    switch (action) {
      case 'like':
        destMetrics.likes++;
        break;
      case 'skip':
        destMetrics.skips++;
        break;
      case 'detail_tap':
        destMetrics.detailTaps++;
        break;
    }

    if (viewDurationMs) {
      destMetrics.totalViewTime += viewDurationMs;
    }
  }

  private updateSessionMetrics(eventData: SwipeEventData): void {
    const { sessionId, action, viewDurationMs } = eventData;

    if (!this.metrics.sessionMetrics[sessionId]) {
      this.metrics.sessionMetrics[sessionId] = {
        totalSwipes: 0,
        likes: 0,
        startTime: Date.now(),
        viewTimes: []
      };
    }

    const sessionMetrics = this.metrics.sessionMetrics[sessionId];
    sessionMetrics.totalSwipes++;
    sessionMetrics.lastActivity = Date.now();

    if (action === 'like') {
      sessionMetrics.likes++;
    }

    if (viewDurationMs) {
      sessionMetrics.viewTimes.push(viewDurationMs);
    }
  }

  private updateDailyMetrics(eventData: SwipeEventData): void {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { sessionId, action } = eventData;

    if (!this.metrics.dailyMetrics[today]) {
      this.metrics.dailyMetrics[today] = {
        totalEvents: 0,
        uniqueSessions: new Set(),
        eventsByAction: {
          like: 0,
          skip: 0,
          detail_tap: 0
        }
      };
    }

    const dailyMetrics = this.metrics.dailyMetrics[today];
    dailyMetrics.totalEvents++;
    dailyMetrics.uniqueSessions.add(sessionId);
    dailyMetrics.eventsByAction[action]++;
  }

  // Get aggregated analytics for a specific destination
  public getDestinationAnalytics(destinationId: string): SwipeAnalyticsData | null {
    const destMetrics = this.metrics.eventsByDestination[destinationId];
    if (!destMetrics) return null;

    const avgViewDuration = destMetrics.eventCount > 0
      ? destMetrics.totalViewTime / destMetrics.eventCount / 1000 // Convert to seconds
      : undefined;

    return {
      destinationId,
      date: new Date().toISOString().split('T')[0],
      likeCount: destMetrics.likes,
      skipCount: destMetrics.skips,
      detailTapCount: destMetrics.detailTaps,
      avgViewDuration
    };
  }

  // Get session analytics
  public getSessionAnalytics(sessionId: string): SessionAnalyticsData | null {
    const sessionMetrics = this.metrics.sessionMetrics[sessionId];
    if (!sessionMetrics) return null;

    const likeRate = sessionMetrics.totalSwipes > 0
      ? sessionMetrics.likes / sessionMetrics.totalSwipes
      : undefined;

    const avgDecisionTime = sessionMetrics.viewTimes.length > 0
      ? sessionMetrics.viewTimes.reduce((sum, time) => sum + time, 0) /
        sessionMetrics.viewTimes.length / 1000 // Convert to seconds
      : undefined;

    const sessionDuration = sessionMetrics.startTime && sessionMetrics.lastActivity
      ? (sessionMetrics.lastActivity - sessionMetrics.startTime) / 1000 // Convert to seconds
      : undefined;

    return {
      sessionId,
      totalSwipes: sessionMetrics.totalSwipes,
      likeRate,
      avgDecisionTime,
      sessionDuration
    };
  }

  // Get overall system metrics
  public getOverallMetrics() {
    const totalSessions = Object.keys(this.metrics.sessionMetrics).length;
    const avgLikeRate = totalSessions > 0
      ? Object.values(this.metrics.sessionMetrics)
          .reduce((sum, session) => {
            const sessionLikeRate = session.totalSwipes > 0 ? session.likes / session.totalSwipes : 0;
            return sum + sessionLikeRate;
          }, 0) / totalSessions
      : 0;

    return {
      totalEvents: this.metrics.totalEvents,
      totalSessions,
      avgLikeRate,
      eventsByAction: { ...this.metrics.eventsByAction },
      topDestinations: this.getTopDestinations(5)
    };
  }

  // Get top destinations by engagement
  private getTopDestinations(limit: number = 10) {
    return Object.entries(this.metrics.eventsByDestination)
      .map(([destinationId, metrics]) => ({
        destinationId,
        totalEvents: metrics.eventCount,
        likeRate: metrics.eventCount > 0 ? metrics.likes / metrics.eventCount : 0,
        avgViewTime: metrics.eventCount > 0 ? metrics.totalViewTime / metrics.eventCount : 0
      }))
      .sort((a, b) => b.totalEvents - a.totalEvents)
      .slice(0, limit);
  }

  // Performance cleanup to prevent memory leaks
  private performCleanup(): void {
    const cutoffTime = Date.now() - (this.PERFORMANCE_TARGETS.retentionDays * 24 * 60 * 60 * 1000);

    // Clean up old session metrics
    Object.keys(this.metrics.sessionMetrics).forEach(sessionId => {
      const session = this.metrics.sessionMetrics[sessionId];
      if (session.lastActivity && session.lastActivity < cutoffTime) {
        delete this.metrics.sessionMetrics[sessionId];
      }
    });

    // Clean up old daily metrics
    const cutoffDate = new Date(cutoffTime).toISOString().split('T')[0];
    Object.keys(this.metrics.dailyMetrics).forEach(date => {
      if (date < cutoffDate) {
        delete this.metrics.dailyMetrics[date];
      }
    });

    console.log('[Analytics] Performed cleanup, total events:', this.metrics.totalEvents);
  }

  // Export metrics for persistence (e.g., to database)
  public exportMetrics() {
    // Convert Sets to arrays for JSON serialization
    const exportData = {
      ...this.metrics,
      dailyMetrics: Object.fromEntries(
        Object.entries(this.metrics.dailyMetrics).map(([date, metrics]) => [
          date,
          {
            ...metrics,
            uniqueSessions: Array.from(metrics.uniqueSessions)
          }
        ])
      )
    };

    return exportData;
  }

  // Reset all metrics (useful for testing)
  public reset(): void {
    this.metrics = {
      totalEvents: 0,
      eventsByAction: {
        like: 0,
        skip: 0,
        detail_tap: 0
      },
      eventsByDestination: {},
      sessionMetrics: {},
      dailyMetrics: {}
    };
  }

  // Health check for the aggregator
  public getHealthStatus() {
    const memoryUsage = JSON.stringify(this.metrics).length;
    const isHealthy = memoryUsage < this.PERFORMANCE_TARGETS.maxMemoryThreshold * 100; // Rough estimate

    return {
      isHealthy,
      memoryUsage,
      totalEvents: this.metrics.totalEvents,
      activeSessions: Object.keys(this.metrics.sessionMetrics).length,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const analyticsAggregator = new AnalyticsAggregator();

// Export class for testing
export { AnalyticsAggregator };