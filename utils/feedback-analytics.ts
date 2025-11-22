import type {
  FeedbackAnalytics,
  SatisfactionRating,
  DurationPerception
} from '@/types/feedback';

class FeedbackAnalyticsTracker {
  private events: FeedbackAnalytics[] = [];

  /**
   * Track when feedback form is viewed
   */
  trackFormViewed(sessionId: string, actualDuration: number): void {
    const event: FeedbackAnalytics = {
      event: 'feedback_form_viewed',
      sessionId,
      actualDuration,
      timestamp: new Date(),
    };

    this.events.push(event);
    this.logEvent(event);
  }

  /**
   * Track when feedback is submitted
   */
  trackFeedbackSubmitted(
    sessionId: string,
    feedbackId: string,
    satisfaction: SatisfactionRating,
    perceivedDuration: DurationPerception,
    wouldRecommend: boolean,
    actualDuration: number,
    targetMet: boolean
  ): void {
    const event: FeedbackAnalytics = {
      event: 'feedback_submitted',
      sessionId,
      feedbackId,
      satisfaction,
      perceivedDuration,
      wouldRecommend,
      actualDuration,
      targetMet,
      timestamp: new Date(),
    };

    this.events.push(event);
    this.logEvent(event);
  }

  /**
   * Track when user skips feedback
   */
  trackFeedbackSkipped(sessionId: string, actualDuration: number): void {
    const event: FeedbackAnalytics = {
      event: 'feedback_skipped',
      sessionId,
      actualDuration,
      timestamp: new Date(),
    };

    this.events.push(event);
    this.logEvent(event);
  }

  /**
   * Track when validation target is met
   */
  trackValidationTargetMet(
    sessionId: string,
    feedbackId: string,
    actualDuration: number,
    satisfaction: SatisfactionRating
  ): void {
    const event: FeedbackAnalytics = {
      event: 'validation_target_met',
      sessionId,
      feedbackId,
      satisfaction,
      actualDuration,
      targetMet: true,
      timestamp: new Date(),
    };

    this.events.push(event);
    this.logEvent(event);
  }

  /**
   * Get all events for a session
   */
  getSessionEvents(sessionId: string): FeedbackAnalytics[] {
    return this.events.filter(event => event.sessionId === sessionId);
  }

  /**
   * Get feedback completion rate
   */
  getFeedbackCompletionRate(): number {
    const viewedEvents = this.events.filter(e => e.event === 'feedback_form_viewed');
    const submittedEvents = this.events.filter(e => e.event === 'feedback_submitted');

    if (viewedEvents.length === 0) return 0;
    return submittedEvents.length / viewedEvents.length;
  }

  /**
   * Get average satisfaction rating
   */
  getAverageSatisfaction(): number {
    const submittedEvents = this.events.filter(e =>
      e.event === 'feedback_submitted' && e.satisfaction !== undefined
    );

    if (submittedEvents.length === 0) return 0;

    const total = submittedEvents.reduce((sum, event) => sum + (event.satisfaction || 0), 0);
    return total / submittedEvents.length;
  }

  /**
   * Get target achievement rate
   */
  getTargetAchievementRate(): number {
    const submittedEvents = this.events.filter(e =>
      e.event === 'feedback_submitted' && e.targetMet !== undefined
    );

    if (submittedEvents.length === 0) return 0;

    const targetMetCount = submittedEvents.filter(e => e.targetMet).length;
    return targetMetCount / submittedEvents.length;
  }

  /**
   * Get recommendation rate
   */
  getRecommendationRate(): number {
    const submittedEvents = this.events.filter(e =>
      e.event === 'feedback_submitted' && e.wouldRecommend !== undefined
    );

    if (submittedEvents.length === 0) return 0;

    const recommendCount = submittedEvents.filter(e => e.wouldRecommend).length;
    return recommendCount / submittedEvents.length;
  }

  /**
   * Get duration perception breakdown
   */
  getDurationPerceptionBreakdown(): Record<DurationPerception, number> {
    const submittedEvents = this.events.filter(e =>
      e.event === 'feedback_submitted' && e.perceivedDuration
    );

    const breakdown: Record<DurationPerception, number> = {
      'much_faster': 0,
      'faster': 0,
      'same': 0,
      'slower': 0,
      'much_slower': 0,
    };

    submittedEvents.forEach(event => {
      if (event.perceivedDuration) {
        breakdown[event.perceivedDuration]++;
      }
    });

    return breakdown;
  }

  /**
   * Export analytics data for external analysis
   */
  exportAnalyticsData(): {
    events: FeedbackAnalytics[];
    summary: {
      totalEvents: number;
      completionRate: number;
      averageSatisfaction: number;
      targetAchievementRate: number;
      recommendationRate: number;
      durationPerceptionBreakdown: Record<DurationPerception, number>;
    };
  } {
    return {
      events: [...this.events],
      summary: {
        totalEvents: this.events.length,
        completionRate: this.getFeedbackCompletionRate(),
        averageSatisfaction: this.getAverageSatisfaction(),
        targetAchievementRate: this.getTargetAchievementRate(),
        recommendationRate: this.getRecommendationRate(),
        durationPerceptionBreakdown: this.getDurationPerceptionBreakdown(),
      },
    };
  }

  /**
   * Clear all events (for testing or privacy compliance)
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Log event to console for development
   */
  private logEvent(event: FeedbackAnalytics): void {
    console.log(`[Analytics] ${event.event}:`, {
      sessionId: event.sessionId,
      feedbackId: event.feedbackId,
      satisfaction: event.satisfaction,
      perceivedDuration: event.perceivedDuration,
      wouldRecommend: event.wouldRecommend,
      actualDuration: event.actualDuration,
      targetMet: event.targetMet,
      timestamp: event.timestamp.toISOString(),
    });
  }
}

// Export singleton instance
export const feedbackAnalytics = new FeedbackAnalyticsTracker();

// Export utility functions for common analytics patterns
export const trackFeedbackEvent = {
  formViewed: (sessionId: string, actualDuration: number) =>
    feedbackAnalytics.trackFormViewed(sessionId, actualDuration),

  submitted: (
    sessionId: string,
    feedbackId: string,
    satisfaction: SatisfactionRating,
    perceivedDuration: DurationPerception,
    wouldRecommend: boolean,
    actualDuration: number,
    targetMet: boolean
  ) => feedbackAnalytics.trackFeedbackSubmitted(
    sessionId,
    feedbackId,
    satisfaction,
    perceivedDuration,
    wouldRecommend,
    actualDuration,
    targetMet
  ),

  skipped: (sessionId: string, actualDuration: number) =>
    feedbackAnalytics.trackFeedbackSkipped(sessionId, actualDuration),

  targetMet: (
    sessionId: string,
    feedbackId: string,
    actualDuration: number,
    satisfaction: SatisfactionRating
  ) => feedbackAnalytics.trackValidationTargetMet(
    sessionId,
    feedbackId,
    actualDuration,
    satisfaction
  ),
};

// Export analytics summary functions
export const getFeedbackAnalytics = {
  completionRate: () => feedbackAnalytics.getFeedbackCompletionRate(),
  averageSatisfaction: () => feedbackAnalytics.getAverageSatisfaction(),
  targetAchievementRate: () => feedbackAnalytics.getTargetAchievementRate(),
  recommendationRate: () => feedbackAnalytics.getRecommendationRate(),
  durationBreakdown: () => feedbackAnalytics.getDurationPerceptionBreakdown(),
  exportData: () => feedbackAnalytics.exportAnalyticsData(),
  sessionEvents: (sessionId: string) => feedbackAnalytics.getSessionEvents(sessionId),
};