import { NextRequest, NextResponse } from 'next/server';
import { healthChecker } from '@/utils/health-checker';
import { generateRequestId } from '@/utils/request-id';
import type { HealthCheckResponse } from '@/types/health-monitoring';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    console.log(`[${requestId}] Health check requested`);

    // Parse query parameters for detailed checks
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';
    const format = searchParams.get('format') || 'json';

    // Perform comprehensive health check
    const healthResult = await healthChecker.performHealthCheck();

    // Log health check analytics
    console.log('[Analytics] health_check_performed:', {
      event: 'health_check_performed',
      requestId,
      status: healthResult.status,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      checks: {
        database: healthResult.checks.database.status,
        redis: healthResult.checks.redis.status,
        externalServices: healthResult.checks.externalServices.status,
        performance: healthResult.checks.performance.status
      }
    });

    // Filter response based on detail level
    const response: HealthCheckResponse = includeDetails
      ? healthResult
      : {
          status: healthResult.status,
          timestamp: healthResult.timestamp,
          version: healthResult.version,
          uptime: healthResult.uptime,
          checks: {
            database: {
              status: healthResult.checks.database.status,
              responseTime: healthResult.checks.database.responseTime
            },
            redis: {
              status: healthResult.checks.redis.status,
              responseTime: healthResult.checks.redis.responseTime
            },
            externalServices: {
              status: healthResult.checks.externalServices.status,
              responseTime: healthResult.checks.externalServices.responseTime
            },
            performance: {
              status: healthResult.checks.performance.status,
              apiLatency: healthResult.checks.performance.apiLatency,
              errorRate: healthResult.checks.performance.errorRate,
              throughput: healthResult.checks.performance.throughput,
              cacheHitRate: healthResult.checks.performance.cacheHitRate,
              responseTime: healthResult.checks.performance.responseTime
            }
          },
          metrics: healthResult.metrics
        };

    // Determine appropriate HTTP status code
    const httpStatus = getHttpStatusFromHealth(healthResult.status);

    // Handle different response formats
    if (format === 'prometheus') {
      const prometheusMetrics = convertToPrometheusFormat(healthResult);
      return new NextResponse(prometheusMetrics, {
        status: httpStatus,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Request-ID': requestId,
          'X-Processing-Time': `${Date.now() - startTime}ms`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'X-Request-ID': requestId,
        'X-Processing-Time': `${Date.now() - startTime}ms`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': healthResult.status
      }
    });

  } catch (error) {
    console.error(`[${requestId}] Health check failed:`, error);

    // Log health check failure
    console.log('[Analytics] health_check_failed:', {
      event: 'health_check_failed',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    const errorResponse = {
      status: 'unhealthy' as const,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      uptime: process.uptime(),
      checks: {
        database: { status: 'fail' as const, responseTime: 0, message: 'Health check failed' },
        redis: { status: 'fail' as const, responseTime: 0, message: 'Health check failed' },
        externalServices: { status: 'fail' as const, responseTime: 0, message: 'Health check failed' },
        performance: {
          status: 'fail' as const,
          apiLatency: 0,
          errorRate: 1,
          throughput: 0,
          cacheHitRate: 0,
          responseTime: 0
        }
      },
      metrics: {
        memory: { used: 0, total: 0, percentage: 0 },
        cpu: { usage: 0, loadAverage: [0, 0, 0] },
        disk: { used: 0, total: 0, percentage: 0 },
        database: {
          connections: { active: 0, idle: 0, total: 0 },
          queryPerformance: { avgResponseTime: 0, slowQueries: 0 }
        },
        requests: { total: 0, errorRate: 1, rpsLast5Min: 0 }
      },
      error: {
        message: error instanceof Error ? error.message : 'Unknown health check error',
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(errorResponse, {
      status: 503, // Service Unavailable
      headers: {
        'X-Request-ID': requestId,
        'X-Processing-Time': `${Date.now() - startTime}ms`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': 'unhealthy'
      }
    });
  }
}

// Options method for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Utility functions
function getHttpStatusFromHealth(status: 'healthy' | 'degraded' | 'unhealthy'): number {
  switch (status) {
    case 'healthy':
      return 200; // OK
    case 'degraded':
      return 200; // Still OK but with warnings
    case 'unhealthy':
      return 503; // Service Unavailable
    default:
      return 503;
  }
}

function convertToPrometheusFormat(healthResult: HealthCheckResponse): string {
  const timestamp = Date.now();
  const metrics: string[] = [];

  // Health status metrics (1 = healthy, 0.5 = degraded, 0 = unhealthy)
  const healthValue = healthResult.status === 'healthy' ? 1 : healthResult.status === 'degraded' ? 0.5 : 0;
  metrics.push(`# HELP health_status Overall health status of the application`);
  metrics.push(`# TYPE health_status gauge`);
  metrics.push(`health_status{version="${healthResult.version}"} ${healthValue} ${timestamp}`);

  // Individual check statuses
  Object.entries(healthResult.checks).forEach(([checkName, check]) => {
    const checkValue = check.status === 'pass' ? 1 : check.status === 'warn' ? 0.5 : 0;
    metrics.push(`health_check_status{check="${checkName}"} ${checkValue} ${timestamp}`);

    // Only add responseTime for checks that have it (not PerformanceCheck)
    if ('responseTime' in check && typeof check.responseTime === 'number') {
      metrics.push(`health_check_response_time_ms{check="${checkName}"} ${check.responseTime} ${timestamp}`);
    }
  });

  // System metrics
  metrics.push(`system_memory_usage_percent ${healthResult.metrics.memory.percentage} ${timestamp}`);
  metrics.push(`system_cpu_usage_percent ${healthResult.metrics.cpu.usage} ${timestamp}`);
  metrics.push(`system_disk_usage_percent ${healthResult.metrics.disk.percentage} ${timestamp}`);

  // Database metrics
  metrics.push(`database_connections_active ${healthResult.metrics.database.connections.active} ${timestamp}`);
  metrics.push(`database_connections_idle ${healthResult.metrics.database.connections.idle} ${timestamp}`);
  metrics.push(`database_connections_total ${healthResult.metrics.database.connections.total} ${timestamp}`);
  metrics.push(`database_query_response_time_ms ${healthResult.metrics.database.queryPerformance.avgResponseTime} ${timestamp}`);

  // Request metrics
  metrics.push(`http_requests_total ${healthResult.metrics.requests.total} ${timestamp}`);
  metrics.push(`http_request_error_rate ${healthResult.metrics.requests.errorRate} ${timestamp}`);
  metrics.push(`http_requests_per_second ${healthResult.metrics.requests.rpsLast5Min} ${timestamp}`);

  // Performance metrics
  const perfCheck = healthResult.checks.performance;
  metrics.push(`api_latency_p95_ms ${perfCheck.apiLatency} ${timestamp}`);
  metrics.push(`api_error_rate ${perfCheck.errorRate} ${timestamp}`);
  metrics.push(`api_throughput_rpm ${perfCheck.throughput} ${timestamp}`);
  metrics.push(`cache_hit_rate ${perfCheck.cacheHitRate} ${timestamp}`);

  // Uptime
  metrics.push(`process_uptime_seconds ${healthResult.uptime} ${timestamp}`);

  return metrics.join('\n') + '\n';
}

// Health check with specific component
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { component } = body;

    if (!component) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_COMPONENT',
            message: 'Component parameter is required'
          }
        },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Component health check requested: ${component}`);

    // Perform specific component check
    let result;
    switch (component) {
      case 'database':
        result = await healthChecker['checkDatabase']();
        break;
      case 'redis':
        result = await healthChecker['checkRedis']();
        break;
      case 'external':
        result = await healthChecker['checkExternalServices']();
        break;
      case 'performance':
        result = await healthChecker['checkPerformance']();
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_COMPONENT',
              message: 'Invalid component. Valid options: database, redis, external, performance'
            }
          },
          { status: 400 }
        );
    }

    console.log(`[Analytics] component_health_check:`, {
      event: 'component_health_check',
      requestId,
      component,
      status: result.status,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        success: true,
        component,
        result,
        timestamp: new Date().toISOString()
      },
      {
        status: result.status === 'fail' ? 503 : 200,
        headers: {
          'X-Request-ID': requestId,
          'X-Processing-Time': `${Date.now() - startTime}ms`
        }
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Component health check failed:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Component health check failed'
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