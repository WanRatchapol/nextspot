import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateRequestId } from '@/utils/request-id';
import type {
  FeedbackRequest,
  FeedbackResponse,
  FeedbackApiError,
  SatisfactionRating,
  DurationPerception
} from '@/types/feedback';
import { SUCCESS_THRESHOLDS } from '@/types/feedback';

export const runtime = 'nodejs';

// Zod validation schema for feedback payload
const FeedbackRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  validationSessionId: z.string().min(1, 'Validation session ID is required'),
  satisfaction: z.number().int().min(1).max(5),
  perceivedDuration: z.enum(['much_faster', 'faster', 'same', 'slower', 'much_slower']),
  wouldRecommend: z.boolean(),
  comments: z.string().max(1000, 'Comments must not exceed 1000 characters').optional(),
  actualDuration: z.number().int().min(0, 'Actual duration must be positive'),
  completedAt: z.string().datetime('Invalid completion date format'),
});

// In-memory storage for MVP (replace with database in production)
const feedbackStore = new Map<string, {
  id: string;
  sessionId: string;
  validationSessionId: string;
  satisfaction: SatisfactionRating;
  perceivedDuration: DurationPerception;
  wouldRecommend: boolean;
  comments?: string;
  actualDurationMs: number;
  submittedAt: Date;
}>();

/**
 * Calculate satisfaction level from rating
 */
function calculateSatisfactionLevel(rating: SatisfactionRating): 'excellent' | 'good' | 'average' | 'poor' {
  if (rating >= 5) return 'excellent';
  if (rating >= 4) return 'good';
  if (rating >= 3) return 'average';
  return 'poor';
}

/**
 * Check if user met the time target
 */
function checkTargetMet(actualDurationMs: number): boolean {
  return actualDurationMs <= SUCCESS_THRESHOLDS.MAX_DECISION_TIME_MS;
}

/**
 * POST /api/feedback
 * Submit user feedback after session completion
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    console.log('Processing feedback submission', { requestId });

    // Parse and validate request body
    const body = await request.json();
    const validationResult = FeedbackRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errorDetails = validationResult.error.issues.reduce((acc, issue) => {
        const field = issue.path[0] as string;
        acc[field] = issue.message;
        return acc;
      }, {} as Record<string, string>);

      const errorResponse: FeedbackApiError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid feedback data provided',
          details: errorDetails,
        },
        request_id: requestId,
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    const feedbackData = validationResult.data;

    // Generate feedback ID
    const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate validation results
    const targetMet = checkTargetMet(feedbackData.actualDuration);
    const satisfactionLevel = calculateSatisfactionLevel(feedbackData.satisfaction as SatisfactionRating);

    // Store feedback (in production, this would be database)
    const storedFeedback = {
      id: feedbackId,
      sessionId: feedbackData.sessionId,
      validationSessionId: feedbackData.validationSessionId,
      satisfaction: feedbackData.satisfaction as SatisfactionRating,
      perceivedDuration: feedbackData.perceivedDuration as DurationPerception,
      wouldRecommend: feedbackData.wouldRecommend,
      comments: feedbackData.comments,
      actualDurationMs: feedbackData.actualDuration,
      submittedAt: new Date(feedbackData.completedAt),
    };

    feedbackStore.set(feedbackId, storedFeedback);

    // Prepare success response
    const response: FeedbackResponse = {
      feedbackId,
      recorded: true,
      validationResults: {
        targetMet,
        satisfactionLevel,
      },
      request_id: requestId,
    };

    // Log analytics event
    console.log('[Analytics] feedback_submitted:', {
      feedbackId,
      sessionId: feedbackData.sessionId,
      satisfaction: feedbackData.satisfaction,
      perceivedDuration: feedbackData.perceivedDuration,
      wouldRecommend: feedbackData.wouldRecommend,
      actualDuration: feedbackData.actualDuration,
      targetMet,
      satisfactionLevel,
      requestId,
    });

    // Track target achievement
    if (targetMet) {
      console.log('[Analytics] validation_target_met:', {
        sessionId: feedbackData.sessionId,
        actualDuration: feedbackData.actualDuration,
        target: SUCCESS_THRESHOLDS.MAX_DECISION_TIME_MS,
        requestId,
      });
    }

    console.log('Feedback submitted successfully', {
      requestId,
      feedbackId,
      sessionId: feedbackData.sessionId,
      satisfaction: feedbackData.satisfaction,
      targetMet,
    });

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Failed to process feedback submission', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const errorResponse: FeedbackApiError = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process feedback submission',
      },
      request_id: requestId,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/feedback
 * Retrieve feedback analytics (for admin/dashboard use)
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (sessionId) {
      // Get feedback for specific session
      const sessionFeedback = Array.from(feedbackStore.values())
        .filter(feedback => feedback.sessionId === sessionId)
        .map(feedback => ({
          id: feedback.id,
          satisfaction: feedback.satisfaction,
          perceivedDuration: feedback.perceivedDuration,
          wouldRecommend: feedback.wouldRecommend,
          comments: feedback.comments,
          actualDurationMs: feedback.actualDurationMs,
          submittedAt: feedback.submittedAt,
        }));

      return NextResponse.json({
        feedback: sessionFeedback,
        request_id: requestId,
      });
    }

    // Get analytics summary
    const allFeedback = Array.from(feedbackStore.values());
    const totalFeedback = allFeedback.length;

    if (totalFeedback === 0) {
      return NextResponse.json({
        metrics: {
          avgSatisfaction: 0,
          speedValidation: {
            fasterPerception: 0,
            targetMet: 0,
            avgActualDuration: 0,
          },
          recommendationRate: 0,
          completionRate: 0,
          totalFeedback: 0,
        },
        request_id: requestId,
      });
    }

    // Calculate metrics
    const avgSatisfaction = allFeedback.reduce((sum, f) => sum + f.satisfaction, 0) / totalFeedback;

    const fasterCount = allFeedback.filter(f =>
      f.perceivedDuration === 'much_faster' || f.perceivedDuration === 'faster'
    ).length;
    const fasterPerception = fasterCount / totalFeedback;

    const targetMetCount = allFeedback.filter(f =>
      f.actualDurationMs <= SUCCESS_THRESHOLDS.MAX_DECISION_TIME_MS
    ).length;
    const targetMet = targetMetCount / totalFeedback;

    const avgActualDuration = allFeedback.reduce((sum, f) => sum + f.actualDurationMs, 0) / totalFeedback;

    const recommendCount = allFeedback.filter(f => f.wouldRecommend).length;
    const recommendationRate = recommendCount / totalFeedback;

    const metrics = {
      avgSatisfaction: Math.round(avgSatisfaction * 100) / 100,
      speedValidation: {
        fasterPerception: Math.round(fasterPerception * 100) / 100,
        targetMet: Math.round(targetMet * 100) / 100,
        avgActualDuration: Math.round(avgActualDuration),
      },
      recommendationRate: Math.round(recommendationRate * 100) / 100,
      completionRate: 1.0, // In MVP, assume 100% completion rate for submitted feedback
      totalFeedback,
    };

    console.log('Feedback analytics retrieved', {
      requestId,
      totalFeedback,
      metrics,
    });

    return NextResponse.json({
      metrics,
      request_id: requestId,
    });

  } catch (error) {
    console.error('Failed to retrieve feedback analytics', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const errorResponse: FeedbackApiError = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve feedback analytics',
      },
      request_id: requestId,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}