#!/usr/bin/env bash
# ============================================================================
# Samar-Minime Llama Fleet — Stop Script
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLEET_DIR="$(dirname "$SCRIPT_DIR")"

cd "$FLEET_DIR"

echo "[*] Stopping Llama Fleet..."
docker compose --profile heavy --profile production down

echo "[*] Llama Fleet stopped"
echo ""
echo "To remove all data (model cache, Redis, metrics):"
echo "  docker compose --profile heavy down -v"
