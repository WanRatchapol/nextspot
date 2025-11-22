import {
  feedbackAnalytics,
  trackFeedbackEvent,
  getFeedbackAnalytics,
} from '@/utils/feedback-analytics';
import type { SatisfactionRating, DurationPerception } from '@/types/feedback';

describe('Feedback Analytics Tracker', () => {
  beforeEach(() => {
    // Clear events before each test
    feedbackAnalytics.clearEvents();
    // Clear console logs
    console.log = jest.fn();
  });

  describe('Event Tracking', () => {
    it('tracks feedback form viewed events', () => {
      trackFeedbackEvent.formViewed('session-123', 180000);

      const events = feedbackAnalytics.getSessionEvents('session-123');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        event: 'feedback_form_viewed',
        sessionId: 'session-123',
        actualDuration: 180000,
        timestamp: expect.any(Date),
      });
    });

    it('tracks feedback submitted events', () => {
      trackFeedbackEvent.submitted(
        'session-123',
        'feedback-456',
        4 as SatisfactionRating,
        'faster' as DurationPerception,
        true,
        180000,
        true
      );

      const events = feedbackAnalytics.getSessionEvents('session-123');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        event: 'feedback_submitted',
        sessionId: 'session-123',
        feedbackId: 'feedback-456',
        satisfaction: 4,
        perceivedDuration: 'faster',
        wouldRecommend: true,
        actualDuration: 180000,
        targetMet: true,
      });
    });

    it('tracks feedback skipped events', () => {
      trackFeedbackEvent.skipped('session-123', 180000);

      const events = feedbackAnalytics.getSessionEvents('session-123');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        event: 'feedback_skipped',
        sessionId: 'session-123',
        actualDuration: 180000,
      });
    });

    it('tracks validation target met events', () => {
      trackFeedbackEvent.targetMet('session-123', 'feedback-456', 180000, 5 as SatisfactionRating);

      const events = feedbackAnalytics.getSessionEvents('session-123');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        event: 'validation_target_met',
        sessionId: 'session-123',
        feedbackId: 'feedback-456',
        satisfaction: 5,
        actualDuration: 180000,
        targetMet: true,
      });
    });

    it('logs events to console', () => {
      trackFeedbackEvent.formViewed('session-123', 180000);

      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] feedback_form_viewed:',
        expect.objectContaining({
          sessionId: 'session-123',
          actualDuration: 180000,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Analytics Calculations', () => {
    beforeEach(() => {
      // Add sample feedback data
      trackFeedbackEvent.formViewed('session-1', 120000);
      trackFeedbackEvent.submitted('session-1', 'feedback-1', 5, 'faster', true, 120000, true);

      trackFeedbackEvent.formViewed('session-2', 180000);
      trackFeedbackEvent.submitted('session-2', 'feedback-2', 3, 'same', false, 180000, true);

      trackFeedbackEvent.formViewed('session-3', 400000);
      trackFeedbackEvent.submitted('session-3', 'feedback-3', 4, 'slower', true, 400000, false);

      trackFeedbackEvent.formViewed('session-4', 90000);
      trackFeedbackEvent.skipped('session-4', 90000);
    });

    it('calculates feedback completion rate correctly', () => {
      const completionRate = getFeedbackAnalytics.completionRate();
      expect(completionRate).toBe(0.75); // 3 submitted out of 4 viewed
    });

    it('calculates average satisfaction correctly', () => {
      const avgSatisfaction = getFeedbackAnalytics.averageSatisfaction();
      expect(avgSatisfaction).toBe(4); // (5 + 3 + 4) / 3
    });

    it('calculates target achievement rate correctly', () => {
      const targetRate = getFeedbackAnalytics.targetAchievementRate();
      expect(targetRate).toBeCloseTo(0.667, 2); // 2 out of 3 met target
    });

    it('calculates recommendation rate correctly', () => {
      const recommendationRate = getFeedbackAnalytics.recommendationRate();
      expect(recommendationRate).toBeCloseTo(0.667, 2); // 2 out of 3 would recommend
    });

    it('calculates duration perception breakdown correctly', () => {
      const breakdown = getFeedbackAnalytics.durationBreakdown();
      expect(breakdown).toEqual({
        much_faster: 0,
        faster: 1,
        same: 1,
        slower: 1,
        much_slower: 0,
      });
    });

    it('handles zero events gracefully', () => {
      feedbackAnalytics.clearEvents();

      expect(getFeedbackAnalytics.completionRate()).toBe(0);
      expect(getFeedbackAnalytics.averageSatisfaction()).toBe(0);
      expect(getFeedbackAnalytics.targetAchievementRate()).toBe(0);
      expect(getFeedbackAnalytics.recommendationRate()).toBe(0);
    });
  });

  describe('Session Event Filtering', () => {
    beforeEach(() => {
      trackFeedbackEvent.formViewed('session-1', 120000);
      trackFeedbackEvent.submitted('session-1', 'feedback-1', 5, 'faster', true, 120000, true);

      trackFeedbackEvent.formViewed('session-2', 180000);
      trackFeedbackEvent.skipped('session-2', 180000);

      trackFeedbackEvent.formViewed('session-3', 200000);
      trackFeedbackEvent.submitted('session-3', 'feedback-3', 3, 'same', false, 200000, true);
    });

    it('returns events for specific session only', () => {
      const session1Events = getFeedbackAnalytics.sessionEvents('session-1');
      expect(session1Events).toHaveLength(2);
      expect(session1Events.every(e => e.sessionId === 'session-1')).toBe(true);

      const session2Events = getFeedbackAnalytics.sessionEvents('session-2');
      expect(session2Events).toHaveLength(2);
      expect(session2Events.every(e => e.sessionId === 'session-2')).toBe(true);
    });

    it('returns empty array for non-existent session', () => {
      const events = getFeedbackAnalytics.sessionEvents('non-existent');
      expect(events).toHaveLength(0);
    });
  });

  describe('Data Export', () => {
    beforeEach(() => {
      trackFeedbackEvent.formViewed('session-1', 120000);
      trackFeedbackEvent.submitted('session-1', 'feedback-1', 4, 'faster', true, 120000, true);
      trackFeedbackEvent.formViewed('session-2', 200000);
      trackFeedbackEvent.skipped('session-2', 200000);
    });

    it('exports complete analytics data', () => {
      const exported = getFeedbackAnalytics.exportData();

      expect(exported).toHaveProperty('events');
      expect(exported).toHaveProperty('summary');

      expect(exported.events).toHaveLength(4);
      expect(exported.summary).toMatchObject({
        totalEvents: 4,
        completionRate: 0.5, // 1 submitted out of 2 viewed
        averageSatisfaction: 4,
        targetAchievementRate: 1, // 1 out of 1 submitted met target
        recommendationRate: 1, // 1 out of 1 submitted would recommend
        durationPerceptionBreakdown: {
          much_faster: 0,
          faster: 1,
          same: 0,
          slower: 0,
          much_slower: 0,
        },
      });
    });

    it('exports events as a copy (not reference)', () => {
      const exported = getFeedbackAnalytics.exportData();
      const originalEventCount = exported.events.length;

      // Add new event
      trackFeedbackEvent.formViewed('session-3', 150000);

      // Exported data should not change
      expect(exported.events).toHaveLength(originalEventCount);
    });
  });

  describe('Event Types', () => {
    it('tracks all required event types', () => {
      const sessionId = 'test-session';

      trackFeedbackEvent.formViewed(sessionId, 120000);
      trackFeedbackEvent.submitted(sessionId, 'feedback-1', 4, 'faster', true, 120000, true);
      trackFeedbackEvent.skipped(sessionId, 120000);
      trackFeedbackEvent.targetMet(sessionId, 'feedback-1', 120000, 4);

      const events = getFeedbackAnalytics.sessionEvents(sessionId);
      const eventTypes = events.map(e => e.event);

      expect(eventTypes).toContain('feedback_form_viewed');
      expect(eventTypes).toContain('feedback_submitted');
      expect(eventTypes).toContain('feedback_skipped');
      expect(eventTypes).toContain('validation_target_met');
    });
  });

  describe('Data Persistence', () => {
    it('maintains event data across multiple operations', () => {
      // Add events over multiple calls
      trackFeedbackEvent.formViewed('session-1', 120000);
      expect(getFeedbackAnalytics.sessionEvents('session-1')).toHaveLength(1);

      trackFeedbackEvent.submitted('session-1', 'feedback-1', 4, 'faster', true, 120000, true);
      expect(getFeedbackAnalytics.sessionEvents('session-1')).toHaveLength(2);

      trackFeedbackEvent.formViewed('session-2', 180000);
      expect(getFeedbackAnalytics.sessionEvents('session-1')).toHaveLength(2);
      expect(getFeedbackAnalytics.sessionEvents('session-2')).toHaveLength(1);
    });

    it('clears all events when requested', () => {
      trackFeedbackEvent.formViewed('session-1', 120000);
      trackFeedbackEvent.formViewed('session-2', 180000);

      expect(getFeedbackAnalytics.sessionEvents('session-1')).toHaveLength(1);
      expect(getFeedbackAnalytics.sessionEvents('session-2')).toHaveLength(1);

      feedbackAnalytics.clearEvents();

      expect(getFeedbackAnalytics.sessionEvents('session-1')).toHaveLength(0);
      expect(getFeedbackAnalytics.sessionEvents('session-2')).toHaveLength(0);
    });
  });

  describe('Timestamp Handling', () => {
    it('sets timestamp on event creation', () => {
      const beforeTime = new Date();
      trackFeedbackEvent.formViewed('session-1', 120000);
      const afterTime = new Date();

      const events = getFeedbackAnalytics.sessionEvents('session-1');
      const event = events[0];

      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined feedback ID gracefully', () => {
      const event = {
        event: 'feedback_form_viewed' as const,
        sessionId: 'session-1',
        actualDuration: 120000,
        timestamp: new Date(),
      };

      // Direct method call to test internal handling
      feedbackAnalytics['events'].push(event);

      const events = getFeedbackAnalytics.sessionEvents('session-1');
      expect(events[0].feedbackId).toBeUndefined();
    });

    it('handles mixed event types in calculations', () => {
      // Mix of different event types
      trackFeedbackEvent.formViewed('session-1', 120000);
      trackFeedbackEvent.targetMet('session-1', 'feedback-1', 120000, 5);
      trackFeedbackEvent.skipped('session-1', 120000);

      // Should not throw errors and should handle appropriately
      expect(() => getFeedbackAnalytics.completionRate()).not.toThrow();
      expect(() => getFeedbackAnalytics.averageSatisfaction()).not.toThrow();
    });
  });
});