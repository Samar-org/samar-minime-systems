import type { ProviderAdapter, CompletionRequest, CompletionResponse } from '../types.js';

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 529]);
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text?: string }>;
  model: string;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
}

interface AnthropicError {
  type: string;
  error: { type: string; message: string };
}

export class ClaudeAdapter implements ProviderAdapter {
  readonly name = 'claude';
  readonly provider = 'anthropic' as const;
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(apiKey: string, options?: { baseUrl?: string; timeout?: number }) {
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl ?? 'https://api.anthropic.com/v1';
    this.timeout = options?.timeout ?? 120_000;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this._execute(request);
      } catch (error: any) {
        lastError = error;

        const statusCode = error?.statusCode;
        if (statusCode && !RETRYABLE_STATUS_CODES.has(statusCode)) {
          throw error;
        }

        if (attempt === MAX_RETRIES) break;

        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;

        if (statusCode === 429) {
          const retryAfter = error?.retryAfter;
          await this._sleep(retryAfter ? retryAfter * 1000 : delay);
        } else {
          await this._sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  private async _execute(request: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();

    // Separate system message (Anthropic uses a top-level system field)
    const systemMessage = request.messages.find(m => m.role === 'system');
    const chatMessages = request.messages.filter(m => m.role !== 'system');

    // Ensure messages alternate properly (Anthropic requirement)
    const messages = this._normalizeMessages(chatMessages);

    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      messages,
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.stop) {
      body.stop_sequences = request.stop;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({})) as AnthropicError;
        const error = new Error(
          `Anthropic API error (${response.status}): ${errorBody?.error?.message ?? response.statusText}`
        ) as any;
        error.statusCode = response.status;

        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          error.retryAfter = retryAfter ? parseInt(retryAfter, 10) : undefined;
        }

        throw error;
      }

      const data = await response.json() as AnthropicResponse;
      const textContent = data.content?.find(c => c.type === 'text');

      return {
        id: data.id,
        content: textContent?.text ?? '',
        model: data.model,
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
        finishReason: data.stop_reason ?? 'unknown',
        latencyMs,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private _normalizeMessages(
    messages: Array<{ role: string; content: string }>,
  ): Array<{ role: string; content: string }> {
    // Anthropic requires messages alternate user/assistant.
    // If we have consecutive messages of the same role, merge them.
    const normalized: Array<{ role: string; content: string }> = [];

    for (const msg of messages) {
      const role = msg.role === 'assistant' ? 'assistant' : 'user';
      const last = normalized[normalized.length - 1];

      if (last && last.role === role) {
        last.content += '\n\n' + msg.content;
      } else {
        normalized.push({ role, content: msg.content });
      }
    }

    // Ensure first message is from user
    if (normalized.length > 0 && normalized[0].role !== 'user') {
      normalized.unshift({ role: 'user', content: 'Continue.' });
    }

    return normalized;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
