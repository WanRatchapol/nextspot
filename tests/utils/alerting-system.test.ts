import { AlertingSystem, alertingSystem, evaluateAlertsFromHealth, getActiveAlertsCount, getCriticalAlertsCount } from '@/utils/alerting-system';
import type { AlertRule, Alert, HealthCheckResponse } from '@/types/health-monitoring';

describe('AlertingSystem', () => {
  let system: AlertingSystem;

  beforeEach(() => {
    system = new AlertingSystem();
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    system.stop();
  });

  describe('Alert Rules Management', () => {
    it('should initialize with default alert rules', () => {
      const rules = system.getAlertRules();

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(rule => rule.name === 'High API Latency')).toBe(true);
      expect(rules.some(rule => rule.name === 'High Error Rate')).toBe(true);
      expect(rules.some(rule => rule.name === 'System Unhealthy')).toBe(true);
    });

    it('should add new alert rules', () => {
      const newRule: AlertRule = {
        id: 'test-rule',
        name: 'Test Alert',
        metric: 'test_metric',
        condition: 'greater_than',
        threshold: 100,
        duration: 300,
        severity: 'warning',
        channels: ['slack'],
        enabled: true,
        description: 'Test alert rule'
      };

      system.addAlertRule(newRule);
      const rules = system.getAlertRules();

      expect(rules.some(rule => rule.id === 'test-rule')).toBe(true);
      expect(console.log).toHaveBeenCalledWith('[AlertingSystem] Added alert rule: Test Alert');
    });

    it('should update existing alert rules', () => {
      const rules = system.getAlertRules();
      const existingRule = rules[0];

      const updated = system.updateAlertRule(existingRule.id, {
        threshold: 5000,
        severity: 'critical'
      });

      expect(updated).toBe(true);

      const updatedRules = system.getAlertRules();
      const updatedRule = updatedRules.find(r => r.id === existingRule.id);

      expect(updatedRule?.threshold).toBe(5000);
      expect(updatedRule?.severity).toBe('critical');
      expect(console.log).toHaveBeenCalledWith(`[AlertingSystem] Updated alert rule: ${updatedRule?.name}`);
    });

    it('should return false when updating non-existent rule', () => {
      const updated = system.updateAlertRule('non-existent', { threshold: 100 });
      expect(updated).toBe(false);
    });

    it('should remove alert rules', () => {
      const rules = system.getAlertRules();
      const ruleToRemove = rules[0];

      const removed = system.removeAlertRule(ruleToRemove.id);
      expect(removed).toBe(true);

      const remainingRules = system.getAlertRules();
      expect(remainingRules.some(r => r.id === ruleToRemove.id)).toBe(false);
      expect(console.log).toHaveBeenCalledWith(`[AlertingSystem] Removed alert rule: ${ruleToRemove.id}`);
    });

    it('should return false when removing non-existent rule', () => {
      const removed = system.removeAlertRule('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('Alert Evaluation', () => {
    const createMockHealthData = (overrides: any = {}): HealthCheckResponse => ({
      status: 'healthy',
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
          apiLatency: 1000, // 1s
          errorRate: 0.001, // 0.1%
          throughput: 100,
          cacheHitRate: 0.8 // 80%
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
      },
      ...overrides
    });

    it('should not trigger alerts when metrics are within thresholds', async () => {
      const healthData = createMockHealthData();

      await system.evaluateAlerts(healthData);

      const activeAlerts = system.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });

    it('should trigger high API latency alert', async () => {
      const healthData = createMockHealthData();
      healthData.checks.performance.apiLatency = 4000; // 4s - above threshold

      await system.evaluateAlerts(healthData);

      const activeAlerts = system.getActiveAlerts();
      const latencyAlert = activeAlerts.find(alert => alert.ruleId === 'high-api-latency');

      expect(latencyAlert).toBeDefined();
      expect(latencyAlert?.status).toBe('firing');
      expect(latencyAlert?.currentValue).toBe(4000);
      expect(latencyAlert?.threshold).toBe(3000);
      expect(latencyAlert?.severity).toBe('critical');

      expect(console.log).toHaveBeenCalledWith(
        '[AlertingSystem] Alert triggered:',
        expect.stringContaining('High API Latency')
      );
    });

    it('should trigger high error rate alert', async () => {
      const healthData = createMockHealthData();
      healthData.checks.performance.errorRate = 0.1; // 10% - above threshold

      await system.evaluateAlerts(healthData);

      const activeAlerts = system.getActiveAlerts();
      const errorAlert = activeAlerts.find(alert => alert.ruleId === 'high-error-rate');

      expect(errorAlert).toBeDefined();
      expect(errorAlert?.status).toBe('firing');
      expect(errorAlert?.currentValue).toBe(0.1);
      expect(errorAlert?.threshold).toBe(0.05);
    });

    it('should trigger system unhealthy alert', async () => {
      const healthData = createMockHealthData({ status: 'unhealthy' });

      await system.evaluateAlerts(healthData);

      const activeAlerts = system.getActiveAlerts();
      const systemAlert = activeAlerts.find(alert => alert.ruleId === 'system-unhealthy');

      expect(systemAlert).toBeDefined();
      expect(systemAlert?.status).toBe('firing');
      expect(systemAlert?.severity).toBe('critical');
    });

    it('should trigger multiple alerts simultaneously', async () => {
      const healthData = createMockHealthData();
      healthData.checks.performance.apiLatency = 4000; // High latency
      healthData.checks.performance.errorRate = 0.1; // High error rate
      healthData.metrics.memory.percentage = 90; // High memory usage

      await system.evaluateAlerts(healthData);

      const activeAlerts = system.getActiveAlerts();
      expect(activeAlerts.length).toBeGreaterThanOrEqual(2);
    });

    it('should resolve alerts when conditions return to normal', async () => {
      // First trigger an alert
      const unhealthyData = createMockHealthData();
      unhealthyData.checks.performance.apiLatency = 4000;

      await system.evaluateAlerts(unhealthyData);
      let activeAlerts = system.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);

      // Then resolve it
      const healthyData = createMockHealthData();
      healthyData.checks.performance.apiLatency = 1000;

      await system.evaluateAlerts(healthyData);
      activeAlerts = system.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);

      // Check alert history
      const history = system.getAlertHistory();
      const resolvedAlert = history.find(alert => alert.ruleId === 'high-api-latency');
      expect(resolvedAlert?.status).toBe('resolved');
      expect(resolvedAlert?.resolvedAt).toBeDefined();

      expect(console.log).toHaveBeenCalledWith(
        '[AlertingSystem] Alert resolved:',
        expect.stringContaining('High API Latency')
      );
    });

    it('should skip disabled alert rules', async () => {
      // Disable a rule
      const rules = system.getAlertRules();
      const rule = rules.find(r => r.name === 'High API Latency');
      if (rule) {
        system.updateAlertRule(rule.id, { enabled: false });
      }

      const healthData = createMockHealthData();
      healthData.checks.performance.apiLatency = 4000; // Should trigger if enabled

      await system.evaluateAlerts(healthData);

      const activeAlerts = system.getActiveAlerts();
      const latencyAlert = activeAlerts.find(alert => alert.ruleId === 'high-api-latency');
      expect(latencyAlert).toBeUndefined();
    });

    it('should handle missing metrics gracefully', async () => {
      const incompleteHealthData = {
        ...createMockHealthData(),
        checks: {
          database: { status: 'pass' as const, responseTime: 50 },
          redis: { status: 'pass' as const, responseTime: 20 },
          externalServices: { status: 'pass' as const, responseTime: 100 },
          performance: {
            status: 'pass' as const,
            responseTime: 0,
            // Missing apiLatency
            errorRate: 0.001,
            throughput: 100,
            cacheHitRate: 0.8
          }
        }
      };

      await system.evaluateAlerts(incompleteHealthData as HealthCheckResponse);

      // Should not crash and should log warning
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Metric api_latency_p95 not found')
      );
    });
  });

  describe('Condition Checking', () => {
    it('should correctly evaluate greater_than conditions', () => {
      expect(system['checkCondition'](100, 'greater_than', 50)).toBe(true);
      expect(system['checkCondition'](50, 'greater_than', 100)).toBe(false);
      expect(system['checkCondition'](100, 'greater_than', 100)).toBe(false);
    });

    it('should correctly evaluate less_than conditions', () => {
      expect(system['checkCondition'](50, 'less_than', 100)).toBe(true);
      expect(system['checkCondition'](100, 'less_than', 50)).toBe(false);
      expect(system['checkCondition'](100, 'less_than', 100)).toBe(false);
    });

    it('should correctly evaluate equals conditions', () => {
      expect(system['checkCondition'](100, 'equals', 100)).toBe(true);
      expect(system['checkCondition'](100.001, 'equals', 100)).toBe(false);
      expect(system['checkCondition'](99.999, 'equals', 100)).toBe(false);
    });

    it('should correctly evaluate not_equals conditions', () => {
      expect(system['checkCondition'](100, 'not_equals', 50)).toBe(true);
      expect(system['checkCondition'](100, 'not_equals', 100)).toBe(false);
    });
  });

  describe('Alert Acknowledgment', () => {
    it('should acknowledge active alerts', async () => {
      // Create an alert first
      const healthData = createMockHealthData();
      healthData.checks.performance.apiLatency = 4000;

      await system.evaluateAlerts(healthData);
      const activeAlerts = system.getActiveAlerts();
      const alert = activeAlerts[0];

      const acknowledgment = {
        userId: 'user-123',
        userName: 'John Doe',
        acknowledgedAt: '2025-10-20T11:00:00Z',
        message: 'Investigating the issue'
      };

      const acknowledged = system.acknowledgeAlert(alert.id, acknowledgment);

      expect(acknowledged).toBe(true);
      expect(alert.acknowledgments).toHaveLength(1);
      expect(alert.acknowledgments[0]).toEqual(
        expect.objectContaining({
          userId: 'user-123',
          userName: 'John Doe',
          message: 'Investigating the issue'
        })
      );

      expect(console.log).toHaveBeenCalledWith(
        `[AlertingSystem] Alert acknowledged: ${alert.id} by John Doe`
      );
    });

    it('should acknowledge alerts in history', async () => {
      // Create and resolve an alert first
      const unhealthyData = createMockHealthData();
      unhealthyData.checks.performance.apiLatency = 4000;
      await system.evaluateAlerts(unhealthyData);

      const healthyData = createMockHealthData();
      await system.evaluateAlerts(healthyData);

      const history = system.getAlertHistory();
      const resolvedAlert = history.find(alert => alert.status === 'resolved');

      if (resolvedAlert) {
        const acknowledgment = {
          userId: 'user-456',
          userName: 'Jane Smith',
          acknowledgedAt: '2025-10-20T11:30:00Z'
        };

        const acknowledged = system.acknowledgeAlert(resolvedAlert.id, acknowledgment);
        expect(acknowledged).toBe(true);
      }
    });

    it('should return false for non-existent alert', () => {
      const acknowledgment = {
        userId: 'user-123',
        userName: 'John Doe',
        acknowledgedAt: '2025-10-20T11:00:00Z'
      };

      const acknowledged = system.acknowledgeAlert('non-existent-alert', acknowledgment);
      expect(acknowledged).toBe(false);
    });
  });

  describe('Notification Sending', () => {
    it('should send notifications through configured channels', async () => {
      const rule: AlertRule = {
        id: 'test-notification',
        name: 'Test Notification',
        metric: 'api_latency_p95',
        condition: 'greater_than',
        threshold: 1000,
        duration: 0,
        severity: 'critical',
        channels: ['slack', 'email', 'sms'],
        enabled: true
      };

      system.addAlertRule(rule);

      const healthData = createMockHealthData();
      healthData.checks.performance.apiLatency = 2000;

      await system.evaluateAlerts(healthData);

      // Should log notifications for all channels
      expect(console.log).toHaveBeenCalledWith(
        '[AlertingSystem] Slack notification:',
        expect.stringContaining('Test Notification')
      );
      expect(console.log).toHaveBeenCalledWith(
        '[AlertingSystem] Email notification:',
        expect.stringContaining('Test Notification')
      );
      expect(console.log).toHaveBeenCalledWith(
        '[AlertingSystem] SMS notification:',
        expect.stringContaining('Test Notification')
      );
    });

    it('should only send SMS for critical alerts', async () => {
      const rule: AlertRule = {
        id: 'test-warning',
        name: 'Test Warning',
        metric: 'api_latency_p95',
        condition: 'greater_than',
        threshold: 1000,
        duration: 0,
        severity: 'warning', // Non-critical
        channels: ['slack', 'sms'],
        enabled: true
      };

      system.addAlertRule(rule);

      const healthData = createMockHealthData();
      healthData.checks.performance.apiLatency = 2000;

      await system.evaluateAlerts(healthData);

      // Should send Slack but not SMS for warning level
      expect(console.log).toHaveBeenCalledWith(
        '[AlertingSystem] Slack notification:',
        expect.stringContaining('Test Warning')
      );

      // SMS should be skipped for non-critical
      const smsLogs = (console.log as jest.Mock).mock.calls.filter(
        call => call[0]?.includes('SMS notification')
      );
      expect(smsLogs).toHaveLength(0);
    });
  });

  describe('Metric Value Formatting', () => {
    it('should format latency metrics correctly', () => {
      expect(system['formatMetricValue']('api_latency_p95', 1500)).toBe('1500ms');
      expect(system['formatMetricValue']('response_time', 2500)).toBe('2.5s');
    });

    it('should format rate metrics correctly', () => {
      expect(system['formatMetricValue']('error_rate', 0.05)).toBe('5.0%');
      expect(system['formatMetricValue']('cache_hit_rate', 0.856)).toBe('85.6%');
    });

    it('should format usage metrics correctly', () => {
      expect(system['formatMetricValue']('memory_usage', 75.5)).toBe('75.5%');
      expect(system['formatMetricValue']('cpu_usage', 60)).toBe('60.0%');
    });

    it('should format generic metrics correctly', () => {
      expect(system['formatMetricValue']('database_connections', 25)).toBe('25.0');
      expect(system['formatMetricValue']('request_count', 1000)).toBe('1000.0');
    });
  });

  describe('Error Handling', () => {
    it('should handle evaluation errors gracefully', async () => {
      // Mock a rule that will cause an error
      const badRule: AlertRule = {
        id: 'bad-rule',
        name: 'Bad Rule',
        metric: 'non_existent_metric',
        condition: 'greater_than',
        threshold: 100,
        duration: 0,
        severity: 'warning',
        channels: ['slack'],
        enabled: true
      };

      system.addAlertRule(badRule);

      const healthData = createMockHealthData();

      // Should not throw error
      await expect(system.evaluateAlerts(healthData)).resolves.not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Metric non_existent_metric not found')
      );
    });

    it('should handle notification failures gracefully', async () => {
      // Mock network failure for notifications
      const originalSendSlack = system['sendSlackNotification'];
      system['sendSlackNotification'] = jest.fn().mockRejectedValue(new Error('Network error'));

      const healthData = createMockHealthData();
      healthData.checks.performance.apiLatency = 4000;

      await system.evaluateAlerts(healthData);

      // Should still create the alert despite notification failure
      const activeAlerts = system.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);

      expect(console.error).toHaveBeenCalledWith(
        '[AlertingSystem] Failed to send slack notification:',
        expect.any(Error)
      );

      // Restore original method
      system['sendSlackNotification'] = originalSendSlack;
    });
  });
});

