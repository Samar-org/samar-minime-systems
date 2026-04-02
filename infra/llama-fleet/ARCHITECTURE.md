# Samar-Minime Llama Worker Fleet — Architecture & Operations Guide

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SAMAR-MINIME SYSTEMS                            │
│                                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐               │
│  │  Temporal     │   │  API Server  │   │  Dashboard   │               │
│  │  Workflows    │   │  (Fastify)   │   │  (Next.js)   │               │
│  └──────┬───────┘   └──────┬───────┘   └──────────────┘               │
│         │                   │                                           │
│  ┌──────▼───────────────────▼──────────────────────┐               │
│  │              Agent Runtime (TypeScript)              │               │
│  │  ┌─────────────────────────────────────────────┐    │               │
│  │  │            Model Router                      │    │               │
│  │  │  UTILITY → Llama 8B (fleet) → GPT-3.5       │    │               │
│  │  │  BUILDER → Llama 70B (fleet) → GPT-4o-mini  │    │               │
│  │  │  DIRECTOR → GPT-4o / Claude Sonnet           │    │               │
│  │  │  SPECIALIST → Claude Opus / o1               │    │               │
│  │  └──────────┬──────────────────────┬────────────┘    │               │
│  └─────────────┼──────────────────────┼─────────────────┘               │
│                │                      │                                  │
└────────────────┼──────────────────────┼──────────────────────────────────┘
                 │                      │
    ┌────────────▼──────────┐  ┌───────▼────────────────┐
    │  LLAMA FLEET (GPU)    │  │  EXTERNAL APIs          │
    │                       │  │  ┌─────────────────┐    │
    │  ┌─────────────────┐  │  │  │  OpenAI API     │    │
    │  │  Nginx (TLS)    │  │  │  └─────────────────┘    │
    │  └────────┬────────┘  │  │  ┌─────────────────┐    │
    │  ┌────────▼────────┐  │  │  │  Anthropic API  │    │
    │  │  Fleet API      │  │  │  └─────────────────┘    │
    │  │  (FastAPI)      │  │  └─────────────────────────┘
    │  │  - Auth         │  │
    │  │  - Rate limit   │  │
    │  │  - Batching     │  │
    │  │  - Metrics      │  │
    │  └──┬──────────┬───┘  │
    │     │          │      │
    │  ┌──▼───┐  ┌──▼───┐  │
    │  │vLLM  │  │vLLM  │  │
    │  │8B    │  │70B   │  │
    │  │GPU 0 │  │GPU1-4│  │
    │  └──────┘  └──────┘  │
    │                       │
    │  ┌─────────────────┐  │
    │  │  Task Worker    │  │
    │  │  (async queue)  │  │
    │  └─────────────────┘  │
    │                       │
    │  ┌─────────────────┐  │
    │  │  Redis          │  │
    │  │  (queue+cache)  │  │
    │  └─────────────────┘  │
    │                       │
    │  ┌─────────────────┐  │
    │  │ Prometheus      │  │
    │  │ + Grafana       │  │
    │  └─────────────────┘  │
    └───────────────────────┘
```

## 2. Request Flow

### Synchronous (real-time inference)
```
Agent → ModelRouter.route() → LlamaFleetAdapter.complete()
  → Fleet API Gateway (/v1/chat/completions)
    → Rate limit check (Redis)
    → Batch queue (collects requests for 50ms window)
    → vLLM backend (GPU inference)
    → Response → Cost tracking → Return to agent
```

### Asynchronous (bulk tasks)
```
Agent → LlamaFleetAdapter.submitAsync()
  → Fleet API Gateway (/v1/tasks/submit)
    → Redis queue (llama:tasks:pending)
    → Task Worker picks up
    → Calls /v1/chat/completions internally
    → Stores result in Redis
    → Agent polls /v1/tasks/{id} → Gets result
