import OpenAI from 'openai';
import type { ProviderAdapter, CompletionRequest, CompletionResponse } from '../types.js';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

export class LlamaAdapter implements ProviderAdapter {
  readonly name = 'llama';
  readonly provider = 'llama' as const;
  private client: OpenAI;
  private baseUrl: string;

  constructor(baseUrl: string, options?: { apiKey?: string; timeout?: number }) {
    this.baseUrl = baseUrl;
    this.client = new OpenAI({
      apiKey: options?.apiKey ?? 'not-needed',
      baseURL: baseUrl,
      timeout: options?.timeout ?? 120_000,
      maxRetries: 0,
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this._execute(request);
      } catch (error: any) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          await this._sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
        }
      }
    }

    throw new Error(`Llama inference failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`);
  }

  private async _execute(request: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();

    // Map model names: router uses 'llama-3.1-8b' but Ollama uses 'llama3.1:8b'
    const model = this._resolveModel(request.model);

    const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      stop: request.stop ?? undefined,
    };

    // JSON mode (supported by vLLM and newer Ollama)
    if (request.responseFormat === 'json') {
      params.response_format = { type: 'json_object' };
    }

    const response = await this.client.chat.completions.create(params);
    const latencyMs = Date.now() - start;
    const choice = response.choices[0];

    return {
      id: response.id ?? `llama-${Date.now()}`,
      content: choice?.message?.content ?? '',
      model: response.model ?? model,
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
      finishReason: choice?.finish_reason ?? 'unknown',
      latencyMs,
    };
  }

  private _resolveModel(model: string): string {
    // If baseURL is Ollama, translate model names
    const isOllama = this.baseUrl.includes('11434');

    if (isOllama) {
      if (model.includes('70b')) return 'llama3.1:70b';
      if (model.includes('8b')) return 'llama3.1:8b';
    }

    // For vLLM fleet, model names match as-is
    return model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
