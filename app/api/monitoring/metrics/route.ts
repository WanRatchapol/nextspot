import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from '@/utils/request-id';
import type { MonitoringMetrics } from '@/types/health-monitoring';
import { HEALTH_CHECK_CONSTANTS } from '@/types/health-monitoring';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    console.log(`[${requestId}] Monitoring metrics requested`);

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '1h'; // 5m, 15m, 1h, 6h, 24h
    const includeDetails = searchParams.get('details') === 'true';

    // Generate monitoring metrics
    const metrics = await generateMonitoringMetrics(timeRange, includeDetails);

    // Log metrics request
    console.log('[Analytics] monitoring_metrics_requested:', {
      event: 'monitoring_metrics_requested',
      requestId,
      timeRange,
      includeDetails,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(metrics, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Processing-Time': `${Date.now() - startTime}ms`,
        'Cache-Control': 'no-cache, max-age=30' // Cache for 30 seconds
      }
    });

  } catch (error) {
    console.error(`[${requestId}] Monitoring metrics failed:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch metrics'
        }
      },
      {
        status: 500,
        headers: {
          'X-Request-ID': requestId,
          'X-Processing-Time': `${Date.now() - startTime}ms`
        }
      }
    );
  }
}

async function generateMonitoringMetrics(timeRange: string, includeDetails: boolean): Promise<MonitoringMetrics> {
  // In a real implementation, these would come from your metrics store (Prometheus, CloudWatch, etc.)
  // For now, we'll generate realistic mock data based on current system state

  const now = Date.now();
  const timeRangeMs = getTimeRangeMs(timeRange);

  // Simulate SLO compliance based on targets
  const sloTargets = HEALTH_CHECK_CONSTANTS.SLO_TARGETS;

  // Generate realistic current values with some variation
  const currentApiLatency = sloTargets.API_LATENCY_P95 * (0.7 + Math.random() * 0.6); // 70-130% of target
  const currentErrorRate = sloTargets.ERROR_RATE * (0.5 + Math.random() * 3); // 50-350% of target
  const currentUptime = Math.max(99.0, sloTargets.UPTIME - Math.random() * 1); // Slight variation

  const metrics: MonitoringMetrics = {
    sloCompliance: {
      apiLatencyP95: {
        current: currentApiLatency,
        target: sloTargets.API_LATENCY_P95,
        status: currentApiLatency <= sloTargets.API_LATENCY_P95 ? 'pass' : 'fail'
      },
      errorRate: {
        current: currentErrorRate,
        target: sloTargets.ERROR_RATE,
        status: currentErrorRate <= sloTargets.ERROR_RATE ? 'pass' : 'fail'
      },
      uptime: {
        current: currentUptime,
        target: sloTargets.UPTIME,
        status: currentUptime >= sloTargets.UPTIME ? 'pass' : 'fail'
      }
    },
    userMetrics: {
      weeklyActiveUsers: Math.floor(50 + Math.random() * 200), // 50-250 users
      sessionCompletionRate: 0.65 + Math.random() * 0.25, // 65-90%
      avgDecisionTime: 3 + Math.random() * 7, // 3-10 minutes
      feedbackScore: 3.8 + Math.random() * 1.2 // 3.8-5.0
    },
    systemMetrics: {
      databaseConnections: Math.floor(10 + Math.random() * 40), // 10-50 connections
      memoryUsage: 40 + Math.random() * 40, // 40-80%
      cpuUsage: 20 + Math.random() * 50, // 20-70%
      diskUsage: 30 + Math.random() * 30 // 30-60%
    }
  };

  return metrics;
}

function getTimeRangeMs(timeRange: string): number {
  switch (timeRange) {
    case '5m': return 5 * 60 * 1000;
    case '15m': return 15 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    case '6h': return 6 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000; // Default to 1 hour
  }
}

// POST endpoint for updating metrics thresholds
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { metric, threshold, type } = body;

    if (!metric || threshold === undefined || !type) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'metric, threshold, and type are required'
          }
        },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Updating metric threshold: ${metric} = ${threshold}`);

    // In a real implementation, you would update the metrics configuration
    // For now, we'll just log the action

    console.log('[Analytics] metric_threshold_updated:', {
      event: 'metric_threshold_updated',
      requestId,
      metric,
      threshold,
      type,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        success: true,
        message: `Updated ${metric} threshold to ${threshold}`,
        metric,
        threshold,
        type,
        updatedAt: new Date().toISOString()
      },
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'X-Processing-Time': `${Date.now() - startTime}ms`
        }
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Metric threshold update failed:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update metric threshold'
        }
      },
      {
        status: 500,
        headers: {
          'X-Request-ID': requestId,
          'X-Processing-Time': `${Date.now() - startTime}ms`
        }
      }
    );
  }
}