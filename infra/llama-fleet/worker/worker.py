import asyncio
import json
import logging
import os
import time
from datetime import datetime
from typing import Any, Dict, Optional

import aioredis
import httpx

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
API_URL = os.getenv("LLAMA_API_URL", "http://llama-api:8080")
API_KEY = os.getenv("LLAMA_API_KEY", "sk-llama-prod-key-1")
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
RETRY_DELAY = int(os.getenv("RETRY_DELAY", "5"))
WORKER_ID = os.getenv("WORKER_ID", f"worker-{int(time.time())}")
STATS_INTERVAL = 60


class WorkerStats:
    """Track worker performance metrics."""

    def __init__(self):
        self.tasks_processed = 0
        self.tasks_failed = 0
        self.tasks_retried = 0
        self.total_latency_ms = 0
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0
        self.start_time = time.time()

    def record_success(self, latency_ms: int, prompt_tokens: int, completion_tokens: int):
        self.tasks_processed += 1
        self.total_latency_ms += latency_ms
        self.total_prompt_tokens += prompt_tokens
        self.total_completion_tokens += completion_tokens

    def record_failure(self):
        self.tasks_failed += 1

    def record_retry(self):
        self.tasks_retried += 1

    def to_dict(self) -> Dict[str, Any]:
        elapsed = time.time() - self.start_time
        avg_latency = (
            self.total_latency_ms / self.tasks_processed
            if self.tasks_processed > 0
            else 0
        )
        throughput = self.tasks_processed / elapsed if elapsed > 0 else 0
        return {
            "worker_id": WORKER_ID,
            "tasks_processed": self.tasks_processed,
            "tasks_failed": self.tasks_failed,
            "tasks_retried": self.tasks_retried,
            "avg_latency_ms": round(avg_latency, 2),
            "throughput_rps": round(throughput, 2),
            "total_prompt_tokens": self.total_prompt_tokens,
            "total_completion_tokens": self.total_completion_tokens,
            "uptime_seconds": round(elapsed, 2),
        }


stats = WorkerStats()


async def process_task(
    redis: aioredis.Redis, task_id: str, task_data: Dict[str, Any]
) -> bool:
    """Process a single inference task.

    Args:
        redis: Redis client
        task_id: Unique task identifier
        task_data: Task payload (model, messages, etc.)

    Returns:
        True if task succeeded, False if exhausted retries
    """
    logger.info(f"[{task_id}] Processing task")
    start = time.time()

    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{API_URL}/v1/chat/completions",
                    json=task_data,
                    headers={
                        "Authorization": f"Bearer {API_KEY}",
                        "Content-Type": "application/json",
                    },
                )
                response.raise_for_status()

            result = response.json()
            latency_ms = int((time.time() - start) * 1000)
            prompt_tokens = result.get("usage", {}).get("prompt_tokens", 0)
            completion_tokens = result.get("usage", {}).get("completion_tokens", 0)

            stats.record_success(latency_ms, prompt_tokens, completion_tokens)
            logger.info(
                f"[{task_id}] Success in {latency_ms}ms (attempt {attempt + 1}/{MAX_RETRIES + 1})"
            )

            # Store result
            await redis.setex(
                f"task:{task_id}:result",
                3600,
                json.dumps(
                    {
                        "status": "completed",
                        "result": result,
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                ),
            )
            return True

        except Exception as e:
            logger.warning(f"[{task_id}] Attempt {attempt + 1} failed: {e}")
            stats.record_retry()
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY)
            else:
                # Max retries exhausted — send to dead-letter queue
                stats.record_failure()
                dlq_entry = {
                    "task_id": task_id,
                    "task_data": task_data,
                    "error": str(e),
                    "attempts": MAX_RETRIES + 1,
                    "timestamp": datetime.utcnow().isoformat(),
                }
                await redis.lpush("tasks:dlq", json.dumps(dlq_entry))
                logger.error(f"[{task_id}] Sent to DLQ after {MAX_RETRIES + 1} attempts")
                await redis.setex(
                    f"task:{task_id}:result",
                    3600,
                    json.dumps(
                        {
                            "status": "failed",
                            "error": str(e),
                            "timestamp": datetime.utcnow().isoformat(),
                        }
                    ),
                )
                return False

    return False


async def worker_loop(redis: aioredis.Redis):
    """Single worker loop — consume one task at a time."""
    logger.info(f"[{WORKER_ID}] Starting single-task worker loop")
    while True:
        try:
            # Block and wait for a task
            task_item = await redis.blpop("tasks:queue", timeout=10)
            if not task_item:
                continue

            _, task_json = task_item
            task_data = json.loads(task_json)
            task_id = task_data.get("task_id")

            await process_task(redis, task_id, task_data)
        except Exception as e:
            logger.error(f"Worker loop error: {e}")
            await asyncio.sleep(1)


async def batch_worker(redis: aioredis.Redis, batch_size: int = 5):
    """Batch worker — consume multiple tasks in parallel."""
    logger.info(f"[{WORKER_ID}] Starting batch worker (batch_size={batch_size})")
    while True:
        try:
            tasks = []
            for _ in range(batch_size):
                task_item = await asyncio.wait_for(
                    redis.blpop("tasks:queue", timeout=1), timeout=2
                )
                if task_item:
                    _, task_json = task_item
                    tasks.append(json.loads(task_json))
            if not tasks:
                continue

            logger.info(f"[{WORKER_ID}] Processing batch of {len(tasks)} tasks")
            coros = [
                process_task(redis, task.get("task_id"), task) for task in tasks
            ]
            await asyncio.gather(*coros)
        except Exception as e:
            logger.error(f"Batch worker error: {e}")
            await asyncio.sleep(1)


async def stats_reporter(redis: aioredis.Redis):
    """Periodically log worker statistics."""
    while True:
        await asyncio.sleep(STATS_INTERVAL)
        stats_dict = stats.to_dict()
        logger.info(f"Stats: {json.dumps(stats_dict)}")
        await redis.setex(
            f"worker:{WORKER_ID}:stats", STATS_INTERVAL * 2, json.dumps(stats_dict)
        )


async def main():
    redis = await aioredis.from_url(REDIS_URL)
    logger.info(f"Connected to Redis: {REDIS_URL}")

    # Create tasks for worker_loop and stats_reporter
    tasks = [
        asyncio.create_task(worker_loop(redis)),
        asyncio.create_task(stats_reporter(redis)),
    ]

    try:
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        logger.info(f"[{WORKER_ID}] Shutting down gracefully")
        for task in tasks:
            task.cancel()
        await redis.close()


if __name__ == "__main__":
    asyncio.run(main())
