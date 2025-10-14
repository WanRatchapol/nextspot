# S-10: Feedback UI + API

## Story Overview

**Story ID:** S-10
**Story Name:** Feedback UI + API
**Epic:** [Core Validation Platform](../epic-1-core-validation-platform.md)
**Effort:** 0.5 days
**Priority:** High (Critical Path - Validation)

## User Story

**As a** product team,
**I want** to collect user satisfaction and timing feedback after the swiping experience,
**so that** I can validate the "faster decision-making" hypothesis and measure user satisfaction.

## Intent & Scope

Implement comprehensive feedback collection system that captures satisfaction ratings, perceived timing, and qualitative insights essential for MVP validation metrics.

## Acceptance Criteria

1. Feedback form appears after session completion
2. 5-star satisfaction rating with visual stars
3. Perceived duration selector (much faster, faster, same, slower, much slower)
4. "Would you recommend this?" yes/no question
5. Optional comment field (max 1000 characters)
6. Submit feedback with validation and error handling
7. Thank you state with next steps or restart option
8. Analytics integration for validation dashboard

## API Contract

**POST /api/feedback**
```typescript
interface FeedbackRequest {
  sessionId: string;
  validationSessionId: string;
  satisfaction: 1 | 2 | 3 | 4 | 5;
  perceivedDuration: 'much_faster' | 'faster' | 'same' | 'slower' | 'much_slower';
  wouldRecommend: boolean;
  comments?: string;
  actualDuration: number; // ms from session timing
  completedAt: Date;
}

interface FeedbackResponse {
  feedbackId: string;
  recorded: boolean;
  validationResults: {
    targetMet: boolean; // < 5 min decision time
    satisfactionLevel: 'excellent' | 'good' | 'average' | 'poor';
  };
}
```

## Database Schema

```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  validation_session_id UUID REFERENCES validation_sessions(id),
  satisfaction INTEGER CHECK (satisfaction BETWEEN 1 AND 5),
  perceived_duration duration_perception_enum NOT NULL,
  would_recommend BOOLEAN NOT NULL,
  comments TEXT,
  actual_duration_ms INTEGER NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE duration_perception_enum AS ENUM (
  'much_faster', 'faster', 'same', 'slower', 'much_slower'
);

-- Index for analytics queries
CREATE INDEX idx_feedback_analytics ON feedback(satisfaction, perceived_duration, submitted_at)
WHERE submitted_at > NOW() - INTERVAL '30 days';
```

## UI Component Design

```typescript
interface FeedbackFormProps {
  sessionTiming: SessionBreakdown;
  onSubmit: (feedback: FeedbackData) => Promise<void>;
  onSkip: () => void;
}

const FeedbackForm = ({ sessionTiming, onSubmit, onSkip }) => {
  const [satisfaction, setSatisfaction] = useState<number>(0);
  const [perceivedDuration, setPerceivedDuration] = useState<string>('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [comments, setComments] = useState<string>('');

  return (
    <form className="feedback-form">
      <StarRating value={satisfaction} onChange={setSatisfaction} />
      <DurationSelector value={perceivedDuration} onChange={setPerceivedDuration} />
      <RecommendSelector value={wouldRecommend} onChange={setWouldRecommend} />
      <CommentBox value={comments} onChange={setComments} />
      <SubmitButton disabled={!isValid} />
    </form>
  );
};
```

## Star Rating Component

```typescript
const StarRating = ({ value, onChange }) => {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="star-rating">
      <p className="rating-label">คุณพอใจกับประสบการณ์นี้แค่ไหน?</p>
      <div className="stars">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            className={`star ${(hoverValue || value) >= star ? 'filled' : ''}`}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
          >
            ⭐
          </button>
        ))}
      </div>
      <div className="rating-labels">
        <span>แย่มาก</span>
        <span>ดีเยี่ยม</span>
      </div>
    </div>
  );
};
```

## Duration Perception Component

