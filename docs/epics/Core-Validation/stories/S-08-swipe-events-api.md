# S-08: Swipe Events API

## Story Overview

**Story ID:** S-08
**Story Name:** Swipe Events API
**Epic:** [Core Validation Platform](../epic-1-core-validation-platform.md)
**Effort:** 0.5 days
**Priority:** High (Critical Path - Analytics)

## User Story

**As a** product team,
**I want** to capture detailed swipe interactions and timing data,
**so that** I can validate user engagement patterns and decision-making speed for the MVP hypothesis.

## Intent & Scope

Implement comprehensive swipe analytics backend that captures gesture details, timing, and user behavior patterns essential for validating the "faster decision-making" hypothesis.

## Acceptance Criteria

1. POST /api/swipe-events captures swipe gesture details
2. Records swipe direction, velocity, duration, and view time
3. Associates events with session and destination for analysis
4. Batch event processing to reduce API calls
5. Real-time analytics aggregation for dashboard
6. Performance optimized for high-frequency events
7. Data export capability for analysis tools
8. Privacy-compliant event storage (90-day retention)

## API Contract

**POST /api/swipe-events**
```typescript
interface SwipeEventRequest {
  sessionId: string;
  destinationId: string;
  action: 'like' | 'skip' | 'detail_tap';
  direction: 'left' | 'right' | 'tap';
  velocity?: number; // px/ms
  durationMs?: number;
  viewDurationMs: number; // Time card was visible
  timestamp: number;
}

interface SwipeEventResponse {
  eventId: string;
  recorded: boolean;
  requestId: string;
}
```

**POST /api/swipe-events/batch** (for performance)
```typescript
interface BatchSwipeRequest {
  events: SwipeEventRequest[];
  sessionId: string;
}
```

## Database Schema

```sql
CREATE TABLE swipe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  action swipe_action_enum NOT NULL,
  direction swipe_direction_enum NOT NULL,
  velocity DECIMAL(5,2),
  duration_ms INTEGER,
  view_duration_ms INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_swipe_events_session_time ON swipe_events(session_id, timestamp DESC);
CREATE INDEX idx_swipe_events_destination_action ON swipe_events(destination_id, action);
CREATE INDEX idx_swipe_events_analytics ON swipe_events(action, timestamp) WHERE timestamp > NOW() - INTERVAL '30 days';
```

## Event Processing Pipeline

```typescript
class SwipeEventProcessor {
  async processEvent(event: SwipeEventRequest): Promise<void> {
    // 1. Validate event data
    const validated = SwipeEventSchema.parse(event);

    // 2. Store in database
    await this.storeEvent(validated);

    // 3. Update real-time aggregates
    await this.updateAggregates(validated);

    // 4. Trigger analytics pipeline
    await this.triggerAnalytics(validated);
  }

  private async updateAggregates(event: SwipeEventRequest): Promise<void> {
    // Update Redis counters for real-time dashboard
    await redis.hincrby(`session:${event.sessionId}:stats`, 'total_swipes', 1);
    await redis.hincrby(`session:${event.sessionId}:stats`, `${event.action}_count`, 1);
  }
}
```

## Analytics Aggregations

```typescript
interface SwipeAnalytics {
  sessionStats: {
    totalSwipes: number;
    likeRate: number; // likes / total
    avgViewDuration: number; // ms
    avgSwipeVelocity: number; // px/ms
    decisionSpeed: number; // swipes per minute
  };
  destinationStats: {
    destinationId: string;
    likeRate: number;
    avgViewDuration: number;
    totalViews: number;
  };
}
```

## Real-time Dashboard Queries

```sql
-- Session completion analytics
SELECT
  session_id,
  COUNT(*) as total_swipes,
  COUNT(*) FILTER (WHERE action = 'like') as likes,
  COUNT(*) FILTER (WHERE action = 'skip') as skips,
  AVG(view_duration_ms) as avg_view_duration,
  AVG(velocity) as avg_velocity
FROM swipe_events
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY session_id;

-- Popular destinations
SELECT
  d.name_en,
  COUNT(*) as total_views,
  COUNT(*) FILTER (WHERE se.action = 'like') as likes,
  (COUNT(*) FILTER (WHERE se.action = 'like')::float / COUNT(*)) as like_rate
FROM swipe_events se
JOIN destinations d ON se.destination_id = d.id
WHERE se.timestamp > NOW() - INTERVAL '7 days'
GROUP BY d.id, d.name_en
ORDER BY like_rate DESC;
```

## Performance Optimizations

```typescript
// Batch processing for high-volume events
const eventQueue = new Queue('swipe-events', {
  batch: {
    size: 100,
    timeout: 5000, // 5 seconds
  }
});

// Async processing
eventQueue.process(async (jobs) => {
  const events = jobs.map(job => job.data);
  await db.swipeEvent.createMany({ data: events });
});
```

## Analytics Events (Meta)

- `swipe_event_recorded` - Event successfully stored
- `batch_processed` - Batch of events processed
- `analytics_updated` - Real-time stats updated

## Performance Targets

- Event Recording: < 100ms P95
- Batch Processing: < 500ms for 100 events
- Real-time Aggregation: < 200ms update latency
- Dashboard Query: < 1s for 7-day analytics

## Privacy & Compliance

- No PII in swipe events (only session/destination IDs)
- 90-day automatic data retention
- Export API for user data requests
- Anonymization for long-term analytics

## Links & References

- **PRD Reference:** [docs/prd.md#story-14-validation-metrics-capture](../../prd.md)
- **Architecture Reference:** [docs/architecture.md#analytics--compliance](../../architecture.md)

---
**Status:** Ready for Development
**Created:** 2025-10-13