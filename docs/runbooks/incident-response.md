# Incident Response Runbook

## Overview

This runbook provides step-by-step procedures for responding to incidents in the Bangkok Destination MVP system during the 8-week validation period.

## Incident Classification

### Critical Incidents (P0)
- **Definition**: Complete service outage or severe functionality loss affecting all users
- **Examples**: API completely down, database unavailable, authentication system failure
- **Response Time**: Acknowledge within 5 minutes, begin resolution immediately
- **Escalation**: Immediate notification to all stakeholders

### High Priority Incidents (P1)
- **Definition**: Significant functionality degradation affecting many users
- **Examples**: High error rates, severe performance degradation, partial service outage
- **Response Time**: Acknowledge within 15 minutes, resolution target 1 hour
- **Escalation**: Notify technical lead and product owner within 30 minutes

### Medium Priority Incidents (P2)
- **Definition**: Moderate impact on user experience or non-critical functionality
- **Examples**: Slow response times, minor feature issues, performance warnings
- **Response Time**: Acknowledge within 1 hour, resolution target 4 hours
- **Escalation**: Include in daily standup updates

### Low Priority Incidents (P3)
- **Definition**: Minor issues with minimal user impact
- **Examples**: Cosmetic bugs, non-critical warnings, documentation issues
- **Response Time**: Acknowledge within 24 hours, resolution target 1 week
- **Escalation**: Track in backlog, address in next sprint

## Emergency Contacts

### Primary Response Team
- **Technical Lead**: [Name] - [Phone] - [Email] - [Timezone]
- **DevOps Engineer**: [Name] - [Phone] - [Email] - [Timezone]
- **Product Owner**: [Name] - [Phone] - [Email] - [Timezone]

### Escalation Contacts
- **Engineering Manager**: [Name] - [Phone] - [Email] - [Timezone]
- **CTO**: [Name] - [Phone] - [Email] - [Timezone]

### On-Call Schedule
```
Week 1: Technical Lead (Primary), DevOps Engineer (Secondary)
Week 2: DevOps Engineer (Primary), Technical Lead (Secondary)
(Rotate weekly)
```

## Critical Incident Response (P0)

### Phase 1: Detection & Initial Response (0-5 minutes)

#### 1. Alert Acknowledgment
- [ ] Acknowledge alert in monitoring system
- [ ] Post initial response in `#incident-response` Slack channel
- [ ] Start incident timer and create incident ID

**Template Message:**
```
🚨 P0 INCIDENT - [INCIDENT-ID] - [TIME]
Status: INVESTIGATING
Impact: [Brief description]
Responder: [Your name]
ETA for update: [TIME + 15 minutes]
```

#### 2. Quick Assessment
- [ ] Check health endpoint: `GET /api/health`
- [ ] Verify monitoring dashboard status
- [ ] Check recent deployments in Vercel dashboard
- [ ] Review error rates in Sentry/logs

#### 3. Immediate Actions
```bash
# Quick health check
curl -s https://[DOMAIN]/api/health | jq '.'

# Check application logs
vercel logs --app=[APP_NAME] --limit=50

# Check system status
curl -s https://[DOMAIN]/api/health?details=true
```

### Phase 2: Investigation & Diagnosis (5-20 minutes)

#### 1. System Health Analysis
- [ ] **Database Connectivity**
  ```bash
  # Test database connection
  curl -s https://[DOMAIN]/api/health | jq '.checks.database'
  ```
- [ ] **External Services**
  ```bash
  # Check external dependencies
  curl -s https://[DOMAIN]/api/health | jq '.checks.externalServices'
  ```
- [ ] **Performance Metrics**
  ```bash
  # Check API performance
  curl -s https://[DOMAIN]/api/health | jq '.checks.performance'
  ```

#### 2. Error Analysis
- [ ] Check Sentry dashboard for error spikes
- [ ] Review application logs for patterns
- [ ] Check database slow query log
- [ ] Verify external service status pages

#### 3. Deployment History
- [ ] Check recent deployments in Vercel
- [ ] Review commit history for recent changes
- [ ] Verify environment variable changes

