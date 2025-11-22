import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateRequestId } from '@/utils/request-id';

export const runtime = 'nodejs';

// Validation schemas
const CompleteSessionRequestSchema = z.object({
  finalSelections: z.array(z.string()).min(0),
  sessionTiming: z.object({
    preferencesMs: z.number().min(0),
    swipingMs: z.number().min(0),
    reviewMs: z.number().min(0),
    totalMs: z.number().min(0),
  }),
  completedAt: z.string().datetime(),
});

// In-memory storage for completed sessions (replace with database in production)
const completedSessionsStore = new Map<string, {
  sessionId: string;
  finalSelections: string[];
  sessionTiming: {
    preferencesMs: number;
    swipingMs: number;
    reviewMs: number;
    totalMs: number;
  };
  completedAt: Date;
  metadata: {
    selectionCount: number;
    averageDecisionTime: number;
    completionRate: number;
  };
}>();

/**
 * POST /api/sessions/[sessionId]/complete
 * Complete the session and finalize destination selections
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = generateRequestId();
  const { sessionId } = await params;

  try {
    console.log('Completing session', { requestId, sessionId });

    // Validate session ID format
    if (!sessionId.startsWith('sess_')) {
      return NextResponse.json(
        { error: { code: 'INVALID_SESSION', message: 'Invalid session ID' }, request_id: requestId },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CompleteSessionRequestSchema.parse(body);

    // Check if session already completed
    if (completedSessionsStore.has(sessionId)) {
      return NextResponse.json(
        { error: { code: 'ALREADY_COMPLETED', message: 'Session already completed' }, request_id: requestId },
        { status: 409 }
      );
    }

    // Calculate completion metrics
    const totalSessionTime = validatedData.sessionTiming.totalMs;
    const selectionCount = validatedData.finalSelections.length;
    const averageDecisionTime = selectionCount > 0 ? totalSessionTime / selectionCount : 0;

    // For MVP, assume 100% completion rate (in production, calculate from all sessions)
    const completionRate = 1.0;

    // Store completed session
    const completedSession = {
      sessionId,
      finalSelections: validatedData.finalSelections,
      sessionTiming: validatedData.sessionTiming,
      completedAt: new Date(validatedData.completedAt),
      metadata: {
        selectionCount,
        averageDecisionTime,
        completionRate,
      },
    };

    completedSessionsStore.set(sessionId, completedSession);

    // Prepare response
    const response = {
      sessionId,
      completedAt: completedSession.completedAt,
      finalSelectionCount: selectionCount,
      totalSessionTime: totalSessionTime,
      success: true,
      metadata: {
        averageDecisionTime,
        completionRate,
        sessionBreakdown: {
          preferencesTime: `${Math.round(validatedData.sessionTiming.preferencesMs / 1000)}s`,
          swipingTime: `${Math.round(validatedData.sessionTiming.swipingMs / 1000)}s`,
          reviewTime: `${Math.round(validatedData.sessionTiming.reviewMs / 1000)}s`,
          totalTime: `${Math.round(totalSessionTime / 1000)}s`,
        },
      },
    };

    console.log('Session completed successfully', {
      requestId,
      sessionId,
      selectionCount,
      totalTime: totalSessionTime,
      averageDecisionTime,
    });

    // Track analytics event for session completion
    if (typeof globalThis !== 'undefined') {
      // In a real implementation, this would be sent to your analytics service
      console.log('[Analytics] session_completed', {
        sessionId,
        selectionCount,
        totalSessionTime,
        averageDecisionTime,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Failed to complete session', {
      requestId,
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.issues }, request_id: requestId },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }, request_id: requestId },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sessions/[sessionId]/complete
 * Get completion status and results for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = generateRequestId();
  const { sessionId } = await params;

  try {
    console.log('Getting session completion status', { requestId, sessionId });

    // Validate session ID format
    if (!sessionId.startsWith('sess_')) {
      return NextResponse.json(
        { error: { code: 'INVALID_SESSION', message: 'Invalid session ID' }, request_id: requestId },
        { status: 401 }
      );
    }

    // Get completed session data
    const completedSession = completedSessionsStore.get(sessionId);

    if (!completedSession) {
      return NextResponse.json(
        { error: { code: 'NOT_COMPLETED', message: 'Session not completed' }, request_id: requestId },
        { status: 404 }
      );
    }

    console.log('Session completion status retrieved', {
      requestId,
      sessionId,
      completedAt: completedSession.completedAt,
      selectionCount: completedSession.metadata.selectionCount,
    });

    return NextResponse.json({
      sessionId,
      completed: true,
      completedAt: completedSession.completedAt,
      finalSelections: completedSession.finalSelections,
      sessionTiming: completedSession.sessionTiming,
      metadata: completedSession.metadata,
      request_id: requestId,
    });

  } catch (error) {
    console.error('Failed to get session completion status', {
      requestId,
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }, request_id: requestId },
      { status: 500 }
    );
  }
}