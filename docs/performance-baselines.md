# Performance Baselines & SLO Targets

## Overview

This document defines performance baselines, Service Level Objectives (SLOs), and monitoring thresholds for the Bangkok Destination MVP during the 8-week validation period.

## Service Level Objectives (SLOs)

### Availability SLO
- **Target**: 99.9% uptime
- **Measurement**: Successful health checks over total health checks
- **Time Window**: 30-day rolling window
- **Error Budget**: 43 minutes of downtime per month

### Latency SLO
- **Target**: 95% of API requests complete in < 2 seconds
- **Measurement**: P95 response time across all API endpoints
- **Time Window**: 24-hour rolling window
- **Degraded Performance**: P95 > 2s but < 5s

### Error Rate SLO
- **Target**: < 0.5% error rate
- **Measurement**: 5xx errors / total requests
- **Time Window**: 1-hour rolling window
- **Error Budget**: 0.5% of total requests per hour

## API Endpoint Baselines

### Core Recommendation API
```typescript
const recommendationBaselines = {
  'GET /api/recommendations': {
    p50: 800,   // 50th percentile: 800ms
    p95: 2200,  // 95th percentile: 2.2s
    p99: 4000,  // 99th percentile: 4s
    throughput: {
      normal: 50,    // requests/minute
      peak: 150,     // requests/minute during peak hours
      burst: 300     // maximum sustainable burst
    },
    errorRate: {
      target: 0.002,  // 0.2%
      warning: 0.01,  // 1%
      critical: 0.05  // 5%
    }
  }
};
```

### Swipe Events API
```typescript
const swipeEventBaselines = {
  'POST /api/swipe-events': {
    p50: 100,   // 50th percentile: 100ms
    p95: 300,   // 95th percentile: 300ms
    p99: 800,   // 99th percentile: 800ms
    throughput: {
      normal: 200,   // requests/minute
      peak: 500,     // requests/minute during peak hours
      burst: 1000    // maximum sustainable burst
    },
    errorRate: {
      target: 0.001,  // 0.1%
      warning: 0.005, // 0.5%
      critical: 0.02  // 2%
    }
  }
};
```

### User Preferences API
```typescript
const preferencesBaselines = {
  'PUT /api/sessions/:id/preferences': {
    p50: 150,   // 50th percentile: 150ms
    p95: 400,   // 95th percentile: 400ms
    p99: 1000,  // 99th percentile: 1s
    throughput: {
      normal: 30,    // requests/minute
      peak: 80,      // requests/minute during peak hours
      burst: 150     // maximum sustainable burst
    },
    errorRate: {
      target: 0.003,  // 0.3%
      warning: 0.01,  // 1%
      critical: 0.03  // 3%
    }
  }
};
```

### Feedback API
```typescript
const feedbackBaselines = {
  'POST /api/feedback': {
    p50: 200,   // 50th percentile: 200ms
    p95: 500,   // 95th percentile: 500ms
    p99: 1200,  // 99th percentile: 1.2s
    throughput: {
      normal: 20,    // requests/minute
      peak: 60,      // requests/minute during peak hours
      burst: 100     // maximum sustainable burst
    },
    errorRate: {
      target: 0.005,  // 0.5%
      warning: 0.02,  // 2%
      critical: 0.05  // 5%
    }
  }
};
```

### Health Check API
```typescript
const healthBaselines = {
  'GET /api/health': {
    p50: 50,    // 50th percentile: 50ms
    p95: 150,   // 95th percentile: 150ms
    p99: 500,   // 99th percentile: 500ms
    throughput: {
      normal: 2,     // requests/minute (monitoring systems)
      peak: 10,      // requests/minute during incidents
      burst: 60      // maximum sustainable burst
    },
    errorRate: {
      target: 0.001,  // 0.1%
      warning: 0.01,  // 1%
      critical: 0.05  // 5%
    }
  }
};
```

## System Resource Baselines

### Memory Usage
```typescript
const memoryBaselines = {
  normal: {
    used: 60,      // % of allocated memory
    warning: 80,   // % threshold for warnings
    critical: 95   // % threshold for critical alerts
  },
  heap: {
    used: 50,      // % of heap memory
    warning: 75,   // % threshold for warnings
    critical: 90   // % threshold for critical alerts
  },
  rss: {
    normal: 128,   // MB resident set size
    warning: 256,  // MB warning threshold
    critical: 512  // MB critical threshold
  }
};
```

