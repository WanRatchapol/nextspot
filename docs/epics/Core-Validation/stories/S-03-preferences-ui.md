# S-03: Preferences UI

## Story Overview

**Story ID:** S-03
**Story Name:** Preferences UI
**Epic:** [Core Validation Platform](../epic-1-core-validation-platform.md)
**Effort:** 0.5 days
**Priority:** High (Critical Path)

## User Story

**As a** Thai university student,
**I want** to quickly specify my budget, mood, and available time,
**so that** I get relevant destination suggestions without lengthy forms.

## Intent & Scope

Create intuitive, mobile-first preference input interface that captures user constraints efficiently. Focus on visual selectors and touch-friendly interactions that complete in under 30 seconds.

## Acceptance Criteria

1. Budget range slider (฿500 - ฿3,000) with visual indicators
2. 6 mood category cards with Thai/English labels (Chill, Adventure, Foodie, Cultural, Social, Romantic)
3. Time window selection (half-day, full-day, weekend) with radio buttons
4. Transport mode selection (BTS/MRT, Taxi, Walk, Mixed) with icons
5. Form validation prevents incomplete submission
6. "ดูสถานที่แนะนำ (View Recommendations)" button enabled when valid
7. Form state persisted across navigation
8. Mobile-optimized touch interactions (≥44px targets)

## Component Architecture

```typescript
interface UserPreferences {
  budgetBand: BudgetBand;
  timeWindow: TimeWindow;
  moodTags: MoodCategory[];
  transport: TransportMode;
}

type BudgetBand = '<500' | '500-1000' | '1000-2000' | '2000+';
type TimeWindow = 'half-day' | 'full-day' | 'weekend';
type MoodCategory = 'chill' | 'adventure' | 'foodie' | 'cultural' | 'social' | 'romantic';
```

## Analytics Events

- `preferences_view` - User visits preferences page
- `preference_selection` - Individual preference selected
- `preferences_completed` - Form submitted successfully

## Performance Targets

- Initial Render: < 300ms
- Interaction Response: < 100ms
- Form Validation: < 50ms per field
- Component Bundle: < 150KB gzipped

## Links & References

- **PRD Reference:** [docs/prd.md#story-12-preference-input-interface](../../prd.md)
- **Architecture Reference:** [docs/architecture.md#component-architecture](../../architecture.md)

---
**Status:** Ready for Development
**Created:** 2025-10-13