### Phase 3: Resolution Actions (20+ minutes)

#### Database Issues
```bash
# Check database connections
curl -s https://[DOMAIN]/api/health | jq '.metrics.database.connections'

# If connection pool exhausted:
# 1. Restart application
vercel --prod redeploy

# 2. Check for slow queries
# 3. Scale database if needed
```

#### Application Performance Issues
```bash
# Check memory usage
curl -s https://[DOMAIN]/api/health | jq '.metrics.memory'

# Check error rates
curl -s https://[DOMAIN]/api/monitoring/metrics | jq '.sloCompliance.errorRate'

# If memory issues:
# 1. Restart application
# 2. Check for memory leaks in recent code
# 3. Scale instances if needed
```

#### External Service Failures
```bash
# Check external service status
curl -s https://[DOMAIN]/api/health | jq '.checks.externalServices'

# If external services down:
# 1. Enable fallback mode if available
# 2. Check service status pages
# 3. Contact service providers if needed
```

#### Deployment Issues
```bash
# Rollback to previous version
vercel --prod rollback

# Check deployment status
vercel ls

# Verify rollback success
curl -s https://[DOMAIN]/api/health
```

### Phase 4: Communication & Updates

#### Every 15 Minutes During Active Incident
```
UPDATE - [INCIDENT-ID] - [TIME]
Status: [INVESTIGATING/IDENTIFIED/RESOLVING/MONITORING]
Actions taken: [Brief summary]
Next steps: [What's being done next]
ETA for next update: [TIME + 15 minutes]
```

#### Resolution Announcement
```
✅ RESOLVED - [INCIDENT-ID] - [TIME]
Duration: [Total incident time]
Impact: [Final impact assessment]
Root cause: [Brief root cause]
Follow-up: [Any follow-up actions needed]
```

## High Priority Incident Response (P1)

### Phase 1: Initial Response (0-15 minutes)
- [ ] Acknowledge alert and create incident ticket
- [ ] Post in `#incident-response` channel
- [ ] Begin investigation using health endpoints

### Phase 2: Investigation (15-45 minutes)
- [ ] Identify affected components and user impact
- [ ] Gather relevant logs and metrics
- [ ] Determine root cause or contributing factors

### Phase 3: Resolution (45+ minutes)
- [ ] Implement fix or workaround
- [ ] Monitor recovery metrics
- [ ] Verify resolution with affected users

## Common Issue Playbooks

### High API Latency
1. **Check Performance Metrics**
   ```bash
   curl -s https://[DOMAIN]/api/health | jq '.checks.performance.apiLatency'
   ```

2. **Identify Slow Endpoints**
   ```bash
   # Check monitoring dashboard for endpoint performance
   curl -s https://[DOMAIN]/api/monitoring/metrics?timeRange=1h
   ```

3. **Resolution Steps**
   - Check database query performance
   - Review recent code changes
   - Scale infrastructure if needed
   - Enable caching for slow endpoints

### High Error Rate
1. **Identify Error Sources**
   ```bash
   # Get error summary
   curl -s https://[DOMAIN]/api/monitoring/errors?summary=true
   ```

2. **Check Error Patterns**
   - Review Sentry dashboard
   - Check application logs
   - Identify common error types

3. **Resolution Steps**
   - Fix identified bugs
   - Improve error handling
   - Add monitoring for new error patterns

### Database Connection Issues
1. **Check Connection Pool**
   ```bash
   curl -s https://[DOMAIN]/api/health | jq '.metrics.database.connections'
   ```

2. **Investigate Slow Queries**
   - Check slow query log
   - Identify problematic queries
   - Review recent database schema changes

3. **Resolution Steps**
   - Optimize slow queries
   - Increase connection pool size
   - Restart database connections

### External Service Failures
1. **Verify Service Status**
   ```bash
   curl -s https://[DOMAIN]/api/health | jq '.checks.externalServices'
   ```

2. **Check Service Dashboards**
   - Unsplash API status
   - Google Maps API status
   - Other third-party services

