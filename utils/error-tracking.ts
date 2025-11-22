import type { LogAnalysisQuery } from '@/types/health-monitoring';

export interface ErrorEvent {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  stack?: string;
  requestId?: string;
  sessionId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  environment: string;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface ErrorSummary {
  totalErrors: number;
  errorRate: number;
  topErrors: Array<{
    message: string;
    count: number;
    percentage: number;
    lastSeen: string;
  }>;
  errorsByEndpoint: Array<{
    endpoint: string;
    count: number;
    errorRate: number;
  }>;
  errorsByTimeFrame: Array<{
    timeframe: string;
    count: number;
  }>;
}

export interface LogPattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  action?: string;
  enabled: boolean;
}

export class ErrorTracker {
  private errors: ErrorEvent[] = [];
  private logPatterns: Map<string, LogPattern> = new Map();
  private maxEvents: number = 10000; // Keep last 10k events in memory

  constructor() {
    this.initializeLogPatterns();
  }

  private initializeLogPatterns() {
    const defaultPatterns: LogPattern[] = [
      {
        id: 'database-connection-error',
        name: 'Database Connection Error',
        pattern: /database.*connection.*failed|ECONNREFUSED.*database|Connection terminated/i,
        severity: 'critical',
        description: 'Database connection failures that could impact service availability',
        action: 'Check database connectivity and connection pool',
        enabled: true
      },
      {
        id: 'out-of-memory',
        name: 'Out of Memory Error',
        pattern: /out of memory|OOM|heap out of memory|allocation failed/i,
        severity: 'critical',
        description: 'Memory allocation failures indicating resource exhaustion',
        action: 'Monitor memory usage and consider scaling up resources',
        enabled: true
      },
      {
        id: 'timeout-error',
        name: 'Timeout Error',
        pattern: /timeout|timed out|request timeout|ETIMEDOUT/i,
        severity: 'high',
        description: 'Request timeouts indicating performance issues',
        action: 'Check network connectivity and service performance',
        enabled: true
      },
      {
        id: 'authentication-failure',
        name: 'Authentication Failure',
        pattern: /authentication failed|unauthorized|invalid token|access denied/i,
        severity: 'medium',
        description: 'Authentication failures that could indicate security issues',
        action: 'Review authentication logs and check for brute force attacks',
        enabled: true
      },
      {
        id: 'rate-limit-exceeded',
        name: 'Rate Limit Exceeded',
        pattern: /rate limit exceeded|too many requests|429/i,
        severity: 'medium',
        description: 'Rate limiting triggered, possibly indicating abuse',
        action: 'Monitor request patterns and adjust rate limits if needed',
        enabled: true
      },
      {
        id: 'external-service-error',
        name: 'External Service Error',
        pattern: /external service.*error|third.?party.*failed|API.*unavailable/i,
        severity: 'high',
        description: 'External service failures affecting functionality',
        action: 'Check external service status and implement fallbacks',
        enabled: true
      },
      {
        id: 'validation-error',
        name: 'Validation Error',
        pattern: /validation.*failed|invalid.*input|schema.*error/i,
        severity: 'low',
        description: 'Input validation failures indicating bad requests',
        action: 'Review client input validation and error messaging',
        enabled: true
      },
      {
        id: 'performance-degradation',
        name: 'Performance Degradation',
        pattern: /slow.*query|performance.*warning|high.*latency/i,
        severity: 'medium',
        description: 'Performance issues that could affect user experience',
        action: 'Analyze query performance and optimize slow operations',
        enabled: true
      }
    ];

    defaultPatterns.forEach(pattern => {
      this.logPatterns.set(pattern.id, pattern);
    });
  }

  public trackError(error: Omit<ErrorEvent, 'id' | 'timestamp' | 'environment'>): void {
    const errorEvent: ErrorEvent = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      ...error
    };

    // Add to in-memory store
    this.errors.unshift(errorEvent);

    // Keep only the most recent events
    if (this.errors.length > this.maxEvents) {
      this.errors = this.errors.slice(0, this.maxEvents);
    }

