import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateRequestId } from '@/utils/request-id';

// Use Node.js runtime for this API route
export const runtime = 'nodejs';

// Zod validation schema for preferences payload
const PreferencesSchema = z.object({
  budgetBand: z.enum(['low', 'mid', 'high']),
  moodTags: z.array(z.enum(['chill', 'adventure', 'foodie', 'cultural', 'social', 'romantic']))
    .min(1, 'Must select at least one mood'),
  timeWindow: z.enum(['evening', 'halfday', 'fullday']),
});

export type PreferencesRequest = z.infer<typeof PreferencesSchema>;

export interface PreferencesResponse {
  sessionId: string;
  prefs: PreferencesRequest;
  request_id: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
  request_id: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<PreferencesResponse | ErrorResponse>> {
  const requestId = generateRequestId();

  try {
    const { id: sessionId } = await params;
    const body = await request.json();

    // Validate the request payload with Zod
    const validationResult = PreferencesSchema.safeParse(body);

    if (!validationResult.success) {
      // Check specifically for empty moodTags error
      const moodTagsError = validationResult.error.issues.find(
        issue => issue.path.includes('moodTags')
      );

      let errorMessage = 'Invalid preferences data';
      if (moodTagsError) {
        errorMessage = moodTagsError.message;
      } else {
        // Generic validation error message
        errorMessage = validationResult.error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
      }

      const errorResponse: ErrorResponse = {
        error: {
          code: 'BAD_REQUEST',
          message: errorMessage,
        },
        request_id: requestId,
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { budgetBand, moodTags, timeWindow } = validationResult.data;

    // TODO: In a real implementation, we would:
    // 1. Validate the sessionId exists
    // 2. Store preferences in database
    // 3. Handle database errors and rollback if needed
    // 4. Log analytics events (preferences_saved)

    // For now, simulate successful storage
    const response: PreferencesResponse = {
      sessionId,
      prefs: {
        budgetBand,
        moodTags,
        timeWindow,
      },
      request_id: requestId,
    };

    // Log successful preference save (placeholder analytics)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] preferences_saved:', {
        sessionId,
        budgetBand,
        moodTags: moodTags.length,
        timeWindow,
        requestId,
      });
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error updating preferences:', error);

    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update preferences',
      },
      request_id: requestId,
    };

    // Log validation error (placeholder analytics)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] preferences_validation_error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      });
    }

    return NextResponse.json(errorResponse, { status: 500 });
  }
}