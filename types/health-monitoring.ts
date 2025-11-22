export interface HealthCheckResponse {
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

export interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  responseTime: number; // ms
  message?: string;
  details?: Record<string, any>;
}

export interface PerformanceCheck {
  apiLatency: number; // ms P95
  errorRate: number; // %
  throughput: number; // req/min
  cacheHitRate: number; // %
  status: 'pass' | 'warn' | 'fail';
  responseTime: number; // ms - overall performance check duration
  message?: string;
}

export interface SystemMetrics {
  memory: {
    used: number; // MB
    total: number; // MB
    percentage: number; // %
  };
  cpu: {
    usage: number; // %
    loadAverage: number[];
  };
  disk: {
    used: number; // GB
    total: number; // GB
    percentage: number; // %
  };
  database: {
    connections: {
      active: number;
      idle: number;
      total: number;
    };
    queryPerformance: {
      avgResponseTime: number; // ms
      slowQueries: number;
    };
  };
  requests: {
    total: number;
    errorRate: number; // %
    rpsLast5Min: number;
  };
}

export interface MonitoringMetrics {
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

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  duration: number; // seconds
  severity: 'info' | 'warning' | 'critical';
  channels: ('slack' | 'email' | 'sms' | 'webhook')[];
  enabled: boolean;
  description?: string;
  tags?: string[];
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  status: 'firing' | 'resolved';
  triggeredAt: string;
  resolvedAt?: string;
  message: string;
  acknowledgments: AlertAcknowledgment[];
}

export interface AlertAcknowledgment {
  id: string;
  userId: string;
  userName: string;
  acknowledgedAt: string;
  message?: string;
}

export interface PerformanceBaselines {
  apiEndpoints: Record<string, {
    p50: number;
    p95: number;
    p99: number;
  }>;
  systemMetrics: {
    memoryUsage: { normal: number; warning: number; critical: number };
    cpuUsage: { normal: number; warning: number; critical: number };
    databaseConnections: { normal: number; warning: number; critical: number };
  };
  userMetrics: {
    sessionCompletionRate: { target: number; warning: number; critical: number };
    avgDecisionTime: { target: number; warning: number; critical: number };
    feedbackScore: { target: number; warning: number; critical: number };
  };
}

export interface LogAnalysisQuery {
  name: string;
  description: string;
  query: string;
  parameters?: string[];
  frequency?: 'realtime' | 'hourly' | 'daily';
  alerts?: {
    threshold: number;
    severity: 'warning' | 'critical';
  };
}

export interface IncidentReport {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  startTime: string;
  endTime?: string;
  affectedServices: string[];
  rootCause?: string;
  resolution?: string;
  timeline: IncidentTimelineEvent[];
  postMortem?: {
    summary: string;
    rootCause: string;
    preventionMeasures: string[];
    followUpTasks: string[];
  };
}

export interface IncidentTimelineEvent {
  timestamp: string;
  type: 'detection' | 'investigation' | 'action' | 'update' | 'resolution';
  description: string;
  author: string;
}

export interface BackupMetadata {
  id: string;
  type: 'database' | 'files' | 'configuration';
  status: 'in_progress' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  size?: number; // bytes
  location: string;
  retention: number; // days
  checksum?: string;
  verification?: {
    status: 'pending' | 'passed' | 'failed';
    verifiedAt?: string;
    details?: string;
  };
}

export interface RecoveryProcedure {
  name: string;
  type: 'database' | 'application' | 'infrastructure';
  rto: number; // Recovery Time Objective in minutes
  rpo: number; // Recovery Point Objective in minutes
  steps: RecoveryStep[];
  prerequisites: string[];
  verification: string[];
  contacts: EmergencyContact[];
}

export interface RecoveryStep {
  order: number;
  description: string;
  command?: string;
  expectedDuration: number; // minutes
  verification: string;
  rollbackProcedure?: string;
}

export interface EmergencyContact {
  name: string;
  role: string;
  phone: string;
  email: string;
  priority: 'primary' | 'secondary' | 'escalation';
  timezone: string;
}

export interface HealthCheckConfiguration {
  intervals: {
    healthCheck: number; // seconds
    metricsCollection: number; // seconds
    alertEvaluation: number; // seconds
    logAnalysis: number; // seconds
  };
  timeouts: {
    database: number; // ms
    redis: number; // ms
    externalServices: number; // ms
    healthCheckTotal: number; // ms
  };
  retries: {
    database: number;
    redis: number;
    externalServices: number;
  };
  storage: {
    metricsRetention: number; // days
    logRetention: number; // days
    alertHistory: number; // days
  };
}

// Error classes for health monitoring
export class HealthCheckError extends Error {
  constructor(
    message: string,
    public component: string,
    public responseTime?: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'HealthCheckError';
  }
}

export class AlertConfigurationError extends Error {
  constructor(message: string, public ruleId?: string) {
    super(message);
    this.name = 'AlertConfigurationError';
  }
}

export class MetricsCollectionError extends Error {
  constructor(
    message: string,
    public metric: string,
    public timestamp?: string
  ) {
    super(message);
    this.name = 'MetricsCollectionError';
  }
}

// Utility types
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
export type CheckStatus = 'pass' | 'warn' | 'fail';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'firing' | 'resolved';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

// Constants
export const HEALTH_CHECK_CONSTANTS = {
  STATUS_THRESHOLDS: {
    DATABASE_RESPONSE_TIME: { warn: 100, fail: 1000 }, // ms
    REDIS_RESPONSE_TIME: { warn: 50, fail: 500 }, // ms
    API_LATENCY_P95: { warn: 2000, fail: 5000 }, // ms
    ERROR_RATE: { warn: 0.01, fail: 0.05 }, // 1% warn, 5% fail
    MEMORY_USAGE: { warn: 80, fail: 95 }, // %
    CPU_USAGE: { warn: 70, fail: 90 }, // %
    DISK_USAGE: { warn: 80, fail: 95 }, // %
  },
  DEFAULT_TIMEOUTS: {
    DATABASE: 5000, // ms
    REDIS: 2000, // ms
    EXTERNAL_SERVICES: 10000, // ms
    HEALTH_CHECK_TOTAL: 15000, // ms
  },
  SLO_TARGETS: {
    API_LATENCY_P95: 2000, // ms
    ERROR_RATE: 0.005, // 0.5%
    UPTIME: 99.9, // %
  }
} as const;