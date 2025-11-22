// Client-side swipe event tracking utility
// Handles API calls and performance optimization for swipe event recording

import type {
  SwipeEventData,
  SwipeEventRequest,
  SwipeEventResponse,
  ApiErrorResponse,
  SwipeAction,
  SwipeDirection
} from '@/types/swipe-events';

class SwipeTracker {
  private sessionId: string | null = null;
  private apiEndpoint = '/api/swipe-events';

  // Performance optimization: queue events for batch sending if needed
  private eventQueue: SwipeEventRequest[] = [];
  private isProcessing = false;

  constructor() {
    // Initialize with session ID from cookie or localStorage if available
    this.loadSessionId();
  }

  private loadSessionId(): void {
    // Try to get session ID from localStorage (fallback)
    if (typeof window !== 'undefined') {
      const storedSessionId = localStorage.getItem('nextspot-session-id');
      if (storedSessionId) {
        this.sessionId = storedSessionId;
      }
    }
  }

  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;

    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('nextspot-session-id', sessionId);
    }
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  public async recordSwipe(data: Omit<SwipeEventData, 'sessionId'>): Promise<void> {
    if (!this.sessionId) {
      console.warn('[SwipeTracker] No session ID set, cannot record swipe event');
      return;
    }

    const eventData: SwipeEventRequest = {
      ...data,
      sessionId: this.sessionId,
      clientTimestamp: new Date().toISOString()
    };

    try {
      await this.sendEvent(eventData);
    } catch (error) {
      console.error('[SwipeTracker] Failed to record swipe event:', error);

      // Analytics event for tracking failures
      this.logAnalyticsEvent('swipe_tracking_error', {
        destinationId: data.destinationId,
        action: data.action,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async sendEvent(eventData: SwipeEventRequest): Promise<SwipeEventResponse> {
    const startTime = performance.now();

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorData = responseData as ApiErrorResponse;
        throw new Error(`API Error: ${errorData.error.message} (${errorData.error.code})`);
      }

      const swipeResponse = responseData as SwipeEventResponse;
      const processingTime = performance.now() - startTime;

      // Log successful event for analytics
      this.logAnalyticsEvent('swipe_event_sent', {
        eventId: swipeResponse.eventId,
        batchId: swipeResponse.batchId,
        processingTime,
        action: eventData.action,
        destinationId: eventData.destinationId
      });

      // Performance monitoring: warn if recording takes too long
      if (processingTime > 100) { // 100ms target from S-08
        console.warn(`[SwipeTracker] Slow event recording: ${processingTime.toFixed(2)}ms`);
      }

      return swipeResponse;

    } catch (error) {
      const processingTime = performance.now() - startTime;

      console.error('[SwipeTracker] Network error recording swipe event:', error);

      // Log network error for monitoring
      this.logAnalyticsEvent('swipe_network_error', {
        processingTime,
        action: eventData.action,
        destinationId: eventData.destinationId,
        error: error instanceof Error ? error.message : 'Network error'
      });

      throw error;
    }
  }

  // Helper method to record specific swipe actions
  public async recordLike(destinationId: string, gestureData?: {
    velocity?: number;
    durationMs?: number;
    viewDurationMs?: number;
  }): Promise<void> {
    await this.recordSwipe({
      destinationId,
      action: 'like',
      direction: 'right',
      ...gestureData
    });
  }

  public async recordSkip(destinationId: string, gestureData?: {
    velocity?: number;
    durationMs?: number;
    viewDurationMs?: number;
  }): Promise<void> {
    await this.recordSwipe({
      destinationId,
      action: 'skip',
      direction: 'left',
      ...gestureData
    });
  }

  public async recordDetailTap(destinationId: string, gestureData?: {
    viewDurationMs?: number;
  }): Promise<void> {
    await this.recordSwipe({
      destinationId,
      action: 'detail_tap',
      direction: 'tap',
      ...gestureData
    });
  }

  // Helper to calculate gesture metrics from touch/mouse events
  public static calculateGestureMetrics(
    startTime: number,
    endTime: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): {
    durationMs: number;
    velocity: number;
    distance: number;
    direction: SwipeDirection;
  } {
    const durationMs = endTime - startTime;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = durationMs > 0 ? distance / durationMs : 0; // px/ms

    // Determine direction based on dominant axis and threshold
    const minSwipeDistance = 50; // pixels
    let direction: SwipeDirection = 'tap';

    if (distance >= minSwipeDistance) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      }
      // For now, we only handle horizontal swipes
      // Vertical swipes could be added later
    }

    return {
      durationMs,
      velocity,
      distance,
      direction
    };
  }

  // Helper to determine action from direction
  public static getActionFromDirection(direction: SwipeDirection): SwipeAction {
    switch (direction) {
      case 'right':
        return 'like';
      case 'left':
        return 'skip';
      case 'tap':
        return 'detail_tap';
      default:
        return 'detail_tap';
    }
  }

  private logAnalyticsEvent(eventName: string, data: Record<string, any>): void {
    // Log to console for development (would integrate with PostHog/analytics in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${eventName}:`, {
        ...data,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      });
    }

    // TODO: In production, integrate with analytics service
    // if (typeof window !== 'undefined' && window.posthog) {
    //   window.posthog.capture(eventName, data);
    // }
  }

  // Method to check API health (useful for monitoring)
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('[SwipeTracker] Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const swipeTracker = new SwipeTracker();

// Export class for testing
export { SwipeTracker };