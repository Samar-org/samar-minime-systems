import type { RoutingRequest, RoutingDecision, ModelSpec } from '@samar/schemas';
import { MODEL_REGISTRY } from './model-registry.js';

const TIER_PRIORITY: Record<string, number> = {
  UTILITY: 0,
  BUILDER: 1,
  DIRECTOR: 2,
  SPECIALIST: 3,
};

const TIER_ORDER = ['UTILITY', 'BUILDER', 'DIRECTOR', 'SPECIALIST'] as const;

export class ModelRouter {
  private registry: ModelSpec[];

  constructor(registry: ModelSpec[] = MODEL_REGISTRY) {
    this.registry = registry.filter(m => m.enabled);
  }

  route(request: RoutingRequest): RoutingDecision {
    const minTier = request.requiredTier
      ? TIER_PRIORITY[request.requiredTier] ?? 0
      : 0;

    // Escalation: each retry bumps the minimum tier
    const escalatedTier = Math.min(minTier + request.retryCount, 3);
    const effectiveTier = TIER_ORDER[escalatedTier] ?? 'SPECIALIST';

    // Filter eligible models
    let candidates = this.registry.filter(m => {
      const tierLevel = TIER_PRIORITY[m.tier] ?? 0;
      if (tierLevel < (TIER_PRIORITY[effectiveTier] ?? 0)) return false;
      if (request.requiresJson && !m.supportsJson) return false;
      if (request.requiresVision && !m.supportsVision) return false;
      if (request.preferredProvider && m.provider !== request.preferredProvider) return false;
      return true;
    });

    // If no candidates with preferred provider, remove that constraint
    if (candidates.length === 0 && request.preferredProvider) {
      candidates = this.registry.filter(m => {
        const tierLevel = TIER_PRIORITY[m.tier] ?? 0;
        if (tierLevel < (TIER_PRIORITY[effectiveTier] ?? 0)) return false;
        if (request.requiresJson && !m.supportsJson) return false;
        if (request.requiresVision && !m.supportsVision) return false;
        return true;
      });
    }

    // Sort by cost (cheapest first within eligible tier)
    candidates.sort((a, b) => {
      const tierDiff = (TIER_PRIORITY[a.tier] ?? 0) - (TIER_PRIORITY[b.tier] ?? 0);
      if (tierDiff !== 0) return tierDiff;
      const costA = a.costPerInputToken + a.costPerOutputToken;
      const costB = b.costPerInputToken + b.costPerOutputToken;
      return costA - costB;
    });

    const selected = candidates[0];
    if (!selected) {
      throw new Error(`No eligible model found for request: ${JSON.stringify(request)}`);
    }

    const estimatedTokens = 2000;
    const estimatedCost = (selected.costPerInputToken * estimatedTokens) + (selected.costPerOutputToken * estimatedTokens);

    // Budget check
    if (request.maxCostUsd && estimatedCost > request.maxCostUsd) {
      // Try to find a cheaper model
      const cheaper = candidates.find(m => {
        const cost = (m.costPerInputToken + m.costPerOutputToken) * estimatedTokens;
        return cost <= (request.maxCostUsd ?? Infinity);
      });

      if (cheaper) {
        return {
          model: cheaper,
          reason: `Budget-constrained: selected ${cheaper.name} (${cheaper.tier}) within $${request.maxCostUsd} limit`,
          estimatedCostUsd: (cheaper.costPerInputToken + cheaper.costPerOutputToken) * estimatedTokens,
          escalated: false,
        };
      }
    }

    const escalated = request.retryCount > 0 && effectiveTier !== TIER_ORDER[minTier];

    return {
      model: selected,
      reason: escalated
        ? `Escalated to ${selected.name} (${selected.tier}) after ${request.retryCount} retries`
        : `Selected ${selected.name} (${selected.tier}) — cheapest eligible model`,
      estimatedCostUsd: estimatedCost,
      escalated,
      escalationReason: escalated ? `Retry #${request.retryCount}: previous tier insufficient` : undefined,
    };
  }

  getModelsForTier(tier: string): ModelSpec[] {
    return this.registry.filter(m => m.tier === tier);
  }

  getModelById(id: string): ModelSpec | undefined {
    return this.registry.find(m => m.id === id);
  }
}
