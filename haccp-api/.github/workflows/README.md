# ============================================================================
# GitHub Actions - Setup Instructions
# ============================================================================

## Required Secrets

Configure these secrets in GitHub repository settings:
**Settings → Secrets and variables → Actions → New repository secret**

### Required for all workflows
- `SNYK_TOKEN` - Snyk API token for security scanning
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications (optional)

### Required for Staging deployment
- `KUBE_CONFIG_STAGING` - Base64-encoded kubeconfig for staging cluster
- `DATABASE_URL_STAGING` - PostgreSQL connection string for staging

### Required for Production deployment
- `KUBE_CONFIG_PRODUCTION` - Base64-encoded kubeconfig for production cluster
- `DATABASE_URL_PRODUCTION` - PostgreSQL connection string for production

### Required for Sentry integration
- `SENTRY_AUTH_TOKEN` - Sentry authentication token
- `SENTRY_ORG` - Sentry organization name

### Optional
- `GITLEAKS_LICENSE` - Gitleaks license key (for commercial use)
- `EMAIL_USERNAME` - Email username for failure notifications
- `EMAIL_PASSWORD` - Email password for failure notifications
- `CODECOV_TOKEN` - Codecov token for coverage reports

## Environment Configuration

### 1. Create Environments

Go to **Settings → Environments** and create:

#### Staging Environment
- Name: `staging`
- Protection rules: None (auto-deploy)
- Environment secrets: Same as repository secrets
- Deployment branches: `develop`

#### Production Environment
- Name: `production`
- Protection rules:
  - ✅ Required reviewers (at least 1-2 people)
  - ✅ Wait timer: 15 minutes (optional)
- Environment secrets: Same as repository secrets  
- Deployment branches: `main` only

### 2. Configure Kubernetes Access

#### Generate base64-encoded kubeconfig:
```bash
# For staging
cat ~/.kube/config-staging | base64 -w 0 > kube-config-staging-base64.txt

# For production
cat ~/.kube/config-production | base64 -w 0 > kube-config-production-base64.txt
```

Copy contents and add as secrets:
- `KUBE_CONFIG_STAGING`
- `KUBE_CONFIG_PRODUCTION`

### 3. Configure Branch Protection

Go to **Settings → Branches → Add rule**

#### For `main` branch:
- ✅ Require pull request reviews before merging (2 approvals)
- ✅ Require status checks to pass before merging
  - CI Pipeline / lint
  - CI Pipeline / test
  - CI Pipeline / build
  - CI Pipeline / security
- ✅ Require conversation resolution before merging
- ✅ Require signed commits
- ✅ Include administrators

#### For `develop` branch:
- ✅ Require status checks to pass before merging
  - CI Pipeline / lint
  - CI Pipeline / test
- ✅ Require conversation resolution before merging

## Workflow Descriptions

### 1. **ci.yml** - Continuous Integration
- **Triggers:** Push/PR to main/develop
- **Jobs:** Lint, test, build, security scan, docker build
- **Duration:** ~5-10 minutes

### 2. **deploy-staging.yml** - Deploy to Staging
- **Triggers:** Push to develop
- **Jobs:** Build, push image, deploy to K8s, run migrations, smoke tests
- **Duration:** ~8-15 minutes

### 3. **deploy-production.yml** - Deploy to Production
- **Triggers:** Push to main, manual workflow dispatch
- **Jobs:** Build, push image, deploy to K8s with approval, migrations, smoke tests
- **Duration:** ~10-20 minutes (plus approval time)

### 4. **migrations.yml** - Database Migrations
- **Triggers:** Manual only
- **Jobs:** Run Prisma migrations with dry-run option
- **Duration:** ~2-5 minutes

### 5. **security.yml** - Security Scanning
- **Triggers:** Daily at 2 AM UTC, PRs, manual
- **Jobs:** Dependency scan, CodeQL, Docker scan, secret scan
- **Duration:** ~10-15 minutes

## Usage Examples

### Deploy to Staging
```bash
# Merge/push to develop branch
git checkout develop
git merge feature/my-feature
git push origin develop
# Automatic deployment starts
```

### Deploy to Production
```bash
# Option 1: Push to main (requires PR)
git checkout main
git merge develop
git push origin main
# Deployment starts after approval

# Option 2: Manual trigger with version
# Go to Actions → Deploy to Production → Run workflow
# Enter version: v1.2.3
```

### Run Migrations
```bash
# Go to Actions → Run Database Migrations → Run workflow
# Select environment: staging or production
# Dry-run: true (preview) or false (execute)
```

### View Deployment Status
```bash
# Check Actions tab in GitHub
# Monitor in real-time
# View logs for any job
```

## Notifications

### Slack Setup
1. Create Slack app: https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Add webhook URL to GitHub secrets as `SLACK_WEBHOOK_URL`

### Email Setup
Configure email secrets:
- `EMAIL_USERNAME`: SMTP username
- `EMAIL_PASSWORD`: SMTP password

## Monitoring

### View Metrics
- GitHub Actions dashboard
- Sentry releases
- Kubernetes dashboard
- Application logs via kubectl

### Rollback
```bash
# Via GitHub UI
# Go to failed deployment → Re-run jobs → Previous version

# Via kubectl
kubectl rollout undo deployment/haccp-api -n haccp-app
```

## Best Practices

1. **Always test in staging first**
2. **Use semantic versioning for releases**
3. **Review and approve production deployments**
4. **Monitor deployment metrics**
5. **Keep secrets rotated regularly**
6. **Run security scans before major releases**
7. **Document all deployment changes**
8. **Have rollback plan ready**

## Troubleshooting

### Deployment fails
- Check pod logs: `kubectl logs -f deployment/haccp-api -n haccp-app`
- Check events: `kubectl get events -n haccp-app`
- Verify secrets are set correctly
- Check health endpoint

### Migrations fail
- Check database connectivity
- Verify DATABASE_URL is correct
- Check migration files for errors
- Rollback if needed: `npx prisma migrate resolve --rolled-back MIGRATION_NAME`

### Security scan fails
- Review security report in Actions
- Update vulnerable dependencies
- Fix identified issues
- Re-run scan

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Sentry Releases](https://docs.sentry.io/product/releases/)
