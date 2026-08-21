# 🔧 GitHub Actions CI/CD Setup & Configuration Guide

## Prerequisites

Before you start, you need:
- GitHub account with repository access
- Repository with write permissions
- Understanding of your deployment targets (staging, production)

---

## Part 1: Initial GitHub Repository Setup

### Step 1.1: Initialize Git Repository (if not already done)

```bash
cd c:\Users\pc\HACCP\ APP\haccp-api

# Initialize git if needed
git init

# Configure git user
git config user.name "Your Name"
git config user.email "you@example.com"

# Or globally (applies to all repos)
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Verify configuration
git config --list | grep user
```

### Step 1.2: Add Remote Repository

```bash
# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# Or if using SSH (recommended)
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPOSITORY.git

# Verify
git remote -v
# Should show:
# origin  https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git (fetch)
# origin  https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git (push)
```

### Step 1.3: Create Initial Commit and Push

```bash
# Add all files
git add .

# Create commit
git commit -m "feat: add production-readiness improvements

- Add health check endpoints
- Configure Pino logging
- Integrate Sentry monitoring
- Document environment variables
- Add Docker configuration
- Add Kubernetes manifests
- Set up GitHub Actions CI/CD"

# Create develop branch
git checkout -b develop

# Push to GitHub
git push -u origin main
git push -u origin develop
```

---

## Part 2: GitHub Secrets Configuration

### Step 2.1: Navigate to GitHub Secrets

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### Step 2.2: Add Required Secrets

Add these secrets one by one:

#### Essential Secrets (Required for CI to work):

**`SNYK_TOKEN`** - For security scanning
```
Get from: https://app.snyk.io/account/
1. Sign up at Snyk
2. Go to Account Settings
3. Copy API Token
4. Paste in GitHub secret
```

#### Staging Deployment Secrets:

**`KUBE_CONFIG_STAGING`** - Kubernetes config (base64 encoded)
```bash
# If you have a staging kubeconfig file:
cat ~/.kube/config-staging | base64 -w 0

# Copy output and paste into GitHub secret
# If you don't have staging yet, skip for now
```

**`DATABASE_URL_STAGING`** - PostgreSQL connection string
```
postgresql://username:password@hostname:5432/database?schema=public

# Example:
postgresql://postgres:mysecurepass@postgres-staging.example.com:5432/haccp_db?schema=public
```

#### Production Deployment Secrets:

**`KUBE_CONFIG_PRODUCTION`** - Kubernetes config (base64 encoded)
```bash
# Similar to staging:
cat ~/.kube/config-production | base64 -w 0
```

**`DATABASE_URL_PRODUCTION`** - Production database URL
```
postgresql://username:password@hostname:5432/database?schema=public
```

#### Sentry Secrets (Optional but recommended):

**`SENTRY_AUTH_TOKEN`**
```
Get from: https://sentry.io/settings/account/api/auth-tokens/
1. Go to Sentry dashboard
2. Settings → Auth Tokens
3. Create new token with 'project:write' and 'org:read' scopes
4. Copy and paste
```

**`SENTRY_ORG`**
```
Your Sentry organization name
```

#### Notifications (Optional):

**`SLACK_WEBHOOK_URL`**
```bash
# Get from: https://api.slack.com/apps
1. Create new Slack app
2. Enable Incoming Webhooks
3. Create new webhook
4. Copy webhook URL
5. Paste in GitHub secret
```

---

## Part 3: GitHub Environments Configuration

### Step 3.1: Create Staging Environment

1. Go to **Settings** → **Environments**
2. Click **New environment**
3. Name it: `staging`
4. **Don't add** protection rules (auto-deploy)
5. Click **Configure environment**
6. Add secrets (copy from repository secrets above):
   - `DATABASE_URL_STAGING`
   - `KUBE_CONFIG_STAGING`
7. Save

### Step 3.2: Create Production Environment

1. Click **New environment**
2. Name it: `production`
3. **Add protection rules:**
   - ✅ Enable "Required reviewers"
   - Set to 1-2 people who can approve deployments
   - ✅ Enable "Wait timer" (optional, 15 minutes recommended)
4. Click **Configure environment**
5. Add secrets:
   - `DATABASE_URL_PRODUCTION`
   - `KUBE_CONFIG_PRODUCTION`
6. Save

---

## Part 4: Branch Protection Rules