3. **Resolution Steps**
   - Enable fallback mode
   - Implement circuit breakers
   - Contact service providers

## Post-Incident Procedures

### Immediate Post-Resolution (0-2 hours)
- [ ] Confirm all systems are fully operational
- [ ] Update incident status in all channels
- [ ] Begin preliminary root cause analysis
- [ ] Document timeline of events

### Post-Incident Review (24-48 hours)
- [ ] Conduct blameless post-mortem meeting
- [ ] Complete detailed root cause analysis
- [ ] Identify improvement opportunities
- [ ] Create action items with owners and deadlines

### Post-Mortem Template
```markdown
# Post-Mortem: [Incident Title]

## Incident Summary
- **Date**: [Date]
- **Duration**: [Start time] - [End time] ([Total duration])
- **Severity**: [P0/P1/P2/P3]
- **Impact**: [User impact description]

## Timeline
- [Time]: [Event description]
- [Time]: [Event description]
- [Time]: [Resolution action]

## Root Cause
[Detailed root cause analysis]

## What Went Well
- [Things that worked well during response]

## What Could Be Improved
- [Areas for improvement]

## Action Items
- [ ] [Action item] - Owner: [Name] - Due: [Date]
- [ ] [Action item] - Owner: [Name] - Due: [Date]

## Lessons Learned
[Key takeaways and learnings]
```

## Monitoring & Alerting

### Key Metrics to Monitor
- **API Response Time**: P95 < 2 seconds
- **Error Rate**: < 0.5%
- **Uptime**: > 99.9%
- **Database Response Time**: < 100ms
- **Memory Usage**: < 80%
- **CPU Usage**: < 70%

### Alert Escalation Matrix
| Metric | Warning Threshold | Critical Threshold | Action |
|--------|------------------|-------------------|---------|
| API Latency P95 | > 2s | > 5s | Scale infrastructure |
| Error Rate | > 1% | > 5% | Investigate immediately |
| Memory Usage | > 80% | > 95% | Restart/scale |
| Database Response | > 100ms | > 1s | Check queries |

## Recovery Procedures

### Database Recovery
```bash
# Check database status
curl -s https://[DOMAIN]/api/health | jq '.checks.database'

# If database is down:
# 1. Check Supabase dashboard
# 2. Verify connection strings
# 3. Contact Supabase support if needed
```

### Application Recovery
```bash
# Restart application
vercel --prod redeploy

# Verify restart
curl -s https://[DOMAIN]/api/health

# Check all services
curl -s https://[DOMAIN]/api/health?details=true
```

### Data Recovery
- **Backup Location**: Supabase automated backups
- **Recovery Point Objective (RPO)**: 24 hours
- **Recovery Time Objective (RTO)**: 4 hours
- **Backup Verification**: Weekly automated tests

## Testing Procedures

### Pre-Deployment Checks
- [ ] Run health check: `curl https://[STAGING]/api/health`
- [ ] Verify all tests pass
- [ ] Check monitoring alerts are configured
- [ ] Validate backup procedures

### Incident Response Drills
- **Frequency**: Monthly
- **Scope**: Full incident response simulation
- **Duration**: 30 minutes
- **Participants**: All team members

## Tools & Resources

### Monitoring Dashboards
- **Health Dashboard**: `https://[DOMAIN]/api/health`
- **Monitoring Dashboard**: `https://[DOMAIN]/admin/monitoring`
- **Vercel Dashboard**: `https://vercel.com/dashboard`
- **Supabase Dashboard**: `https://app.supabase.com/project/[PROJECT]`

### Log Analysis
- **Application Logs**: Vercel Functions logs
- **Error Tracking**: Sentry dashboard
- **Performance Monitoring**: Built-in monitoring API

### Communication Channels
- **Primary**: #incident-response (Slack)
- **Updates**: #general (Slack)
- **Email**: incident-updates@[DOMAIN]

---

**Last Updated**: [Date]
**Version**: 1.0
**Next Review**: [Date + 1 month]