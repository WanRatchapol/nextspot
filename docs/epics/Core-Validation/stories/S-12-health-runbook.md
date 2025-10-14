# S-12: Health & Runbook

## Story Overview

**Story ID:** S-12
**Story Name:** Health & Runbook
**Epic:** [Core Validation Platform](../epic-1-core-validation-platform.md)
**Effort:** 0.5 days
**Priority:** High (Operational Readiness)

## User Story

**As a** development and operations team,
**I want** comprehensive health monitoring and operational runbooks,
**so that** the MVP runs reliably during the 8-week validation period with minimal downtime.

## Intent & Scope

Implement production-ready monitoring, health checks, and operational procedures to ensure system reliability during critical validation period. Focus on proactive monitoring and rapid incident response.

## Acceptance Criteria

1. Health check endpoint with comprehensive system status
2. Real-time monitoring dashboard for SLO tracking
3. Automated alerting for performance degradation
4. Incident response runbook with escalation procedures
5. Performance baseline documentation
6. Database health monitoring and query optimization
7. Error tracking and automated log analysis
8. Backup and recovery procedures documentation

## API Contract

**GET /api/health** - System health check
```typescript
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number; // seconds
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    externalServices: HealthCheck;
    performance: PerformanceCheck;
  };
  metrics: SystemMetrics;
}

interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  responseTime: number; // ms
  message?: string;
}

interface PerformanceCheck {
  apiLatency: number; // ms P95
  errorRate: number; // %
  throughput: number; // req/min
  cacheHitRate: number; // %
}
```

## Monitoring Dashboard

```typescript
interface MonitoringMetrics {
  sloCompliance: {
    apiLatencyP95: { current: number; target: number; status: 'pass' | 'fail' };
    errorRate: { current: number; target: number; status: 'pass' | 'fail' };
    uptime: { current: number; target: number; status: 'pass' | 'fail' };
  };
  userMetrics: {
    weeklyActiveUsers: number;
    sessionCompletionRate: number;
    avgDecisionTime: number; // minutes
    feedbackScore: number; // 1-5
  };
  systemMetrics: {
    databaseConnections: number;
    memoryUsage: number; // %
    cpuUsage: number; // %
    diskUsage: number; // %
  };
}
```

## Health Check Implementation

```typescript
class HealthChecker {
  async performHealthCheck(): Promise<HealthCheckResponse> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalServices(),
      this.checkPerformance()
    ]);

    const [database, redis, externalServices, performance] = checks.map(
      result => result.status === 'fulfilled' ? result.value : { status: 'fail', responseTime: 0 }
    );

    const overallStatus = this.determineOverallStatus([database, redis, externalServices, performance]);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      uptime: process.uptime(),
      checks: { database, redis, externalServices, performance },
      metrics: await this.getSystemMetrics()
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await db.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      // Check for slow queries
      const slowQueries = await this.getSlowQueries();

      return {
        status: responseTime < 100 && slowQueries.length === 0 ? 'pass' : 'warn',
        responseTime,
        message: slowQueries.length > 0 ? `${slowQueries.length} slow queries detected` : undefined
      };
    } catch (error) {
      return {
        status: 'fail',
        responseTime: Date.now() - start,
        message: error.message
      };
    }
  }

  private async checkPerformance(): Promise<PerformanceCheck> {
    const metrics = await this.getPerformanceMetrics();

    return {
      apiLatency: metrics.recommendationsP95,
      errorRate: metrics.errorRate,
      throughput: metrics.requestsPerMinute,
      cacheHitRate: metrics.cacheHitRate
    };
  }
}
```

## Alerting Configuration

```typescript
interface AlertRule {
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  duration: number; // seconds
  severity: 'warning' | 'critical';
  channels: ('slack' | 'email' | 'sms')[];
}

const alertRules: AlertRule[] = [
  {
    name: 'High API Latency',
    metric: 'api_latency_p95',
    condition: 'greater_than',
    threshold: 3000, // 3s
    duration: 300, // 5 minutes
    severity: 'critical',
    channels: ['slack', 'email']
  },
  {
    name: 'High Error Rate',
    metric: 'error_rate',
    condition: 'greater_than',
    threshold: 0.05, // 5%
    duration: 180, // 3 minutes
    severity: 'critical',
    channels: ['slack', 'email']
  },
  {
    name: 'Low Cache Hit Rate',
    metric: 'cache_hit_rate',
    condition: 'less_than',
    threshold: 0.3, // 30%
    duration: 600, // 10 minutes
    severity: 'warning',
    channels: ['slack']
  },
  {
    name: 'Database Connection Issues',
    metric: 'database_connections',
    condition: 'greater_than',
    threshold: 80, // 80% of pool
    duration: 300,
    severity: 'warning',
    channels: ['slack']
  }
];
```

## Incident Response Runbook

### Critical Incidents (API Down / High Error Rate)