### CPU Usage
```typescript
const cpuBaselines = {
  idle: {
    usage: 10,     // % CPU during idle periods
    warning: 30,   // % sustained usage warning
    critical: 50   // % sustained usage critical
  },
  normal: {
    usage: 25,     // % CPU during normal load
    warning: 60,   // % sustained usage warning
    critical: 80   // % sustained usage critical
  },
  peak: {
    usage: 45,     // % CPU during peak load
    warning: 75,   // % sustained usage warning
    critical: 90   // % sustained usage critical
  },
  loadAverage: {
    normal: 0.5,   // 1-minute load average
    warning: 1.0,  // Warning threshold
    critical: 2.0  // Critical threshold
  }
};
```

### Database Performance
```typescript
const databaseBaselines = {
  connections: {
    normal: 5,     // Active connections during normal load
    warning: 20,   // Warning threshold
    critical: 40,  // Critical threshold (80% of pool)
    total: 50      // Maximum connection pool size
  },
  queryPerformance: {
    avgResponseTime: {
      normal: 50,    // ms average query time
      warning: 100,  // ms warning threshold
      critical: 500  // ms critical threshold
    },
    slowQueries: {
      normal: 0,     // Count of slow queries per hour
      warning: 5,    // Warning threshold
      critical: 20   // Critical threshold
    },
    lockWaitTime: {
      normal: 1,     // ms average lock wait time
      warning: 10,   // ms warning threshold
      critical: 100  // ms critical threshold
    }
  }
};
```

### Disk Usage
```typescript
const diskBaselines = {
  storage: {
    normal: 30,    // % disk usage during normal operation
    warning: 80,   // % warning threshold
    critical: 95   // % critical threshold
  },
  iops: {
    normal: 100,   // IOPS during normal load
    warning: 500,  // IOPS warning threshold
    critical: 1000 // IOPS critical threshold
  },
  logs: {
    retention: 7,  // Days to retain logs
    maxSize: 1,    // GB maximum log size
    rotation: 24   // Hours between log rotation
  }
};
```

## User Experience Baselines

### Session Metrics
```typescript
const sessionBaselines = {
  completionRate: {
    target: 75,    // % of sessions that reach feedback stage
    warning: 65,   // % warning threshold
    critical: 50   // % critical threshold
  },
  avgDecisionTime: {
    target: 300,   // seconds (5 minutes) average session duration
    warning: 450,  // seconds (7.5 minutes) warning
    critical: 600  // seconds (10 minutes) critical
  },
  swipesPerSession: {
    target: 20,    // Average swipes per session
    warning: 10,   // Minimum acceptable swipes
    critical: 5    // Critical low engagement
  },
  bounceRate: {
    target: 15,    // % users who leave immediately
    warning: 25,   // % warning threshold
    critical: 40   // % critical threshold
  }
};
```

### Feedback Quality
```typescript
const feedbackBaselines = {
  responseRate: {
    target: 60,    // % users who provide feedback
    warning: 40,   // % warning threshold
    critical: 25   // % critical threshold
  },
  avgRating: {
    target: 4.0,   // Average feedback score (1-5)
    warning: 3.5,  // Warning threshold
    critical: 3.0  // Critical threshold
  },
  sentimentScore: {
    target: 0.7,   // Positive sentiment ratio
    warning: 0.5,  // Warning threshold
    critical: 0.3  // Critical threshold
  }
};
```

### Engagement Metrics
```typescript
const engagementBaselines = {
  weeklyActiveUsers: {
    target: 100,   // Target WAU during MVP
    warning: 75,   // Warning threshold
    critical: 50   // Critical threshold
  },
  dailyActiveUsers: {
    target: 30,    // Target DAU during MVP
    warning: 20,   // Warning threshold
    critical: 10   // Critical threshold
  },
  retentionRate: {
    day1: 70,      // % users who return day 1
    day7: 40,      // % users who return week 1
    day30: 20      // % users who return month 1
  }
};
```

## External Service Baselines

### Image Services (Unsplash)
```typescript
const imageServiceBaselines = {
  availability: {
    target: 99.5,  // % availability
    warning: 98,   // % warning threshold
    critical: 95   // % critical threshold
  },
  responseTime: {
    p50: 200,      // ms for image metadata
    p95: 800,      // ms for image metadata
    p99: 2000      // ms for image metadata
  },
  errorRate: {
    target: 0.01,  // 1% error rate
    warning: 0.05, // 5% warning threshold
    critical: 0.15 // 15% critical threshold
  }
};
```

### Geocoding Services
```typescript
const geocodingBaselines = {
  availability: {
    target: 99.9,  // % availability
    warning: 99,   // % warning threshold
    critical: 97   // % critical threshold
  },
  responseTime: {
    p50: 150,      // ms for geocoding requests
    p95: 500,      // ms for geocoding requests
    p99: 1500      // ms for geocoding requests
  },
  quotaUsage: {
    daily: 1000,   // Requests per day
    warning: 800,  // 80% of quota
    critical: 950  // 95% of quota
  }
};
```

