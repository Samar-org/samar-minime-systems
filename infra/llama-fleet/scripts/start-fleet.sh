#!/usr/bin/env bash
# ============================================================================
# Samar-Minime Llama Fleet — Start Script
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLEET_DIR="$(dirname "$SCRIPT_DIR")"

cd "$FLEET_DIR"

# ── Load .env ────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy .env.example to .env and configure it."
  exit 1
fi

source .env

# ── Detect GPU Configuration ────────────────────────────────────────────────
GPU_COUNT=$(nvidia-smi --query-gpu=count --format=csv,noheader | head -1 2>/dev/null || echo "0")
GPU_MEMORY=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -1 2>/dev/null || echo "0")

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Samar-Minime Llama Fleet — Starting                       ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  GPUs detected: ${GPU_COUNT}"
echo "║  GPU memory: ${GPU_MEMORY} MiB per GPU"
echo "╚══════════════════════════════════════════════════════════════╝"

# ── Create SSL certs for Nginx (self-signed, dev only) ───────────────────────
if [ ! -f nginx/ssl/cert.pem ]; then
  echo "[*] Generating self-signed SSL certificates..."
  mkdir -p nginx/ssl
  openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/CN=llama-fleet.local"
fi

# ── Determine profile ───────────────────────────────────────────────────────
PROFILE_FLAG=""
TOTAL_GPU_MEM=$((GPU_COUNT * GPU_MEMORY))

if [ "$TOTAL_GPU_MEM" -ge 160000 ]; then
  # 4x A100 80GB = 320GB — can run both 8B + 70B
  echo "[*] Sufficient GPU memory for 8B + 70B models"
  PROFILE_FLAG="--profile heavy"
elif [ "$TOTAL_GPU_MEM" -ge 80000 ]; then
  # 1x A100 80GB or 2x A100 40GB — can run 70B quantized
  echo "[*] Sufficient GPU memory for 70B quantized model"
  PROFILE_FLAG="--profile heavy"
elif [ "$GPU_MEMORY" -ge 16000 ]; then
  # Single 24GB+ GPU — 8B only
  echo "[*] Running 8B model only (insufficient memory for 70B)"
  PROFILE_FLAG=""
else
  echo "WARNING: GPU memory too low. Minimum 16GB recommended for 8B model."
  echo "Proceeding anyway..."
fi

# ── Pre-download models (if HF_TOKEN set) ────────────────────────────────────
if [ -n "${HF_TOKEN:-}" ]; then
  echo "[*] HF_TOKEN detected — models will be downloaded on first start"
fi

# ── Start Services ───────────────────────────────────────────────────────────
echo "[*] Starting core services (Redis + vLLM 8B + API + Worker + Monitoring)..."

docker compose up -d redis
echo "[*] Waiting for Redis..."
sleep 3

docker compose up -d vllm-8b
echo "[*] vLLM 8B starting (model download may take 5-10 minutes on first run)..."

# Wait for vLLM to be healthy
echo "[*] Waiting for vLLM 8B to load model..."
RETRIES=0
MAX_RETRIES=60
until docker compose exec vllm-8b curl -sf http://localhost:8000/health > /dev/null 2>&1; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: vLLM 8B failed to start within ${MAX_RETRIES} attempts"
    echo "Check logs: docker compose logs vllm-8b"
    exit 1
  fi
  echo "  Waiting... (${RETRIES}/${MAX_RETRIES})"
  sleep 10
done
echo "[*] vLLM 8B is healthy!"

# Start remaining services
docker compose $PROFILE_FLAG up -d llama-api llama-worker prometheus grafana

if [ -n "$PROFILE_FLAG" ]; then
  echo "[*] Starting vLLM 70B (heavy profile)..."
  docker compose --profile heavy up -d vllm-70b
fi

# ── Health Check ─────────────────────────────────────────────────────────────
echo ""
echo "[*] Waiting for API gateway..."
sleep 5

API_HEALTH=$(curl -sf http://localhost:8080/health 2>/dev/null || echo '{"status":"starting"}')

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Llama Fleet is running!                                    ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  API Gateway:    http://localhost:8080                      ║"
echo "║  vLLM 8B:        http://localhost:8000                      ║"
echo "║  vLLM 70B:       http://localhost:8001 (if heavy profile)   ║"
echo "║  Prometheus:      http://localhost:9090                      ║"
echo "║  Grafana:         http://localhost:3002 (admin/admin)        ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Health: ${API_HEALTH}"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Test it:                                                   ║"
echo "║  curl http://localhost:8080/v1/chat/completions \\           ║"
echo "║    -H 'Content-Type: application/json' \\                    ║"
echo "║    -H 'Authorization: Bearer YOUR_API_KEY' \\                ║"
echo "║    -d '{                                                    ║"
echo '║      "model": "llama-3.1-8b",                              ║'
echo '║      "messages": [{"role":"user","content":"Hello!"}]       ║'
echo "║    }'                                                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
