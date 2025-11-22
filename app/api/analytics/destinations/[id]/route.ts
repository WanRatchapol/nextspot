import { NextRequest, NextResponse } from 'next/server';
import { analyticsAggregator } from '@/utils/analytics-aggregator';
import { generateRequestId } from '@/utils/request-id';
import type { SwipeAnalyticsData } from '@/types/swipe-events';

// Use Node.js runtime for analytics processing
export const runtime = 'nodejs';

export interface DestinationAnalyticsResponse {
  analytics: SwipeAnalyticsData | null;
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
): Promise<NextResponse<DestinationAnalyticsResponse | ErrorResponse>> {
  const requestId = generateRequestId();

  try {
    const { id: destinationId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(destinationId)) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INVALID_DESTINATION_ID',
          message: 'Destination ID must be a valid UUID',
        },
        request_id: requestId,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Get analytics for the specific destination
    const analytics = analyticsAggregator.getDestinationAnalytics(destinationId);

    const response: DestinationAnalyticsResponse = {
      analytics,
      request_id: requestId
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Error getting destination analytics:', error);

    const errorResponse: ErrorResponse = {
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to get destination analytics',
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