## Monitoring Thresholds

### Alert Severity Mapping
```typescript
const alertThresholds = {
  info: {
    description: "Informational alerts for awareness",
    examples: ["New deployment", "Configuration change", "Scheduled maintenance"]
  },
  warning: {
    description: "Issues that may impact performance but don't require immediate action",
    responseTime: "1 hour",
    examples: ["High memory usage", "Slow queries", "External service degradation"]
  },
  critical: {
    description: "Issues that significantly impact service or user experience",
    responseTime: "15 minutes",
    examples: ["API errors > 5%", "Response time > 5s", "Database connection failures"]
  },
  emergency: {
    description: "Complete service outage or severe data loss risk",
    responseTime: "5 minutes",
    examples: ["API completely down", "Database unavailable", "Security breach"]
  }
};
```

### Escalation Matrix
```typescript
const escalationMatrix = {
  level1: {
    duration: "15 minutes",
    action: "Automated resolution attempt",
    notification: ["Slack #alerts"]
  },
  level2: {
    duration: "30 minutes",
    action: "On-call engineer notification",
    notification: ["Slack #alerts", "Email to on-call"]
  },
  level3: {
    duration: "1 hour",
    action: "Technical lead escalation",
    notification: ["Slack #incidents", "Email to tech lead", "SMS to on-call"]
  },
  level4: {
    duration: "2 hours",
    action: "Management escalation",
    notification: ["All channels", "Executive notification"]
  }
};
```

## Performance Testing Scenarios

### Load Testing
```typescript
const loadTestScenarios = {
  normal: {
    users: 50,           // Concurrent users
    duration: "10 minutes",
    rampUp: "2 minutes",
    scenarios: [
      { endpoint: "/api/recommendations", weight: 40 },
      { endpoint: "/api/swipe-events", weight: 35 },
      { endpoint: "/api/preferences", weight: 15 },
      { endpoint: "/api/feedback", weight: 10 }
    ]
  },
  peak: {
    users: 200,          // Concurrent users
    duration: "15 minutes",
    rampUp: "5 minutes",
    scenarios: [
      { endpoint: "/api/recommendations", weight: 45 },
      { endpoint: "/api/swipe-events", weight: 40 },
      { endpoint: "/api/preferences", weight: 10 },
      { endpoint: "/api/feedback", weight: 5 }
    ]
  },
  stress: {
    users: 500,          // Concurrent users
    duration: "20 minutes",
    rampUp: "10 minutes",
    scenarios: [
      { endpoint: "/api/recommendations", weight: 50 },
      { endpoint: "/api/swipe-events", weight: 45 },
      { endpoint: "/api/preferences", weight: 3 },
      { endpoint: "/api/feedback", weight: 2 }
    ]
  }
};
```

### Chaos Engineering
```typescript
const chaosScenarios = {
  weekly: [
    {
      name: "Database Connection Loss",
      description: "Simulate database connection failures",
      duration: "5 minutes",
      impact: "Test connection pooling and retry logic"
    },
    {
      name: "External Service Timeout",
      description: "Simulate external service timeouts",
      duration: "10 minutes",
      impact: "Test fallback mechanisms and graceful degradation"
    }
  ],
  monthly: [
    {
      name: "Memory Pressure",
      description: "Artificially increase memory usage",
      duration: "15 minutes",
      impact: "Test memory management and garbage collection"
    },
    {
      name: "Network Latency",
      description: "Introduce network delays",
      duration: "20 minutes",
      impact: "Test timeout handling and user experience"
    }
  ]
};
```

## Capacity Planning

### Current Capacity
- **Vercel Functions**: 1000 concurrent executions
- **Database**: 50 connections, 1GB storage
- **CDN**: Unlimited bandwidth
- **External APIs**: 1000 requests/day per service

### Growth Projections
```typescript
const capacityProjections = {
  week2: { users: 50, requests: 5000 },
  week4: { users: 100, requests: 15000 },
  week6: { users: 150, requests: 30000 },
  week8: { users: 200, requests: 50000 }
};
```

### Scaling Triggers
- **Scale Up**: When sustained usage > 70% of capacity
- **Scale Down**: When sustained usage < 30% of capacity
- **Auto-scaling**: Response time > SLO for 5 minutes

## Review Schedule

- **Daily**: Monitor SLO compliance and alert trends
- **Weekly**: Review performance trends and capacity usage
- **Monthly**: Update baselines based on actual performance data
- **Quarterly**: Comprehensive performance review and target adjustment

---

**Document Version**: 1.0
**Last Updated**: 2025-10-20
**Next Review**: 2025-11-20
**Owner**: Technical Lead
**Stakeholders**: Engineering Team, Product Owner, DevOps