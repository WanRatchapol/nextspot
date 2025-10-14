# S-04: Preferences API

## Story Overview

**Story ID:** S-04
**Story Name:** Preferences API
**Epic:** [Core Validation Platform](../epic-1-core-validation-platform.md)
**Effort:** 0.5 days
**Priority:** High (Critical Path)

## User Story

**As a** development team,
**I want** robust preference storage and validation backend,
**so that** user preferences are reliably stored and can drive recommendation algorithms.

## Intent & Scope

Implement preference storage API with validation, efficient updates, and optimized database schema for Bangkok student travel preferences.

## Acceptance Criteria

1. PUT /api/sessions/{id}/preferences stores validated user preferences
2. Zod schema validation for all preference fields
3. Budget band enum mapping (฿500-3000 ranges)
4. Mood tags array validation (1-6 categories allowed)
5. Transport mode and time window validation
6. Atomic preference updates with rollback on failure
7. Preference retrieval for recommendation engine
8. Database indexes for efficient filtering

## API Contract

**PUT /api/sessions/{sessionId}/preferences**
```typescript
interface UpdatePreferencesRequest {
  budgetBand: BudgetBand;
  timeWindow: TimeWindow;
  moodTags: MoodCategory[];
  transport: TransportMode;
}
interface PreferencesResponse {
  preferences: UserPreferences;
  updatedAt: string;
  isValid: boolean;
}
```

## Database Schema

```sql
CREATE TABLE user_preferences (
  session_id UUID PRIMARY KEY REFERENCES sessions(id),
  budget_band budget_band_enum NOT NULL,
  time_window time_window_enum NOT NULL,
  mood_tags mood_category_enum[] NOT NULL,
  transport transport_mode_enum NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Validation Rules

```typescript
const PreferencesSchema = z.object({
  budgetBand: z.enum(['<500', '500-1000', '1000-2000', '2000+']),
  timeWindow: z.enum(['half-day', 'full-day', 'weekend']),
  moodTags: z.array(z.enum(['chill', 'adventure', 'foodie', 'cultural', 'social', 'romantic']))
    .min(1).max(6),
  transport: z.enum(['bts_mrt', 'taxi', 'walk', 'mixed'])
});
```

## Analytics Events

- `preferences_saved` - Preferences successfully stored
- `preferences_validation_error` - Invalid data submitted

## Performance Targets

- Preference Update: < 150ms P95
- Preference Retrieval: < 100ms P95
- Database Query: < 50ms P95

## Links & References

- **PRD Reference:** [docs/prd.md#story-12-preference-input-interface](../../prd.md)
- **Architecture Reference:** [docs/architecture.md#data-models](../../architecture.md)

---
**Status:** Ready for Development
**Created:** 2025-10-13