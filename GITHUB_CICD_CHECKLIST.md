# ✅ GitHub Actions CI/CD - Quick Start Checklist

## 📋 Complete This Checklist to Enable CI/CD

Follow this in order. Each section takes 5-15 minutes.

---

## Phase 1: GitHub Account & Repository (10 minutes)

### ✓ Step 1: Create GitHub Repository
- [ ] Create new repository on github.com
  - Name: `haccp-api` (or similar)
  - Visibility: Private (for production)
  - Do NOT initialize with README (we have one)
- [ ] Copy repository URL (HTTPS or SSH)

### ✓ Step 2: Initialize Git Locally

**For Windows (PowerShell):**
```powershell
cd "c:\Users\pc\HACCP APP\haccp-api"

# Configure git user (one time)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/haccp-api.git

# Create main branch and push
git add .
git commit -m "feat: initial commit with production-ready setup"
git branch -M main
git push -u origin main

# Create develop branch
git checkout -b develop
git push -u origin develop
```

**For Mac/Linux:**
```bash
cd ~/path/to/haccp-api

# Configure git user
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Add remote
git remote add origin git@github.com:YOUR_USERNAME/haccp-api.git

# Create main branch and push
git add .
git commit -m "feat: initial commit with production-ready setup"
git branch -M main
git push -u origin main

# Create develop branch
git checkout -b develop
git push -u origin develop
```

**Verify:**
```bash
git remote -v
# Should show: origin https://github.com/YOUR_USERNAME/haccp-api.git
```

- [ ] Both `main` and `develop` branches pushed to GitHub

---

## Phase 2: GitHub Secrets Configuration (15 minutes)

Go to: **GitHub Repository → Settings → Secrets and variables → Actions**

### ✓ Step 3: Add Essential Secrets

Click "New repository secret" and add these one by one:

#### Secret #1: SNYK_TOKEN (REQUIRED for CI)
```
1. Go to https://app.snyk.io/account/
2. Click "Auth Tokens" on left
3. Copy your token
4. Paste in GitHub as SNYK_TOKEN
```
- [ ] `SNYK_TOKEN` added

#### Secret #2: KUBE_CONFIG_STAGING (for staging deployment)
```
IF you have a Kubernetes staging cluster:

# Encode your kubeconfig in base64:
# Windows PowerShell:
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content ~/.kube/config-staging -Raw))) | Set-Clipboard

# Mac/Linux:
cat ~/.kube/config-staging | base64 -w 0

# Paste the output as KUBE_CONFIG_STAGING in GitHub
```
- [ ] `KUBE_CONFIG_STAGING` added (or skip if no staging cluster yet)

#### Secret #3: DATABASE_URL_STAGING
```
PostgreSQL connection string for staging:
postgresql://username:password@hostname:5432/database?schema=public

Example:
postgresql://postgres:mypassword@staging-db.example.com:5432/haccp_db?schema=public
```
- [ ] `DATABASE_URL_STAGING` added

#### Secret #4: KUBE_CONFIG_PRODUCTION
```
Same as KUBE_CONFIG_STAGING but for production cluster
```
- [ ] `KUBE_CONFIG_PRODUCTION` added

#### Secret #5: DATABASE_URL_PRODUCTION
```
PostgreSQL connection string for production
postgresql://username:password@hostname:5432/database?schema=public
```
- [ ] `DATABASE_URL_PRODUCTION` added

#### Secret #6-#7: Optional but Recommended

**SENTRY_AUTH_TOKEN** (for error tracking)
```
1. Go to https://sentry.io/settings/account/api/
2. Create auth token with:
   - project:write
   - org:read
3. Paste in GitHub
```
- [ ] `SENTRY_AUTH_TOKEN` added (optional)

**SENTRY_ORG** (your Sentry organization name)
- [ ] `SENTRY_ORG` added (optional)

**SLACK_WEBHOOK_URL** (for deployment notifications)
```
1. Go to https://api.slack.com/apps
2. Create new app
3. Enable Incoming Webhooks
4. Create webhook for your channel
5. Copy webhook URL to GitHub
```
- [ ] `SLACK_WEBHOOK_URL` added (optional)

