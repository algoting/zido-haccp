# ============================================================================
# GitHub Actions CI/CD Verification Script (Windows PowerShell)
# ============================================================================
# This script helps verify your CI/CD setup is working correctly
# Usage: .\verify-cicd.ps1
# ============================================================================

param(
    [switch]$Verbose
)

# Colors for output
function Write-Pass { Write-Host "✅ PASS: $args" -ForegroundColor Green }
function Write-Fail { Write-Host "❌ FAIL: $args" -ForegroundColor Red }
function Write-Warn { Write-Host "⚠️  WARN: $args" -ForegroundColor Yellow }
function Write-Header { Write-Host "`n========== $args ==========" -ForegroundColor Blue }
function Write-Info { if ($Verbose) { Write-Host "ℹ️  INFO: $args" -ForegroundColor Cyan } }

# Counters
$script:ChecksPassed = 0
$script:ChecksFailed = 0

function Check-Pass {
    param([string]$message)
    Write-Pass $message
    $script:ChecksPassed++
}

function Check-Fail {
    param([string]$message)
    Write-Fail $message
    $script:ChecksFailed++
}

function Check-Warn {
    param([string]$message)
    Write-Warn $message
}

# ============================================================================
# Check 1: Git Repository Setup
# ============================================================================
Write-Header "CHECK 1: Git Repository Setup"

try {
    $gitDir = git rev-parse --git-dir 2>$null
    if ($LASTEXITCODE -eq 0) {
        Check-Pass "Git repository initialized"
    } else {
        Check-Fail "Git repository not initialized"
        Write-Host "       Run: git init"
    }
} catch {
    Check-Fail "Git not found or error occurred"
}

try {
    $remoteUrl = git remote get-url origin 2>$null
    if ($remoteUrl) {
        Check-Pass "Git remote configured: $remoteUrl"
    } else {
        Check-Fail "Git remote not configured"
        Write-Host "       Run: git remote add origin <url>"
    }
} catch {
    Check-Fail "Cannot read git remote"
}

try {
    $gitUser = git config user.name 2>$null
    if ($gitUser) {
        Check-Pass "Git user configured: $gitUser"
    } else {
        Check-Fail "Git user not configured"
        Write-Host "       Run: git config user.name 'Your Name'"
    }
} catch {
    Check-Fail "Cannot read git user configuration"
}

# ============================================================================
# Check 2: Workflow Files
# ============================================================================
Write-Header "CHECK 2: Workflow Files"

$workflows = @(
    ".github/workflows/ci.yml",
    ".github/workflows/deploy-staging.yml",
    ".github/workflows/deploy-production.yml",
    ".github/workflows/migrations.yml",
    ".github/workflows/security.yml"
)

foreach ($workflow in $workflows) {
    if (Test-Path $workflow) {
        Check-Pass "Workflow file exists: $workflow"
        
        # Check if valid YAML (basic check)
        try {
            $content = Get-Content $workflow -Raw
            if ($content -match "^name:" -and $content -match "^on:") {
                Check-Pass "  └─ Valid YAML structure"
            } else {
                Check-Warn "  └─ YAML structure might have issues"
            }
        } catch {
            Check-Warn "  └─ Could not validate YAML"
        }
    } else {
        Check-Fail "Workflow file missing: $workflow"
    }
}

# ============================================================================
# Check 3: Required Configuration Files
# ============================================================================
Write-Header "CHECK 3: Configuration Files"

$configFiles = @(
    ".env.example",
    "Dockerfile",
    "docker-compose.yml",
    "k8s/deployment.yaml",
    "k8s/README.md"
)

foreach ($config in $configFiles) {
    if (Test-Path $config) {
        Check-Pass "Config file exists: $config"
    } else {
        Check-Fail "Config file missing: $config"
    }
}

# ============================================================================
# Check 4: Git Status
# ============================================================================
Write-Header "CHECK 4: Git Status"

try {
    $status = git status --porcelain 2>$null
    if (-not $status) {
        Check-Pass "Working directory is clean"
    } else {
        Check-Warn "Uncommitted changes found"
        Write-Host "       Run: git status"
    }
} catch {
    Check-Warn "Could not check git status"
}

try {
    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    Check-Pass "Current branch: $branch"
} catch {
    Check-Warn "Could not determine current branch"
}

# ============================================================================
# Check 5: Node/NPM
# ============================================================================
Write-Header "CHECK 5: Node/NPM Setup"

try {
    $nodeVersion = node --version
    Check-Pass "Node.js installed: $nodeVersion"
} catch {
    Check-Fail "Node.js not found"
    Write-Host "       Download from: https://nodejs.org/"
}

