#!/bin/bash
# ============================================================================
# GitHub Actions CI/CD Verification Script
# ============================================================================
# This script helps verify your CI/CD setup is working correctly
# Usage: bash verify-cicd.sh
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}========== $1 ==========${NC}\n"
}

check_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

# ============================================================================
# Check 1: Git Repository Setup
# ============================================================================
print_header "CHECK 1: Git Repository Setup"

if git rev-parse --git-dir > /dev/null 2>&1; then
    check_pass "Git repository initialized"
else
    check_fail "Git repository not initialized"
    echo "       Run: git init"
fi

if git remote -v | grep -q origin; then
    REMOTE_URL=$(git remote get-url origin)
    check_pass "Git remote configured: $REMOTE_URL"
else
    check_fail "Git remote not configured"
    echo "       Run: git remote add origin <url>"
fi

if git config user.name > /dev/null 2>&1; then
    USERNAME=$(git config user.name)
    check_pass "Git user configured: $USERNAME"
else
    check_fail "Git user not configured"
    echo "       Run: git config user.name 'Your Name'"
fi

# ============================================================================
# Check 2: Workflow Files
# ============================================================================
print_header "CHECK 2: Workflow Files"

WORKFLOWS=(
    ".github/workflows/ci.yml"
    ".github/workflows/deploy-staging.yml"
    ".github/workflows/deploy-production.yml"
    ".github/workflows/migrations.yml"
    ".github/workflows/security.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
    if [ -f "$workflow" ]; then
        check_pass "Workflow file exists: $workflow"
        
        # Check if valid YAML
        if python3 -c "import yaml; yaml.safe_load(open('$workflow'))" 2>/dev/null; then
            check_pass "  └─ Valid YAML syntax"
        else
            check_warn "  └─ YAML syntax might have issues"
        fi
    else
        check_fail "Workflow file missing: $workflow"
    fi
done

# ============================================================================
# Check 3: Required Configuration Files
# ============================================================================
print_header "CHECK 3: Configuration Files"

CONFIG_FILES=(
    ".env.example"
    "Dockerfile"
    "docker-compose.yml"
    "k8s/deployment.yaml"
    "k8s/README.md"
)

for config in "${CONFIG_FILES[@]}"; do
    if [ -f "$config" ]; then
        check_pass "Config file exists: $config"
    else
        check_fail "Config file missing: $config"
    fi
done

# ============================================================================
# Check 4: Git Status
# ============================================================================
print_header "CHECK 4: Git Status"

if [ -z "$(git status --porcelain)" ]; then
    check_pass "Working directory is clean"
else
    check_warn "Uncommitted changes found"
    echo "       Run: git status"
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
check_pass "Current branch: $BRANCH"

# ============================================================================
# Check 5: Node/NPM
# ============================================================================
print_header "CHECK 5: Node/NPM Setup"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js installed: $NODE_VERSION"
else
    check_fail "Node.js not found"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm installed: $NPM_VERSION"
else
    check_fail "npm not found"
fi

if [ -f "package.json" ]; then
    check_pass "package.json exists"
else
    check_fail "package.json missing"
fi

if [ -f "package-lock.json" ] || [ -f "pnpm-lock.yaml" ] || [ -f "yarn.lock" ]; then
    check_pass "Lockfile exists"
else
    check_warn "No lockfile found (package-lock.json, pnpm-lock.yaml, or yarn.lock)"
fi

# ============================================================================
# Check 6: Docker
# ============================================================================
print_header "CHECK 6: Docker Setup"

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    check_pass "Docker installed: $DOCKER_VERSION"
else
    check_warn "Docker not installed (optional for local testing)"
fi

if command -v docker-compose &> /dev/null; then
    check_pass "docker-compose installed"
elif docker compose version &> /dev/null; then
    check_pass "docker compose (v2) installed"
else
    check_warn "docker-compose not installed (optional for local testing)"
fi

# ============================================================================
# Check 7: Environment Variables
# ============================================================================
print_header "CHECK 7: Environment Variables"

if [ -f ".env" ]; then
    check_pass ".env file exists"
    
    # Check for required variables
    REQUIRED_VARS=(
        "NODE_ENV"
        "DATABASE_URL"
        "JWT_SECRET"
        "PORT"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" .env; then
            check_pass "  └─ $var is configured"
        else
            check_warn "  └─ $var not found in .env"
        fi
    done
else
    check_warn ".env file not found"
    echo "       Run: cp .env.example .env"
fi

# ============================================================================
# Check 8: Prisma / Database
# ============================================================================
print_header "CHECK 8: Prisma Setup"

if [ -f "prisma/schema.prisma" ]; then
    check_pass "Prisma schema exists"
else
    check_fail "Prisma schema missing"
fi

if [ -d "prisma/migrations" ]; then
    MIGRATION_COUNT=$(find prisma/migrations -name "migration.sql" | wc -l)
    check_pass "Prisma migrations directory found ($MIGRATION_COUNT migrations)"
else
    check_warn "No migrations directory found"
fi

# ============================================================================
# Check 9: Build & Dependencies
# ============================================================================
print_header "CHECK 9: Build & Dependencies"

if [ -d "node_modules" ]; then
    check_pass "node_modules installed"
else
    check_warn "node_modules not installed"
    echo "       Run: npm install"
fi

if [ -f "tsconfig.json" ]; then
    check_pass "TypeScript configuration found"
else
    check_fail "tsconfig.json missing"
fi

# Try to build
if command -v npm &> /dev/null; then
    echo "       Testing build..."
    if npm run build --silent 2>/dev/null; then
        check_pass "Application builds successfully"
    else
        check_warn "Build failed (check dependencies or fix errors)"
    fi
fi

# ============================================================================
# Check 10: Git Remote Commands (Dry Run)
# ============================================================================
print_header "CHECK 10: Git Commands Verification"

if git rev-parse --verify main^{commit} &>/dev/null; then
    check_pass "Main branch exists (can push to main)"
else
    check_warn "Main branch doesn't exist yet"
fi

if git rev-parse --verify develop^{commit} &>/dev/null; then
    check_pass "Develop branch exists (can push to develop)"
else
    check_warn "Develop branch doesn't exist yet"
fi

# ============================================================================
# Summary
# ============================================================================
print_header "SUMMARY"

TOTAL=$((CHECKS_PASSED + CHECKS_FAILED))

echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
echo -e "${RED}Failed: $CHECKS_FAILED${NC}"
echo -e "Total:  $TOTAL"

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All checks passed! You're ready to push to GitHub.${NC}\n"
    
    cat << 'EOF'
Next steps to setup CI/CD:

1. Push code to GitHub
   git push -u origin main
   git push -u origin develop

2. Go to GitHub repository and add secrets:
   Settings → Secrets and variables → Actions
   
   Required:
   - SNYK_TOKEN
   - KUBE_CONFIG_STAGING
   - DATABASE_URL_STAGING
   - KUBE_CONFIG_PRODUCTION
   - DATABASE_URL_PRODUCTION

3. Create environments (Settings → Environments):
   - staging (no protection)
   - production (require 1-2 approvers)

4. Setup branch protection (Settings → Branches):
   - Require PR reviews
   - Require status checks
   - Require signed commits (optional)

5. Test the CI pipeline:
   git checkout -b feature/test-ci
   git push -u origin feature/test-ci
   # Create PR and watch CI run

6. Test staging deployment:
   git checkout develop
   git merge feature/test-ci
   git push origin develop
   # Watch staging deployment in Actions

See GITHUB_SETUP.md for detailed instructions!
EOF
    
    exit 0
else
    echo -e "\n${RED}❌ Some checks failed. Please fix the issues above.${NC}\n"
    exit 1
fi
