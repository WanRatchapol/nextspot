# S-06: Popular Recommendations (Edge)

## Story Overview

**Story ID:** S-06
**Story Name:** Popular Recommendations (Edge)
**Epic:** [Core Validation Platform](../epic-1-core-validation-platform.md)
**Effort:** 0.5 days
**Priority:** High (Critical Path - Fast Mode Support)

## User Story

**As a** Thai university student,
**I want** to receive popular destination recommendations quickly when the system is under load,
**so that** I always get suggestions even if personalized recommendations are temporarily unavailable.

## Intent & Scope

Implement Fast Mode fallback system using edge-cached popular destinations that loads in <800ms when main recommendation engine times out or fails.

## Acceptance Criteria

1. GET /api/recommendations/popular returns top-rated destinations
2. Edge runtime deployment for sub-second response times
3. Static caching with 10-minute TTL and stale-while-revalidate
4. Returns 3 precomputed destinations + 1 popular choice
5. Fallback triggered when main recommendations API > 800ms
6. Clear "Fast Mode" indicator in response metadata
7. Same DestinationCard format as main recommendations
8. No preference filtering - universally appealing destinations

## API Contract

**GET /api/recommendations/popular?limit=3**
```typescript
interface FastModeResponse {
  destinations: DestinationCard[];
  isFastMode: true;
  message: "Fast estimate - showing popular recommendations";
  metadata: {
    reason: "recommendation_timeout" | "circuit_breaker_open";
    fallbackUsed: "precomputed_popular";
    cacheKey: string;
  };
}
```

## Edge Function Implementation

```typescript
// app/api/recommendations/popular/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  const cached = await getEdgeCache('popular-destinations');
  if (cached) return Response.json(cached);

  const popular = await db.destination.findMany({
    where: { isActive: true },
    orderBy: { instagramScore: 'desc' },
    take: 10,
    include: { images: { where: { isPrimary: true } } }
  });

  await setEdgeCache('popular-destinations', popular, { ttl: 600 });
  return Response.json(formatFastModeResponse(popular.slice(0, 3)));
}
```

## Caching Strategy

```typescript
const CACHE_CONFIG = {
  POPULAR: {
    maxAge: 600, // 10 minutes
    staleWhileRevalidate: 1200, // 20 minutes
    keyPattern: 'popular:{limit}'
  }
};
```

## Fallback Logic

```typescript
async function getRecommendationsWithFallback(sessionId: string) {
  try {
    return await circuitBreaker.execute(() =>
      getPersonalizedRecommendations(sessionId)
    );
  } catch (error) {
    console.warn('Falling back to Fast Mode:', error.message);
    return await getPopularRecommendations();
  }
}
```

## Analytics Events

- `fast_mode_activated` - Fallback system triggered
- `popular_recommendations_served` - Fast Mode response delivered
- `cache_hit_popular` - Edge cache served request

## Performance Targets

- Edge Response Time: < 400ms P95
- Cache Hit Rate: > 80%
- Fallback Activation: < 20% of requests
- Fast Mode User Experience: Seamless transition

## Popular Destination Criteria

1. Instagram Score ≥ 7/10
2. Budget-friendly (฿500-1500 range)
3. BTS/MRT accessible
4. Mixed mood appeal (chill + foodie + cultural)
5. Positive user feedback from previous sessions

## Links & References

- **PRD Reference:** [docs/prd.md#story-13-tinder-style-card-recommendation-interface](../../prd.md)
- **Architecture Reference:** [docs/architecture.md#graceful-degradation-pattern](../../architecture.md)

---
**Status:** Ready for Development
**Created:** 2025-10-13