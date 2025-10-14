# S-09: Liked List & Completion

## Story Overview

**Story ID:** S-09
**Story Name:** Liked List & Completion
**Epic:** [Core Validation Platform](../epic-1-core-validation-platform.md)
**Effort:** 0.5 days
**Priority:** High (Critical Path)

## User Story

**As a** Thai university student,
**I want** to review my liked destinations and complete my selection,
**so that** I have a curated list of places to visit that match my preferences.

## Intent & Scope

Create liked destinations collection interface that allows users to review their swipe-right choices and complete the decision-making flow with timing validation.

## Acceptance Criteria

1. "Liked destinations" collection builds as users swipe right
2. Real-time counter shows "ถูกใจ X ที่" (Liked X places)
3. Review screen displays all liked destinations in grid/list format
4. Remove destinations from liked list if changed mind
5. "Complete Selection" button to finish decision flow
6. Session timing captured from preferences to completion
7. Empty state handling if no destinations liked
8. Navigation back to card stack for more options

## Component Architecture

```typescript
interface LikedListProps {
  likedDestinations: DestinationCard[];
  onRemove: (destinationId: string) => void;
  onComplete: () => void;
  onContinueSwiping: () => void;
  sessionTiming: SessionTiming;
}

interface SessionTiming {
  startTime: Date;
  preferencesTime: number; // ms spent on preferences
  swipingTime: number; // ms spent swiping
  totalTime: number; // total session duration
}

interface LikedDestination extends DestinationCard {
  likedAt: Date;
  swipeVelocity?: number;
}
```

## Session Timing Logic

```typescript
class SessionTimingTracker {
  private startTime: Date;
  private phaseStartTime: Date;
  private phases: SessionPhase[] = [];

  startPhase(phase: 'preferences' | 'swiping' | 'review'): void {
    this.phaseStartTime = new Date();
  }

  endPhase(phase: string): number {
    const duration = Date.now() - this.phaseStartTime.getTime();
    this.phases.push({ phase, duration, endedAt: new Date() });
    return duration;
  }

  getTotalTime(): number {
    return Date.now() - this.startTime.getTime();
  }

  getPhaseBreakdown(): SessionBreakdown {
    return {
      preferencesMs: this.getPhaseTime('preferences'),
      swipingMs: this.getPhaseTime('swiping'),
      reviewMs: this.getPhaseTime('review'),
      totalMs: this.getTotalTime()
    };
  }
}
```

## UI Design Specifications

```typescript
// Liked counter component
const LikedCounter = ({ count }: { count: number }) => (
  <div className="liked-counter">
    <span className="heart-icon">❤️</span>
    <span className="count-text">ถูกใจ {count} ที่</span>
  </div>
);

// Liked destinations grid
const LikedGrid = ({ destinations, onRemove }) => (
  <div className="liked-grid">
    {destinations.map(dest => (
      <LikedDestinationCard
        key={dest.id}
        destination={dest}
        onRemove={() => onRemove(dest.id)}
      />
    ))}
  </div>
);

// Empty state
const EmptyLikedState = ({ onContinueSwiping }) => (
  <div className="empty-liked-state">
    <p>คุณยังไม่ได้เลือกสถานที่ใดเลย</p>
    <button onClick={onContinueSwiping}>
      กลับไปดูสถานที่เพิ่มเติม
    </button>
  </div>
);
```

## API Integration

**GET /api/sessions/{sessionId}/liked** - Retrieve liked destinations
```typescript
interface LikedDestinationsResponse {
  destinations: LikedDestination[];
  count: number;
  sessionTiming: SessionBreakdown;
}
```

**DELETE /api/sessions/{sessionId}/liked/{destinationId}** - Remove from liked list

**POST /api/sessions/{sessionId}/complete** - Complete decision flow
```typescript
interface CompleteSessionRequest {
  finalSelections: string[]; // destination IDs
  sessionTiming: SessionBreakdown;
  completedAt: Date;
}
```

## State Management

```typescript
// Zustand store for liked destinations
interface LikedState {
  likedDestinations: LikedDestination[];
  sessionTiming: SessionTimingTracker;

  addLiked: (destination: DestinationCard, swipeData: SwipeData) => void;
  removeLiked: (destinationId: string) => void;
  completeSession: () => Promise<void>;
  getLikedCount: () => number;
  getTiming: () => SessionBreakdown;
}

export const useLikedStore = create<LikedState>()((set, get) => ({
  likedDestinations: [],
  sessionTiming: new SessionTimingTracker(),

  addLiked: (destination, swipeData) => set(state => ({
    likedDestinations: [
      ...state.likedDestinations,
      {
        ...destination,
        likedAt: new Date(),
        swipeVelocity: swipeData.velocity
      }
    ]
  })),

  removeLiked: (destinationId) => set(state => ({
    likedDestinations: state.likedDestinations.filter(d => d.id !== destinationId)
  })),

  completeSession: async () => {
    const { likedDestinations, sessionTiming } = get();
    await apiClient.completeSession({
      finalSelections: likedDestinations.map(d => d.id),
      sessionTiming: sessionTiming.getPhaseBreakdown(),
      completedAt: new Date()
    });
  }
}));
```

## Analytics Events

- `destination_liked` - User swiped right
- `destination_unliked` - User removed from liked list
- `liked_list_viewed` - User opened review screen
- `session_completed` - User finished decision flow

## Performance Targets

- Liked List Load: < 200ms
- Remove Operation: < 100ms
- State Persistence: < 50ms
- Session Completion: < 500ms

## Validation Metrics

Track these key metrics for MVP validation:
- Average decision time (preferences → completion)
- Completion rate (% users who finish flow)
- Liked destination count distribution
- Time spent in each phase
- Return rate to continue swiping

## Links & References

- **PRD Reference:** [docs/prd.md#story-13-tinder-style-card-recommendation-interface](../../prd.md)
- **Architecture Reference:** [docs/architecture.md#state-management-architecture](../../architecture.md)

---
**Status:** Ready for Development
**Created:** 2025-10-13