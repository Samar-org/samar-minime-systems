"""
Samar-Minime Llama Fleet — API Gateway
OpenAI-compatible API with auth, rate limiting, batching, and model routing.
"""

import asyncio
import hashlib
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import httpx
import redis.asyncio as redis
from fastapi import FastAPI, HTTPException, Header, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from pythonjsonlogger import json as jsonlogger

from models import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    CompletionChoice,
    UsageInfo,
    ModelListResponse,
    ModelInfo,
    ErrorResponse,
)

# ── Logging ──────────────────────────────────────────────────────────────────

logger = logging.getLogger("llama-fleet")
handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
    "%(asctime)s %(name)s %(levelname)s %(message)s",
    timestamp=True,
)
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(getattr(logging, os.getenv("LOG_LEVEL", "info").upper()))

# ── Metrics ──────────────────────────────────────────────────────────────────

REQUEST_COUNT = Counter(
    "llama_fleet_requests_total",
    "Total inference requests",
    ["model", "status"],
)
REQUEST_LATENCY = Histogram(
    "llama_fleet_request_latency_seconds",
    "Request latency in seconds",
    ["model"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0],
)
TOKENS_PROCESSED = Counter(
    "llama_fleet_tokens_total",
    "Total tokens processed",
    ["model", "type"],
)
ACTIVE_REQUESTS = Gauge(
    "llama_fleet_active_requests",
    "Currently processing requests",
    ["model"],
)
QUEUE_DEPTH = Gauge(
    "llama_fleet_queue_depth",
    "Pending requests in queue",
)
BATCH_SIZE_HIST = Histogram(
    "llama_fleet_batch_size",
    "Batch sizes sent to vLLM",
    buckets=[1, 2, 4, 8, 16, 32],
)

# ── Configuration ────────────────────────────────────────────────────────────

VLLM_8B_URL = os.getenv("VLLM_8B_URL", "http://localhost:8000")
VLLM_70B_URL = os.getenv("VLLM_70B_URL", "http://localhost:8001")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
API_KEYS = set(os.getenv("API_KEYS", "").split(",")) - {""}
RATE_LIMIT_RPM = int(os.getenv("RATE_LIMIT_RPM", "600"))
RATE_LIMIT_TPM = int(os.getenv("RATE_LIMIT_TPM", "1000000"))
ENABLE_BATCHING = os.getenv("ENABLE_BATCHING", "true").lower() == "true"
MAX_BATCH_SIZE = int(os.getenv("MAX_BATCH_SIZE", "32"))
BATCH_TIMEOUT_MS = int(os.getenv("BATCH_TIMEOUT_MS", "50"))

MODEL_TO_BACKEND = {
    "llama-3.1-8b": VLLM_8B_URL,
    "llama-3.1-8b-instruct": VLLM_8B_URL,
    "meta-llama/Llama-3.1-8B-Instruct": VLLM_8B_URL,
    "llama-3.1-70b": VLLM_70B_URL,
    "llama-3.1-70b-instruct": VLLM_70B_URL,
    "meta-llama/Llama-3.1-70B-Instruct": VLLM_70B_URL,
}

AVAILABLE_MODELS = [
    ModelInfo(
        id="llama-3.1-8b",
        object="model",
        created=int(time.time()),
        owned_by="meta-llama",
        permission=[],
        root="meta-llama/Llama-3.1-8B-Instruct",
        parent=None,
    ),
    ModelInfo(
        id="llama-3.1-70b",
        object="model",
        created=int(time.time()),
        owned_by="meta-llama",
        permission=[],
        root="meta-llama/Llama-3.1-70B-Instruct",
        parent=None,
    ),
]

# ── Globals ──────────────────────────────────────────────────────────────────

redis_client: redis.Redis | None = None
http_client: httpx.AsyncClient | None = None
batch_queues: dict[str, asyncio.Queue] = {}
batch_tasks: dict[str, asyncio.Task] = {}