---

## Phase 3: Create GitHub Environments (10 minutes)

Go to: **GitHub Repository → Settings → Environments**

### ✓ Step 4: Create Staging Environment

1. Click **New environment**
2. Name: `staging`
3. **Don't add** restrictions (auto-deploy)
4. Click **Configure environment**
5. Add these secrets:
   - `DATABASE_URL_STAGING`
   - `KUBE_CONFIG_STAGING`
6. Click **Save protection rules**

- [ ] `staging` environment created

### ✓ Step 5: Create Production Environment

1. Click **New environment**
2. Name: `production`
3. Add restrictions:
   - ✅ Check "Required reviewers"
   - Set value: 1 (or 2 for higher security)
   - ✅ Check "Wait timer" (set to 15 minutes)
4. Click **Configure environment**
5. Add these secrets:
   - `DATABASE_URL_PRODUCTION`
   - `KUBE_CONFIG_PRODUCTION`
6. Click **Save protection rules**

- [ ] `production` environment created with approval gating

---

## Phase 4: Branch Protection Rules (10 minutes)

Go to: **GitHub Repository → Settings → Branches**

### ✓ Step 6: Protect Main Branch

1. Click **Add rule**
2. Pattern: `main`
3. Configure:
   - ✅ Require pull request reviews before merging
     - Set: 1 (number of approvals)
   - ✅ Require status checks to pass
     - Select: `CI Pipeline / lint`
     - Select: `CI Pipeline / test`
     - Select: `CI Pipeline / build`
   - ✅ Require branches to be up to date
   - ✅ Include administrators
4. Click **Create**

- [ ] `main` branch protected

### ✓ Step 7: Protect Develop Branch (Optional)

1. Click **Add rule**
2. Pattern: `develop`
3. Configure:
   - ✅ Require status checks to pass
     - Select: `CI Pipeline / lint`
     - Select: `CI Pipeline / test`
4. Click **Create**

- [ ] `develop` branch protected (optional)

---

## Phase 5: Test CI Pipeline (15 minutes)

### ✓ Step 8: Create Test Feature Branch

```bash
cd "c:\Users\pc\HACCP APP\haccp-api"

# Create and push test branch
git checkout -b feature/test-ci
git push -u origin feature/test-ci
```

- [ ] Test branch created and pushed

### ✓ Step 9: Create Pull Request

1. Go to GitHub → Pull requests
2. Click **New pull request**
3. Base: `develop`, Compare: `feature/test-ci`
4. Title: "Test CI Pipeline"
5. Description: "Testing GitHub Actions workflows"
6. Click **Create pull request**

- [ ] Pull request created

### ✓ Step 10: Monitor CI Execution

1. Scroll to "Checks" section
2. Wait for jobs to run (usually 3-5 minutes):
   - ✅ lint
   - ✅ test
   - ✅ build
   - ✅ security
   - ✅ docker (builds image)
3. Click each to see details if anything fails

Look for:
- Green ✅ marks = Success
- Red ❌ marks = Failed (click to see error)
- Yellow ⏳ = Still running

**Common issues:**
- `npm packages not found` → need to run `npm install` locally
- `TypeScript errors` → run `npm run build` locally to see
- `Test failures` → run `npm test` locally to debug

- [ ] CI pipeline completed successfully (all checks green)

### ✓ Step 11: Merge PR to Develop

Once CI passes:
1. Click **Merge pull request**
2. Click **Confirm merge**

This triggers the staging deployment automatically!

- [ ] PR merged to develop

### ✓ Step 12: Monitor Staging Deployment (Optional)

Go to: **Actions** tab → **Deploy to Staging**

You should see a new run starting. It will:
1. Build Docker image
2. Push to repository
3. Deploy to Kubernetes staging
4. Run smoke tests
5. Send Slack notification

- [ ] Staging deployment complete (optional, only if staging configured)

---

## Phase 6: Test Production Deployment (20 minutes)

### ✓ Step 13: Create Release PR

