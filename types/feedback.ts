// Types for S-10 Feedback UI + API feature
// Validation metrics collection for MVP hypothesis testing

// Session timing interface for feedback collection
export interface SessionBreakdown {
  sessionId: string;
  validationSessionId: string;
  totalDurationMs: number;
  phases: {
    preferences: number;
    swiping: number;
    review: number;
  };
  timestamps: {
    started: Date;
    completed: Date;
  };
}

// Core feedback data types
export type SatisfactionRating = 1 | 2 | 3 | 4 | 5;
export type DurationPerception = 'much_faster' | 'faster' | 'same' | 'slower' | 'much_slower';

// Feedback form data interface
export interface FeedbackData {
  sessionId: string;
  validationSessionId: string;
  satisfaction: SatisfactionRating;
  perceivedDuration: DurationPerception;
  wouldRecommend: boolean;
  comments?: string;
  actualDuration: number; // ms from session timing
  completedAt: Date;
}

// API request/response interfaces
export interface FeedbackRequest {
  sessionId: string;
  validationSessionId: string;
  satisfaction: SatisfactionRating;
  perceivedDuration: DurationPerception;
  wouldRecommend: boolean;
  comments?: string;
  actualDuration: number; // ms from session timing
  completedAt: Date;
}

export interface FeedbackResponse {
  feedbackId: string;
  recorded: boolean;
  validationResults: {
    targetMet: boolean; // < 5 min decision time
    satisfactionLevel: 'excellent' | 'good' | 'average' | 'poor';
  };
  request_id: string;
}

// Component prop interfaces
export interface FeedbackFormProps {
  sessionTiming: SessionBreakdown;
  onSubmit: (feedback: FeedbackData) => Promise<void>;
  onSkip: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export interface StarRatingProps {
  value: SatisfactionRating | 0;
  onChange: (rating: SatisfactionRating) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export interface DurationSelectorProps {
  value: DurationPerception | '';
  onChange: (duration: DurationPerception) => void;
  actualDuration: number; // ms
  disabled?: boolean;
}

export interface RecommendSelectorProps {
  value: boolean | null;
  onChange: (recommend: boolean) => void;
  disabled?: boolean;
}

export interface CommentBoxProps {
  value: string;
  onChange: (comments: string) => void;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
}

// Duration perception options
export interface DurationOption {
  key: DurationPerception;
  label: string;
  emoji: string;
  description?: string;
}

export const DURATION_OPTIONS: DurationOption[] = [
  {
    key: 'much_faster',
    label: 'เร็วมากกว่าที่คิด',
    emoji: '⚡',
    description: 'เร็วกว่าที่คาดไว้มาก'
  },
  {
    key: 'faster',
    label: 'เร็วกว่าที่คิด',
    emoji: '🚀',
    description: 'เร็วกว่าที่คาดไว้'
  },
  {
    key: 'same',
    label: 'ตามที่คิดไว้',
    emoji: '⏰',
    description: 'ใช้เวลาตามที่คาดไว้'
  },
  {
    key: 'slower',
    label: 'ช้ากว่าที่คิด',
    emoji: '🐌',
    description: 'ช้ากว่าที่คาดไว้'
  },
  {
    key: 'much_slower',
    label: 'ช้ามากกว่าที่คิด',
    emoji: '⏳',
    description: 'ช้ากว่าที่คาดไว้มาก'
  }
];

// Validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FeedbackValidationErrors {
  satisfaction?: string;
  perceivedDuration?: string;
  wouldRecommend?: string;
  comments?: string;
  general?: string;
}

// Analytics interfaces
export interface FeedbackAnalytics {
  event: 'feedback_form_viewed' | 'feedback_submitted' | 'feedback_skipped' | 'validation_target_met';
  sessionId: string;
  feedbackId?: string;
  satisfaction?: SatisfactionRating;
  perceivedDuration?: DurationPerception;
  wouldRecommend?: boolean;
  actualDuration: number;
  targetMet?: boolean;
  timestamp: Date;
}

// Validation metrics for MVP
export interface ValidationMetrics {
  avgSatisfaction: number; // 1-5 scale
  speedValidation: {
    fasterPerception: number; // % who felt it was faster
    targetMet: number; // % who completed in < 5 min
    avgActualDuration: number; // ms
  };
  recommendationRate: number; // % who would recommend
  completionRate: number; // % who submitted feedback
  totalFeedback: number;
  dateRange: {
    from: Date;
    to: Date;
  };
}

// Success thresholds for MVP validation
export const SUCCESS_THRESHOLDS = {
  SATISFACTION_TARGET: 4.0, // >= 4.0/5.0
  FASTER_PERCEPTION_TARGET: 0.6, // >= 60% perceive as faster
  RECOMMENDATION_TARGET: 0.7, // >= 70% would recommend
  TIME_TARGET_ACHIEVEMENT: 0.7, // >= 70% complete in < 5 minutes
  MAX_DECISION_TIME_MS: 5 * 60 * 1000, // 5 minutes
} as const;

// Error response interface
export interface FeedbackApiError {
  error: {
    code: string;
    message: string;
    details?: FeedbackValidationErrors;
  };
  request_id: string;
}

// Database model interface (for reference)
export interface FeedbackModel {
  id: string;
  sessionId: string;
  validationSessionId: string;
  satisfaction: SatisfactionRating;
  perceivedDuration: DurationPerception;
  wouldRecommend: boolean;
  comments?: string;
  actualDurationMs: number;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Utility functions type definitions
export type SatisfactionLevelCalculator = (rating: SatisfactionRating) => 'excellent' | 'good' | 'average' | 'poor';
export type DurationFormatter = (ms: number) => string;
export type ValidationChecker = (actualDurationMs: number) => boolean;