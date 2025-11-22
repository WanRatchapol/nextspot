import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from '@/utils/request-id';
import { alertingSystem } from '@/utils/alerting-system';
import type { AlertRule, Alert, AlertAcknowledgment } from '@/types/health-monitoring';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    console.log(`[${requestId}] Alerts requested`);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'firing', 'resolved', 'all'
    const severity = searchParams.get('severity'); // 'info', 'warning', 'critical'
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeHistory = searchParams.get('history') === 'true';

    let alerts: Alert[] = [];

    if (includeHistory) {
      alerts = alertingSystem.getAlertHistory(limit);
    } else {
      alerts = alertingSystem.getActiveAlerts();
    }

    // Apply filters
    if (status && status !== 'all') {
      alerts = alerts.filter(alert => alert.status === status);
    }

    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    // Limit results
    alerts = alerts.slice(0, limit);

    // Get summary statistics
    const summary = {
      total: alerts.length,
      active: alertingSystem.getActiveAlerts().length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length
    };

    console.log('[Analytics] alerts_requested:', {
      event: 'alerts_requested',
      requestId,
      filters: { status, severity, limit, includeHistory },
      resultCount: alerts.length,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        success: true,
        alerts,
        summary,
        timestamp: new Date().toISOString()
      },
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'X-Processing-Time': `${Date.now() - startTime}ms`,
          'Cache-Control': 'no-cache, max-age=10' // Cache for 10 seconds
        }
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Alerts request failed:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ALERTS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch alerts'
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

// POST endpoint for acknowledging alerts
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { action, alertId, acknowledgment } = body;

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_ACTION',
            message: 'Action parameter is required'
          }
        },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Alert action requested: ${action}`);

    switch (action) {
      case 'acknowledge':
        if (!alertId || !acknowledgment) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'MISSING_PARAMETERS',
                message: 'alertId and acknowledgment are required for acknowledge action'
              }
            },
            { status: 400 }
          );
        }

        const ackData: Omit<AlertAcknowledgment, 'id'> = {
          userId: acknowledgment.userId || 'unknown',
          userName: acknowledgment.userName || 'Unknown User',
          acknowledgedAt: new Date().toISOString(),
          message: acknowledgment.message
        };

        const acknowledged = alertingSystem.acknowledgeAlert(alertId, ackData);

        if (!acknowledged) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'ALERT_NOT_FOUND',
                message: 'Alert not found'
              }
            },
            { status: 404 }
          );
        }

        console.log('[Analytics] alert_acknowledged:', {
          event: 'alert_acknowledged',
          requestId,
          alertId,
          userId: ackData.userId,
          userName: ackData.userName,
          timestamp: ackData.acknowledgedAt
        });

        return NextResponse.json(
          {
            success: true,
            message: 'Alert acknowledged successfully',
            alertId,
            acknowledgment: ackData
          },
          {
            status: 200,
            headers: {
              'X-Request-ID': requestId,
              'X-Processing-Time': `${Date.now() - startTime}ms`
            }
          }
        );

      case 'test':
        // Test alert functionality
        const testAlert: Alert = {
          id: `test-${Date.now()}`,
          ruleId: 'test-rule',
          ruleName: 'Test Alert',
          metric: 'test_metric',
          currentValue: 100,
          threshold: 50,
          severity: 'warning',
          status: 'firing',
          triggeredAt: new Date().toISOString(),
          message: 'This is a test alert to verify the alerting system',
          acknowledgments: []
        };

        // In production, this would trigger actual notifications
        console.log('[AlertingSystem] Test alert generated:', testAlert);

        return NextResponse.json(
          {
            success: true,
            message: 'Test alert generated successfully',
            testAlert
          },
          {
            status: 200,
            headers: {
              'X-Request-ID': requestId,
              'X-Processing-Time': `${Date.now() - startTime}ms`
            }
          }
        );

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: 'Invalid action. Valid actions: acknowledge, test'
            }
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error(`[${requestId}] Alert action failed:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ACTION_ERROR',
          message: 'Failed to process alert action'
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

// PUT endpoint for managing alert rules
export async function PUT(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { action, rule, ruleId } = body;

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_ACTION',
            message: 'Action parameter is required'
          }
        },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Alert rule action: ${action}`);

    switch (action) {
      case 'create':
        if (!rule) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'MISSING_RULE',
                message: 'Rule data is required for create action'
              }
            },
            { status: 400 }
          );
        }

        // Validate rule structure
        const newRule: AlertRule = {
          id: rule.id || `rule-${Date.now()}`,
          name: rule.name,
          metric: rule.metric,
          condition: rule.condition,
          threshold: rule.threshold,
          duration: rule.duration,
          severity: rule.severity,
          channels: rule.channels,
          enabled: rule.enabled !== false,
          description: rule.description,
          tags: rule.tags || []
        };

        alertingSystem.addAlertRule(newRule);

        return NextResponse.json(
          {
            success: true,
            message: 'Alert rule created successfully',
            rule: newRule
          },
          {
            status: 201,
            headers: {
              'X-Request-ID': requestId,
              'X-Processing-Time': `${Date.now() - startTime}ms`
            }
          }
        );

      case 'update':
        if (!ruleId || !rule) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'MISSING_PARAMETERS',
                message: 'ruleId and rule data are required for update action'
              }
            },
            { status: 400 }
          );
        }

        const updated = alertingSystem.updateAlertRule(ruleId, rule);

        if (!updated) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'RULE_NOT_FOUND',
                message: 'Alert rule not found'
              }
            },
            { status: 404 }
          );
        }

        return NextResponse.json(
          {
            success: true,
            message: 'Alert rule updated successfully',
            ruleId
          },
          {
            status: 200,
            headers: {
              'X-Request-ID': requestId,
              'X-Processing-Time': `${Date.now() - startTime}ms`
            }
          }
        );

      case 'delete':
        if (!ruleId) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'MISSING_RULE_ID',
                message: 'ruleId is required for delete action'
              }
            },
            { status: 400 }
          );
        }

        const deleted = alertingSystem.removeAlertRule(ruleId);

        if (!deleted) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'RULE_NOT_FOUND',
                message: 'Alert rule not found'
              }
            },
            { status: 404 }
          );
        }

        return NextResponse.json(
          {
            success: true,
            message: 'Alert rule deleted successfully',
            ruleId
          },
          {
            status: 200,
            headers: {
              'X-Request-ID': requestId,
              'X-Processing-Time': `${Date.now() - startTime}ms`
            }
          }
        );

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: 'Invalid action. Valid actions: create, update, delete'
            }
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error(`[${requestId}] Alert rule action failed:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RULE_ACTION_ERROR',
          message: 'Failed to process alert rule action'
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

// GET endpoint for alert rules
export async function DELETE(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');

    if (!ruleId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_RULE_ID',
            message: 'ruleId parameter is required'
          }
        },
        { status: 400 }
      );
    }

    const deleted = alertingSystem.removeAlertRule(ruleId);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RULE_NOT_FOUND',
            message: 'Alert rule not found'
          }
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Alert rule deleted successfully',
        ruleId
      },
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'X-Processing-Time': `${Date.now() - startTime}ms`
        }
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Alert rule deletion failed:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete alert rule'
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