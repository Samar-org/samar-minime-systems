import OpenAI from 'openai';
import type { ProviderAdapter, CompletionRequest, CompletionResponse } from '../types.js';

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

export class OpenAIAdapter implements ProviderAdapter {
  readonly name = 'openai';
  readonly provider = 'openai' as const;
  private client: OpenAI;
  private apiKey: string;

  constructor(apiKey: string, options?: { baseUrl?: string; timeout?: number }) {
    this.apiKey = apiKey;
    this.client = new OpenAI({
      apiKey,
      baseURL: options?.baseUrl,
      timeout: options?.timeout ?? 120_000,
      maxRetries: 0, // We handle retries ourselves for cost tracking
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this._execute(request);
      } catch (error: any) {
        lastError = error;

        // Don't retry non-retryable errors
        const statusCode = error?.status ?? error?.response?.status;
        if (statusCode && !RETRYABLE_STATUS_CODES.has(statusCode)) {
          throw this._wrapError(error, request.model);
        }

        // Don't retry on last attempt
        if (attempt === MAX_RETRIES) break;

        // Exponential backoff with jitter
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;

        // For rate limits, respect Retry-After header
        if (statusCode === 429) {
          const retryAfter = error?.headers?.['retry-after'];
          const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
          await this._sleep(Math.min(waitMs, 60_000));
        } else {
          await this._sleep(delay);
        }
      }
    }

    throw this._wrapError(lastError!, request.model);
  }

  private async _execute(request: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();

    const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model: request.model,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      stop: request.stop ?? undefined,
    };

    // JSON mode
    if (request.responseFormat === 'json') {
      params.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat.completions.create(params);
    const latencyMs = Date.now() - start;
    const choice = response.choices[0];

    return {
      id: response.id,
      content: choice?.message?.content ?? '',
      model: response.model,
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
      finishReason: choice?.finish_reason ?? 'unknown',
      latencyMs,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      });
      return !!response.id;
    } catch {
      return false;
    }
  }

  private _wrapError(error: any, model: string): Error {
    const statusCode = error?.status ?? error?.response?.status;
    const message = error?.message ?? 'Unknown OpenAI error';

    if (statusCode === 401) {
      return new Error(`OpenAI authentication failed — check OPENAI_API_KEY`);
    }
    if (statusCode === 429) {
      return new Error(`OpenAI rate limit exceeded for model ${model}. Retry later.`);
    }
    if (statusCode === 400) {
      return new Error(`OpenAI bad request (model: ${model}): ${message}`);
    }
    if (statusCode === 404) {
      return new Error(`OpenAI model not found: ${model}`);
    }

    return new Error(`OpenAI error (${statusCode ?? 'unknown'}): ${message}`);
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
