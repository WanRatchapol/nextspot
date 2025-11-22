import { GET, POST, OPTIONS } from '@/app/api/health/route';
import { NextRequest } from 'next/server';
import { healthChecker } from '@/utils/health-checker';
import type { HealthCheckResponse } from '@/types/health-monitoring';

// Mock the health checker
jest.mock('@/utils/health-checker', () => ({
  healthChecker: {
    performHealthCheck: jest.fn(),
    checkDatabase: jest.fn(),
    checkRedis: jest.fn(),
    checkExternalServices: jest.fn(),
    checkPerformance: jest.fn()
  }
}));

// Mock request ID generation
jest.mock('@/utils/request-id', () => ({
  generateRequestId: jest.fn(() => 'test-request-id-123')
}));

const mockHealthChecker = healthChecker as jest.Mocked<typeof healthChecker>;

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('GET /api/health', () => {
    const createMockHealthResponse = (status: 'healthy' | 'degraded' | 'unhealthy'): HealthCheckResponse => ({
      status,
      timestamp: '2025-10-20T10:00:00Z',
      version: '1.0.0',
      uptime: 3600,
      checks: {
        database: { status: 'pass', responseTime: 50 },
        redis: { status: 'pass', responseTime: 20 },
        externalServices: { status: 'pass', responseTime: 100 },
        performance: {
          status: 'pass',
          responseTime: 0,
          apiLatency: 800,
          errorRate: 0.001,
          throughput: 100,
          cacheHitRate: 0.8
        }
      },
      metrics: {
        memory: { used: 32, total: 64, percentage: 50 },
        cpu: { usage: 25, loadAverage: [0.5, 0.6, 0.7] },
        disk: { used: 10, total: 50, percentage: 20 },
        database: {
          connections: { active: 5, idle: 2, total: 50 },
          queryPerformance: { avgResponseTime: 50, slowQueries: 0 }
        },
        requests: { total: 1000, errorRate: 0.001, rpsLast5Min: 10 }
      }
    });

    it('should return healthy status when system is healthy', async () => {
      const healthResponse = createMockHealthResponse('healthy');
      mockHealthChecker.performHealthCheck.mockResolvedValue(healthResponse);

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.version).toBe('1.0.0');
      expect(data.uptime).toBe(3600);
      expect(data.checks).toBeDefined();
      expect(data.metrics).toBeDefined();

      // Check response headers
      expect(response.headers.get('X-Request-ID')).toBe('test-request-id-123');
      expect(response.headers.get('X-Processing-Time')).toBeDefined();
      expect(response.headers.get('X-Health-Status')).toBe('healthy');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    });

    it('should return degraded status with 200 HTTP status', async () => {
      const healthResponse = createMockHealthResponse('degraded');
      healthResponse.checks.database.status = 'warn';
      mockHealthChecker.performHealthCheck.mockResolvedValue(healthResponse);

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Still 200 for degraded
      expect(data.status).toBe('degraded');
      expect(data.checks.database.status).toBe('warn');
      expect(response.headers.get('X-Health-Status')).toBe('degraded');
    });

    it('should return unhealthy status with 503 HTTP status', async () => {
      const healthResponse = createMockHealthResponse('unhealthy');
      healthResponse.checks.database.status = 'fail';
      healthResponse.checks.database.message = 'Database connection failed';
      mockHealthChecker.performHealthCheck.mockResolvedValue(healthResponse);

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503); // Service Unavailable
      expect(data.status).toBe('unhealthy');
      expect(data.checks.database.status).toBe('fail');
      expect(data.checks.database.message).toBe('Database connection failed');
      expect(response.headers.get('X-Health-Status')).toBe('unhealthy');
    });

    it('should return detailed health information when details=true', async () => {
      const healthResponse = createMockHealthResponse('healthy');
      healthResponse.checks.database.details = { connectionPool: { active: 5, idle: 2 } };
      mockHealthChecker.performHealthCheck.mockResolvedValue(healthResponse);

      const request = new NextRequest('http://localhost/api/health?details=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.checks.database.details).toEqual({ connectionPool: { active: 5, idle: 2 } });
    });

    it('should return filtered response when details=false', async () => {
      const healthResponse = createMockHealthResponse('healthy');
      healthResponse.checks.database.details = { connectionPool: { active: 5, idle: 2 } };
      mockHealthChecker.performHealthCheck.mockResolvedValue(healthResponse);

      const request = new NextRequest('http://localhost/api/health?details=false');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.checks.database.details).toBeUndefined();
      expect(data.checks.database.status).toBeDefined();
      expect(data.checks.database.responseTime).toBeDefined();
    });

    it('should return Prometheus format when format=prometheus', async () => {
      const healthResponse = createMockHealthResponse('healthy');
      mockHealthChecker.performHealthCheck.mockResolvedValue(healthResponse);

      const request = new NextRequest('http://localhost/api/health?format=prometheus');
      const response = await GET(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
      expect(text).toContain('health_status{version="1.0.0"} 1');
      expect(text).toContain('system_memory_usage_percent 50');
      expect(text).toContain('api_latency_p95_ms 800');
      expect(text).toContain('process_uptime_seconds 3600');
    });

    it('should handle health check failures gracefully', async () => {
      mockHealthChecker.performHealthCheck.mockRejectedValue(new Error('Health check service unavailable'));

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.error).toBeDefined();
      expect(data.error.message).toBe('Health check service unavailable');
      expect(response.headers.get('X-Health-Status')).toBe('unhealthy');

      // Should still include basic structure
      expect(data.checks).toBeDefined();
      expect(data.metrics).toBeDefined();
      expect(Object.values(data.checks).every(check => check.status === 'fail')).toBe(true);
    });

    it('should log analytics events', async () => {
      const healthResponse = createMockHealthResponse('healthy');
      mockHealthChecker.performHealthCheck.mockResolvedValue(healthResponse);

      const request = new NextRequest('http://localhost/api/health');
      await GET(request);

      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] health_check_performed:',
        expect.objectContaining({
          event: 'health_check_performed',
          requestId: 'test-request-id-123',
          status: 'healthy',
          responseTime: expect.any(Number),
          timestamp: expect.any(String),
          checks: {
            database: 'pass',
            redis: 'pass',
            externalServices: 'pass',
            performance: 'pass'
          }
        })
      );
    });

    it('should log failure analytics on error', async () => {
      mockHealthChecker.performHealthCheck.mockRejectedValue(new Error('Service down'));

      const request = new NextRequest('http://localhost/api/health');
      await GET(request);

      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] health_check_failed:',
        expect.objectContaining({
          event: 'health_check_failed',
          requestId: 'test-request-id-123',
          error: 'Service down',
          responseTime: expect.any(Number),
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle concurrent requests properly', async () => {
      const healthResponse = createMockHealthResponse('healthy');
      mockHealthChecker.performHealthCheck.mockResolvedValue(healthResponse);

      const requests = Array.from({ length: 5 }, () =>
        GET(new NextRequest('http://localhost/api/health'))
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(mockHealthChecker.performHealthCheck).toHaveBeenCalledTimes(5);
    });
  });

  describe('POST /api/health', () => {
    it('should perform component-specific health check for database', async () => {
      const mockDatabaseCheck = { status: 'pass', responseTime: 45 };
      mockHealthChecker['checkDatabase'] = jest.fn().mockResolvedValue(mockDatabaseCheck);

      const request = new NextRequest('http://localhost/api/health', {
        method: 'POST',
        body: JSON.stringify({ component: 'database' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.component).toBe('database');
      expect(data.result).toEqual(mockDatabaseCheck);
      expect(data.timestamp).toBeDefined();
    });

    it('should perform component-specific health check for redis', async () => {
      const mockRedisCheck = { status: 'pass', responseTime: 25 };
      mockHealthChecker['checkRedis'] = jest.fn().mockResolvedValue(mockRedisCheck);

      const request = new NextRequest('http://localhost/api/health', {
        method: 'POST',
        body: JSON.stringify({ component: 'redis' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.component).toBe('redis');
      expect(data.result).toEqual(mockRedisCheck);
    });

    it('should perform component-specific health check for external services', async () => {
      const mockExternalCheck = { status: 'warn', responseTime: 150, message: 'Some services slow' };
      mockHealthChecker['checkExternalServices'] = jest.fn().mockResolvedValue(mockExternalCheck);

      const request = new NextRequest('http://localhost/api/health', {
        method: 'POST',
        body: JSON.stringify({ component: 'external' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.component).toBe('external');
      expect(data.result).toEqual(mockExternalCheck);
    });

    it('should perform component-specific health check for performance', async () => {
      const mockPerformanceCheck = {
        status: 'pass',
        responseTime: 0,
        apiLatency: 1200,
        errorRate: 0.002,
        throughput: 150,
        cacheHitRate: 0.85
      };
      mockHealthChecker['checkPerformance'] = jest.fn().mockResolvedValue(mockPerformanceCheck);

      const request = new NextRequest('http://localhost/api/health', {
        method: 'POST',
        body: JSON.stringify({ component: 'performance' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.component).toBe('performance');
      expect(data.result).toEqual(mockPerformanceCheck);
    });

    it('should return 503 for failing component checks', async () => {
      const mockFailedCheck = { status: 'fail', responseTime: 0, message: 'Component failed' };
      mockHealthChecker['checkDatabase'] = jest.fn().mockResolvedValue(mockFailedCheck);

      const request = new NextRequest('http://localhost/api/health', {
        method: 'POST',
        body: JSON.stringify({ component: 'database' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(true);
      expect(data.result.status).toBe('fail');
    });

    it('should return 400 for missing component parameter', async () => {
      const request = new NextRequest('http://localhost/api/health', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('MISSING_COMPONENT');
      expect(data.error.message).toBe('Component parameter is required');
    });

    it('should return 400 for invalid component parameter', async () => {
      const request = new NextRequest('http://localhost/api/health', {
        method: 'POST',
        body: JSON.stringify({ component: 'invalid_component' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_COMPONENT');
      expect(data.error.message).toContain('Valid options: database, redis, external, performance');
    });

    it('should handle component check failures', async () => {
      mockHealthChecker['checkDatabase'] = jest.fn().mockRejectedValue(new Error('Database check failed'));

      const request = new NextRequest('http://localhost/api/health', {
        method: 'POST',
        body: JSON.stringify({ component: 'database' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should log component check analytics', async () => {
      const mockDatabaseCheck = { status: 'pass', responseTime: 45 };
      mockHealthChecker['checkDatabase'] = jest.fn().mockResolvedValue(mockDatabaseCheck);

      const request = new NextRequest('http://localhost/api/health', {
        method: 'POST',
        body: JSON.stringify({ component: 'database' }),
        headers: { 'Content-Type': 'application/json' }
      });

      await POST(request);

      expect(console.log).toHaveBeenCalledWith(
        '[Analytics] component_health_check:',
        expect.objectContaining({
          event: 'component_health_check',
          requestId: 'test-request-id-123',
          component: 'database',
          status: 'pass',
          responseTime: expect.any(Number),
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('OPTIONS /api/health', () => {
    it('should return CORS headers', async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });
  });

  describe('Prometheus Metrics Conversion', () => {
    it('should convert health response to valid Prometheus format', async () => {
      const healthResponse = createMockHealthResponse('healthy');
      mockHealthChecker.performHealthCheck.mockResolvedValue(healthResponse);

      const request = new NextRequest('http://localhost/api/health?format=prometheus');
      const response = await GET(request);
      const text = await response.text();

      // Check Prometheus metric format
      expect(text).toContain('# HELP health_status Overall health status of the application');
      expect(text).toContain('# TYPE health_status gauge');
      expect(text).toContain('health_status{version="1.0.0"} 1');

      // Check individual check metrics
      expect(text).toContain('health_check_status{check="database"} 1');
      expect(text).toContain('health_check_response_time_ms{check="database"} 50');

      // Check system metrics
      expect(text).toContain('system_memory_usage_percent 50');
      expect(text).toContain('system_cpu_usage_percent 25');
      expect(text).toContain('database_connections_active 5');
      expect(text).toContain('api_latency_p95_ms 800');

      // Verify timestamp format
      expect(text).toMatch(/\d+ \d+$/m); // Should end with timestamp
    });

    it('should handle degraded status in Prometheus format', async () => {
      const healthResponse = createMockHealthResponse('degraded');
      mockHealthChecker.performHealthCheck.mockResolvedValue(healthResponse);

      const request = new NextRequest('http://localhost/api/health?format=prometheus');
      const response = await GET(request);
      const text = await response.text();

      expect(text).toContain('health_status{version="1.0.0"} 0.5'); // 0.5 for degraded
    });

    it('should handle unhealthy status in Prometheus format', async () => {
      const healthResponse = createMockHealthResponse('unhealthy');
      mockHealthChecker.performHealthCheck.mockResolvedValue(healthResponse);

      const request = new NextRequest('http://localhost/api/health?format=prometheus');
      const response = await GET(request);
      const text = await response.text();

      expect(text).toContain('health_status{version="1.0.0"} 0'); // 0 for unhealthy
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed JSON in POST request', async () => {
      const request = new NextRequest('http://localhost/api/health', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle missing Content-Type header', async () => {
      const request = new NextRequest('http://localhost/api/health', {
        method: 'POST',
        body: JSON.stringify({ component: 'database' })
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still work without Content-Type header
      expect(response.status).toBe(200);
    });

    it('should handle very large health check responses', async () => {
      const largeHealthResponse = createMockHealthResponse('healthy');
      // Add large details object
      largeHealthResponse.checks.database.details = {
        largeData: 'x'.repeat(10000), // 10KB of data
        connections: Array.from({ length: 1000 }, (_, i) => ({ id: i, status: 'active' }))
      };

      mockHealthChecker.performHealthCheck.mockResolvedValue(largeHealthResponse);

      const request = new NextRequest('http://localhost/api/health?details=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.checks.database.details.largeData).toHaveLength(10000);
    });
  });
});