# ── Lifecycle ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client, http_client
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    http_client = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0))

    # Start batch processors for each model
    if ENABLE_BATCHING:
        for model_name in ["llama-3.1-8b", "llama-3.1-70b"]:
            batch_queues[model_name] = asyncio.Queue()
            batch_tasks[model_name] = asyncio.create_task(
                _batch_processor(model_name)
            )

    logger.info(
        "Llama Fleet API started",
        extra={
            "models": list(MODEL_TO_BACKEND.keys()),
            "rate_limit_rpm": RATE_LIMIT_RPM,
            "batching": ENABLE_BATCHING,
        },
    )
    yield

    # Cleanup
    for task in batch_tasks.values():
        task.cancel()
    if http_client:
        await http_client.aclose()
    if redis_client:
        await redis_client.aclose()


app = FastAPI(
    title="Samar-Minime Llama Fleet API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Authentication ───────────────────────────────────────────────────────────

async def verify_api_key(authorization: str | None = Header(None)) -> str:
    """Validate Bearer token or raw API key."""
    if not API_KEYS:
        return "anonymous"

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing API key")

    key = authorization.replace("Bearer ", "").strip()
    if key not in API_KEYS:
        raise HTTPException(status_code=403, detail="Invalid API key")

    return hashlib.sha256(key.encode()).hexdigest()[:16]


# ── Rate Limiting ────────────────────────────────────────────────────────────

async def check_rate_limit(key_hash: str):
    """Sliding window rate limiter using Redis."""
    if not redis_client:
        return

    now = int(time.time())
    minute_key = f"ratelimit:rpm:{key_hash}:{now // 60}"

    pipe = redis_client.pipeline()
    pipe.incr(minute_key)
    pipe.expire(minute_key, 120)
    results = await pipe.execute()

    current_rpm = results[0]
    if current_rpm > RATE_LIMIT_RPM:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {current_rpm}/{RATE_LIMIT_RPM} RPM",
            headers={"Retry-After": str(60 - (now % 60))},
        )


async def track_token_usage(key_hash: str, model: str, prompt_tokens: int, completion_tokens: int):
    """Track token usage for rate limiting and billing."""
    if not redis_client:
        return

    now = int(time.time())
    minute_key = f"ratelimit:tpm:{key_hash}:{now // 60}"
    total_tokens = prompt_tokens + completion_tokens

    pipe = redis_client.pipeline()
    pipe.incrby(minute_key, total_tokens)
    pipe.expire(minute_key, 120)
    # Usage tracking (persists)
    pipe.hincrby(f"usage:{key_hash}", f"prompt_tokens:{model}", prompt_tokens)
    pipe.hincrby(f"usage:{key_hash}", f"completion_tokens:{model}", completion_tokens)
    pipe.hincrby(f"usage:{key_hash}", "total_requests", 1)
    await pipe.execute()


# ── Batch Processor ──────────────────────────────────────────────────────────

async def _batch_processor(model_name: str):
    """Collects requests and dispatches in batches to vLLM."""
    queue = batch_queues[model_name]

    while True:
        batch: list[tuple[ChatCompletionRequest, asyncio.Future]] = []

        # Wait for first request
        try:
            item = await asyncio.wait_for(queue.get(), timeout=1.0)
            batch.append(item)
        except asyncio.TimeoutError:
            continue

        # Collect more requests within timeout window
        deadline = time.monotonic() + (BATCH_TIMEOUT_MS / 1000)
        while len(batch) < MAX_BATCH_SIZE and time.monotonic() < deadline:
            try:
                remaining = deadline - time.monotonic()
                item = await asyncio.wait_for(queue.get(), timeout=max(0.001, remaining))
                batch.append(item)
            except asyncio.TimeoutError:
                break

        BATCH_SIZE_HIST.observe(len(batch))

        # Dispatch batch concurrently
        tasks = []
        for req, future in batch:
            tasks.append(_execute_single(req, future, model_name))
        await asyncio.gather(*tasks, return_exceptions=True)


