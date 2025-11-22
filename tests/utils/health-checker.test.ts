import { HealthChecker, healthChecker, quickHealthCheck, getSystemStatus } from '@/utils/health-checker';
import type { HealthCheckResponse, HealthCheckConfiguration } from '@/types/health-monitoring';

// Mock process.uptime and other Node.js APIs
global.process.uptime = jest.fn(() => 3600); // 1 hour uptime
global.process.memoryUsage = jest.fn(() => ({
  rss: 134217728, // 128MB
  heapTotal: 67108864, // 64MB
  heapUsed: 33554432, // 32MB
  external: 1048576, // 1MB
  arrayBuffers: 524288 // 512KB
}));
global.process.cpuUsage = jest.fn(() => ({
  user: 500000, // 500ms
  system: 200000 // 200ms
}));

// Mock os module
jest.mock('os', () => ({
  loadavg: () => [0.5, 0.6, 0.7]
}));

describe('HealthChecker', () => {
  let checker: HealthChecker;

  beforeEach(() => {
    checker = new HealthChecker();
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = checker.getConfiguration();

      expect(config.intervals.healthCheck).toBe(30);
      expect(config.timeouts.database).toBe(5000);
      expect(config.retries.database).toBe(3);
      expect(config.storage.metricsRetention).toBe(30);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        intervals: { healthCheck: 60 },
        timeouts: { database: 10000 }
      };

      const customChecker = new HealthChecker(customConfig);
      const config = customChecker.getConfiguration();

      expect(config.intervals.healthCheck).toBe(60);
      expect(config.timeouts.database).toBe(10000);
      expect(config.retries.database).toBe(3); // Should keep default
    });

    it('should allow configuration updates', () => {
      const newConfig = {
        intervals: { healthCheck: 45 },
        retries: { database: 5 }
      };

      checker.updateConfiguration(newConfig);
      const config = checker.getConfiguration();

      expect(config.intervals.healthCheck).toBe(45);
      expect(config.retries.database).toBe(5);
    });
  });

  describe('performHealthCheck', () => {
    it('should return healthy status when all checks pass', async () => {
      const result = await checker.performHealthCheck();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.uptime).toBe(3600);
      expect(result.checks).toHaveProperty('database');
      expect(result.checks).toHaveProperty('redis');
      expect(result.checks).toHaveProperty('externalServices');
      expect(result.checks).toHaveProperty('performance');
      expect(result.metrics).toBeDefined();
    });

    it('should return degraded status when some checks warn', async () => {
      // Mock a warning condition by overriding the method
      const originalCheck = checker['checkDatabase'];
      checker['checkDatabase'] = jest.fn().mockResolvedValue({
        status: 'warn',
        responseTime: 150,
        message: 'High response time'
      });

      const result = await checker.performHealthCheck();

      expect(result.status).toBe('degraded');
      expect(result.checks.database.status).toBe('warn');

      // Restore original method
      checker['checkDatabase'] = originalCheck;
    });

    it('should return unhealthy status when checks fail', async () => {
      // Mock a failure condition
      const originalCheck = checker['checkDatabase'];
      checker['checkDatabase'] = jest.fn().mockResolvedValue({
        status: 'fail',
        responseTime: 0,
        message: 'Connection failed'
      });

      const result = await checker.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('fail');

      // Restore original method
      checker['checkDatabase'] = originalCheck;
    });

    it('should handle timeout errors gracefully', async () => {
      // Create a checker with very short timeout
      const shortTimeoutChecker = new HealthChecker({
        timeouts: { healthCheckTotal: 100 }
      });

      // Mock slow database check
      shortTimeoutChecker['checkDatabase'] = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          status: 'pass',
          responseTime: 50
        }), 200))
      );

      const result = await shortTimeoutChecker.performHealthCheck();

      expect(result.status).toBe('unhealthy');
    });

    it('should include proper error details on failure', async () => {
      const originalCheck = checker['checkDatabase'];
      checker['checkDatabase'] = jest.fn().mockRejectedValue(new Error('Connection timeout'));

      const result = await checker.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('fail');
      expect(result.checks.database.message).toContain('Connection timeout');

      // Restore original method
      checker['checkDatabase'] = originalCheck;
    });
  });

  describe('Database Health Check', () => {
    it('should return pass status for fast database response', async () => {
      const result = await checker['checkDatabase']();

      expect(result.status).toBe('pass');
      expect(result.responseTime).toBeLessThan(100);
      expect(result.details).toHaveProperty('connectionPool');
    });

    it('should return warn status for slow database response', async () => {
      // Mock slow database operation
      const originalRetryOperation = checker['retryOperation'];
      checker['retryOperation'] = jest.fn().mockImplementation(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 150));
          return {};
        }
      );

      const result = await checker['checkDatabase']();

      expect(result.status).toBe('warn');
      expect(result.responseTime).toBeGreaterThan(100);

      // Restore original method
      checker['retryOperation'] = originalRetryOperation;
    });

    it('should return fail status on database error', async () => {
      const originalRetryOperation = checker['retryOperation'];
      checker['retryOperation'] = jest.fn().mockRejectedValue(new Error('Database unavailable'));

      const result = await checker['checkDatabase']();

      expect(result.status).toBe('fail');
      expect(result.message).toBe('Database unavailable');

      // Restore original method
      checker['retryOperation'] = originalRetryOperation;
    });
  });

  describe('Redis Health Check', () => {
    it('should return pass status for fast Redis response', async () => {
      const result = await checker['checkRedis']();

      expect(result.status).toBe('pass');
      expect(result.responseTime).toBeLessThan(50);
      expect(result.details).toHaveProperty('cacheHitRate');
    });

    it('should handle Redis connection failures', async () => {
      const originalRetryOperation = checker['retryOperation'];
      checker['retryOperation'] = jest.fn().mockRejectedValue(new Error('Redis connection refused'));

      const result = await checker['checkRedis']();

      expect(result.status).toBe('fail');
      expect(result.message).toBe('Redis connection refused');

      // Restore original method
      checker['retryOperation'] = originalRetryOperation;
    });
  });

  describe('External Services Health Check', () => {
    it('should return pass status when all external services are available', async () => {
      const result = await checker['checkExternalServices']();

      expect(result.status).toBe('pass');
      expect(result.details).toHaveProperty('serviceResults');
      expect(result.details.serviceResults).toHaveLength(2); // Unsplash, Google Maps
    });

    it('should return warn status when some services are down', async () => {
      const originalUnsplashCheck = checker['checkUnsplashAPI'];
      checker['checkUnsplashAPI'] = jest.fn().mockRejectedValue(new Error('Unsplash API unavailable'));

      const result = await checker['checkExternalServices']();

      expect(result.status).toBe('warn');
      expect(result.message).toContain('1/2 external services unavailable');

      // Restore original method
      checker['checkUnsplashAPI'] = originalUnsplashCheck;
    });

    it('should return fail status when all services are down', async () => {
      const originalUnsplashCheck = checker['checkUnsplashAPI'];
      const originalGoogleCheck = checker['checkGoogleMapsAPI'];

      checker['checkUnsplashAPI'] = jest.fn().mockRejectedValue(new Error('Service down'));
      checker['checkGoogleMapsAPI'] = jest.fn().mockRejectedValue(new Error('Service down'));

      const result = await checker['checkExternalServices']();

      expect(result.status).toBe('fail');
      expect(result.message).toContain('2/2 external services unavailable');

      // Restore original methods
      checker['checkUnsplashAPI'] = originalUnsplashCheck;
      checker['checkGoogleMapsAPI'] = originalGoogleCheck;
    });
  });

  describe('Performance Check', () => {
    it('should return pass status for good performance metrics', async () => {
      const originalGetMetrics = checker['getPerformanceMetrics'];
      checker['getPerformanceMetrics'] = jest.fn().mockResolvedValue({
        apiLatencyP95: 1000, // 1s - good
        errorRate: 0.001, // 0.1% - good
        requestsPerMinute: 100,
        cacheHitRate: 0.8
      });

      const result = await checker['checkPerformance']();

      expect(result.status).toBe('pass');
      expect(result.apiLatency).toBe(1000);
      expect(result.errorRate).toBe(0.001);

      // Restore original method
      checker['getPerformanceMetrics'] = originalGetMetrics;
    });

    it('should return warn status for degraded performance', async () => {
      const originalGetMetrics = checker['getPerformanceMetrics'];
      checker['getPerformanceMetrics'] = jest.fn().mockResolvedValue({
        apiLatencyP95: 3000, // 3s - warning level
        errorRate: 0.02, // 2% - warning level
        requestsPerMinute: 100,
        cacheHitRate: 0.8
      });

      const result = await checker['checkPerformance']();

      expect(result.status).toBe('warn');

      // Restore original method
      checker['getPerformanceMetrics'] = originalGetMetrics;
    });

    it('should return fail status for poor performance', async () => {
      const originalGetMetrics = checker['getPerformanceMetrics'];
      checker['getPerformanceMetrics'] = jest.fn().mockResolvedValue({
        apiLatencyP95: 6000, // 6s - critical level
        errorRate: 0.1, // 10% - critical level
        requestsPerMinute: 100,
        cacheHitRate: 0.8
      });

      const result = await checker['checkPerformance']();

      expect(result.status).toBe('fail');

      // Restore original method
      checker['getPerformanceMetrics'] = originalGetMetrics;
    });
  });

  describe('System Metrics', () => {
    it('should collect system metrics correctly', async () => {
      const metrics = await checker['getSystemMetrics']();

      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('total');
      expect(metrics.memory).toHaveProperty('percentage');
      expect(metrics.cpu).toHaveProperty('usage');
      expect(metrics.cpu).toHaveProperty('loadAverage');
      expect(metrics.disk).toHaveProperty('used');
      expect(metrics.database).toHaveProperty('connections');
      expect(metrics.requests).toHaveProperty('total');

      // Verify memory calculations
      expect(metrics.memory.used).toBe(32); // 32MB from mocked heapUsed
      expect(metrics.memory.total).toBe(64); // 64MB from mocked heapTotal
      expect(metrics.memory.percentage).toBe(50); // 32/64 * 100
    });

    it('should handle metrics collection errors gracefully', async () => {
      // Mock memory usage to throw error
      const originalMemoryUsage = global.process.memoryUsage;
      global.process.memoryUsage = jest.fn().mockImplementation(() => {
        throw new Error('Memory access denied');
      });

      const metrics = await checker['getSystemMetrics']();

      // Should return empty metrics on error
      expect(metrics.memory.used).toBe(0);
      expect(metrics.memory.total).toBe(0);

      // Restore original function
      global.process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed operations', async () => {
      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await checker['retryOperation'](operation, 3);

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should give up after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(checker['retryOperation'](operation, 2))
        .rejects.toThrow('Persistent failure');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should apply delay between retries', async () => {
      jest.useFakeTimers();

      const operation = jest.fn().mockRejectedValue(new Error('Failure'));
      const retryPromise = checker['retryOperation'](operation, 3, 100);

      // Fast forward time
      jest.advanceTimersByTime(300); // Should cover delays

      await expect(retryPromise).rejects.toThrow('Failure');

      jest.useRealTimers();
    });
  });

  describe('Overall Status Determination', () => {
    it('should return healthy when all checks pass', () => {
      const checks = [
        { status: 'pass' as const },
        { status: 'pass' as const },
        { status: 'pass' as const }
      ];

      const status = checker['determineOverallStatus'](checks);
      expect(status).toBe('healthy');
    });

    it('should return degraded when some checks warn', () => {
      const checks = [
        { status: 'pass' as const },
        { status: 'warn' as const },
        { status: 'pass' as const }
      ];

      const status = checker['determineOverallStatus'](checks);
      expect(status).toBe('degraded');
    });

    it('should return unhealthy when any check fails', () => {
      const checks = [
        { status: 'pass' as const },
        { status: 'warn' as const },
        { status: 'fail' as const }
      ];

      const status = checker['determineOverallStatus'](checks);
      expect(status).toBe('unhealthy');
    });

    it('should return degraded for multiple warnings', () => {
      const checks = [
        { status: 'warn' as const },
        { status: 'warn' as const },
        { status: 'pass' as const }
      ];

      const status = checker['determineOverallStatus'](checks);
      expect(status).toBe('degraded');
    });
  });
});

