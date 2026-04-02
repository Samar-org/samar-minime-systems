#!/usr/bin/env bash
# ============================================================================
# Samar-Minime Llama Fleet — GPU Server Setup Script
# Provisions a bare GPU server with everything needed to run the fleet.
#
# Tested on: Ubuntu 22.04 LTS with NVIDIA GPUs
# Run as root or with sudo.
# ============================================================================

set -euo pipefail

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Samar-Minime Llama Fleet — Server Setup                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# ── 1. System Updates ────────────────────────────────────────────────────────
echo "[1/8] Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y \
  build-essential \
  curl \
  wget \
  git \
  htop \
  nvtop \
  tmux \
  jq \
  unzip \
  ca-certificates \
  gnupg \
  lsb-release

# ── 2. NVIDIA Drivers + CUDA ────────────────────────────────────────────────
echo "[2/8] Installing NVIDIA drivers and CUDA toolkit..."

if ! command -v nvidia-smi &>/dev/null; then
  # Add NVIDIA package repository
  distribution=$(. /etc/os-release; echo "$ID$VERSION_ID")
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
  curl -s -L "https://nvidia.github.io/libnvidia-container/${distribution}/libnvidia-container.list" | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

  apt-get update

  # Install drivers (this handles CUDA too)
  apt-get install -y nvidia-driver-545 nvidia-cuda-toolkit
  echo "NVIDIA drivers installed. A reboot may be required."
else
  echo "NVIDIA drivers already installed:"
  nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
fi

# ── 3. NVIDIA Container Toolkit ─────────────────────────────────────────────
echo "[3/8] Installing NVIDIA Container Toolkit..."
apt-get install -y nvidia-container-toolkit
nvidia-ctk runtime configure --runtime=docker || true

# ── 4. Docker ────────────────────────────────────────────────────────────────
echo "[4/8] Installing Docker..."

if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  # Add current user to docker group
  usermod -aG docker "${SUDO_USER:-$USER}" || true
else
  echo "Docker already installed: $(docker --version)"
fi

# Verify GPU access in Docker
echo "Verifying GPU access in Docker..."
docker run --rm --gpus all nvidia/cuda:12.3.2-base-ubuntu22.04 nvidia-smi || {
  echo "WARNING: GPU access in Docker failed. Reboot and re-run this script."
}

# ── 5. Docker Compose ───────────────────────────────────────────────────────
echo "[5/8] Installing Docker Compose..."

if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null; then
  COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
  curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
else
  echo "Docker Compose already installed"
fi

# ── 6. Pre-pull vLLM Image ──────────────────────────────────────────────────
echo "[6/8] Pulling vLLM Docker image (this may take a while)..."
docker pull vllm/vllm-openai:v0.6.6

# ── 7. DCGM Exporter (GPU Metrics for Prometheus) ───────────────────────────
echo "[7/8] Setting up DCGM GPU metrics exporter..."
docker pull nvcr.io/nvidia/k8s/dcgm-exporter:3.3.5-3.4.0-ubuntu22.04

# Create systemd service for GPU metrics
cat > /etc/systemd/system/dcgm-exporter.service << 'DCGM_EOF'
[Unit]
Description=NVIDIA DCGM Exporter
After=docker.service
Requires=docker.service

[Service]
Restart=always
RestartSec=5
ExecStartPre=-/usr/bin/docker rm -f dcgm-exporter
ExecStart=/usr/bin/docker run --rm \
  --name dcgm-exporter \
  --gpus all \
  --cap-add SYS_ADMIN \
  -p 9400:9400 \
  nvcr.io/nvidia/k8s/dcgm-exporter:3.3.5-3.4.0-ubuntu22.04

[Install]
WantedBy=multi-user.target
DCGM_EOF

systemctl daemon-reload
systemctl enable dcgm-exporter
systemctl start dcgm-exporter || echo "DCGM exporter will start after reboot with GPU access"

# ── 8. Firewall ──────────────────────────────────────────────────────────────
echo "[8/8] Configuring firewall..."

if command -v ufw &>/dev/null; then
  ufw allow 22/tcp     # SSH
  ufw allow 80/tcp     # HTTP
  ufw allow 443/tcp    # HTTPS
  ufw allow 8080/tcp   # Llama API
  ufw allow 9090/tcp   # Prometheus
  ufw allow 3002/tcp   # Grafana
  # Block direct vLLM access from outside
  ufw deny 8000/tcp
  ufw deny 8001/tcp
  echo "Firewall rules configured"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Setup Complete!                                            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Next steps:                                                ║"
echo "║  1. Reboot if NVIDIA drivers were just installed            ║"
echo "║  2. cd /path/to/samar-minime-systems/infra/llama-fleet     ║"
echo "║  3. cp .env.example .env && edit .env                      ║"
echo "║  4. ./scripts/start-fleet.sh                                ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# GPU Info
echo ""
echo "GPU Information:"
nvidia-smi --query-gpu=index,name,memory.total,driver_version --format=csv,noheader 2>/dev/null || echo "Run nvidia-smi after reboot"
