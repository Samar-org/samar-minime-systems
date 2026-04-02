export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
  stop?: string[];
}

export interface CompletionResponse {
  id: string;
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason: string;
  latencyMs: number;
}

export interface ProviderAdapter {
  readonly name: string;
  readonly provider: 'openai' | 'anthropic' | 'llama';
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  isAvailable(): Promise<boolean>;
}
