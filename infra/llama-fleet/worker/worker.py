"""
Samar-Minime Llama Fleet — Queue Worker
Consumes tasks from Redis queue, dispatches to Llama API, stores results.
Supports parallel execution, retries, and dead-letter queue.
"""

import asyncio
import json
import logging
import os
import signal
import time
from typing import Any

import httpx
import redis.asyncio as redis
from pythonjsonlogger import json as jsonlogger

# ── Configuration ────────────────────────────────────────────────────────────

LLAMA_API_URL = os.getenv("LLAMA_API_URL", "http://localhost:8080")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
WORKER_CONCURRENCY = int(os.getenv("WORKER_CONCURRENCY", "16"))
WORKER_BATCH_SIZE = int(os.getenv("WORKER_BATCH_SIZE", "8"))
POLL_INTERVAL_MS = int(os.getenv("POLL_INTERVAL_MS", "100"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
TASK_TTL = 3600  # 1 hour

# ── Logging ──────────────────────────────────────────────────────────────────

logger = logging.getLogger("llama-worker")
handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
    "%(asctime)s %(name)s %(levelname)s %(message)s",
    timestamp=True,
)
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(getattr(logging, os.getenv("LOG_LEVEL", "info").upper()))

# ── Globals ──────────────────────────────────────────────────────────────────

shutdown_event = asyncio.Event()
redis_client: redis.Redis | None = None
http_client: httpx.AsyncClient | None = None

# Stats
stats = {
    "tasks_processed": 0,
    "tasks_failed": 0,
    "tasks_retried": 0,
    "total_latency_s": 0.0,
    "total_prompt_tokens": 0,
    "total_completion_tokens": 0,
}


# ── Task Processing ─────────────────────────────────────────────────────────

async def process_task(task_data: dict) -> dict:
    """Process a single inference task."""
    task_id = task_data.get("_task_id", "unknown")
    retry_count = task_data.get("_retry_count", 0)

    try:
        # Update status to running
        await redis_client.set(
            f"llama:task:{task_id}:status", "running", ex=TASK_TTL
        )

        # Build request to Llama API
        model = task_data.get("model", "llama-3.1-8b")
        messages = task_data.get("messages", [])
        max_tokens = task_data.get("max_tokens", 4096)
        temperature = task_data.get("temperature", 0.7)

        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        if task_data.get("response_format"):
            payload["response_format"] = task_data["response_format"]
        if task_data.get("stop"):
            payload["stop"] = task_data["stop"]

        start = time.monotonic()
        response = await http_client.post(
            f"{LLAMA_API_URL}/v1/chat/completions",
            json=payload,
            timeout=120.0,
        )
        latency = time.monotonic() - start

        if response.status_code != 200:
            raise Exception(f"API error {response.status_code}: {response.text}")

        result = response.json()

        # Update stats
        usage = result.get("usage", {})
        stats["tasks_processed"] += 1
        stats["total_latency_s"] += latency
        stats["total_prompt_tokens"] += usage.get("prompt_tokens", 0)
        stats["total_completion_tokens"] += usage.get("completion_tokens", 0)

        # Store result
        await redis_client.set(
            f"llama:task:{task_id}:result",
            json.dumps(result),
            ex=TASK_TTL,
        )
        await redis_client.set(
            f"llama:task:{task_id}:status", "completed", ex=TASK_TTL
        )

        logger.info(
            "Task completed",
            extra={
                "task_id": task_id,
                "model": model,
                "latency_s": round(latency, 3),
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
            },
        )

        return result

    except Exception as e:
        logger.error(
            "Task failed",
            extra={
                "task_id": task_id,
                "error": str(e),
                "retry_count": retry_count,
            },
        )

        if retry_count < MAX_RETRIES:
            # Re-queue with incremented retry count
            task_data["_retry_count"] = retry_count + 1
            await redis_client.lpush(
                "llama:tasks:pending", json.dumps(task_data)
            )
            stats["tasks_retried"] += 1
            logger.info(f"Task {task_id} requeued (retry {retry_count + 1}/{MAX_RETRIES})")
        else:
            # Dead letter queue
            await redis_client.lpush(
                "llama:tasks:dead", json.dumps(task_data)
            )
            await redis_client.set(
                f"llama:task:{task_id}:status", "failed", ex=TASK_TTL
            )
            await redis_client.set(
                f"llama:task:{task_id}:error", str(e), ex=TASK_TTL
            )
            stats["tasks_failed"] += 1
            logger.error(f"Task {task_id} moved to dead letter queue after {MAX_RETRIES} retries")

        return {"error": str(e)}


# ── Worker Loop ──────────────────────────────────────────────────────────────

async def worker_loop(worker_id: int):
    """Single worker coroutine — polls Redis and processes tasks."""
    logger.info(f"Worker {worker_id} started")

    while not shutdown_event.is_set():
        try:
            # Blocking pop with 1s timeout
            result = await redis_client.brpop("llama:tasks:pending", timeout=1)

            if result is None:
                continue

            _, raw = result
            task_data = json.loads(raw)

            await process_task(task_data)

        except asyncio.CancelledError:
            break
        except json.JSONDecodeError as e:
            logger.error(f"Worker {worker_id}: invalid JSON in queue: {e}")
        except Exception as e:
            logger.error(f"Worker {worker_id}: unexpected error: {e}")
            await asyncio.sleep(1)

    logger.info(f"Worker {worker_id} stopped")


# ── Batch Worker ─────────────────────────────────────────────────────────────

async def batch_worker():
    """
    Batch worker — collects multiple tasks and processes them together.
    Useful for throughput optimization when tasks arrive in bursts.
    """
    logger.info("Batch worker started")

    while not shutdown_event.is_set():
        try:
            # Collect a batch
            batch = []
            pipe = redis_client.pipeline()
            for _ in range(WORKER_BATCH_SIZE):
                pipe.rpop("llama:tasks:pending")
            results = await pipe.execute()

            for raw in results:
                if raw is not None:
                    try:
                        batch.append(json.loads(raw))
                    except json.JSONDecodeError:
                        continue

            if not batch:
                await asyncio.sleep(POLL_INTERVAL_MS / 1000)
                continue

            # Process batch concurrently
            tasks = [process_task(task_data) for task_data in batch]
            await asyncio.gather(*tasks, return_exceptions=True)

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Batch worker error: {e}")
            await asyncio.sleep(1)


# ── Stats Reporter ───────────────────────────────────────────────────────────

async def stats_reporter():
    """Periodically log worker stats."""
    while not shutdown_event.is_set():
        await asyncio.sleep(60)

        queue_len = await redis_client.llen("llama:tasks:pending")
        dead_len = await redis_client.llen("llama:tasks:dead")

        avg_latency = 0.0
        if stats["tasks_processed"] > 0:
            avg_latency = stats["total_latency_s"] / stats["tasks_processed"]

        logger.info(
            "Worker stats",
            extra={
                "tasks_processed": stats["tasks_processed"],
                "tasks_failed": stats["tasks_failed"],
                "tasks_retried": stats["tasks_retried"],
                "avg_latency_s": round(avg_latency, 3),
                "total_prompt_tokens": stats["total_prompt_tokens"],
                "total_completion_tokens": stats["total_completion_tokens"],
                "queue_pending": queue_len,
                "queue_dead": dead_len,
            },
        )


# ── Main ─────────────────────────────────────────────────────────────────────

async def main():
    global redis_client, http_client

    logger.info(
        "Starting Llama Fleet Worker",
        extra={
            "concurrency": WORKER_CONCURRENCY,
            "batch_size": WORKER_BATCH_SIZE,
            "api_url": LLAMA_API_URL,
        },
    )

    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    http_client = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0))

    # Verify connectivity
    await redis_client.ping()
    logger.info("Redis connected")

    try:
        health = await http_client.get(f"{LLAMA_API_URL}/health", timeout=10.0)
        logger.info(f"Llama API health: {health.json()}")
    except Exception as e:
        logger.warning(f"Llama API not yet available: {e}")

    # Start workers
    tasks = []

    # Individual workers for low-latency
    for i in range(WORKER_CONCURRENCY):
        tasks.append(asyncio.create_task(worker_loop(i)))

    # Stats reporter
    tasks.append(asyncio.create_task(stats_reporter()))

    # Handle shutdown signals
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, lambda: shutdown_event.set())

    logger.info(f"All {WORKER_CONCURRENCY} workers running")

    # Wait for shutdown
    await shutdown_event.wait()
    logger.info("Shutdown signal received, draining workers...")

    # Cancel all tasks
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)

    # Cleanup
    await http_client.aclose()
    await redis_client.aclose()

    logger.info(
        "Worker shutdown complete",
        extra={"final_stats": stats},
    )


if __name__ == "__main__":
    asyncio.run(main())