```typescript
const DurationSelector = ({ value, onChange }) => {
  const options = [
    { key: 'much_faster', label: 'เร็วมากกว่าที่คิด', emoji: '⚡' },
    { key: 'faster', label: 'เร็วกว่าที่คิด', emoji: '🚀' },
    { key: 'same', label: 'ตามที่คิดไว้', emoji: '⏰' },
    { key: 'slower', label: 'ช้ากว่าที่คิด', emoji: '🐌' },
    { key: 'much_slower', label: 'ช้ามากกว่าที่คิด', emoji: '⏳' }
  ];

  return (
    <div className="duration-selector">
      <p className="selector-label">
        เวลาที่ใช้ในการตัดสินใจเป็นอย่างไร?
        <span className="actual-time">
          (เวลาจริง: {formatDuration(actualDuration)})
        </span>
      </p>
      <div className="duration-options">
        {options.map(option => (
          <button
            key={option.key}
            className={`duration-option ${value === option.key ? 'selected' : ''}`}
            onClick={() => onChange(option.key)}
          >
            <span className="emoji">{option.emoji}</span>
            <span className="label">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
```

## Validation Logic

```typescript
const validateFeedback = (feedback: FeedbackData): ValidationResult => {
  const errors: string[] = [];

  if (!feedback.satisfaction || feedback.satisfaction < 1 || feedback.satisfaction > 5) {
    errors.push('กรุณาให้คะแนนความพอใจ');
  }

  if (!feedback.perceivedDuration) {
    errors.push('กรุณาเลือกความรู้สึกเกี่ยวกับเวลา');
  }

  if (feedback.wouldRecommend === null) {
    errors.push('กรุณาตอบว่าจะแนะนำให้เพื่อนหรือไม่');
  }

  if (feedback.comments && feedback.comments.length > 1000) {
    errors.push('ความคิดเห็นต้องไม่เกิน 1000 ตัวอักษร');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
```

## Analytics Dashboard Integration

```typescript
// Real-time validation metrics
interface ValidationMetrics {
  avgSatisfaction: number; // 1-5 scale
  speedValidation: {
    fasterPerception: number; // % who felt it was faster
    targetMet: number; // % who completed in < 5 min
    avgActualDuration: number; // ms
  };
  recommendationRate: number; // % who would recommend
  completionRate: number; // % who submitted feedback
}

// Generate validation report
const generateValidationReport = async (): Promise<ValidationMetrics> => {
  const results = await db.feedback.aggregate({
    _avg: { satisfaction: true, actualDurationMs: true },
    _count: { id: true },
    where: { submittedAt: { gte: last7Days } }
  });

  return {
    avgSatisfaction: results._avg.satisfaction,
    speedValidation: {
      fasterPerception: await getFasterPerceptionRate(),
      targetMet: await getTargetMetRate(),
      avgActualDuration: results._avg.actualDurationMs
    },
    recommendationRate: await getRecommendationRate(),
    completionRate: await getCompletionRate()
  };
};
```

## Analytics Events

- `feedback_form_viewed` - User reached feedback screen
- `feedback_submitted` - User completed feedback form
- `feedback_skipped` - User skipped feedback
- `validation_target_met` - User completed in < 5 minutes

## Performance Targets

- Form Load Time: < 200ms
- Submission Response: < 300ms
- Validation Processing: < 100ms
- Database Write: < 150ms

## Success Metrics

Key validation metrics for MVP:
- **Satisfaction Score:** Target ≥ 4.0/5.0
- **Speed Perception:** ≥ 60% perceive as "faster" or "much faster"
- **Recommendation Rate:** ≥ 70% would recommend
- **Target Achievement:** ≥ 70% complete in < 5 minutes

## Links & References

- **PRD Reference:** [docs/prd.md#story-14-validation-metrics-capture](../../prd.md)
- **Architecture Reference:** [docs/architecture.md#validation--learnings](../../architecture.md)

---
**Status:** Ready for Development
**Created:** 2025-10-13