### Step 4.1: Protect Main Branch

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Branch name pattern: `main`
4. Configure:
   - ✅ **Require pull request reviews before merging** (1 approval)
   - ✅ **Require status checks to pass:**
     - `CI Pipeline / lint`
     - `CI Pipeline / test`
     - `CI Pipeline / build`
     - `CI Pipeline / security`
   - ✅ **Require conversation resolution before merging**
   - ✅ **Require signed commits** (optional but recommended)
   - ✅ **Include administrators** (so admins follow same rules)
5. Click **Create**

### Step 4.2: Protect Develop Branch (Optional)

1. Click **Add rule**
2. Branch name pattern: `develop`
3. Configure:
   - ✅ **Require status checks to pass:**
     - `CI Pipeline / lint`
     - `CI Pipeline / test`
   - ✅ **Require conversation resolution before merging**
4. Click **Create**

---

## Part 5: Verify Workflows Are Enabled

### Step 5.1: Check Workflow Files

All workflow files should be in `.github/workflows/`:
- ✅ `ci.yml`
- ✅ `deploy-staging.yml`
- ✅ `deploy-production.yml`
- ✅ `migrations.yml`
- ✅ `security.yml`

### Step 5.2: Enable Workflows

1. Go to **Actions** tab in GitHub
2. You should see all 5 workflows listed
3. If any are disabled, click them and enable
4. Status should show "Active"

---

## Part 6: Test the CI Pipeline

### Step 6.1: Create a Feature Branch and PR

```bash
# Create and push feature branch
git checkout -b feature/test-ci
git add .
git commit -m "test: verify ci pipeline works"
git push -u origin feature/test-ci
```

### Step 6.2: Create Pull Request

1. Go to GitHub → Your Repository
2. Click **Pull requests**
3. Click **New pull request**
4. Base: `develop`, Compare: `feature/test-ci`
5. Click **Create pull request**
6. Add title: "Test CI Pipeline"
7. Add description: "Testing GitHub Actions workflows"

### Step 6.3: Monitor CI Run

1. Scroll down to see "Checks" section
2. You should see CI Pipeline starting to run
3. Watch for these jobs:
   - `lint` - Should pass
   - `test` - Should pass
   - `build` - Should pass
   - `security` - Should pass
   - `docker` - Should pass

### Step 6.4: Check Detailed Logs

For each job:
1. Click job name to expand
2. Click step to see detailed output
3. Look for any errors or warnings

---

## Part 7: Test Deployment to Staging

### Step 7.1: Merge to Develop

```bash
# After CI passes on the PR:
# Go to GitHub PR page
# Click "Approve" (if you have permissions)
# Click "Merge pull request"
# Click "Confirm merge"
```

Or merge locally:
```bash
git checkout develop
git pull origin develop
git merge feature/test-ci
git push origin develop
```

### Step 7.2: Monitor Staging Deployment

1. Go to **Actions** tab
2. Click **Deploy to Staging** workflow
3. You should see a new run starting
4. Watch for:
   - Build: Docker image building
   - Push: Image pushed to registry
   - Deploy: Kubernetes deployment updating
   - Smoke tests: Health checks running
   - Notifications: Slack message (if configured)

### Step 7.3: Verify Staging Deployment

```bash
# Check if API is running
curl https://api-staging.yourdomain.com/health

# Check pod status
kubectl get pods -n haccp-app-staging

# View logs
kubectl logs -f deployment/haccp-api -n haccp-app-staging
```

---

## Part 8: Test Deployment to Production

### Step 8.1: Merge to Main

```bash
# Create PR from develop to main
git checkout -b release/v0.1.0

# On GitHub:
# 1. Go to Pull requests
# 2. New pull request
# 3. Base: main, Compare: develop
# 4. Create PR
# 5. Wait for CI to pass
# 6. Request review from team member
# 7. After approval, click Merge
```

### Step 8.2: Approve Production Deployment

1. Go to **Actions** tab
2. Click **Deploy to Production** workflow
3. You should see a run waiting for review
4. Click the waiting deployment
5. Click **Review deployments**
6. Select reviewers
7. Add comment (optional): "Approved for production"
8. Click **Approve and deploy**

### Step 8.3: Monitor Production Deployment

1. Watch job progress in Actions
2. You should see:
   - Build and push image
   - Deploy to Kubernetes production
   - Run migrations
   - Smoke tests
   - Create release
   - Send notifications

### Step 8.4: Verify Production

```bash
# Check if API is running
curl https://api.yourdomain.com/health

# Check logs
kubectl logs -f deployment/haccp-api -n haccp-app

# Check Sentry release
# Go to Sentry → Releases
# Should see new release listed
```

---

## Part 9: Troubleshooting CI/CD Issues

