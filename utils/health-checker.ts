import type {
  HealthCheckResponse,
  HealthCheck,
  PerformanceCheck,
  SystemMetrics,
  HealthCheckConfiguration
} from '@/types/health-monitoring';
import { HealthCheckError } from '@/types/health-monitoring';
import { HEALTH_CHECK_CONSTANTS } from '@/types/health-monitoring';

export class HealthChecker {
  private startTime: number;
  private config: HealthCheckConfiguration;

  constructor(config?: Partial<HealthCheckConfiguration>) {
    this.startTime = Date.now();
    this.config = {
      intervals: {
        healthCheck: 30,
        metricsCollection: 60,
        alertEvaluation: 30,
        logAnalysis: 300,
        ...config?.intervals
      },
      timeouts: {
        database: HEALTH_CHECK_CONSTANTS.DEFAULT_TIMEOUTS.DATABASE,
        redis: HEALTH_CHECK_CONSTANTS.DEFAULT_TIMEOUTS.REDIS,
        externalServices: HEALTH_CHECK_CONSTANTS.DEFAULT_TIMEOUTS.EXTERNAL_SERVICES,
        healthCheckTotal: HEALTH_CHECK_CONSTANTS.DEFAULT_TIMEOUTS.HEALTH_CHECK_TOTAL,
        ...config?.timeouts
      },
      retries: {
        database: 3,
        redis: 2,
        externalServices: 2,
        ...config?.retries
      },
      storage: {
        metricsRetention: 30,
        logRetention: 7,
        alertHistory: 90,
        ...config?.storage
      }
    };
  }

