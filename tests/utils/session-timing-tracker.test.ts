// Tests for SessionTimingTracker utility
// S-09 Liked List & Completion feature

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionTimingTracker, getGlobalSessionTracker, resetGlobalSessionTracker } from '@/utils/session-timing-tracker';

// Mock Date.now for consistent testing
const mockNow = vi.fn();
vi.stubGlobal('Date', {
  ...Date,
  now: mockNow,
});

describe('SessionTimingTracker', () => {
  let tracker: SessionTimingTracker;

  beforeEach(() => {
    tracker = new SessionTimingTracker();
    mockNow.mockReturnValue(1000000); // Fixed timestamp for testing
  });

  describe('constructor', () => {
    it('should initialize with current time', () => {
      expect(tracker.getTotalTime()).toBe(0);
      expect(tracker.getCurrentPhase()).toBeNull();
    });
  });

  describe('startPhase', () => {
    it('should start a new phase', () => {
      tracker.startPhase('preferences');
      expect(tracker.getCurrentPhase()).toBe('preferences');
    });

    it('should end previous phase when starting new one', () => {
      tracker.startPhase('preferences');
      mockNow.mockReturnValue(1005000); // 5 seconds later

      tracker.startPhase('swiping');
      expect(tracker.getCurrentPhase()).toBe('swiping');

      const breakdown = tracker.getPhaseBreakdown();
      expect(breakdown.preferencesMs).toBe(5000);
    });
  });

  describe('endPhase', () => {
    it('should end the current phase and return duration', () => {
      tracker.startPhase('preferences');
      mockNow.mockReturnValue(1003000); // 3 seconds later

      const duration = tracker.endPhase('preferences');
      expect(duration).toBe(3000);
      expect(tracker.getCurrentPhase()).toBeNull();
    });

    it('should warn when ending wrong phase', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      tracker.startPhase('preferences');
      tracker.endPhase('swiping');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Trying to end phase 'swiping' but current phase is 'preferences'")
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getTotalTime', () => {
    it('should return total time from start', () => {
      mockNow.mockReturnValue(1010000); // 10 seconds later
      expect(tracker.getTotalTime()).toBe(10000);
    });
  });

  describe('getPhaseBreakdown', () => {
    it('should return breakdown of all phases', () => {
      // Preferences phase
      tracker.startPhase('preferences');
      mockNow.mockReturnValue(1005000); // 5 seconds
      tracker.endPhase('preferences');

      // Swiping phase
      tracker.startPhase('swiping');
      mockNow.mockReturnValue(1015000); // 10 more seconds
      tracker.endPhase('swiping');

      // Review phase
      tracker.startPhase('review');
      mockNow.mockReturnValue(1018000); // 3 more seconds

      const breakdown = tracker.getPhaseBreakdown();
      expect(breakdown.preferencesMs).toBe(5000);
      expect(breakdown.swipingMs).toBe(10000);
      expect(breakdown.reviewMs).toBe(3000); // Current phase time
      expect(breakdown.totalMs).toBe(18000);
    });

    it('should handle multiple sessions of same phase', () => {
      // First preferences session
      tracker.startPhase('preferences');
      mockNow.mockReturnValue(1002000); // 2 seconds
      tracker.endPhase('preferences');

      // Second preferences session
      tracker.startPhase('preferences');
      mockNow.mockReturnValue(1005000); // 3 more seconds
      tracker.endPhase('preferences');

      const breakdown = tracker.getPhaseBreakdown();
      expect(breakdown.preferencesMs).toBe(5000); // 2 + 3 seconds
    });
  });

  describe('getSessionTiming', () => {
    it('should return session timing data for API calls', () => {
      tracker.startPhase('preferences');
      mockNow.mockReturnValue(1003000);
      tracker.endPhase('preferences');

      tracker.startPhase('swiping');
      mockNow.mockReturnValue(1008000);

      const timing = tracker.getSessionTiming();
      expect(timing.startTime).toBeInstanceOf(Date);
      expect(timing.preferencesTime).toBe(3000);
      expect(timing.swipingTime).toBe(5000);
      expect(timing.totalTime).toBe(8000);
    });
  });

  describe('reset', () => {
    it('should reset all timing data', () => {
      tracker.startPhase('preferences');
      mockNow.mockReturnValue(1005000);
      tracker.endPhase('preferences');

      mockNow.mockReturnValue(1010000);
      tracker.reset();

      expect(tracker.getTotalTime()).toBe(0);
      expect(tracker.getCurrentPhase()).toBeNull();
      expect(tracker.getPhaseBreakdown().preferencesMs).toBe(0);
    });
  });

  describe('getSummary', () => {
    it('should return human-readable timing summary', () => {
      tracker.startPhase('preferences');
      mockNow.mockReturnValue(1005000); // 5 seconds
      tracker.endPhase('preferences');

      tracker.startPhase('swiping');
      mockNow.mockReturnValue(1015000); // 10 more seconds
      tracker.endPhase('swiping');

      const summary = tracker.getSummary();
      expect(summary).toBe('Total: 15s (Prefs: 5s, Swiping: 10s, Review: 0s)');
    });
  });
});

describe('Global Session Tracker', () => {
  beforeEach(() => {
    resetGlobalSessionTracker();
  });

  it('should return singleton instance', () => {
    const tracker1 = getGlobalSessionTracker();
    const tracker2 = getGlobalSessionTracker();
    expect(tracker1).toBe(tracker2);
  });

  it('should reset and return new instance', () => {
    const tracker1 = getGlobalSessionTracker();
    tracker1.startPhase('preferences');

    const tracker2 = resetGlobalSessionTracker();
    expect(tracker2).not.toBe(tracker1);
    expect(tracker2.getCurrentPhase()).toBeNull();
  });
});

describe('Performance', () => {
  it('should handle rapid phase changes efficiently', () => {
    const tracker = new SessionTimingTracker();
    const start = Date.now();

    // Rapidly change phases 1000 times
    for (let i = 0; i < 1000; i++) {
      tracker.startPhase('preferences');
      tracker.endPhase('preferences');
      tracker.startPhase('swiping');
      tracker.endPhase('swiping');
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // Should complete in less than 100ms
  });

  it('should handle large numbers of phase transitions', () => {
    const tracker = new SessionTimingTracker();

    // Create many phase transitions
    for (let i = 0; i < 100; i++) {
      tracker.startPhase('preferences');
      tracker.endPhase('preferences');
    }

    const breakdown = tracker.getPhaseBreakdown();
    expect(breakdown.preferencesMs).toBeGreaterThan(0);
    expect(typeof breakdown.preferencesMs).toBe('number');
  });
});