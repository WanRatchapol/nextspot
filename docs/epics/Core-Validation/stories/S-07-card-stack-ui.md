# S-07: Card Stack UI

## Story Overview

**Story ID:** S-07
**Story Name:** Card Stack UI
**Epic:** [Core Validation Platform](../epic-1-core-validation-platform.md)
**Effort:** 0.5 days
**Priority:** High (Critical Path)

## User Story

**As a** Thai university student,
**I want** to swipe through destination suggestions like Tinder,
**so that** I can quickly browse options and make decisions intuitively.

## Intent & Scope

Create engaging Tinder-style card interface with smooth gesture handling, optimized for mobile performance with fallback tap controls for accessibility.

## Acceptance Criteria

1. Tinder-style card stack interface with destination cards
2. Swipe right (like) / swipe left (skip) / tap for details functionality
3. Smooth swipe animations at 60fps on mobile devices
4. Each card shows: large photo, name, brief description, budget indicator, mood tags
5. "Like" collection builds as users swipe right
6. Maximum 10 cards per session to prevent decision fatigue
7. Fallback tap buttons for users who prefer clicking over swiping
8. Loading states and empty stack handling

## Component Architecture

```typescript
interface CardStackProps {
  destinations: DestinationCard[];
  onSwipe: (direction: 'left' | 'right', destination: DestinationCard) => void;
  onDetailTap: (destination: DestinationCard) => void;
  isLoading?: boolean;
}

interface SwipeGesture {
  direction: 'left' | 'right' | 'tap';
  velocity: number; // px/ms
  distance: number; // px
  duration: number; // ms
}
```

## Gesture Library Integration

```typescript
// Using @use-gesture/react for optimized mobile performance
import { useSpring, animated } from 'react-spring';
import { useDrag } from '@use-gesture/react';

const CardComponent = ({ destination, onSwipe }) => {
  const [{ x, rotate }, api] = useSpring(() => ({ x: 0, rotate: 0 }));

  const bind = useDrag(({ down, movement: [mx], velocity, direction }) => {
    const trigger = Math.abs(mx) > 50; // 50px threshold
    const dir = mx < 0 ? 'left' : 'right';

    if (!down && trigger) {
      onSwipe(dir, destination);
    }

    api.start({
      x: down ? mx : trigger ? 1000 * (mx > 0 ? 1 : -1) : 0,
      rotate: down ? mx * 0.1 : 0,
    });
  });
};
```

## Card Design Specifications

```css
.destination-card {
  width: 90vw;
  max-width: 350px;
  height: 500px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  background: white;
}

.card-image {
  height: 60%;
  object-fit: cover;
  width: 100%;
}

.card-content {
  padding: 16px;
  height: 40%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.swipe-indicator {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 24px;
  font-weight: bold;
  opacity: 0;
  transition: opacity 0.2s;
}

.swipe-indicator.like {
  right: 20px;
  color: #22c55e;
}

.swipe-indicator.skip {
  left: 20px;
  color: #ef4444;
}
```

## Analytics Events

- `card_viewed` - Card displayed to user
- `card_swiped` - User swiped card (direction, velocity, duration)
- `card_tapped` - User tapped for details
- `stack_completed` - All cards swiped

## Performance Targets

- Animation Frame Rate: 60fps consistent
- Gesture Response Time: < 16ms (1 frame)
- Card Render Time: < 100ms
- Memory Usage: < 100MB for 10 cards
- Touch Event Latency: < 50ms

## Accessibility Features

- Screen reader announcements for card content
- Keyboard navigation support (arrow keys)
- High contrast mode compatibility
- Alternative tap buttons for gesture-impaired users
- Focus indicators for interactive elements

## Error Handling

```typescript
// Empty stack state
const EmptyStack = () => (
  <div className="empty-stack">
    <p>🎉 คุณได้ดูสถานที่ครบแล้ว!</p>
    <button onClick={loadMoreCards}>ดูเพิ่มเติม</button>
  </div>
);

// Loading state
const LoadingCard = () => (
  <div className="loading-card">
    <div className="shimmer-effect" />
  </div>
);
```

## Links & References

- **PRD Reference:** [docs/prd.md#story-13-tinder-style-card-recommendation-interface](../../prd.md)
- **Architecture Reference:** [docs/architecture.md#mobile-specific-optimizations](../../architecture.md)

---
**Status:** Ready for Development
**Created:** 2025-10-13