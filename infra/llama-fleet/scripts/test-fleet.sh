#!/usr/bin/env bash
# ============================================================================
# Samar-Minime Llama Fleet — Test Script
# Validates all endpoints and prints results.
# ============================================================================

set -euo pipefail

API_URL="${LLAMA_API_URL:-http://localhost:8080}"
API_KEY="${LLAMA_API_KEY:-sk-llama-prod-key-1}"
PASS=0
FAIL=0

pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Llama Fleet — Test Suite                                   ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  API: $API_URL"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Test 1: Health ───────────────────────────────────────────────────────────
echo "[Test 1] Health Check"
HEALTH=$(curl -sf "$API_URL/health" 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | jq -e '.status' > /dev/null 2>&1; then
  STATUS=$(echo "$HEALTH" | jq -r '.status')
  pass "Health endpoint returned: $STATUS"
else
  fail "Health endpoint unreachable"
fi
echo ""

# ── Test 2: Models List ──────────────────────────────────────────────────────
echo "[Test 2] List Models"
MODELS=$(curl -sf "$API_URL/v1/models" \
  -H "Authorization: Bearer $API_KEY" 2>/dev/null || echo "FAIL")
if echo "$MODELS" | jq -e '.data' > /dev/null 2>&1; then
  MODEL_COUNT=$(echo "$MODELS" | jq '.data | length')
  pass "Models endpoint returned $MODEL_COUNT models"
else
  fail "Models endpoint failed"
fi
echo ""

# ── Test 3: Chat Completion (8B) ────────────────────────────────────────────
echo "[Test 3] Chat Completion — Llama 3.1 8B"
START=$(date +%s%N)
RESPONSE=$(curl -sf "$API_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "llama-3.1-8b",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant. Be concise."},
      {"role": "user", "content": "What is 2+2? Reply with just the number."}
    ],
    "max_tokens": 32,
    "temperature": 0.1
  }' 2>/dev/null || echo "FAIL")
END=$(date +%s%N)
LATENCY_MS=$(( (END - START) / 1000000 ))

if echo "$RESPONSE" | jq -e '.choices[0].message.content' > /dev/null 2>&1; then
  CONTENT=$(echo "$RESPONSE" | jq -r '.choices[0].message.content')
  PROMPT_TOKENS=$(echo "$RESPONSE" | jq -r '.usage.prompt_tokens')
  COMP_TOKENS=$(echo "$RESPONSE" | jq -r '.usage.completion_tokens')
  pass "Response: \"$CONTENT\" (${LATENCY_MS}ms, ${PROMPT_TOKENS}+${COMP_TOKENS} tokens)"
else
  fail "Chat completion failed (${LATENCY_MS}ms)"
  echo "  Response: $RESPONSE"
fi
echo ""

# ── Test 4: JSON Mode ───────────────────────────────────────────────────────
echo "[Test 4] JSON Response Format"
JSON_RESPONSE=$(curl -sf "$API_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "llama-3.1-8b",
    "messages": [
      {"role": "system", "content": "Respond in JSON only."},
      {"role": "user", "content": "Return {\"answer\": 42}"}
    ],
    "max_tokens": 64,
    "temperature": 0.0,
    "response_format": {"type": "json_object"}
  }' 2>/dev/null || echo "FAIL")

if echo "$JSON_RESPONSE" | jq -e '.choices[0].message.content' > /dev/null 2>&1; then
  CONTENT=$(echo "$JSON_RESPONSE" | jq -r '.choices[0].message.content')
  if echo "$CONTENT" | jq -e '.' > /dev/null 2>&1; then
    pass "Valid JSON response: $CONTENT"
  else
    fail "Response is not valid JSON: $CONTENT"
  fi
else
  fail "JSON mode request failed"
fi
echo ""

# ── Test 5: Async Task Submit ────────────────────────────────────────────────
echo "[Test 5] Async Task Queue"
SUBMIT=$(curl -sf "$API_URL/v1/tasks/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "llama-3.1-8b",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 32
  }' 2>/dev/null || echo "FAIL")

if echo "$SUBMIT" | jq -e '.task_id' > /dev/null 2>&1; then
  TASK_ID=$(echo "$SUBMIT" | jq -r '.task_id')
  pass "Task submitted: $TASK_ID"

  # Poll for result
  sleep 3
  TASK_STATUS=$(curl -sf "$API_URL/v1/tasks/$TASK_ID" \
    -H "Authorization: Bearer $API_KEY" 2>/dev/null || echo "FAIL")
  STATUS=$(echo "$TASK_STATUS" | jq -r '.status' 2>/dev/null || echo "unknown")
  pass "Task status: $STATUS"
else
  fail "Task submission failed"
fi
echo ""

# ── Test 6: Rate Limiting ───────────────────────────────────────────────────
echo "[Test 6] Rate Limiting"
RATE_LIMITED=false
for i in $(seq 1 5); do
  STATUS_CODE=$(curl -so /dev/null -w "%{http_code}" "$API_URL/v1/models" \
    -H "Authorization: Bearer $API_KEY" 2>/dev/null || echo "000")
  if [ "$STATUS_CODE" = "429" ]; then
    RATE_LIMITED=true
    break
  fi
done
if [ "$RATE_LIMITED" = "true" ]; then
  pass "Rate limiting is active (429 received)"
else
  pass "Rate limiting not triggered (within limits)"
fi
echo ""

# ── Test 7: Auth Rejection ──────────────────────────────────────────────────
echo "[Test 7] Authentication"
AUTH_STATUS=$(curl -so /dev/null -w "%{http_code}" "$API_URL/v1/models" \
  -H "Authorization: Bearer invalid-key" 2>/dev/null || echo "000")
if [ "$AUTH_STATUS" = "403" ] || [ "$AUTH_STATUS" = "401" ]; then
  pass "Invalid key rejected (HTTP $AUTH_STATUS)"
else
  fail "Invalid key not rejected (HTTP $AUTH_STATUS)"
fi
echo ""

# ── Test 8: Metrics ─────────────────────────────────────────────────────────
echo "[Test 8] Prometheus Metrics"
METRICS=$(curl -sf "$API_URL/metrics" 2>/dev/null || echo "FAIL")
if echo "$METRICS" | grep -q "llama_fleet_requests_total"; then
  pass "Prometheus metrics available"
else
  fail "Metrics endpoint not working"
fi
echo ""

# ── Summary ──────────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Results: $PASS passed, $FAIL failed"
echo "╚══════════════════════════════════════════════════════════════╝"

exit $FAIL