describe('Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateAlertsFromHealth', () => {
    it('should delegate to alerting system', async () => {
      const spy = jest.spyOn(alertingSystem, 'evaluateAlerts');
      const healthData = {
        status: 'healthy' as const,
        timestamp: '2025-10-20T10:00:00Z',
        version: '1.0.0',
        uptime: 3600,
        checks: {
          database: { status: 'pass' as const, responseTime: 50 },
          redis: { status: 'pass' as const, responseTime: 20 },
          externalServices: { status: 'pass' as const, responseTime: 100 },
          performance: {
            status: 'pass' as const,
            responseTime: 0,
            apiLatency: 1000,
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
      };

      await evaluateAlertsFromHealth(healthData);
      expect(spy).toHaveBeenCalledWith(healthData);
    });
  });

  describe('getActiveAlertsCount', () => {
    it('should return count of active alerts', () => {
      const spy = jest.spyOn(alertingSystem, 'getActiveAlerts').mockReturnValue([
        { status: 'firing' } as Alert,
        { status: 'firing' } as Alert
      ]);

      const count = getActiveAlertsCount();
      expect(count).toBe(2);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getCriticalAlertsCount', () => {
    it('should return count of critical alerts', () => {
      const spy = jest.spyOn(alertingSystem, 'getActiveAlerts').mockReturnValue([
        { status: 'firing', severity: 'critical' } as Alert,
        { status: 'firing', severity: 'warning' } as Alert,
        { status: 'firing', severity: 'critical' } as Alert
      ]);

      const count = getCriticalAlertsCount();
      expect(count).toBe(2);
      expect(spy).toHaveBeenCalled();
    });
  });
});