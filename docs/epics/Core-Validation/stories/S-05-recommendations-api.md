# S-05: Recommendations API

## Story Overview

**Story ID:** S-05
**Story Name:** Recommendations API
**Epic:** [Core Validation Platform](../epic-1-core-validation-platform.md)
**Effort:** 0.5 days
**Priority:** High (Critical Path)

## User Story

**As a** Thai university student,
**I want** to receive personalized destination recommendations based on my preferences,
**so that** I can discover relevant places that match my budget, mood, and time constraints.

## Intent & Scope

Implement core recommendation engine that filters Bangkok destinations by user preferences with circuit breaker protection and Fast Mode fallback for sub-3s performance.

## Acceptance Criteria

1. GET /api/recommendations returns filtered destinations based on user preferences
2. Filters by budget band, mood tags, time window, and transport accessibility
3. Returns up to 10 destination cards per request with pagination
4. Each card includes: photo, name, description, budget indicator, mood tags
5. Circuit breaker with 800ms timeout triggers Fast Mode fallback
6. Cache segmentation by preference combinations (5-10min TTL)
7. Structured error responses with request IDs
8. Performance logging and metrics collection

## API Contract

**GET /api/recommendations?sessionId={id}&limit=10&offset=0**
```typescript
interface RecommendationsResponse {
  destinations: DestinationCard[];
  metadata: {
    total: number;
    hasMore: boolean;
    cacheKey: string;
    generatedAt: string;
  };
}

interface DestinationCard {
  id: string;
  name: { th: string; en: string };
  description: { th: string; en: string };
  budgetBand: BudgetBand;
  moodTags: MoodCategory[];
  instagramScore: number;
  image: OptimizedImage;
  district: string;
}
```

## Database Query

```sql
SELECT d.*, di.url, di.width, di.height
FROM destinations d
JOIN destination_images di ON d.id = di.destination_id AND di.is_primary = true
WHERE d.budget_band = $1
  AND d.tags && $2  -- mood tags overlap
  AND d.is_active = true
ORDER BY d.instagram_score DESC, d.updated_at DESC
LIMIT $3 OFFSET $4;
```

## Circuit Breaker Implementation

```typescript
class RecommendationCircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // 800ms timeout, 1 retry, 60s open, 10s half-open
  }
}
```

## Analytics Events

- `recommendations_requested` - API call initiated
- `recommendations_returned` - Successful response
- `fast_mode_triggered` - Circuit breaker activated

## Performance Targets

- Recommendations API: P95 < 2.2s (target)
- Database Query: < 800ms P95
- Cache Hit Rate: > 50%
- Fast Mode Trigger Rate: < 20%

## Links & References

- **PRD Reference:** [docs/prd.md#story-13-tinder-style-card-recommendation-interface](../../prd.md)
- **Architecture Reference:** [docs/architecture.md#circuit-breaker--timeout-implementation](../../architecture.md)

---
**Status:** Ready for Development
**Created:** 2025-10-13