import type {
  AlertRule,
  Alert,
  AlertAcknowledgment,
  HealthCheckResponse
} from '@/types/health-monitoring';

export class AlertingSystem {
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private evaluationTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadDefaultAlertRules();
    this.startEvaluation();
  }

  private loadDefaultAlertRules() {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-api-latency',
        name: 'High API Latency',
        metric: 'api_latency_p95',
        condition: 'greater_than',
        threshold: 3000, // 3s
        duration: 300, // 5 minutes
        severity: 'critical',
        channels: ['slack', 'email'],
        enabled: true,
        description: 'API response time is consistently high',
        tags: ['performance', 'api']
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        metric: 'error_rate',
        condition: 'greater_than',
        threshold: 0.05, // 5%
        duration: 180, // 3 minutes
        severity: 'critical',
        channels: ['slack', 'email'],
        enabled: true,
        description: 'Error rate is above acceptable threshold',
        tags: ['reliability', 'errors']
      },
      {
        id: 'low-cache-hit-rate',
        name: 'Low Cache Hit Rate',
        metric: 'cache_hit_rate',
        condition: 'less_than',
        threshold: 0.3, // 30%
        duration: 600, // 10 minutes
        severity: 'warning',
        channels: ['slack'],
        enabled: true,
        description: 'Cache hit rate is below optimal threshold',
        tags: ['performance', 'cache']
      },
      {
        id: 'database-connection-issues',
        name: 'Database Connection Issues',
        metric: 'database_connections',
        condition: 'greater_than',
        threshold: 40, // 80% of typical pool size
        duration: 300, // 5 minutes
        severity: 'warning',
        channels: ['slack'],
        enabled: true,
        description: 'Database connection pool is near capacity',
        tags: ['database', 'connections']
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        metric: 'memory_usage',
        condition: 'greater_than',
        threshold: 85, // 85%
        duration: 600, // 10 minutes
        severity: 'warning',
        channels: ['slack'],
        enabled: true,
        description: 'Memory usage is consistently high',
        tags: ['system', 'memory']
      },
      {
        id: 'system-unhealthy',
        name: 'System Unhealthy',
        metric: 'health_status',
        condition: 'equals',
        threshold: 0, // 0 = unhealthy
        duration: 60, // 1 minute
        severity: 'critical',
        channels: ['slack', 'email', 'sms'],
        enabled: true,
        description: 'Overall system health is unhealthy',
        tags: ['system', 'health']
      },
      {
        id: 'external-service-failures',
        name: 'External Service Failures',
        metric: 'external_services_status',
        condition: 'less_than',
        threshold: 1, // Less than fully operational
        duration: 300, // 5 minutes
        severity: 'warning',
        channels: ['slack'],
        enabled: true,
        description: 'One or more external services are unavailable',
        tags: ['external', 'dependencies']
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  public addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    console.log(`[AlertingSystem] Added alert rule: ${rule.name}`);
  }

  public updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;

    const updatedRule = { ...rule, ...updates };
    this.alertRules.set(ruleId, updatedRule);
    console.log(`[AlertingSystem] Updated alert rule: ${updatedRule.name}`);
    return true;
  }

  public removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);
    if (removed) {
      console.log(`[AlertingSystem] Removed alert rule: ${ruleId}`);
    }
    return removed;
  }

  public getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  public getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  public async evaluateAlerts(healthData: HealthCheckResponse): Promise<void> {
    const metrics = this.extractMetricsFromHealthData(healthData);
    const timestamp = new Date().toISOString();

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      try {
        await this.evaluateRule(rule, metrics, timestamp);
      } catch (error) {
        console.error(`[AlertingSystem] Error evaluating rule ${rule.id}:`, error);
      }
    }
  }

  private async evaluateRule(
    rule: AlertRule,
    metrics: Record<string, number>,
    timestamp: string
  ): Promise<void> {
    const metricValue = metrics[rule.metric];
    if (metricValue === undefined) {
      console.warn(`[AlertingSystem] Metric ${rule.metric} not found for rule ${rule.id}`);
      return;
    }

    const isTriggered = this.checkCondition(metricValue, rule.condition, rule.threshold);
    const existingAlert = this.activeAlerts.get(rule.id);

    if (isTriggered && !existingAlert) {
      // New alert condition met
      const alert: Alert = {
        id: `${rule.id}-${Date.now()}`,
        ruleId: rule.id,
        ruleName: rule.name,
        metric: rule.metric,
        currentValue: metricValue,
        threshold: rule.threshold,
        severity: rule.severity,
        status: 'firing',
        triggeredAt: timestamp,
        message: this.generateAlertMessage(rule, metricValue),
        acknowledgments: []
      };

      this.activeAlerts.set(rule.id, alert);
      this.alertHistory.push(alert);

      // Send notifications
      await this.sendNotifications(alert, rule.channels);

      console.log(`[AlertingSystem] Alert triggered: ${alert.message}`);

      // Log alert analytics
      console.log('[Analytics] alert_triggered:', {
        event: 'alert_triggered',
        alertId: alert.id,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        metric: rule.metric,
        currentValue: metricValue,
        threshold: rule.threshold,
        timestamp
      });

    } else if (!isTriggered && existingAlert) {
      // Alert condition resolved
      existingAlert.status = 'resolved';
      existingAlert.resolvedAt = timestamp;

      this.activeAlerts.delete(rule.id);

      // Update in history
      const historyIndex = this.alertHistory.findIndex(a => a.id === existingAlert.id);
      if (historyIndex !== -1) {
        this.alertHistory[historyIndex] = existingAlert;
      }

      // Send resolution notification
      await this.sendResolutionNotification(existingAlert, rule.channels);

      console.log(`[AlertingSystem] Alert resolved: ${existingAlert.message}`);

      // Log resolution analytics
      console.log('[Analytics] alert_resolved:', {
        event: 'alert_resolved',
        alertId: existingAlert.id,
        ruleId: rule.id,
        ruleName: rule.name,
        duration: Date.parse(timestamp) - Date.parse(existingAlert.triggeredAt),
        timestamp
      });
    }
  }

  private extractMetricsFromHealthData(healthData: HealthCheckResponse): Record<string, number> {
    return {
      api_latency_p95: healthData.checks.performance?.apiLatency || 0,
      error_rate: healthData.checks.performance?.errorRate || 0,
      cache_hit_rate: healthData.checks.performance?.cacheHitRate || 0,
      database_connections: healthData.metrics.database.connections.active || 0,
      memory_usage: healthData.metrics.memory.percentage || 0,
      cpu_usage: healthData.metrics.cpu.usage || 0,
      disk_usage: healthData.metrics.disk.percentage || 0,
      health_status: healthData.status === 'healthy' ? 1 : healthData.status === 'degraded' ? 0.5 : 0,
      external_services_status: healthData.checks.externalServices?.status === 'pass' ? 1 :
                                healthData.checks.externalServices?.status === 'warn' ? 0.5 : 0,
      database_response_time: healthData.checks.database?.responseTime || 0,
      redis_response_time: healthData.checks.redis?.responseTime || 0
    };
  }

  private checkCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return Math.abs(value - threshold) < 0.001; // Float comparison
      case 'not_equals':
        return Math.abs(value - threshold) >= 0.001;
      default:
        return false;
    }
  }

  private generateAlertMessage(rule: AlertRule, currentValue: number): string {
    const formattedValue = this.formatMetricValue(rule.metric, currentValue);
    const formattedThreshold = this.formatMetricValue(rule.metric, rule.threshold);

    return `${rule.name}: ${rule.metric} is ${formattedValue} (threshold: ${formattedThreshold})`;
  }

  private formatMetricValue(metric: string, value: number): string {
    if (metric.includes('rate') || metric.includes('percentage')) {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (metric.includes('latency') || metric.includes('time')) {
      return value < 1000 ? `${value.toFixed(0)}ms` : `${(value / 1000).toFixed(1)}s`;
    }
    if (metric.includes('usage') && !metric.includes('memory')) {
      return `${value.toFixed(1)}%`;
    }
    return value.toFixed(1);
  }

  private async sendNotifications(alert: Alert, channels: string[]): Promise<void> {
    const notifications = channels.map(channel => this.sendNotification(alert, channel));
    await Promise.allSettled(notifications);
  }

  private async sendResolutionNotification(alert: Alert, channels: string[]): Promise<void> {
    const resolutionMessage = `✅ RESOLVED: ${alert.message}`;
    const notifications = channels.map(channel =>
      this.sendNotification({ ...alert, message: resolutionMessage }, channel)
    );
    await Promise.allSettled(notifications);
  }

  private async sendNotification(alert: Alert, channel: string): Promise<void> {
    try {
      switch (channel) {
        case 'slack':
          await this.sendSlackNotification(alert);
          break;
        case 'email':
          await this.sendEmailNotification(alert);
          break;
        case 'sms':
          await this.sendSMSNotification(alert);
          break;
        case 'webhook':
          await this.sendWebhookNotification(alert);
          break;
        default:
          console.warn(`[AlertingSystem] Unknown notification channel: ${channel}`);
      }
    } catch (error) {
      console.error(`[AlertingSystem] Failed to send ${channel} notification:`, error);
    }
  }

  private async sendSlackNotification(alert: Alert): Promise<void> {
    // In a real implementation, this would use the Slack API
    console.log(`[AlertingSystem] Slack notification: ${alert.message}`);

    // Simulate API call
    const slackMessage = {
      channel: process.env.SLACK_ALERT_CHANNEL || '#alerts',
      text: alert.message,
      attachments: [{
        color: alert.severity === 'critical' ? 'danger' : 'warning',
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Metric', value: alert.metric, short: true },
          { title: 'Current Value', value: alert.currentValue.toString(), short: true },
          { title: 'Threshold', value: alert.threshold.toString(), short: true }
        ],
        timestamp: Math.floor(Date.parse(alert.triggeredAt) / 1000)
      }]
    };

    // In production, you would make actual API call:
    // await fetch(process.env.SLACK_WEBHOOK_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(slackMessage)
    // });

    console.log('[Notification] Slack message sent:', slackMessage);
  }

  private async sendEmailNotification(alert: Alert): Promise<void> {
    // In a real implementation, this would use an email service like SendGrid
    console.log(`[AlertingSystem] Email notification: ${alert.message}`);

    const emailData = {
      to: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || ['admin@company.com'],
      subject: `🚨 Alert: ${alert.ruleName}`,
      html: `
        <h2>Alert Triggered</h2>
        <p><strong>Alert:</strong> ${alert.message}</p>
        <p><strong>Severity:</strong> ${alert.severity}</p>
        <p><strong>Triggered At:</strong> ${alert.triggeredAt}</p>
        <p><strong>Current Value:</strong> ${alert.currentValue}</p>
        <p><strong>Threshold:</strong> ${alert.threshold}</p>
        <p><strong>Alert ID:</strong> ${alert.id}</p>
      `
    };

    console.log('[Notification] Email sent:', emailData);
  }

  private async sendSMSNotification(alert: Alert): Promise<void> {
    // In a real implementation, this would use a service like Twilio
    if (alert.severity !== 'critical') return; // Only send SMS for critical alerts

    console.log(`[AlertingSystem] SMS notification: ${alert.message}`);

    const smsData = {
      to: process.env.ALERT_SMS_NUMBERS?.split(',') || ['+1234567890'],
      message: `🚨 CRITICAL ALERT: ${alert.ruleName} - ${alert.message}`
    };

    console.log('[Notification] SMS sent:', smsData);
  }

  private async sendWebhookNotification(alert: Alert): Promise<void> {
    // Send to external webhook endpoints
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) return;

    console.log(`[AlertingSystem] Webhook notification: ${alert.message}`);

    try {
      // In production, you would make actual HTTP request:
      // await fetch(webhookUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ alert, timestamp: new Date().toISOString() })
      // });

      console.log('[Notification] Webhook sent to:', webhookUrl);
    } catch (error) {
      console.error('[AlertingSystem] Webhook notification failed:', error);
    }
  }

  public acknowledgeAlert(alertId: string, acknowledgment: Omit<AlertAcknowledgment, 'id'>): boolean {
    // Find alert in active alerts or history
    let alert = Array.from(this.activeAlerts.values()).find(a => a.id === alertId);
    if (!alert) {
      alert = this.alertHistory.find(a => a.id === alertId);
    }

    if (!alert) return false;

    const ack: AlertAcknowledgment = {
      id: `ack-${Date.now()}`,
      ...acknowledgment
    };

    alert.acknowledgments.push(ack);

    console.log(`[AlertingSystem] Alert acknowledged: ${alertId} by ${acknowledgment.userName}`);

    // Log acknowledgment analytics
    console.log('[Analytics] alert_acknowledged:', {
      event: 'alert_acknowledged',
      alertId,
      userId: acknowledgment.userId,
      userName: acknowledgment.userName,
      timestamp: acknowledgment.acknowledgedAt
    });

    return true;
  }

  private startEvaluation(): void {
    // Evaluate alerts every 30 seconds
    this.evaluationTimer = setInterval(async () => {
      try {
        // In a real implementation, you would fetch latest health data
        // For now, we'll skip automatic evaluation
        console.log('[AlertingSystem] Alert evaluation cycle (skipped - no automatic health data)');
      } catch (error) {
        console.error('[AlertingSystem] Evaluation error:', error);
      }
    }, 30000);
  }

  public stop(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = null;
    }
  }
}

// Export singleton instance
export const alertingSystem = new AlertingSystem();

// Utility functions
export async function evaluateAlertsFromHealth(healthData: HealthCheckResponse): Promise<void> {
  await alertingSystem.evaluateAlerts(healthData);
}

export function getActiveAlertsCount(): number {
  return alertingSystem.getActiveAlerts().length;
}

export function getCriticalAlertsCount(): number {
  return alertingSystem.getActiveAlerts().filter(alert => alert.severity === 'critical').length;
}