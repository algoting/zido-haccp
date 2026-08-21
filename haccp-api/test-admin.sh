#!/bin/bash
# Test admin endpoints

# Step 1: Login as admin
echo "=== LOGIN ==="
LOGIN_RESULT=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"shiftup01@gmail.com","password":"Lesucre3107("}')
echo "$LOGIN_RESULT" | head -c 200
echo ""

TOKEN=$(echo "$LOGIN_RESULT" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "TOKEN: ${TOKEN:0:30}..."

# Step 2: Create establishment
echo ""
echo "=== CREATE ESTABLISHMENT ==="
EST_RESULT=$(curl -s -X POST http://localhost:3000/admin/establishments \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Restaurant Test","ownerEmail":"owner@test.com","ownerPassword":"Test1234!","activateSubscription":true}')
echo "$EST_RESULT"

# Extract establishment ID
EST_ID=$(echo "$EST_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Establishment ID: $EST_ID"

# Step 3: Create staff user for that establishment
echo ""
echo "=== CREATE STAFF USER ==="
if [ -n "$EST_ID" ]; then
  curl -s -X POST http://localhost:3000/admin/users \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"email\":\"staff@test.com\",\"password\":\"Staff1234!\",\"role\":\"STAFF\",\"establishmentId\":\"$EST_ID\"}"
  echo ""
else
  echo "Skipped - no establishment ID"
fi

echo ""
echo "=== DONE ==="