describe('Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('quickHealthCheck', () => {
    it('should return healthy status for successful check', async () => {
      const status = await quickHealthCheck();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(status);
    });

    it('should return unhealthy on error', async () => {
      // Mock the health checker to throw an error
      const originalPerformHealthCheck = healthChecker.performHealthCheck;
      healthChecker.performHealthCheck = jest.fn().mockRejectedValue(new Error('Health check failed'));

      const status = await quickHealthCheck();
      expect(status).toBe('unhealthy');

      // Restore original method
      healthChecker.performHealthCheck = originalPerformHealthCheck;
    });
  });

  describe('getSystemStatus', () => {
    it('should return system metrics', async () => {
      const metrics = await getSystemStatus();

      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('disk');
      expect(metrics).toHaveProperty('database');
      expect(metrics).toHaveProperty('requests');
    });

    it('should handle errors gracefully', async () => {
      // Mock system metrics to fail
      const originalGetSystemMetrics = HealthChecker.prototype['getSystemMetrics'];
      HealthChecker.prototype['getSystemMetrics'] = jest.fn().mockRejectedValue(new Error('Metrics failed'));

      const metrics = await getSystemStatus();

      // Should return empty metrics on error
      expect(metrics.memory.used).toBe(0);

      // Restore original method
      HealthChecker.prototype['getSystemMetrics'] = originalGetSystemMetrics;
    });
  });
});

