#!/bin/bash

# Session 2.5 QA - API Endpoint Testing Script

BASE_URL="http://localhost:4000"

echo "======================================"
echo "ToastyKey API QA Test Suite"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_count=0
pass_count=0
fail_count=0

# Function to test endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4

  test_count=$((test_count + 1))
  echo -n "[$test_count] Testing $description... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  status_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
    echo -e "${GREEN}PASS${NC} (HTTP $status_code)"
    pass_count=$((pass_count + 1))
    if [ -n "$body" ]; then
      echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    fi
  else
    echo -e "${RED}FAIL${NC} (HTTP $status_code)"
    fail_count=$((fail_count + 1))
    echo "Response: $body"
  fi
  echo ""
}

# Health Check
echo "===== Health Check ====="
test_endpoint "GET" "/api/health" "" "Health check"

# Stats API
echo "===== Stats API ====="
test_endpoint "GET" "/api/stats" "" "Overview stats"
test_endpoint "GET" "/api/stats/daily?days=30" "" "Daily spend (30 days)"
test_endpoint "GET" "/api/stats/providers" "" "Provider breakdown"
test_endpoint "GET" "/api/stats/tangible" "" "Tangible outputs"
test_endpoint "GET" "/api/stats/calls?limit=5" "" "Recent API calls (limit 5)"

# Projects API
echo "===== Projects API ====="
test_endpoint "GET" "/api/projects" "" "All projects"

# Vault API
echo "===== Vault API ====="
test_endpoint "GET" "/api/vault/keys" "" "List all keys"

# Test adding a key (use timestamp for unique label)
echo "===== Vault API - Add Key ====="
TIMESTAMP=$(date +%s)
test_endpoint "POST" "/api/vault/keys" \
  "{\"provider\":\"openai\",\"label\":\"qa-test-$TIMESTAMP\",\"key\":\"sk-qatest123456789\"}" \
  "Add test key with unique label"

# Get keys again to verify
test_endpoint "GET" "/api/vault/keys" "" "List keys (after add)"

# Test import-env
echo "===== Vault API - Import .env ====="
test_endpoint "POST" "/api/vault/import-env" \
  '{"content":"OPENAI_API_KEY=sk-test111\nANTHROPIC_API_KEY=sk-ant-test222"}' \
  "Import .env content"

# Budgets API
echo "===== Budgets API ====="
test_endpoint "GET" "/api/budgets" "" "List budgets"

echo "===== Budgets API - Create Budget ====="
test_endpoint "POST" "/api/budgets" \
  '{"scope":"global","period":"month","limit_amount":5000}' \
  "Create global monthly budget"

test_endpoint "GET" "/api/budgets" "" "List budgets (after create)"

# Setup API
echo "===== Setup API ====="
test_endpoint "GET" "/api/setup/status" "" "Setup status"

# Summary
echo "======================================"
echo "Test Summary"
echo "======================================"
echo "Total tests: $test_count"
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
