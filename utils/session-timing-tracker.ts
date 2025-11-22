// Session timing tracker for S-09 Liked List & Completion
// Tracks time spent in different phases of the user session

export interface SessionPhase {
  phase: 'preferences' | 'swiping' | 'review';
  duration: number; // milliseconds
  endedAt: Date;
}

export interface SessionTiming {
  startTime: Date;
  preferencesTime: number; // ms spent on preferences
  swipingTime: number; // ms spent swiping
  totalTime: number; // total session duration
}

export interface SessionBreakdown {
  preferencesMs: number;
  swipingMs: number;
  reviewMs: number;
  totalMs: number;
}

export class SessionTimingTracker {
  private startTime: Date;
  private phaseStartTime: Date;
  private phases: SessionPhase[] = [];
  private currentPhase: string | null = null;

  constructor() {
    this.startTime = new Date();
    this.phaseStartTime = new Date();
  }

  /**
   * Start tracking a new phase
   */
  startPhase(phase: 'preferences' | 'swiping' | 'review'): void {
    // End current phase if one is active
    if (this.currentPhase) {
      this.endPhase(this.currentPhase);
    }

    this.currentPhase = phase;
    this.phaseStartTime = new Date();
  }

  /**
   * End the current phase and return duration
   */
  endPhase(phase: string): number {
    if (this.currentPhase !== phase) {
      console.warn(`[SessionTimingTracker] Trying to end phase '${phase}' but current phase is '${this.currentPhase}'`);
    }

    const duration = Date.now() - this.phaseStartTime.getTime();
    this.phases.push({
      phase: phase as 'preferences' | 'swiping' | 'review',
      duration,
      endedAt: new Date()
    });

    this.currentPhase = null;
    return duration;
  }

  /**
   * Get total session time from start
   */
  getTotalTime(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Get time spent in a specific phase
   */
  private getPhaseTime(phaseName: 'preferences' | 'swiping' | 'review'): number {
    return this.phases
      .filter(phase => phase.phase === phaseName)
      .reduce((total, phase) => total + phase.duration, 0);
  }

  /**
   * Get breakdown of all phases with timing
   */
  getPhaseBreakdown(): SessionBreakdown {
    // Include current phase time if phase is active
    let currentPhaseTime = 0;
    if (this.currentPhase) {
      currentPhaseTime = Date.now() - this.phaseStartTime.getTime();
    }

    return {
      preferencesMs: this.getPhaseTime('preferences') + (this.currentPhase === 'preferences' ? currentPhaseTime : 0),
      swipingMs: this.getPhaseTime('swiping') + (this.currentPhase === 'swiping' ? currentPhaseTime : 0),
      reviewMs: this.getPhaseTime('review') + (this.currentPhase === 'review' ? currentPhaseTime : 0),
      totalMs: this.getTotalTime()
    };
  }

  /**
   * Get session timing data for API calls
   */
  getSessionTiming(): SessionTiming {
    const breakdown = this.getPhaseBreakdown();
    return {
      startTime: this.startTime,
      preferencesTime: breakdown.preferencesMs,
      swipingTime: breakdown.swipingMs,
      totalTime: breakdown.totalMs
    };
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): string | null {
    return this.currentPhase;
  }

  /**
   * Reset timer (for new sessions)
   */
  reset(): void {
    this.startTime = new Date();
    this.phaseStartTime = new Date();
    this.phases = [];
    this.currentPhase = null;
  }

  /**
   * Get human-readable timing summary
   */
  getSummary(): string {
    const breakdown = this.getPhaseBreakdown();
    const totalSeconds = Math.round(breakdown.totalMs / 1000);
    const preferencesSeconds = Math.round(breakdown.preferencesMs / 1000);
    const swipingSeconds = Math.round(breakdown.swipingMs / 1000);
    const reviewSeconds = Math.round(breakdown.reviewMs / 1000);

    return `Total: ${totalSeconds}s (Prefs: ${preferencesSeconds}s, Swiping: ${swipingSeconds}s, Review: ${reviewSeconds}s)`;
  }
}

// Create a singleton instance for global session tracking
let globalSessionTracker: SessionTimingTracker | null = null;

export function getGlobalSessionTracker(): SessionTimingTracker {
  if (!globalSessionTracker) {
    globalSessionTracker = new SessionTimingTracker();
  }
  return globalSessionTracker;
}

export function resetGlobalSessionTracker(): SessionTimingTracker {
  globalSessionTracker = new SessionTimingTracker();
  return globalSessionTracker;
}