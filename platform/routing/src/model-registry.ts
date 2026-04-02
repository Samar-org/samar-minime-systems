import { ModelSpec } from '@samar/schemas';
import { getLogger } from '@samar/observability';

const logger = getLogger('model-registry');

export interface ModelMetadata {
  model: string;
  provider: 'openai' | 'anthropic' | 'llama';
  tier: 'foundation' | 'standard' | 'advanced';
  contextWindow: number;
  basePrice: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
  supportedFormats: ('text' | 'json')[];
  available: boolean;
}

export class ModelRegistry {
  private models: Map<string, ModelMetadata> = new Map();

  constructor() {
    this.initializeDefaultModels();
  }

  private initializeDefaultModels(): void {
    const defaultModels: ModelMetadata[] = [
      // OpenAI - Foundation tier
      {
        model: 'gpt-3.5-turbo',
        provider: 'openai',
        tier: 'foundation',
        contextWindow: 4096,
        basePrice: 0.002,
        inputCostPer1M: 0.50,
        outputCostPer1M: 1.50,
        supportedFormats: ['text', 'json'],
        available: true,
      },
      // OpenAI - Standard tier
      {
        model: 'gpt-4',
        provider: 'openai',
        tier: 'standard',
        contextWindow: 8192,
        basePrice: 0.03,
        inputCostPer1M: 30.0,
        outputCostPer1M: 60.0,
        supportedFormats: ['text', 'json'],
        available: true,
      },
      {
        model: 'gpt-4o',
        provider: 'openai',
        tier: 'standard',
        contextWindow: 128000,
        basePrice: 0.015,
        inputCostPer1M: 5.0,
        outputCostPer1M: 15.0,
        supportedFormats: ['text', 'json'],
        available: true,
      },
      // OpenAI - Advanced tier
      {
        model: 'gpt-4-turbo',
        provider: 'openai',
        tier: 'advanced',
        contextWindow: 128000,
        basePrice: 0.03,
        inputCostPer1M: 10.0,
        outputCostPer1M: 30.0,
        supportedFormats: ['text', 'json'],
        available: true,
      },
      // Anthropic - Foundation tier
      {
        model: 'claude-3-haiku',
        provider: 'anthropic',
        tier: 'foundation',
        contextWindow: 200000,
        basePrice: 0.001,
        inputCostPer1M: 0.25,
        outputCostPer1M: 1.25,
        supportedFormats: ['text', 'json'],
        available: true,
      },
      // Anthropic - Standard tier
      {
        model: 'claude-3-sonnet',
        provider: 'anthropic',
        tier: 'standard',
        contextWindow: 200000,
        basePrice: 0.003,
        inputCostPer1M: 3.0,
        outputCostPer1M: 15.0,
        supportedFormats: ['text', 'json'],
        available: true,
      },
      // Anthropic - Advanced tier
      {
        model: 'claude-3-opus',
        provider: 'anthropic',
        tier: 'advanced',
        contextWindow: 200000,
        basePrice: 0.015,
        inputCostPer1M: 15.0,
        outputCostPer1M: 75.0,
        supportedFormats: ['text', 'json'],
        available: true,
      },
      // Llama - Foundation tier
      {
        model: 'llama-2-7b',
        provider: 'llama',
        tier: 'foundation',
        contextWindow: 4096,
        basePrice: 0.0,
        inputCostPer1M: 0.0,
        outputCostPer1M: 0.0,
        supportedFormats: ['text'],
        available: true,
      },
    ];

    defaultModels.forEach(model => this.register(model));
  }

  register(metadata: ModelMetadata): void {
    this.models.set(metadata.model, metadata);
    logger.info(`Registered model: ${metadata.model} (${metadata.provider})`);
  }

  getModel(model: string): ModelMetadata | undefined {
    return this.models.get(model);
  }

  getModelsByProvider(provider: string): ModelMetadata[] {
    return Array.from(this.models.values()).filter(m => m.provider === provider);
  }

  getModelsByTier(tier: 'foundation' | 'standard' | 'advanced'): ModelMetadata[] {
    return Array.from(this.models.values()).filter(m => m.tier === tier);
  }

  list(): ModelMetadata[] {
    return Array.from(this.models.values()).filter(m => m.available);
  }
}