async def _execute_single(
    req: ChatCompletionRequest,
    future: asyncio.Future,
    model_name: str,
):
    """Execute a single inference request against vLLM."""
    try:
        result = await _call_vllm(req, model_name)
        if not future.done():
            future.set_result(result)
    except Exception as e:
        if not future.done():
            future.set_exception(e)


# ── vLLM Backend Call ────────────────────────────────────────────────────────

async def _call_vllm(req: ChatCompletionRequest, model_name: str) -> dict:
    """Forward request to vLLM backend."""
    backend_url = MODEL_TO_BACKEND.get(model_name)
    if not backend_url:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model_name}")

    payload = {
        "model": model_name,
        "messages": [m.model_dump() for m in req.messages],
        "max_tokens": req.max_tokens or 4096,
        "temperature": req.temperature or 0.7,
        "top_p": req.top_p or 1.0,
        "frequency_penalty": req.frequency_penalty or 0.0,
        "presence_penalty": req.presence_penalty or 0.0,
        "n": req.n or 1,
    }

    if req.stop:
        payload["stop"] = req.stop
    if req.response_format:
        payload["response_format"] = req.response_format.model_dump()

    start = time.monotonic()
    response = await http_client.post(
        f"{backend_url}/v1/chat/completions",
        json=payload,
        timeout=120.0,
    )
    latency = time.monotonic() - start

    if response.status_code != 200:
        error_body = response.text
        logger.error(
            "vLLM error",
            extra={"status": response.status_code, "body": error_body, "model": model_name},
        )
        raise HTTPException(
            status_code=502,
            detail=f"Inference backend error: {response.status_code}",
        )

    result = response.json()
    result["_latency_seconds"] = latency
    return result


async def _call_vllm_stream(req: ChatCompletionRequest, model_name: str) -> AsyncGenerator[str, None]:
    """Stream response from vLLM backend."""
    backend_url = MODEL_TO_BACKEND.get(model_name)
    if not backend_url:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model_name}")

    payload = {
        "model": model_name,
        "messages": [m.model_dump() for m in req.messages],
        "max_tokens": req.max_tokens or 4096,
        "temperature": req.temperature or 0.7,
        "top_p": req.top_p or 1.0,
        "stream": True,
        "n": req.n or 1,
    }

    if req.stop:
        payload["stop"] = req.stop

    async with http_client.stream(
        "POST",
        f"{backend_url}/v1/chat/completions",
        json=payload,
        timeout=120.0,
    ) as response:
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Inference backend error")
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                yield line + "\n\n"
            elif line.strip() == "data: [DONE]":
                yield "data: [DONE]\n\n"
                break


# ── Resolve Model Name ───────────────────────────────────────────────────────

def _resolve_model(model: str) -> str:
    """Normalize model name to canonical form."""
    normalized = model.lower().strip()
    if "70b" in normalized:
        return "llama-3.1-70b"
    return "llama-3.1-8b"


# ── API Endpoints ────────────────────────────────────────────────────────────