### Issue: "Workflows not running"

**Solution:**
```bash
# Make sure workflows are enabled
# GitHub → Actions → Enable workflows

# Check .github/workflows/ files exist
ls -la .github/workflows/

# Push to trigger workflow
git push
```

### Issue: "Secrets not found"

**Solution:**
```bash
# Verify secrets are added
# GitHub → Settings → Secrets → Actions

# Check workflow uses correct secret names
# Look for typos in workflow files

# Add missing secrets if needed
```

### Issue: "Status checks not appearing"

**Solution:**
```bash
# Wait for workflow to run (usually 2-5 minutes)
# Refresh GitHub page (F5)

# Check workflow file syntax
# .github/workflows/ci.yml should be valid YAML

# View Actions tab for errors
```

### Issue: "Deployment fails"

**Solution:**
```bash
# Check GitHub Actions logs for specific error
# Click failed workflow → Click failed job → Read logs

# Common issues:
# 1. Invalid kubeconfig - verify KUBE_CONFIG_* secrets
# 2. Database connection - verify DATABASE_URL_* secrets
# 3. Docker registry - verify GitHub token has push access
# 4. Kubernetes permissions - verify service account has access

# Fix and re-run
# Go to Actions → Click failed workflow → Re-run failed jobs
```

### Issue: "Tests failing"

**Solution:**
```bash
# Run tests locally first
npm test

# Check test output in GitHub Actions
# fixture → test → scroll to see error output

# Fix tests locally
# Commit and push to update PR

# Tests will automatically re-run
```

### Issue: "Security scan failing"

**Solution:**
```bash
# View security scan results
# GitHub → Actions → Security Scanning → View details

# Check for:
# - Vulnerable dependencies (npm audit)
# - Code issues (CodeQL)
# - Secrets in code (Gitleaks)

# Fix issues and push update
# Scan will re-run automatically
```

---

## Part 10: Daily Operations

### Workflow for New Features

```bash
# 1. Create feature branch
git checkout -b feature/my-feature
git add .
git commit -m "feat: add new feature"
git push -u origin feature/my-feature

# 2. Create PR on GitHub
# - Base: develop
# - Compare: feature/my-feature
# - Wait for CI tests to pass

# 3. Request review
# - Assign reviewer
# - Wait for approval

# 4. Merge to develop
# - Click "Merge pull request"
# - Auto-deploys to staging

# 5. Verify staging
# - Check https://api-staging.yourdomain.com/health
# - Run smoke tests

# 6. Merge to main
# - Create PR from develop to main
# - Wait for CI tests
# - Get approval
# - Merge to main

# 7. Approve production deployment
# - Go to Actions → Deploy to Production
# - Wait for deployment job
# - Click "Review deployments"
# - Click "Approve and deploy"

# 8. Verify production
# - Check https://api.yourdomain.com/health
# - Monitor Sentry for errors
```

### Quick Deployment Commands

```bash
# View all workflow runs
git log --oneline --graph --all

# Trigger specific workflow (manual)
# GitHub → Actions → Workflow name → Run workflow

# Cancel running workflow
# GitHub → Actions → Running workflow → Click cancel

# Rollback deployment
# kubectl rollout undo deployment/haccp-api -n haccp-app
```

---

## Part 11: Monitoring & Alerts

### Check Workflow Status

```bash
# Via GitHub CLI (if installed)
gh workflow list

gh run list --branch main

gh run view <run-id> --log
```

### View Deployment History

```bash
# Via kubectl
kubectl rollout history deployment/haccp-api -n haccp-app

# Via Sentry
# Go to Sentry → Releases
# See all deployments and their status
```

### Monitor Logs

```bash
# IMPORTANT: Replace yourdomain.com with your actual domain

# Staging
kubectl logs -f deployment/haccp-api -n haccp-app-staging

# Production
kubectl logs -f deployment/haccp-api -n haccp-app

# With filters
kubectl logs -f deployment/haccp-api -n haccp-app --tail=100 | grep ERROR
```

---

## Part 12: Post-Setup Verification Checklist