```markdown
## CRITICAL: API Down or High Error Rate

### Immediate Actions (0-5 minutes)
1. **Acknowledge Alert** - Confirm you're responding
2. **Check Health Endpoint** - `/api/health` for system status
3. **Review Error Logs** - Sentry dashboard for error patterns
4. **Verify Database** - Connection and query performance
5. **Check External Dependencies** - Supabase, Vercel status

### Diagnosis Steps (5-15 minutes)
1. **Check Recent Deployments** - Vercel deployment logs
2. **Review Performance Metrics** - API latency, throughput
3. **Database Query Analysis** - Slow query log, connection pool
4. **Memory/CPU Usage** - System resource utilization
5. **Network Connectivity** - Inter-service communication

### Resolution Actions
- **Database Issues**: Restart connections, optimize queries
- **Memory Leaks**: Restart affected services
- **External API Failures**: Activate Fast Mode fallback
- **Deployment Issues**: Rollback to previous version

### Communication
- Update #incident-response Slack channel every 15 minutes
- Notify stakeholders if downtime > 30 minutes
```

### Performance Degradation

```markdown
## WARNING: Performance Degradation

### Investigation Checklist
- [ ] Check API latency trends (last 4 hours)
- [ ] Review cache hit rates
- [ ] Analyze database query performance
- [ ] Check for traffic spikes
- [ ] Review recent code changes

### Common Resolutions
- **Cache Issues**: Clear and warm cache
- **Database Slowdown**: Restart connection pool, check indexes
- **Traffic Spike**: Monitor for DDoS, enable rate limiting
- **Code Issues**: Revert recent changes if identified
```

## Performance Baselines

```typescript
interface PerformanceBaselines {
  apiEndpoints: {
    'GET /api/recommendations': { p50: 800, p95: 2200, p99: 4000 }; // ms
    'POST /api/swipe-events': { p50: 100, p95: 300, p99: 800 };
    'PUT /api/sessions/:id/preferences': { p50: 150, p95: 400, p99: 1000 };
    'POST /api/feedback': { p50: 200, p95: 500, p99: 1200 };
  };
  systemMetrics: {
    memoryUsage: { normal: 60, warning: 80, critical: 90 }; // %
    cpuUsage: { normal: 50, warning: 70, critical: 85 }; // %
    databaseConnections: { normal: 20, warning: 60, critical: 80 }; // count
  };
  userMetrics: {
    sessionCompletionRate: { target: 70, warning: 60, critical: 50 }; // %
    avgDecisionTime: { target: 300, warning: 450, critical: 600 }; // seconds
    feedbackScore: { target: 4.0, warning: 3.5, critical: 3.0 }; // 1-5 scale
  };
}
```

## Backup & Recovery Procedures

```typescript
// Automated daily backups
const backupProcedure = {
  database: {
    frequency: 'daily',
    retention: '30 days',
    command: 'pg_dump --clean --no-owner --no-privileges',
    verification: 'restore to staging and run health checks'
  },
  userFeedback: {
    frequency: 'daily',
    retention: '90 days',
    format: 'JSON export',
    encryption: 'AES-256'
  },
  configuration: {
    frequency: 'on change',
    retention: 'indefinite',
    items: ['environment variables', 'deployment configs', 'DNS settings']
  }
};

// Recovery Time Objectives (RTO) / Recovery Point Objectives (RPO)
const recoveryObjectives = {
  database: { rto: '4 hours', rpo: '24 hours' },
  application: { rto: '30 minutes', rpo: '1 hour' },
  monitoring: { rto: '15 minutes', rpo: '5 minutes' }
};
```

## Log Analysis & Debugging

```typescript
// Structured logging for operational insights
const logger = createLogger({
  format: combine(
    timestamp(),
    json(),
    format(info => ({
      ...info,
      requestId: info.requestId || 'unknown',
      sessionId: info.sessionId || 'anonymous',
      userAgent: info.userAgent || 'unknown',
      environment: process.env.NODE_ENV
    }))()
  )
});

// Common log queries for troubleshooting
const logQueries = {
  errorsByEndpoint: `
    SELECT endpoint, COUNT(*) as error_count
    FROM logs
    WHERE level = 'error' AND timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY endpoint
    ORDER BY error_count DESC;
  `,
  slowRequests: `
    SELECT endpoint, AVG(duration) as avg_duration
    FROM logs
    WHERE duration > 2000 AND timestamp > NOW() - INTERVAL '6 hours'
    GROUP BY endpoint;
  `,
  userJourneyErrors: `
    SELECT session_id, endpoint, error_message, timestamp
    FROM logs
    WHERE level = 'error' AND session_id = ?
    ORDER BY timestamp;
  `
};
```

## Analytics Events

- `health_check_performed` - Regular health check execution
- `alert_triggered` - Monitoring alert fired
- `incident_resolved` - Problem resolution completed
- `performance_baseline_exceeded` - Metric threshold breached

## Performance Targets

- Health Check Response: < 500ms
- Alert Response Time: < 2 minutes
- Incident Acknowledgment: < 5 minutes
- Mean Time to Recovery: < 30 minutes

## Success Criteria

MVP operational readiness:
- **Uptime**: 99.9% during validation period
- **Alert Response**: 100% alerts acknowledged within SLA
- **Performance**: All SLOs met 95% of the time
- **Recovery**: All incidents resolved within RTO

## Links & References

- **PRD Reference:** [docs/prd.md#technical-risks-mitigation](../../prd.md)
- **Architecture Reference:** [docs/architecture.md#monitoring--runbook](../../architecture.md)

---
**Status:** Ready for Development
**Created:** 2025-10-13