  async performHealthCheck(): Promise<HealthCheckResponse> {
    const checkStartTime = Date.now();

    try {
      // Run all health checks concurrently with timeout
      const checkPromises = [
        this.checkDatabase(),
        this.checkRedis(),
        this.checkExternalServices(),
        this.checkPerformance()
      ];

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new HealthCheckError(
            'Health check timeout',
            'health-checker',
            Date.now() - checkStartTime
          ));
        }, this.config.timeouts.healthCheckTotal);
      });

      const checks = await Promise.race([
        Promise.allSettled(checkPromises),
        timeoutPromise
      ]);

      const results = checks.map(
        (result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            // Return appropriate error structure based on check type
            if (index === 3) { // performance check
              return {
                status: 'fail' as const,
                responseTime: 0,
                message: result.reason?.message || 'Unknown error',
                apiLatency: 0,
                errorRate: 1,
                throughput: 0,
                cacheHitRate: 0
              } as PerformanceCheck;
            } else {
              return {
                status: 'fail' as const,
                responseTime: 0,
                message: result.reason?.message || 'Unknown error'
              } as HealthCheck;
            }
          }
        }
      );

      const database = results[0] as HealthCheck;
      const redis = results[1] as HealthCheck;
      const externalServices = results[2] as HealthCheck;
      const performance = results[3] as PerformanceCheck;

      const overallStatus = this.determineOverallStatus([
        database,
        redis,
        externalServices,
        performance
      ]);

      const metrics = await this.getSystemMetrics();

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
        uptime: process.uptime(),
        checks: {
          database,
          redis,
          externalServices,
          performance
        },
        metrics
      };
    } catch (error) {
      console.error('[HealthChecker] Health check failed:', error);

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || 'unknown',
        uptime: process.uptime(),
        checks: {
          database: { status: 'fail', responseTime: 0, message: 'Health check failed' },
          redis: { status: 'fail', responseTime: 0, message: 'Health check failed' },
          externalServices: { status: 'fail', responseTime: 0, message: 'Health check failed' },
          performance: { status: 'fail', responseTime: 0, message: 'Health check failed', apiLatency: 0, errorRate: 0, throughput: 0, cacheHitRate: 0 }
        },
        metrics: await this.getSystemMetrics().catch(() => this.getEmptyMetrics())
      };
    }
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      // Check basic database connectivity
      // Note: In a real implementation, you'd use your actual database client
      // For now, we'll simulate the check
      await this.retryOperation(async () => {
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

        // In real implementation:
        // await db.$queryRaw`SELECT 1`;
        // const slowQueries = await this.getSlowQueries();
      }, this.config.retries.database);

      const responseTime = Date.now() - start;
      const slowQueries = await this.getSlowQueries();

      return {
        status: this.getDatabaseStatus(responseTime, slowQueries.length),
        responseTime,
        message: slowQueries.length > 0 ? `${slowQueries.length} slow queries detected` : undefined,
        details: {
          slowQueries: slowQueries.length,
          connectionPool: await this.getDatabaseConnectionInfo()
        }
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      return {
        status: 'fail',
        responseTime,
        message: error instanceof Error ? error.message : 'Database connection failed',
        details: { error: String(error) }
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      await this.retryOperation(async () => {
        // Simulate Redis ping
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20));

        // In real implementation:
        // await redis.ping();
      }, this.config.retries.redis);

      const responseTime = Date.now() - start;

      return {
        status: this.getRedisStatus(responseTime),
        responseTime,
        details: {
          cacheHitRate: await this.getCacheHitRate(),
          memoryUsage: await this.getRedisMemoryUsage()
        }
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      return {
        status: 'fail',
        responseTime,
        message: error instanceof Error ? error.message : 'Redis connection failed',
        details: { error: String(error) }
      };
    }
  }

  private async checkExternalServices(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      // Check critical external services
      const services = await Promise.allSettled([
        this.checkUnsplashAPI(),
        this.checkGoogleMapsAPI(),
        // Add other external service checks
      ]);

      const responseTime = Date.now() - start;
      const failedServices = services.filter(s => s.status === 'rejected').length;
      const totalServices = services.length;

      return {
        status: failedServices === 0 ? 'pass' : failedServices < totalServices ? 'warn' : 'fail',
        responseTime,
        message: failedServices > 0 ? `${failedServices}/${totalServices} external services unavailable` : undefined,
        details: {
          serviceResults: services.map((result, index) => ({
            service: ['Unsplash', 'Google Maps'][index],
            status: result.status,
            error: result.status === 'rejected' ? result.reason?.message : undefined
          }))
        }
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      return {
        status: 'fail',
        responseTime,
        message: 'External services check failed',
        details: { error: String(error) }
      };
    }
  }

  private async checkPerformance(): Promise<PerformanceCheck> {
    const start = Date.now();

    try {
      const metrics = await this.getPerformanceMetrics();

      const status = this.getPerformanceStatus(metrics);
      const responseTime = Date.now() - start;

      return {
        apiLatency: metrics.apiLatencyP95,
        errorRate: metrics.errorRate,
        throughput: metrics.requestsPerMinute,
        cacheHitRate: metrics.cacheHitRate,
        status,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      return {
        apiLatency: 0,
        errorRate: 1,
        throughput: 0,
        cacheHitRate: 0,
        status: 'fail',
        responseTime,
        message: error instanceof Error ? error.message : 'Performance check failed'
      };
    }
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Get system information
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      return {
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
        },
        cpu: {
          usage: await this.getCPUUsage(),
          loadAverage: process.platform !== 'win32' ? (await import('os')).loadavg() : [0, 0, 0]
        },
        disk: await this.getDiskUsage(),
        database: {
          connections: await this.getDatabaseConnectionInfo(),
          queryPerformance: await this.getDatabasePerformanceMetrics()
        },
        requests: await this.getRequestMetrics()
      };
    } catch (error) {
      console.error('[HealthChecker] Failed to get system metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  private async getPerformanceMetrics() {
    // In a real implementation, these would come from your metrics store
    // For now, we'll simulate realistic values
    return {
      apiLatencyP95: Math.random() * 1000 + 500, // 500-1500ms
      errorRate: Math.random() * 0.02, // 0-2%
      requestsPerMinute: Math.random() * 1000 + 100, // 100-1100 rpm
      cacheHitRate: Math.random() * 0.3 + 0.7 // 70-100%
    };
  }

  private async getSlowQueries(): Promise<any[]> {
    // In real implementation, query slow query log
    return [];
  }

  private async getDatabaseConnectionInfo() {
    // Mock database connection info
    return {
      active: Math.floor(Math.random() * 20) + 5,
      idle: Math.floor(Math.random() * 10) + 2,
      total: 50
    };
  }

  private async getDatabasePerformanceMetrics() {
    return {
      avgResponseTime: Math.random() * 100 + 50, // 50-150ms
      slowQueries: Math.floor(Math.random() * 3) // 0-2 slow queries
    };
  }

  private async getCacheHitRate(): Promise<number> {
    return Math.random() * 0.3 + 0.7; // 70-100%
  }

  private async getRedisMemoryUsage(): Promise<number> {
    return Math.random() * 50 + 10; // 10-60MB
  }

  private async getCPUUsage(): Promise<number> {
    // Simplified CPU usage calculation
    return Math.random() * 30 + 10; // 10-40%
  }

  private async getDiskUsage() {
    return {
      used: Math.random() * 10 + 5, // 5-15GB
      total: 50, // 50GB
      percentage: Math.random() * 30 + 10 // 10-40%
    };
  }

  private async getRequestMetrics() {
    return {
      total: Math.floor(Math.random() * 10000) + 1000,
      errorRate: Math.random() * 0.02, // 0-2%
      rpsLast5Min: Math.random() * 20 + 5 // 5-25 RPS
    };
  }

  private async checkUnsplashAPI(): Promise<void> {
    // Simulate external API check
    if (Math.random() < 0.05) throw new Error('Unsplash API unavailable');
  }

  private async checkGoogleMapsAPI(): Promise<void> {
    // Simulate external API check
    if (Math.random() < 0.03) throw new Error('Google Maps API unavailable');
  }

  private getDatabaseStatus(responseTime: number, slowQueries: number): 'pass' | 'warn' | 'fail' {
    const thresholds = HEALTH_CHECK_CONSTANTS.STATUS_THRESHOLDS.DATABASE_RESPONSE_TIME;

    if (responseTime > thresholds.fail || slowQueries > 5) return 'fail';
    if (responseTime > thresholds.warn || slowQueries > 2) return 'warn';
    return 'pass';
  }

  private getRedisStatus(responseTime: number): 'pass' | 'warn' | 'fail' {
    const thresholds = HEALTH_CHECK_CONSTANTS.STATUS_THRESHOLDS.REDIS_RESPONSE_TIME;

    if (responseTime > thresholds.fail) return 'fail';
    if (responseTime > thresholds.warn) return 'warn';
    return 'pass';
  }

  private getPerformanceStatus(metrics: any): 'pass' | 'warn' | 'fail' {
    const thresholds = HEALTH_CHECK_CONSTANTS.STATUS_THRESHOLDS;

    if (
      metrics.apiLatencyP95 > thresholds.API_LATENCY_P95.fail ||
      metrics.errorRate > thresholds.ERROR_RATE.fail
    ) {
      return 'fail';
    }

    if (
      metrics.apiLatencyP95 > thresholds.API_LATENCY_P95.warn ||
      metrics.errorRate > thresholds.ERROR_RATE.warn
    ) {
      return 'warn';
    }

    return 'pass';
  }

  private determineOverallStatus(checks: (HealthCheck | PerformanceCheck)[]): 'healthy' | 'degraded' | 'unhealthy' {
    const failedChecks = checks.filter(check => check.status === 'fail').length;
    const warnChecks = checks.filter(check => check.status === 'warn').length;

    if (failedChecks > 0) return 'unhealthy';
    if (warnChecks > 1) return 'degraded';
    if (warnChecks > 0) return 'degraded';
    return 'healthy';
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delay: number = 100
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw lastError!;
  }

  private getEmptyMetrics(): SystemMetrics {
    return {
      memory: { used: 0, total: 0, percentage: 0 },
      cpu: { usage: 0, loadAverage: [0, 0, 0] },
      disk: { used: 0, total: 0, percentage: 0 },
      database: {
        connections: { active: 0, idle: 0, total: 0 },
        queryPerformance: { avgResponseTime: 0, slowQueries: 0 }
      },
      requests: { total: 0, errorRate: 0, rpsLast5Min: 0 }
    };
  }

  // Method to get health check configuration
  getConfiguration(): HealthCheckConfiguration {
    return { ...this.config };
  }

  // Method to update configuration
  updateConfiguration(newConfig: Partial<HealthCheckConfiguration>): void {
    this.config = {
      intervals: { ...this.config.intervals, ...newConfig.intervals },
      timeouts: { ...this.config.timeouts, ...newConfig.timeouts },
      retries: { ...this.config.retries, ...newConfig.retries },
      storage: { ...this.config.storage, ...newConfig.storage }
    };
  }
}

// Export singleton instance
export const healthChecker = new HealthChecker();

// Utility functions
export async function quickHealthCheck(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    const result = await healthChecker.performHealthCheck();
    return result.status;
  } catch (error) {
    console.error('[QuickHealthCheck] Failed:', error);
    return 'unhealthy';
  }
}

export async function getSystemStatus(): Promise<SystemMetrics> {
  const checker = new HealthChecker();
  try {
    return await checker['getSystemMetrics']();
  } catch (error) {
    console.error('[SystemStatus] Failed:', error);
    return checker['getEmptyMetrics']();
  }
}