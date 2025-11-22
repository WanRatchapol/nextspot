import { NextRequest, NextResponse } from 'next/server';
import { analyticsAggregator } from '@/utils/analytics-aggregator';
import { generateRequestId } from '@/utils/request-id';

// Use Node.js runtime for analytics processing
export const runtime = 'nodejs';

export interface DashboardResponse {
  metrics: {
    totalEvents: number;
    totalSessions: number;
    avgLikeRate: number;
    eventsByAction: Record<string, number>;
    topDestinations: Array<{
      destinationId: string;
      totalEvents: number;
      likeRate: number;
      avgViewTime: number;
    }>;
  };
  system: {
    health: {
      isHealthy: boolean;
      memoryUsage: number;
      activeSessions: number;
    };
    batchProcessing: {
      length: number;
      maxSize: number;
      timeoutMs: number;
      hasPendingTimeout: boolean;
    };
  };
  timestamp: string;
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
  request: NextRequest
): Promise<NextResponse<DashboardResponse | ErrorResponse>> {
  const requestId = generateRequestId();

  try {
    // Get overall metrics from aggregator
    const overallMetrics = analyticsAggregator.getOverallMetrics();
    const healthStatus = analyticsAggregator.getHealthStatus();

    // Get batch processing status from the swipe-events endpoint
    // In a real implementation, this would be shared state or external service
    const batchStatus = {
      length: 0, // Would be actual queue length
      maxSize: 100,
      timeoutMs: 5000,
      hasPendingTimeout: false // Would be actual status
    };

    const response: DashboardResponse = {
      metrics: overallMetrics,
      system: {
        health: {
          isHealthy: healthStatus.isHealthy,
          memoryUsage: healthStatus.memoryUsage,
          activeSessions: healthStatus.activeSessions
        },
        batchProcessing: batchStatus
      },
      timestamp: new Date().toISOString(),
      request_id: requestId
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*', // Allow CORS for dashboard access
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Error generating dashboard analytics:', error);

    const errorResponse: ErrorResponse = {
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to generate analytics dashboard',
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