import { RoutingRequest, RoutingDecision } from '@samar/schemas';
import { ModelRegistry, ModelMetadata } from './model-registry';
import { getLogger } from '@samar/observability';

const logger = getLogger('model-router');

export class ModelRouter {
  private registry: ModelRegistry;

  constructor(registry: ModelRegistry) {
    this.registry = registry;
  }

  selectModel(request: RoutingRequest): RoutingDecision {
    logger.info(`Selecting model for: ${request.taskDescription}`);

    const candidates = this.registry.list();

    // Filter by constraints
    let filtered = candidates.filter(m => {
      if (request.constraints?.maxTokens && m.contextWindow < request.constraints.maxTokens) {
        return false;
      }
      if (request.constraints?.maxCost && m.basePrice > request.constraints.maxCost) {
        return false;
      }
      if (request.constraints?.requiredFormat && !m.supportedFormats.includes(request.constraints.requiredFormat)) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      throw new Error('No models available matching constraints');
    }

    // Select based on cost optimization
    let selected: ModelMetadata;
    if (request.constraints?.maxCost) {
      // Budget-conscious: pick foundation tier
      selected = filtered.find(m => m.tier === 'foundation') || filtered[0];
    } else {
      // Default: pick standard tier for balance
      selected = filtered.find(m => m.tier === 'standard') || filtered[0];
    }

    const estimatedCost = this.estimateCost(selected, request);

    logger.info(`Selected: ${selected.model} (estimated cost: $${estimatedCost})`);

    return {
      model: selected.model,
      provider: selected.provider,
      tier: selected.tier,
      estimatedCost,
      contextWindow: selected.contextWindow,
    };
  }

  estimateCost(
    model: ModelMetadata,
    request: RoutingRequest
  ): number {
    // Rough estimate: assume 1000 input tokens + 500 output tokens
    const inputTokens = 1000;
    const outputTokens = 500;

    const inputCost = (inputTokens / 1000000) * model.inputCostPer1M;
    const outputCost = (outputTokens / 1000000) * model.outputCostPer1M;

    return inputCost + outputCost + model.basePrice;
  }

  canHandle(
    model: ModelMetadata,
    request: RoutingRequest
  ): boolean {
    if (request.constraints?.maxTokens && model.contextWindow < request.constraints.maxTokens) {
      return false;
    }
    if (request.constraints?.requiredFormat && !model.supportedFormats.includes(request.constraints.requiredFormat)) {
      return false;
    }
    return true;
  }

  getAlternatives(
    model: string,
    request: RoutingRequest
  ): ModelMetadata[] {
    const candidates = this.registry.list();
    return candidates
      .filter(m => m.model !== model && this.canHandle(m, request))
      .sort((a, b) => a.basePrice - b.basePrice)
      .slice(0, 3);
  }
}