try {
    $npmVersion = npm --version
    Check-Pass "npm installed: $npmVersion"
} catch {
    Check-Fail "npm not found"
}

if (Test-Path "package.json") {
    Check-Pass "package.json exists"
} else {
    Check-Fail "package.json missing"
}

if ((Test-Path "package-lock.json") -or (Test-Path "pnpm-lock.yaml") -or (Test-Path "yarn.lock")) {
    Check-Pass "Lockfile exists"
} else {
    Check-Warn "No lockfile found (package-lock.json, pnpm-lock.yaml, or yarn.lock)"
}

# ============================================================================
# Check 6: Docker
# ============================================================================
Write-Header "CHECK 6: Docker Setup"

try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Check-Pass "Docker installed: $dockerVersion"
    } else {
        Check-Warn "Docker not found (optional for local testing)"
    }
} catch {
    Check-Warn "Docker not installed (optional for local testing)"
}

try {
    $composeVersion = docker-compose --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Check-Pass "docker-compose installed"
    } else {
        Check-Warn "docker-compose not found (optional for local testing)"
    }
} catch {
    Check-Warn "docker-compose not installed (optional for local testing)"
}

# ============================================================================
# Check 7: Environment Variables
# ============================================================================
Write-Header "CHECK 7: Environment Variables"

if (Test-Path ".env") {
    Check-Pass ".env file exists"
    
    $requiredVars = @("NODE_ENV", "DATABASE_URL", "JWT_SECRET", "PORT")
    
    foreach ($var in $requiredVars) {
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match "^$var=") {
            Check-Pass "  └─ $var is configured"
        } else {
            Check-Warn "  └─ $var not found in .env"
        }
    }
} else {
    Check-Warn ".env file not found"
    Write-Host "       Run: Copy-Item .env.example .env"
}

# ============================================================================
# Check 8: Prisma / Database
# ============================================================================
Write-Header "CHECK 8: Prisma Setup"

if (Test-Path "prisma/schema.prisma") {
    Check-Pass "Prisma schema exists"
} else {
    Check-Fail "Prisma schema missing"
}

if (Test-Path "prisma/migrations") {
    $migrations = (Get-ChildItem "prisma/migrations" -Recurse -Filter "migration.sql" | Measure-Object).Count
    Check-Pass "Prisma migrations directory found ($migrations migrations)"
} else {
    Check-Warn "No migrations directory found"
}

# ============================================================================
# Check 9: Build & Dependencies
# ============================================================================
Write-Header "CHECK 9: Build & Dependencies"

if (Test-Path "node_modules") {
    Check-Pass "node_modules installed"
} else {
    Check-Warn "node_modules not installed"
    Write-Host "       Run: npm install"
}

if (Test-Path "tsconfig.json") {
    Check-Pass "TypeScript configuration found"
} else {
    Check-Fail "tsconfig.json missing"
}

# ============================================================================
# Check 10: Git Remote Commands (Dry Run)
# ============================================================================
Write-Header "CHECK 10: Git Branches"

try {
    $mainExists = git rev-parse --verify main 2>$null
    if ($LASTEXITCODE -eq 0) {
        Check-Pass "Main branch exists (can push to main)"
    } else {
        Check-Warn "Main branch doesn't exist yet"
    }
} catch {
    Check-Warn "Could not verify main branch"
}

try {
    $developExists = git rev-parse --verify develop 2>$null
    if ($LASTEXITCODE -eq 0) {
        Check-Pass "Develop branch exists (can push to develop)"
    } else {
        Check-Warn "Develop branch doesn't exist yet"
    }
} catch {
    Check-Warn "Could not verify develop branch"
}

# ============================================================================
# Summary
# ============================================================================
Write-Header "SUMMARY"

$total = $script:ChecksPassed + $script:ChecksFailed

Write-Host "Passed: " -NoNewline
Write-Host $script:ChecksPassed -ForegroundColor Green
Write-Host "Failed: " -NoNewline
Write-Host $script:ChecksFailed -ForegroundColor Red
Write-Host "Total:  $total"

if ($script:ChecksFailed -eq 0) {
    Write-Host "`n✅ All checks passed! You're ready to push to GitHub.`n" -ForegroundColor Green
    
    $nextSteps = @"
Next steps to setup CI/CD:

1. Push code to GitHub:
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
"@
    Write-Host $nextSteps
    
    exit 0
} else {
    Write-Host "`n❌ Some checks failed. Please fix the issues above.`n" -ForegroundColor Red
    exit 1
}