```bash
# Create release branch
git checkout -b release/v0.1.0 develop
git push -u origin release/v0.1.0
```

1. Go to GitHub → Pull requests → New
2. Base: `main`, Compare: `release/v0.1.0`
3. Title: "Release v0.1.0"
4. Description:
   ```
   Production release with:
   - Health checks
   - Pino logging
   - Sentry monitoring
   - Docker & Kubernetes support
   - GitHub Actions CI/CD
   ```
5. Create PR

- [ ] Release PR created

### ✓ Step 14: Request Review & Merge

1. Assign reviewers (team members)
2. Wait for approval from all reviewers
3. Once approved, click **Merge pull request**

- [ ] PR merged to main

### ✓ Step 15: Approve Production Deployment

Go to: **Actions** tab → **Deploy to Production**

You should see a run waiting for review:

1. Click the waiting deployment
2. Click **Review deployments**
3. Select reviewers (you or team)
4. Comment (optional): "Approved"
5. Click **Approve and deploy**

This will:
1. Build and push Docker image
2. Deploy to production Kubernetes
3. Run migrations
4. Run smoke tests
5. Create GitHub release
6. Send notifications

- [ ] Production deployment approved and running

### ✓ Step 16: Verify Production

```bash
# Check if API is live
curl https://api.yourdomain.com/health

# Check Sentry release (if configured)
# Go to: https://sentry.io/releases/
# Should see new release appear
```

- [ ] Production verified and working

---

## Final Verification

### ✓ Checklist Summary

- [ ] GitHub repository created
- [ ] Git initialized locally with main + develop branches
- [ ] All required secrets added (at minimum: SNYK_TOKEN)
- [ ] Staging environment created
- [ ] Production environment created
- [ ] Branch protection rules set on main
- [ ] Test CI workflow passed on feature branch
- [ ] Staging deployment tested (if applicable)
- [ ] Production deployment tested (if applicable)
- [ ] All team members can approve deployments

---

## 🚀 You're Ready!

Your CI/CD pipeline is now active. From here:

### Daily Workflow:
```bash
# 1. Create feature branch
git checkout -b feature/my-feature develop

# 2. Make changes
# ... code ...
git add .
git commit -m "feat: my feature"
git push -u origin feature/my-feature

# 3. Create PR on GitHub
# - CI automatically runs tests
# - Request review when ready
# - Merge after approval

# 4. Deploys automatically:
# - To staging (on merge to develop)
# - To production (on merge to main, with approval)
```

### Monitor Deployments:
- GitHub Actions tab for real-time status
- Sentry dashboard for errors
- Slack for notifications
- kubectl for Kubernetes status

---

## 📚 Documentation

- **Detailed Setup:** [GITHUB_SETUP.md](GITHUB_SETUP.md)
- **Production Ready:** [PRODUCTION_READY.md](PRODUCTION_READY.md)
- **Workflows:** [.github/workflows/README.md](.github/workflows/README.md)
- **Kubernetes:** [k8s/README.md](k8s/README.md)

---

## 🆘 Troubleshooting

### "Workflows not showing"
```bash
# Make sure main.yml, develop, etc. are pushed
git log --oneline | head
# Should show recent commits

# Check workflows folder
ls -la .github/workflows/
```

### "CI failing"
1. Click the failed workflow in Actions tab
2. Click the failed job
3. Read error message
4. Fix locally: `npm run build`, `npm test`
5. Push fix: `git push`
6. CI automatically re-runs

### "Deployment stuck waiting"
1. Go to Actions → Deploy to Production
2. Click the waiting run
3. Click "Review deployments"
4. Select yourself as reviewer
5. Click "Approve and deploy"

### "Secrets not working"
1. Verify secret name matches workflow file
2. Recheck secret value is correct
3. Go to secret settings, copy again
4. Paste carefully (no extra spaces)

---

## ✅ Success!

When everything is working:
- PRs trigger CI automatically
- Staging deploys automatically on develop
- Production deploys on manual approval on main
- Errors go to Sentry
- Notifications go to Slack
- You can rollback instantly if needed

**You now have enterprise-grade CI/CD!** 🎉