- [ ] Git repository initialized and remote configured
- [ ] All workflow files (.github/workflows/*.yml) committed and pushed
- [ ] Repository secrets configured:
  - [ ] `SNYK_TOKEN` (for security scanning)
  - [ ] `KUBE_CONFIG_STAGING` (for staging deployment)
  - [ ] `DATABASE_URL_STAGING` (for staging DB)
  - [ ] `KUBE_CONFIG_PRODUCTION` (for production deployment)
  - [ ] `DATABASE_URL_PRODUCTION` (for production DB)
  - [ ] `SENTRY_AUTH_TOKEN` (optional, for error tracking)
  - [ ] `SLACK_WEBHOOK_URL` (optional, for notifications)
- [ ] Environments created (staging and production)
- [ ] Branch protection rules set up (main and develop)
- [ ] Workflows enabled in Actions tab
- [ ] Test PR created and CI passed
- [ ] Staging deployment tested
- [ ] Production deployment tested (if ready)
- [ ] Team members can approve deployments
- [ ] Notifications working (Slack, email)
- [ ] Monitoring configured (Sentry, kubectl)

---

## Part 13: Advanced Configuration

### GitHub CLI Setup (Optional but Recommended)

```bash
# Install GitHub CLI
# Windows: choco install gh
# Mac: brew install gh
# Linux: sudo apt install gh

# Authenticate
gh auth login
# Choose: GitHub.com
# Choose: HTTPS
# Choose: Paste authentication token

# Then you can deploy from terminal
gh workflow run deploy-production.yml -r main \
  -f version=v1.0.0
```

### Environment-Specific Customization

You can customize workflows per environment by editing:

**For Staging** (.github/workflows/deploy-staging.yml):
- Change health check URL
- Adjust smoke tests
- Different notification teams

**For Production** (.github/workflows/deploy-production.yml):
- Require multiple approvers
- Add rollback notifications
- Different alert thresholds

### Custom Deployment Scripts

If you need custom deployment logic:

```bash
# Create deployment script
mkdir -p scripts
cat > scripts/deploy.sh << 'EOF'
#!/bin/bash
set -e

ENVIRONMENT=$1
VERSION=$2

echo "Deploying $VERSION to $ENVIRONMENT"

# Custom deployment logic here
# ...

echo "✅ Deployment successful!"
EOF

chmod +x scripts/deploy.sh
```

Then call from workflow:
```yaml
- name: Custom deployment
  run: ./scripts/deploy.sh staging v1.0.0
```

---

## Part 14: Rollback Procedures

### Via GitHub Actions (Automatic)

The `deploy-production.yml` includes automatic rollback on failure. If deployment fails, it automatically reverts to previous version.

### Manual Rollback

```bash
# Check deployment history
kubectl rollout history deployment/haccp-api -n haccp-app

# Rollback to previous version
kubectl rollout undo deployment/haccp-api -n haccp-app

# Rollback to specific revision
kubectl rollout undo deployment/haccp-api -n haccp-app --to-revision=3

# Check status
kubectl rollout status deployment/haccp-api -n haccp-app
```

### Via Sentry

1. Go to Sentry → Releases
2. Find previous stable release
3. Click release
4. Click "Set as Latest Release"
5. Deploy that version

---

## 🎯 Summary: From Start to Production

1. **Setup (10 minutes)**
   - Initialize git repository
   - Push code to GitHub

2. **Configure Secrets (15 minutes)**
   - Add 7+ secrets to GitHub

3. **Setup Environments (10 minutes)**
   - Create staging and production environments
   - Add protection rules

4. **Test CI (5 minutes)**
   - Create feature branch
   - Open PR
   - Watch CI run

5. **Test Staging Deployment (10 minutes)**
   - Merge to develop
   - Watch staging deployment
   - Verify API is running

6. **Test Production Deployment (15 minutes)**
   - Merge to main
   - Approve deployment (manual)
   - Verify production is running

**Total time: ~1 hour to full setup** ✨

---

## 🆘 Support & Debugging

### Get Help

```bash
# Check GitHub Actions documentation
# https://docs.github.com/en/actions

# Check workflow logs
# GitHub → Actions → Workflow name → Run → Job name → Step output

# Test workflow locally with act
# https://github.com/nektos/act
# act -j ci
```

### Common Error Messages

| Error | Solution |
|-------|----------|
| "Secrets not found" | Add missing secrets in GitHub Settings |
| "kubectl: command not found" | Verify `KUBE_CONFIG_*` secret is set |
| "Authentication failed" | Check GitHub token has correct scopes |
| "Connection refused" | Verify database URLs in secrets |
| "Insufficient permissions" | Add reviewer role in GitHub environment |

---

## 📞 Next Steps

1. **Follow Part 1** to initialize and push code
2. **Complete Part 2** to add all GitHub secrets
3. **Setup Part 3** to create environments
4. **Apply Part 4** for branch protection
5. **Test Part 6** with a feature branch
6. **Verify Part 12** checklist before going live

**You're ready to deploy!** 🚀
