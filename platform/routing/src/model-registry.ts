import type { ModelSpec } from '@samar/schemas';
import { getLogger } from '@samar/observability';

const logger = getLogger('model-registry');

/**
 * Default MODEL_REGISTRY consumed by ModelRouter.
 * Extend or override by constructing ModelRouter with a custom registry.
 */
export const MODEL_REGISTRY: ModelSpec[] = [
  {
    id: 'gpt-4o-mini',
    name: 'gpt-4o-mini',
    provider: 'openai',
    tier: 'UTILITY',
    costPerInputToken: 0.00000015,
    costPerOutputToken: 0.0000006,
    supportsJson: true,
    supportsVision: true,
    enabled: true,
  },
  {
    id: 'gpt-4o',
    name: 'gpt-4o',
    provider: 'openai',
    tier: 'BUILDER',
    costPerInputToken: 0.000005,
    costPerOutputToken: 0.000015,
    supportsJson: true,
    supportsVision: true,
    enabled: true,
  },
  {
    id: 'claude-3-5-sonnet-latest',
    name: 'claude-3.5-sonnet',
    provider: 'anthropic',
    tier: 'DIRECTOR',
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000015,
    supportsJson: true,
    supportsVision: true,
    enabled: true,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'llama-3.1-8b (groq)',
    provider: 'llama',
    tier: 'UTILITY',
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsJson: true,
    supportsVision: false,
    enabled: true,
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'llama-3.3-70b (groq)',
    provider: 'llama',
    tier: 'BUILDER',
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsJson: true,
    supportsVision: false,
    enabled: true,
  },
] as any;

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
      {
        model: 'gpt-4o-mini',
        provider: 'openai',
        tier: 'foundation',
        contextWindow: 128000,
        basePrice: 0.0002,
        inputCostPer1M: 0.15,
        outputCostPer1M: 0.60,
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
      {
        model: 'claude-3-5-sonnet-latest',
        provider: 'anthropic',
        tier: 'advanced',
        contextWindow: 200000,
        basePrice: 0.003,
        inputCostPer1M: 3.0,
        outputCostPer1M: 15.0,
        supportedFormats: ['text', 'json'],
        available: true,
      },
      {
        model: 'llama-3.1-8b-instant',
        provider: 'llama',
        tier: 'foundation',
        contextWindow: 128000,
        basePrice: 0.0,
        inputCostPer1M: 0.0,
        outputCostPer1M: 0.0,
        supportedFormats: ['text', 'json'],
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
