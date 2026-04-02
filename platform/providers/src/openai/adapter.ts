import OpenAI from 'openai';
import type { ProviderAdapter, CompletionRequest, CompletionResponse } from '../types.js';

export class OpenAIAdapter implements ProviderAdapter {
  readonly name = 'openai';
  readonly provider = 'openai' as const;
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const start = Date.now();

    const response = await this.client.chat.completions.create({
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
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
