import { NextRequest, NextResponse } from 'next/server';
import { analyticsAggregator } from '@/utils/analytics-aggregator';
import { generateRequestId } from '@/utils/request-id';
import type { SessionAnalyticsData } from '@/types/swipe-events';

// Use Node.js runtime for analytics processing
export const runtime = 'nodejs';

export interface SessionAnalyticsResponse {
  analytics: SessionAnalyticsData | null;
  request_id: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
  request_id: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<SessionAnalyticsResponse | ErrorResponse>> {
  const requestId = generateRequestId();

  try {
    const { id: sessionId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INVALID_SESSION_ID',
          message: 'Session ID must be a valid UUID',
        },
        request_id: requestId,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Get analytics for the specific session
    const analytics = analyticsAggregator.getSessionAnalytics(sessionId);

    const response: SessionAnalyticsResponse = {
      analytics,
      request_id: requestId
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Error getting session analytics:', error);

    const errorResponse: ErrorResponse = {
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to get session analytics',
      },
      request_id: requestId,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}