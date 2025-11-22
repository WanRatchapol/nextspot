// Analytics tracking for S-09 Liked List & Completion feature
// Extends the existing analytics system with liked destinations specific events

import { fireEvent, type AnalyticsEvent } from './analytics';
import { generateRequestId } from './request-id';
import type { LikedDestinationAnalytics, ValidationMetrics } from '@/types/liked-destinations';
import type { SessionBreakdown } from './session-timing-tracker';

// Liked destination specific analytics events
export interface DestinationLikedEvent {
  event: 'destination_liked';
  properties: {
    sessionId: string;
    destinationId: string;
    likedCount: number;
    swipeVelocity?: number;
    viewDurationMs?: number;
    swipeDirection: 'left' | 'right' | 'tap';
    timestamp: number;
    requestId: string;
  };
}

export interface DestinationUnlikedEvent {
  event: 'destination_unliked';
  properties: {
    sessionId: string;
    destinationId: string;
    likedCount: number;
    removalTime: number; // ms since liked
    timestamp: number;
    requestId: string;
  };
}

export interface LikedListViewedEvent {
  event: 'liked_list_viewed';
  properties: {
    sessionId: string;
    likedCount: number;
    swipingDuration: number; // ms spent swiping before viewing list
    timestamp: number;
    requestId: string;
  };
}

export interface SessionCompletedEvent {
  event: 'session_completed';
  properties: {
    sessionId: string;
    finalSelectionCount: number;
    sessionTiming: SessionBreakdown;
    totalSessionTime: number;
    averageDecisionTime: number;
    completionRate: number;
    timestamp: number;
    requestId: string;
  };
}

export interface LikedListInteractionEvent {
  event: 'liked_list_interaction';
  properties: {
    sessionId: string;
    action: 'remove_destination' | 'continue_swiping' | 'complete_session';
    likedCount: number;
    timeSpentInList: number; // ms
    timestamp: number;
    requestId: string;
  };
}

/**
 * Fire destination liked event
 */
export function fireDestinationLiked(
  sessionId: string,
  destinationId: string,
  likedCount: number,
  swipeData?: {
    velocity?: number;
    viewDurationMs?: number;
    direction: 'left' | 'right' | 'tap';
  }
): void {
  const event: DestinationLikedEvent = {
    event: 'destination_liked',
    properties: {
      sessionId,
      destinationId,
      likedCount,
      swipeVelocity: swipeData?.velocity,
      viewDurationMs: swipeData?.viewDurationMs,
      swipeDirection: swipeData?.direction || 'right',
      timestamp: Date.now(),
      requestId: generateRequestId(),
    },
  };

  fireEvent(event);

  // Also dispatch custom event for real-time tracking
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nextspot-analytics', {
      detail: {
        event: 'destination_liked',
        destinationId,
        sessionId,
        count: likedCount,
        timestamp: new Date()
      }
    }));
  }
}

/**
 * Fire destination unliked event
 */
export function fireDestinationUnliked(
  sessionId: string,
  destinationId: string,
  likedCount: number,
  likedAt: Date
): void {
  const removalTime = Date.now() - likedAt.getTime();

  const event: DestinationUnlikedEvent = {
    event: 'destination_unliked',
    properties: {
      sessionId,
      destinationId,
      likedCount,
      removalTime,
      timestamp: Date.now(),
      requestId: generateRequestId(),
    },
  };

  fireEvent(event);

  // Also dispatch custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nextspot-analytics', {
      detail: {
        event: 'destination_unliked',
        destinationId,
        sessionId,
        count: likedCount,
        timestamp: new Date()
      }
    }));
  }
}

/**
 * Fire liked list viewed event
 */
export function fireLikedListViewed(
  sessionId: string,
  likedCount: number,
  swipingDuration: number
): void {
  const event: LikedListViewedEvent = {
    event: 'liked_list_viewed',
    properties: {
      sessionId,
      likedCount,
      swipingDuration,
      timestamp: Date.now(),
      requestId: generateRequestId(),
    },
  };

  fireEvent(event);

  // Also dispatch custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nextspot-analytics', {
      detail: {
        event: 'liked_list_viewed',
        sessionId,
        count: likedCount,
        timestamp: new Date()
      }
    }));
  }
}

/**
 * Fire session completed event
 */
export function fireSessionCompleted(
  sessionId: string,
  finalSelectionCount: number,
  sessionTiming: SessionBreakdown
): void {
  const totalSessionTime = sessionTiming.totalMs;
  const averageDecisionTime = finalSelectionCount > 0 ? totalSessionTime / finalSelectionCount : 0;
  const completionRate = 1.0; // TODO: Calculate from historical data

  const event: SessionCompletedEvent = {
    event: 'session_completed',
    properties: {
      sessionId,
      finalSelectionCount,
      sessionTiming,
      totalSessionTime,
      averageDecisionTime,
      completionRate,
      timestamp: Date.now(),
      requestId: generateRequestId(),
    },
  };

  fireEvent(event);

  // Also dispatch custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nextspot-analytics', {
      detail: {
        event: 'session_completed',
        sessionId,
        count: finalSelectionCount,
        sessionTiming,
        timestamp: new Date()
      }
    }));
  }
}

/**
 * Fire liked list interaction event
 */