    // Analyze error for patterns
    this.analyzeError(errorEvent);

    // Log for external systems
    this.logError(errorEvent);

    console.log(`[ErrorTracker] Error tracked: ${errorEvent.message}`);
  }

  private analyzeError(error: ErrorEvent): void {
    const matchedPatterns: LogPattern[] = [];

    for (const pattern of this.logPatterns.values()) {
      if (!pattern.enabled) continue;

      const fullText = `${error.message} ${error.stack || ''}`;
      if (pattern.pattern.test(fullText)) {
        matchedPatterns.push(pattern);
      }
    }

    if (matchedPatterns.length > 0) {
      console.log(`[ErrorTracker] Error patterns matched:`, matchedPatterns.map(p => p.name));

      // Log pattern matches for analytics
      matchedPatterns.forEach(pattern => {
        console.log('[Analytics] error_pattern_matched:', {
          event: 'error_pattern_matched',
          errorId: error.id,
          patternId: pattern.id,
          patternName: pattern.name,
          severity: pattern.severity,
          timestamp: error.timestamp
        });
      });

      // Check for critical patterns that need immediate attention
      const criticalPatterns = matchedPatterns.filter(p => p.severity === 'critical');
      if (criticalPatterns.length > 0) {
        this.handleCriticalError(error, criticalPatterns);
      }
    }
  }

  private handleCriticalError(error: ErrorEvent, patterns: LogPattern[]): void {
    console.error(`[ErrorTracker] CRITICAL ERROR DETECTED:`, {
      errorId: error.id,
      message: error.message,
      patterns: patterns.map(p => p.name),
      timestamp: error.timestamp
    });

    // In production, this would trigger immediate alerts
    patterns.forEach(pattern => {
      if (pattern.action) {
        console.log(`[ErrorTracker] Recommended action for ${pattern.name}: ${pattern.action}`);
      }
    });

    // Log critical error for immediate notification
    console.log('[Analytics] critical_error_detected:', {
      event: 'critical_error_detected',
      errorId: error.id,
      patterns: patterns.map(p => ({ id: p.id, name: p.name, severity: p.severity })),
      error: {
        message: error.message,
        endpoint: error.endpoint,
        requestId: error.requestId
      },
      timestamp: error.timestamp
    });
  }

  private logError(error: ErrorEvent): void {
    // Structure the log for external systems like Sentry, LogRocket, etc.
    const logEntry = {
      timestamp: error.timestamp,
      level: error.level,
      message: error.message,
      ...(error.stack && { stack: error.stack }),
      ...(error.requestId && { requestId: error.requestId }),
      ...(error.sessionId && { sessionId: error.sessionId }),
      ...(error.userId && { userId: error.userId }),
      ...(error.endpoint && { endpoint: error.endpoint }),
      ...(error.method && { method: error.method }),
      ...(error.statusCode && { statusCode: error.statusCode }),
      ...(error.userAgent && { userAgent: error.userAgent }),
      ...(error.ip && { ip: error.ip }),
      environment: error.environment,
      ...(error.tags && { tags: error.tags }),
      ...(error.metadata && { metadata: error.metadata })
    };

    // In production, send to external error tracking service
    // await sentry.captureException(logEntry);
    // await logRocket.captureException(logEntry);

    console.log('[ErrorLog]', JSON.stringify(logEntry));
  }

  public getErrorSummary(timeframeHours: number = 24): ErrorSummary {
    const cutoffTime = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
    const recentErrors = this.errors.filter(e => new Date(e.timestamp) > cutoffTime);

    // Calculate error rate (errors per hour)
    const errorRate = recentErrors.length / timeframeHours;

    // Group errors by message
    const errorCounts = new Map<string, { count: number; lastSeen: string }>();
    recentErrors.forEach(error => {
      const key = error.message.substring(0, 100); // Truncate for grouping
      const existing = errorCounts.get(key);
      if (existing) {
        existing.count++;
        if (error.timestamp > existing.lastSeen) {
          existing.lastSeen = error.timestamp;
        }
      } else {
        errorCounts.set(key, { count: 1, lastSeen: error.timestamp });
      }
    });

    // Get top errors
    const topErrors = Array.from(errorCounts.entries())
      .map(([message, data]) => ({
        message,
        count: data.count,
        percentage: (data.count / recentErrors.length) * 100,
        lastSeen: data.lastSeen
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Group errors by endpoint
    const endpointCounts = new Map<string, number>();
    const endpointTotals = new Map<string, number>();

    recentErrors.forEach(error => {
      if (error.endpoint) {
        endpointCounts.set(error.endpoint, (endpointCounts.get(error.endpoint) || 0) + 1);
      }
    });

    // In a real implementation, you'd get total request counts from metrics
    // For now, estimate based on error data
    const errorsByEndpoint = Array.from(endpointCounts.entries())
      .map(([endpoint, errorCount]) => {
        const estimatedTotal = errorCount * 20; // Assume 5% error rate
        return {
          endpoint,
          count: errorCount,
          errorRate: (errorCount / estimatedTotal) * 100
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Group errors by time frame (hourly buckets)
    const hourlyBuckets = new Map<string, number>();
    recentErrors.forEach(error => {
      const hour = new Date(error.timestamp).toISOString().substring(0, 13); // YYYY-MM-DDTHH
      hourlyBuckets.set(hour, (hourlyBuckets.get(hour) || 0) + 1);
    });

    const errorsByTimeFrame = Array.from(hourlyBuckets.entries())
      .map(([timeframe, count]) => ({ timeframe, count }))
      .sort((a, b) => a.timeframe.localeCompare(b.timeframe));

    return {
      totalErrors: recentErrors.length,
      errorRate,
      topErrors,
      errorsByEndpoint,
      errorsByTimeFrame
    };
  }

  public searchErrors(query: {
    message?: string;
    level?: string;
    endpoint?: string;
    userId?: string;
    timeframe?: { start: string; end: string };
    limit?: number;
  }): ErrorEvent[] {
    let filteredErrors = [...this.errors];

    if (query.message) {
      const messageRegex = new RegExp(query.message, 'i');
      filteredErrors = filteredErrors.filter(e => messageRegex.test(e.message));
    }

    if (query.level) {
      filteredErrors = filteredErrors.filter(e => e.level === query.level);
    }

    if (query.endpoint) {
      filteredErrors = filteredErrors.filter(e => e.endpoint === query.endpoint);
    }

    if (query.userId) {
      filteredErrors = filteredErrors.filter(e => e.userId === query.userId);
    }

    if (query.timeframe) {
      const start = new Date(query.timeframe.start);
      const end = new Date(query.timeframe.end);
      filteredErrors = filteredErrors.filter(e => {
        const timestamp = new Date(e.timestamp);
        return timestamp >= start && timestamp <= end;
      });
    }

    return filteredErrors.slice(0, query.limit || 100);
  }

  public getLogAnalysisQueries(): LogAnalysisQuery[] {
    return [
      {
        name: 'Errors by Endpoint',
        description: 'Count errors grouped by API endpoint',
        query: `
          SELECT endpoint, COUNT(*) as error_count,
                 COUNT(*) * 100.0 / (SELECT COUNT(*) FROM errors WHERE timestamp > datetime('now', '-1 hour')) as percentage
          FROM errors
          WHERE level = 'error' AND timestamp > datetime('now', '-1 hour')
          GROUP BY endpoint
          ORDER BY error_count DESC
          LIMIT 10;
        `,
        frequency: 'hourly',
        alerts: {
          threshold: 100,
          severity: 'warning'
        }
      },
      {
        name: 'Slow Requests',
        description: 'Find requests with high response times',
        query: `
          SELECT endpoint, AVG(response_time) as avg_duration, COUNT(*) as count
          FROM request_logs
          WHERE response_time > 2000 AND timestamp > datetime('now', '-6 hours')
          GROUP BY endpoint
          ORDER BY avg_duration DESC;
        `,
        frequency: 'hourly'
      },
      {
        name: 'User Journey Errors',
        description: 'Track errors for specific user sessions',
        query: `
          SELECT session_id, endpoint, message, timestamp
          FROM errors
          WHERE level = 'error' AND session_id = ?
          ORDER BY timestamp;
        `,
        parameters: ['session_id']
      },
      {
        name: 'Authentication Failures',
        description: 'Track authentication and authorization failures',
        query: `
          SELECT COUNT(*) as auth_failures,
                 COUNT(DISTINCT ip) as unique_ips,
                 datetime(timestamp, 'start of hour') as hour
          FROM errors
          WHERE message LIKE '%authentication%' OR message LIKE '%unauthorized%'
          AND timestamp > datetime('now', '-24 hours')
          GROUP BY hour
          ORDER BY hour;
        `,
        frequency: 'hourly',
        alerts: {
          threshold: 50,
          severity: 'critical'
        }
      },
      {
        name: 'Error Rate Trend',
        description: 'Monitor error rate trends over time',
        query: `
          SELECT datetime(timestamp, 'start of hour') as hour,
                 COUNT(*) as error_count,
                 COUNT(*) * 100.0 / (
                   SELECT COUNT(*) FROM request_logs
                   WHERE datetime(timestamp, 'start of hour') = hour
                 ) as error_rate
          FROM errors
          WHERE timestamp > datetime('now', '-24 hours')
          GROUP BY hour
          ORDER BY hour;
        `,
        frequency: 'hourly'
      }
    ];
  }

  public addLogPattern(pattern: LogPattern): void {
    this.logPatterns.set(pattern.id, pattern);
    console.log(`[ErrorTracker] Added log pattern: ${pattern.name}`);
  }

  public updateLogPattern(patternId: string, updates: Partial<LogPattern>): boolean {
    const pattern = this.logPatterns.get(patternId);
    if (!pattern) return false;

    const updatedPattern = { ...pattern, ...updates };
    this.logPatterns.set(patternId, updatedPattern);
    console.log(`[ErrorTracker] Updated log pattern: ${updatedPattern.name}`);
    return true;
  }

  public getLogPatterns(): LogPattern[] {
    return Array.from(this.logPatterns.values());
  }

  public exportErrors(format: 'json' | 'csv' = 'json', limit: number = 1000): string {
    const errors = this.errors.slice(0, limit);

    if (format === 'csv') {
      const headers = [
        'timestamp', 'level', 'message', 'endpoint', 'method',
        'statusCode', 'requestId', 'sessionId', 'userId'
      ];

      const csvLines = [headers.join(',')];
      errors.forEach(error => {
        const row = headers.map(header => {
          const value = error[header as keyof ErrorEvent];
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value || '';
        });
        csvLines.push(row.join(','));
      });

      return csvLines.join('\n');
    }

    return JSON.stringify(errors, null, 2);
  }

  public clearErrors(): void {
    this.errors = [];
    console.log('[ErrorTracker] Error history cleared');
  }

  public getErrorCount(): number {
    return this.errors.length;
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

// Utility functions
export function trackError(
  message: string,
  level: 'error' | 'warn' | 'info' | 'debug' = 'error',
  metadata?: {
    stack?: string;
    requestId?: string;
    sessionId?: string;
    userId?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    userAgent?: string;
    ip?: string;
    tags?: Record<string, string>;
    metadata?: Record<string, any>;
  }
): void {
  errorTracker.trackError({
    message,
    level,
    ...metadata
  });
}

export function getErrorSummary(timeframeHours: number = 24): ErrorSummary {
  return errorTracker.getErrorSummary(timeframeHours);
}

export function searchErrorLogs(query: {
  message?: string;
  level?: string;
  endpoint?: string;
  userId?: string;
  timeframe?: { start: string; end: string };
  limit?: number;
}): ErrorEvent[] {
  return errorTracker.searchErrors(query);
}