describe('Error Handling and Edge Cases', () => {
  let checker: HealthChecker;

  beforeEach(() => {
    checker = new HealthChecker();
    jest.clearAllMocks();
  });

  it('should handle malformed response gracefully', async () => {
    const originalGetMetrics = checker['getPerformanceMetrics'];
    checker['getPerformanceMetrics'] = jest.fn().mockResolvedValue(null);

    const result = await checker['checkPerformance']();

    expect(result.status).toBe('fail');
    expect(result.apiLatency).toBe(0);

    // Restore original method
    checker['getPerformanceMetrics'] = originalGetMetrics;
  });

  it('should handle concurrent health checks', async () => {
    const promises = Array.from({ length: 5 }, () => checker.performHealthCheck());
    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
    });
  });

  it('should handle resource exhaustion gracefully', async () => {
    // Mock extreme resource usage
    global.process.memoryUsage = jest.fn(() => ({
      rss: 2147483648, // 2GB
      heapTotal: 1073741824, // 1GB
      heapUsed: 1073741824, // 1GB (100% usage)
      external: 0,
      arrayBuffers: 0
    }));

    const metrics = await checker['getSystemMetrics']();

    expect(metrics.memory.percentage).toBe(100);

    // Restore original function
    global.process.memoryUsage = jest.fn(() => ({
      rss: 134217728,
      heapTotal: 67108864,
      heapUsed: 33554432,
      external: 1048576,
      arrayBuffers: 524288
    }));
  });

  it('should validate health check response structure', async () => {
    const result = await checker.performHealthCheck();

    // Validate required fields
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('uptime');
    expect(result).toHaveProperty('checks');
    expect(result).toHaveProperty('metrics');

    // Validate checks structure
    expect(result.checks).toHaveProperty('database');
    expect(result.checks).toHaveProperty('redis');
    expect(result.checks).toHaveProperty('externalServices');
    expect(result.checks).toHaveProperty('performance');

    // Validate individual check structure
    Object.values(result.checks).forEach(check => {
      expect(check).toHaveProperty('status');
      expect(check).toHaveProperty('responseTime');
      expect(['pass', 'warn', 'fail']).toContain(check.status);
      expect(typeof check.responseTime).toBe('number');
    });

    // Validate metrics structure
    expect(result.metrics).toHaveProperty('memory');
    expect(result.metrics).toHaveProperty('cpu');
    expect(result.metrics).toHaveProperty('disk');
    expect(result.metrics).toHaveProperty('database');
    expect(result.metrics).toHaveProperty('requests');
  });
});