#!/bin/bash
# ============================================================================
# Migrate PostgreSQL data from Google Cloud SQL to local Docker Postgres
# ============================================================================
# Run this script ONCE on the VPS after starting the new docker-compose stack.
#
# Prerequisites:
#   1. The new docker-compose stack is running (postgres + api)
#   2. The Google Cloud SQL instance is still reachable
#
# Usage:
#   chmod +x migrate-from-gcloud.sh
#   ./migrate-from-gcloud.sh
# ============================================================================

set -euo pipefail

# --- Google Cloud SQL (source) ---
GCLOUD_HOST="34.155.14.93"
GCLOUD_PORT="5432"
GCLOUD_USER="postgres"
GCLOUD_PASS="Haccp2026StrongPass"
GCLOUD_DB="postgres"

# --- Local Docker Postgres (target) ---
LOCAL_CONTAINER="haccp-postgres"
LOCAL_USER="haccp"
LOCAL_DB="haccp_prod"

DUMP_FILE="/tmp/gcloud_haccp_dump.sql"

echo "============================================"
echo "  HACCP DB Migration: Google Cloud → Local"
echo "============================================"
echo ""

# Step 1: Dump from Google Cloud SQL
echo "[1/4] Dumping data from Google Cloud SQL at ${GCLOUD_HOST}..."
PGPASSWORD="${GCLOUD_PASS}" pg_dump \
  -h "${GCLOUD_HOST}" \
  -p "${GCLOUD_PORT}" \
  -U "${GCLOUD_USER}" \
  -d "${GCLOUD_DB}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  -F p \
  -f "${DUMP_FILE}"

echo "   ✓ Dump completed: ${DUMP_FILE} ($(du -h ${DUMP_FILE} | cut -f1))"
echo ""

# Step 2: Ensure local Postgres is running and healthy
echo "[2/4] Checking local Postgres container..."
if ! docker exec "${LOCAL_CONTAINER}" pg_isready -U "${LOCAL_USER}" -d "${LOCAL_DB}" > /dev/null 2>&1; then
  echo "   ✗ Local Postgres is not ready. Start docker-compose first:"
  echo "     docker compose -f docker-compose.prod.yml up -d postgres"
  exit 1
fi
echo "   ✓ Local Postgres is healthy"
echo ""

# Step 3: Import into local Postgres
echo "[3/4] Importing data into local Postgres..."
docker exec -i "${LOCAL_CONTAINER}" psql -U "${LOCAL_USER}" -d "${LOCAL_DB}" < "${DUMP_FILE}"
echo "   ✓ Import completed"
echo ""

# Step 4: Verify
echo "[4/4] Verifying data..."
TABLES=$(docker exec "${LOCAL_CONTAINER}" psql -U "${LOCAL_USER}" -d "${LOCAL_DB}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
USERS=$(docker exec "${LOCAL_CONTAINER}" psql -U "${LOCAL_USER}" -d "${LOCAL_DB}" -t -c "SELECT count(*) FROM \"User\";" 2>/dev/null || echo "0")

echo "   Tables found: ${TABLES}"
echo "   Users found:  ${USERS}"
echo ""

# Cleanup
rm -f "${DUMP_FILE}"

echo "============================================"
echo "  Migration complete!"
echo ""
echo "  Next steps:"
echo "  1. Verify the app works with local DB"
echo "  2. Update DNS/firewall if needed"
echo "  3. Stop/delete Google Cloud SQL instance"
echo "     to stop the billing"
echo "============================================"