export function fireLikedListInteraction(
  sessionId: string,
  action: 'remove_destination' | 'continue_swiping' | 'complete_session',
  likedCount: number,
  timeSpentInList: number
): void {
  const event: LikedListInteractionEvent = {
    event: 'liked_list_interaction',
    properties: {
      sessionId,
      action,
      likedCount,
      timeSpentInList,
      timestamp: Date.now(),
      requestId: generateRequestId(),
    },
  };

  fireEvent(event);
}

/**
 * Track validation metrics for MVP validation
 */
export class ValidationMetricsTracker {
  private metrics: ValidationMetrics[] = [];

  addSessionMetrics(
    sessionId: string,
    decisionTime: number,
    completed: boolean,
    likedCount: number,
    sessionTiming: SessionBreakdown,
    returnedToSwiping: boolean
  ): void {
    const metrics: ValidationMetrics = {
      averageDecisionTime: decisionTime,
      completionRate: completed ? 1 : 0,
      likedDestinationCountDistribution: { [likedCount]: 1 },
      phaseTimeBreakdown: sessionTiming,
      returnToSwipingRate: returnedToSwiping ? 1 : 0,
    };

    this.metrics.push(metrics);

    // Log for development
    if (process.env.NODE_ENV === 'development') {
      console.log('[ValidationMetrics]', {
        sessionId,
        decisionTime,
        completed,
        likedCount,
        returnedToSwiping,
        sessionTiming,
      });
    }
  }

  getAggregatedMetrics(): ValidationMetrics {
    if (this.metrics.length === 0) {
      return {
        averageDecisionTime: 0,
        completionRate: 0,
        likedDestinationCountDistribution: {},
        phaseTimeBreakdown: {
          preferencesMs: 0,
          swipingMs: 0,
          reviewMs: 0,
          totalMs: 0,
        },
        returnToSwipingRate: 0,
      };
    }

    const totalSessions = this.metrics.length;

    // Calculate averages
    const averageDecisionTime = this.metrics.reduce((sum, m) => sum + m.averageDecisionTime, 0) / totalSessions;
    const completionRate = this.metrics.reduce((sum, m) => sum + m.completionRate, 0) / totalSessions;
    const returnToSwipingRate = this.metrics.reduce((sum, m) => sum + m.returnToSwipingRate, 0) / totalSessions;

    // Aggregate count distribution
    const likedDestinationCountDistribution: Record<number, number> = {};
    this.metrics.forEach(m => {
      Object.entries(m.likedDestinationCountDistribution).forEach(([count, frequency]) => {
        const countNum = parseInt(count);
        likedDestinationCountDistribution[countNum] = (likedDestinationCountDistribution[countNum] || 0) + frequency;
      });
    });

    // Calculate average phase breakdown
    const phaseTimeBreakdown: SessionBreakdown = {
      preferencesMs: this.metrics.reduce((sum, m) => sum + m.phaseTimeBreakdown.preferencesMs, 0) / totalSessions,
      swipingMs: this.metrics.reduce((sum, m) => sum + m.phaseTimeBreakdown.swipingMs, 0) / totalSessions,
      reviewMs: this.metrics.reduce((sum, m) => sum + m.phaseTimeBreakdown.reviewMs, 0) / totalSessions,
      totalMs: this.metrics.reduce((sum, m) => sum + m.phaseTimeBreakdown.totalMs, 0) / totalSessions,
    };

    return {
      averageDecisionTime,
      completionRate,
      likedDestinationCountDistribution,
      phaseTimeBreakdown,
      returnToSwipingRate,
    };
  }

  exportMetrics(): string {
    return JSON.stringify({
      totalSessions: this.metrics.length,
      aggregated: this.getAggregatedMetrics(),
      individual: this.metrics,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }
}

// Global validation metrics tracker instance
let globalValidationTracker: ValidationMetricsTracker | null = null;

export function getValidationTracker(): ValidationMetricsTracker {
  if (!globalValidationTracker) {
    globalValidationTracker = new ValidationMetricsTracker();
  }
  return globalValidationTracker;
}

/**
 * Performance monitoring for liked list operations
 */
export class LikedListPerformanceMonitor {
  private metrics: Array<{
    operation: 'load' | 'remove' | 'persist' | 'complete';
    duration: number;
    timestamp: number;
    sessionId: string;
  }> = [];

  recordOperation(
    operation: 'load' | 'remove' | 'persist' | 'complete',
    duration: number,
    sessionId: string
  ): void {
    this.metrics.push({
      operation,
      duration,
      timestamp: Date.now(),
      sessionId,
    });

    // Log slow operations
    const thresholds = {
      load: 200, // ms
      remove: 100, // ms
      persist: 50, // ms
      complete: 500, // ms
    };

    if (duration > thresholds[operation]) {
      console.warn(`[Performance] Slow ${operation} operation: ${duration}ms (threshold: ${thresholds[operation]}ms)`, {
        sessionId,
        duration,
        operation,
      });
    }
  }

  getAveragePerformance(): Record<string, number> {
    const grouped = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = [];
      }
      acc[metric.operation].push(metric.duration);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(grouped).reduce((acc, [operation, durations]) => {
      acc[operation] = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      return acc;
    }, {} as Record<string, number>);
  }
}

// Global performance monitor instance
let globalPerformanceMonitor: LikedListPerformanceMonitor | null = null;

export function getPerformanceMonitor(): LikedListPerformanceMonitor {
  if (!globalPerformanceMonitor) {
    globalPerformanceMonitor = new LikedListPerformanceMonitor();
  }
  return globalPerformanceMonitor;
}