```

### Fallback Chain
```
1. Fleet API (vLLM) — primary, $0/token
2. Ollama (local) — fallback for dev
3. OpenAI API — escalation if both fail
```

## 3. Cost Analysis

### Self-Hosted vs API Pricing

| Model | Self-Hosted (per 1M tokens) | API Price (per 1M tokens) | Savings |
|-------|---------------------------|---------------------------|----------|
| Llama 3.1 8B | $0.00* | GPT-3.5: $0.50 input / $1.50 output | 100% |
| Llama 3.1 70B | $0.00* | GPT-4o-mini: $0.15 input / $0.60 output | 100% |
| Llama 3.1 70B | $0.00* | GPT-4o: $2.50 input / $10.00 output | 100% |

*Infrastructure cost amortized separately (see below)

### GPU Server Costs

| Provider | Instance | GPUs | Cost/hr | Cost/mo (730hr) | Best For |
|----------|----------|------|---------|------------------|----------|
| **Lambda** | gpu_4x_a100 | 4x A100 80GB | $5.20 | $3,796 | Best value |
| **RunPod** | A100-80G x4 | 4x A100 80GB | $7.44 | $5,431 | Flexible |
| **Paperspace** | A100-80G x4 | 4x A100 80GB | $12.40 | $9,052 | Easy setup |
| **GCP** | a2-highgpu-4g | 4x A100 40GB | $14.69 | $10,724 | Enterprise |
| **AWS** | p4d.24xlarge | 8x A100 40GB | $32.77 | $23,922 | Enterprise |

### Break-Even Analysis

At Lambda pricing ($5.20/hr = $0.0014/sec):

**Llama 8B replacing GPT-3.5-Turbo ($2.00/M combined tokens):**
- Fleet processes ~100 tokens/sec
- Cost per 1M tokens = $0.0014/sec × 10,000 sec = $14.00 in compute
- Wait — that's per-request serial. With batching (32 concurrent):
- Effective cost = $14.00 / 32 = **$0.44 per 1M tokens**
- **Saves 78% vs GPT-3.5** at >500K tokens/day

**Llama 70B replacing GPT-4o ($12.50/M combined tokens):**
- Fleet processes ~30 tokens/sec per request
- With batching (8 concurrent on 4x A100):
- Effective cost = $14.00 × 33.3 / 8 = **$5.83 per 1M tokens**
- **Saves 53% vs GPT-4o** at >200K tokens/day

### When Self-Hosting Makes Sense

| Monthly Token Volume | Recommended | Why |
|---------------------|-------------|-----|
| < 10M tokens | Use APIs | Infrastructure overhead not worth it |
| 10M - 100M tokens | Single GPU (8B) | ~$150/mo saves $500-2000 vs API |
| 100M - 1B tokens | 4x A100 (8B+70B) | ~$4K/mo saves $10K-50K vs API |
| > 1B tokens | Multi-node cluster | Massive savings, predictable costs |

## 4. Infrastructure Tiers

### Tier 1: Development (Local)
- **Hardware:** Any machine with Docker
- **GPU:** None required (uses Ollama CPU mode)
- **Run:** `ollama serve` + point `LLAMA_BASE_URL` at it
- **Cost:** $0
- **Throughput:** ~5 tokens/sec (CPU), ~30 tok/s (consumer GPU)

### Tier 2: Single GPU (Starter Production)
- **Hardware:** 1x A10G (24GB) or 1x RTX 4090 (24GB)
- **Models:** Llama 3.1 8B only
- **Cost:** ~$150-400/mo (cloud) or ~$2000 one-time (own hardware)
- **Throughput:** ~60-80 tok/s per request, ~15-20 concurrent

### Tier 3: Multi-GPU (Full Production)
- **Hardware:** 4x A100 80GB
- **Models:** Llama 3.1 8B + 70B (quantized)
- **Cost:** ~$4,000-5,500/mo (cloud)
- **Throughput:** 8B: ~120 tok/s, 70B: ~30 tok/s, 50+ concurrent

### Tier 4: Multi-Node (Enterprise Scale)
- **Hardware:** 2-4 servers, each with 4-8x A100
- **Models:** 8B + 70B (full precision) + potential 405B
- **Cost:** ~$15,000-25,000/mo
- **Throughput:** Hundreds of concurrent requests
- **Load balancing:** Nginx upstream or Kubernetes ingress

## 5. Scaling Strategy

### Horizontal Scaling
```yaml
# Add more vLLM instances in docker-compose.yml:
vllm-8b-replica-2:
  image: vllm/vllm-openai:v0.6.6
  command: [--model=meta-llama/Llama-3.1-8B-Instruct, --port=8002, ...]
  environment:
    CUDA_VISIBLE_DEVICES: "1"  # Use second GPU

# Update API Gateway upstream:
MODEL_TO_BACKEND = {
    "llama-3.1-8b": ["http://vllm-8b:8000", "http://vllm-8b-2:8002"],
}
```

### Auto-Scaling (Kubernetes)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vllm-8b-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vllm-8b
  minReplicas: 1
  maxReplicas: 8
  metrics:
    - type: Pods
      pods:
        metric:
          name: llama_fleet_active_requests
        target:
          type: AverageValue
          averageValue: "10"
```

### Queue-Based Scaling
The async task queue naturally handles load spikes:
1. Burst of tasks → fills Redis queue
2. Workers process at GPU throughput rate
3. No dropped requests, just increased latency
4. Add more worker replicas for parallelism

## 6. Integration with Samar-Minime

### Model Router Priority (cost-optimized)
The `ModelRouter` sorts candidates by cost. With fleet models at $0/token:

```
UTILITY tier request:
  1. llama-3.1-8b (fleet) → $0.00  ← SELECTED
  2. gpt-3.5-turbo        → $2.00/M

BUILDER tier request:
  1. llama-3.1-70b (fleet) → $0.00  ← SELECTED
  2. gpt-4o-mini           → $0.75/M
```

Fleet models are always chosen first because `costPerInputToken + costPerOutputToken = 0`.

### Provider Setup in Agent Runtime
```typescript
import { LlamaFleetAdapter, OpenAIAdapter, ClaudeAdapter } from '@samar/providers';

const providers = new Map();

// Fleet adapter (primary for Llama models)
if (config.LLAMA_FLEET_ENABLED) {
  providers.set('llama', new LlamaFleetAdapter({
    fleetUrl: config.LLAMA_FLEET_URL,
    fleetApiKey: config.LLAMA_FLEET_API_KEY,
    ollamaUrl: config.LLAMA_BASE_URL,  // fallback
  }));
} else {
  providers.set('llama', new LlamaAdapter(config.LLAMA_BASE_URL));
}

providers.set('openai', new OpenAIAdapter(config.OPENAI_API_KEY));
providers.set('anthropic', new ClaudeAdapter(config.ANTHROPIC_API_KEY));

const runtime = new AgentRuntime({ router, providers });
```

### Temporal Workflow Integration
The `executeAgentTask` activity in Temporal already goes through `AgentRuntime → ModelRouter → ProviderAdapter`. No workflow changes needed — just set `LLAMA_FLEET_ENABLED=true` and the router automatically prefers fleet models.

For bulk tasks (e.g., generating 50 ad variations), the workflow can use the async queue:

```typescript
// In a Temporal activity:
const fleet = providers.get('llama') as LlamaFleetAdapter;

// Submit all tasks in parallel
const taskIds = await Promise.all(
  variations.map(v => fleet.submitAsync({
    model: 'llama-3.1-8b',
    messages: [{ role: 'user', content: v.prompt }],
    maxTokens: 512,
  }))
);

// Wait for all results
const results = await Promise.all(
  taskIds.map(t => fleet.waitForTask(t.taskId))
);
```

## 7. Monitoring

### Key Metrics (Prometheus)

| Metric | What It Measures | Alert Threshold |
|--------|-----------------|----------|
| `llama_fleet_requests_total` | Total requests by model and status | Error rate > 5% |
| `llama_fleet_request_latency_seconds` | End-to-end latency | P99 > 30s |
| `llama_fleet_tokens_total` | Tokens processed | N/A (billing) |
| `llama_fleet_active_requests` | In-flight requests | > 80% of max_num_seqs |
| `llama_fleet_queue_depth` | Pending queue tasks | > 100 |
| `llama_fleet_batch_size` | Requests per batch | Avg < 2 (not batching) |
| `vllm:gpu_cache_usage_perc` | KV cache utilization | > 95% |
| `vllm:num_requests_running` | Active vLLM requests | > max_num_seqs × 0.9 |

### Grafana Dashboard Access
```
URL:      http://your-server:3002
Login:    admin / (GRAFANA_PASSWORD from .env)
```

### GPU Monitoring
```bash
# Real-time GPU stats
nvidia-smi dmon -s pucvmet -d 5

# Or use nvtop for interactive view
nvtop
```

## 8. Security Checklist

- [ ] Change default API keys in `.env`
- [ ] Enable TLS via Nginx (`--profile production`)
- [ ] Restrict vLLM ports (8000, 8001) to internal network only
- [ ] Set up IP allowlisting in Nginx if public-facing
- [ ] Rotate API keys periodically
- [ ] Enable Redis AUTH if exposed
- [ ] Review firewall rules (`ufw status`)
- [ ] Set up log rotation for Docker containers

## 9. Troubleshooting

### vLLM won't start
```bash
# Check GPU access
nvidia-smi

# Check Docker GPU access
docker run --rm --gpus all nvidia/cuda:12.3.2-base-ubuntu22.04 nvidia-smi

# Check vLLM logs
docker compose logs vllm-8b --tail 100

# Common issues:
# - CUDA version mismatch → update nvidia-driver
# - OOM → reduce --max-model-len or --max-num-seqs
# - HF token invalid → check HF_TOKEN in .env
```

### High latency
```bash
# Check GPU utilization
nvidia-smi dmon -s pucvmet -d 1

# Check batch sizes
curl http://localhost:8080/metrics | grep batch_size

# If GPU util < 50% → increase max_num_seqs
# If GPU util > 95% → reduce concurrent requests or add GPU
```

### Out of memory
```bash
# Reduce model parameters:
# In docker-compose.yml:
--max-model-len=4096        # Reduce from 8192
--max-num-seqs=64           # Reduce from 256
--gpu-memory-utilization=0.85  # Reduce from 0.90
```