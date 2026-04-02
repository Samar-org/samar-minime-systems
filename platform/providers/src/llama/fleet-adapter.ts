/**
 * Samar-Minime Llama Fleet Adapter
 * Enhanced adapter for the hosted vLLM fleet with:
 * - Health-aware routing (8B vs 70B backends)
 * - Async task queue support
 * - Automatic fallback to Ollama
 * - Cost tracking ($0 for self-hosted inference)
 * - Connection pooling and retry logic
 */

import OpenAI from 'openai';
import type { ProviderAdapter, CompletionRequest, CompletionResponse } from '../types.js';

export interface FleetConfig {
  /** Fleet API gateway URL (e.g., http://llama-fleet:8080) */
  fleetUrl: string;
  /** API key for fleet authentication */
  fleetApiKey?: string;
  /** Fallback Ollama URL for local dev */
  ollamaUrl?: string;
  /** Request timeout in ms */
  timeoutMs?: number;
  /** Max retries before fallback */
  maxRetries?: number;
}

interface FleetHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
  checks: Record<string, string>;
  timestamp: number;
}

export class LlamaFleetAdapter implements ProviderAdapter {
  readonly name = 'llama-fleet';
  readonly provider = 'llama' as const;

  private fleetClient: OpenAI;
  private ollamaClient: OpenAI | null = null;
  private config: Required<FleetConfig>;
  private fleetHealthy = true;
  private lastHealthCheck = 0;
  private healthCheckInterval = 30_000; // 30s

  constructor(config: FleetConfig) {
    this.config = {
      fleetUrl: config.fleetUrl,
      fleetApiKey: config.fleetApiKey ?? '',
      ollamaUrl: config.ollamaUrl ?? 'http://localhost:11434/v1',
      timeoutMs: config.timeoutMs ?? 120_000,
      maxRetries: config.maxRetries ?? 2,
    };

    this.fleetClient = new OpenAI({
      apiKey: this.config.fleetApiKey || 'not-needed',
      baseURL: `${this.config.fleetUrl}/v1`,
      timeout: this.config.timeoutMs,
      maxRetries: 0, // We handle retries ourselves
    });

    // Ollama fallback for local dev
    if (this.config.ollamaUrl) {
      this.ollamaClient = new OpenAI({
        apiKey: 'not-needed',
        baseURL: this.config.ollamaUrl,
        timeout: 60_000,
      });
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Try fleet first
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (this.fleetHealthy || attempt === 0) {
        try {
          return await this._executeOnFleet(request);
        } catch (error) {
          const isLastRetry = attempt === this.config.maxRetries;
          if (isLastRetry) {
            this.fleetHealthy = false;
          }
          // Continue to retry or fallback
        }
      }
    }

    // Fallback to Ollama
    if (this.ollamaClient) {
      console.warn('[LlamaFleet] Fleet unavailable, falling back to Ollama');
      return this._executeOnOllama(request);
    }

    throw new Error('Llama Fleet and Ollama both unavailable');
  }

  private async _executeOnFleet(request: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();

    const response = await this.fleetClient.chat.completions.create({
      model: request.model,
      messages: request.messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      response_format: request.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      stop: request.stop,
    });

    const latencyMs = Date.now() - start;
    const choice = response.choices[0];

    return {
      id: response.id ?? `fleet-${Date.now()}`,
      content: choice?.message?.content ?? '',
      model: response.model,
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
      finishReason: choice?.finish_reason ?? 'unknown',
      latencyMs,
    };
  }

  private async _executeOnOllama(request: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();

    // Map fleet model names to Ollama model names
    const ollamaModel = request.model.includes('70b')
      ? 'llama3.1:70b'
      : 'llama3.1:8b';

    const response = await this.ollamaClient!.chat.completions.create({
      model: ollamaModel,
      messages: request.messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      stop: request.stop,
    });

    const latencyMs = Date.now() - start;
    const choice = response.choices[0];

    return {
      id: response.id ?? `ollama-${Date.now()}`,
      content: choice?.message?.content ?? '',
      model: ollamaModel,
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
      finishReason: choice?.finish_reason ?? 'unknown',
      latencyMs,
    };
  }

  /**
   * Submit a task to the async queue (for bulk/non-urgent work).
   * Returns a task_id that can be polled for results.
   */
  async submitAsync(request: CompletionRequest): Promise<{ taskId: string }> {
    const response = await fetch(`${this.config.fleetUrl}/v1/tasks/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.fleetApiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        response_format: request.responseFormat === 'json'
          ? { type: 'json_object' }
          : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`Fleet task submit failed: ${response.status}`);
    }

    const data = await response.json() as { task_id: string };
    return { taskId: data.task_id };
  }

  /**
   * Poll for async task result.
   */
  async getTaskResult(taskId: string): Promise<{
    status: string;
    result?: CompletionResponse;
    error?: string;
  }> {
    const response = await fetch(
      `${this.config.fleetUrl}/v1/tasks/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${this.config.fleetApiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Fleet task poll failed: ${response.status}`);
    }

    const data = await response.json() as {
      status: string;
      result?: Record<string, unknown>;
      error?: string;
    };

    if (data.status === 'completed' && data.result) {
      const choices = (data.result.choices as Array<{
        message: { content: string };
        finish_reason: string;
      }>) ?? [];
      const usage = (data.result.usage as {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      }) ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      return {
        status: 'completed',
        result: {
          id: (data.result.id as string) ?? `fleet-${Date.now()}`,
          content: choices[0]?.message?.content ?? '',
          model: (data.result.model as string) ?? 'unknown',
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          finishReason: choices[0]?.finish_reason ?? 'unknown',
          latencyMs: 0,
        },
      };
    }

    return { status: data.status, error: data.error };
  }

  /**
   * Wait for async task to complete (with polling).
   */
  async waitForTask(
    taskId: string,
    pollIntervalMs = 500,
    timeoutMs = 120_000,
  ): Promise<CompletionResponse> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const result = await this.getTaskResult(taskId);

      if (result.status === 'completed' && result.result) {
        return result.result;
      }

      if (result.status === 'failed') {
        throw new Error(`Task failed: ${result.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Task ${taskId} timed out after ${timeoutMs}ms`);
  }

  async isAvailable(): Promise<boolean> {
    const now = Date.now();

    // Cache health check
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.fleetHealthy;
    }

    this.lastHealthCheck = now;

    // Check fleet
    try {
      const response = await fetch(`${this.config.fleetUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json() as FleetHealth;
      this.fleetHealthy = data.status === 'healthy' || data.status === 'degraded';
      return this.fleetHealthy;
    } catch {
      this.fleetHealthy = false;
    }

    // Check Ollama fallback
    if (this.ollamaClient) {
      try {
        await this.ollamaClient.models.list();
        return true;
      } catch {
        // Both unavailable
      }
    }

    return false;
  }
}