@app.post("/v1/chat/completions")
async def chat_completions(
    req: ChatCompletionRequest,
    request: Request,
    authorization: str | None = Header(None),
):
    """OpenAI-compatible chat completions endpoint."""
    key_hash = await verify_api_key(authorization)
    await check_rate_limit(key_hash)

    model_name = _resolve_model(req.model)
    start_time = time.monotonic()

    ACTIVE_REQUESTS.labels(model=model_name).inc()

    try:
        # Streaming response
        if req.stream:
            REQUEST_COUNT.labels(model=model_name, status="stream").inc()
            return StreamingResponse(
                _call_vllm_stream(req, model_name),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no",
                },
            )

        # Batched or direct execution
        if ENABLE_BATCHING and model_name in batch_queues:
            future: asyncio.Future = asyncio.get_event_loop().create_future()
            await batch_queues[model_name].put((req, future))
            QUEUE_DEPTH.set(sum(q.qsize() for q in batch_queues.values()))
            result = await asyncio.wait_for(future, timeout=120.0)
        else:
            result = await _call_vllm(req, model_name)

        latency = time.monotonic() - start_time

        # Extract usage
        usage = result.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)

        # Track metrics
        REQUEST_COUNT.labels(model=model_name, status="success").inc()
        REQUEST_LATENCY.labels(model=model_name).observe(latency)
        TOKENS_PROCESSED.labels(model=model_name, type="prompt").inc(prompt_tokens)
        TOKENS_PROCESSED.labels(model=model_name, type="completion").inc(completion_tokens)

        # Track usage for rate limiting
        await track_token_usage(key_hash, model_name, prompt_tokens, completion_tokens)

        logger.info(
            "Inference complete",
            extra={
                "model": model_name,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "latency_s": round(latency, 3),
                "key": key_hash,
            },
        )

        # Return OpenAI-compatible response
        return result

    except asyncio.TimeoutError:
        REQUEST_COUNT.labels(model=model_name, status="timeout").inc()
        raise HTTPException(status_code=504, detail="Inference timeout")
    except HTTPException:
        raise
    except Exception as e:
        REQUEST_COUNT.labels(model=model_name, status="error").inc()
        logger.error("Inference error", extra={"error": str(e), "model": model_name})
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        ACTIVE_REQUESTS.labels(model=model_name).dec()


@app.get("/v1/models")
async def list_models(authorization: str | None = Header(None)):
    """List available models."""
    await verify_api_key(authorization)
    return ModelListResponse(object="list", data=AVAILABLE_MODELS)


@app.get("/health")
async def health():
    """Health check endpoint."""
    checks = {}

    # Check vLLM backends
    for name, url in [("vllm-8b", VLLM_8B_URL), ("vllm-70b", VLLM_70B_URL)]:
        try:
            resp = await http_client.get(f"{url}/health", timeout=5.0)
            checks[name] = "healthy" if resp.status_code == 200 else "unhealthy"
        except Exception:
            checks[name] = "unavailable"

    # Check Redis
    try:
        await redis_client.ping()
        checks["redis"] = "healthy"
    except Exception:
        checks["redis"] = "unavailable"

    healthy = checks.get("vllm-8b") == "healthy" and checks.get("redis") == "healthy"

    return {
        "status": "healthy" if healthy else "degraded",
        "checks": checks,
        "timestamp": time.time(),
    }


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )


@app.get("/v1/usage")
async def get_usage(authorization: str | None = Header(None)):
    """Get token usage stats for the authenticated key."""
    key_hash = await verify_api_key(authorization)

    if not redis_client:
        return {"usage": {}}

    data = await redis_client.hgetall(f"usage:{key_hash}")
    return {"key": key_hash, "usage": data}


# ── Queue Endpoints (for Samar-Minime worker integration) ────────────────────

@app.post("/v1/tasks/submit")
async def submit_task(request: Request, authorization: str | None = Header(None)):
    """Submit a task to the async queue. Returns task_id immediately."""
    key_hash = await verify_api_key(authorization)
    await check_rate_limit(key_hash)

    body = await request.json()
    task_id = str(uuid.uuid4())
    body["_task_id"] = task_id
    body["_submitted_at"] = time.time()
    body["_key_hash"] = key_hash

    await redis_client.lpush("llama:tasks:pending", json.dumps(body))
    await redis_client.set(f"llama:task:{task_id}:status", "pending", ex=3600)

    QUEUE_DEPTH.set(await redis_client.llen("llama:tasks:pending"))

    return {"task_id": task_id, "status": "pending"}


@app.get("/v1/tasks/{task_id}")
async def get_task_status(task_id: str, authorization: str | None = Header(None)):
    """Check status of an async task."""
    await verify_api_key(authorization)

    status = await redis_client.get(f"llama:task:{task_id}:status")
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")

    result = None
    if status == "completed":
        result_raw = await redis_client.get(f"llama:task:{task_id}:result")
        if result_raw:
            result = json.loads(result_raw)

    error = None
    if status == "failed":
        error = await redis_client.get(f"llama:task:{task_id}:error")

    return {
        "task_id": task_id,
        "status": status,
        "result": result,
        "error": error,
    }
