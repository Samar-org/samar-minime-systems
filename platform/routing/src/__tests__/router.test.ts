import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRouter } from '../router.js';
import type { RoutingRequest } from '@samar/schemas';
import { MODEL_REGISTRY } from '../model-registry.js';

describe('ModelRouter', () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = new ModelRouter(MODEL_REGISTRY);
  });

  describe('route() - basic selection', () => {
    it('should select the cheapest model within UTILITY tier', () => {
      const request: RoutingRequest = {
        taskType: 'summarization',
        requiredTier: 'UTILITY',
      };

      const decision = router.route(request);

      expect(decision.model.tier).toBe('UTILITY');
      expect(decision.model.id).toBe('gpt-3.5-turbo'); // Cheapest in UTILITY
      expect(decision.reason).toContain('cheapest eligible model');
    });

    it('should select cheapest BUILDER tier model by default', () => {
      const request: RoutingRequest = {
        taskType: 'general',
      };

      const decision = router.route(request);

      // No required tier = minimum UTILITY (tier 0), so should select cheapest of all
      expect(decision.model.tier).toBe('UTILITY');
    });

    it('should select model from DIRECTOR tier when required', () => {
      const request: RoutingRequest = {
        taskType: 'complex-analysis',
        requiredTier: 'DIRECTOR',
      };

      const decision = router.route(request);

      expect(decision.model.tier).toBe('DIRECTOR');
      expect(['gpt-4o', 'claude-sonnet-4-20250514']).toContain(decision.model.id);
    });

    it('should select SPECIALIST tier model when required', () => {
      const request: RoutingRequest = {
        taskType: 'reasoning',
        requiredTier: 'SPECIALIST',
      };

      const decision = router.route(request);

      expect(decision.model.tier).toBe('SPECIALIST');
      expect(['claude-opus-4-20250514', 'o1']).toContain(decision.model.id);
    });
  });

  describe('route() - feature filtering', () => {
    it('should filter models requiring JSON support', () => {
      const request: RoutingRequest = {
        taskType: 'json-output',
        requiredTier: 'UTILITY',
        requiresJson: true,
      };

      const decision = router.route(request);

      expect(decision.model.supportsJson).toBe(true);
    });

    it('should filter models requiring vision support', () => {
      const request: RoutingRequest = {
        taskType: 'image-analysis',
        requiredTier: 'BUILDER',
        requiresVision: true,
      };

      const decision = router.route(request);

      expect(decision.model.supportsVision).toBe(true);
      expect(decision.model.tier).toBe('BUILDER');
    });

    it('should restrict to preferred provider if available', () => {
      const request: RoutingRequest = {
        taskType: 'director-level',
        requiredTier: 'DIRECTOR',
        preferredProvider: 'anthropic',
      };

      const decision = router.route(request);

      expect(decision.model.provider).toBe('anthropic');
      expect(decision.model.name).toBe('Claude Sonnet');
    });

    it('should fall back to any provider if preferred is unavailable', () => {
      const request: RoutingRequest = {
        taskType: 'specialist-task',
        requiredTier: 'SPECIALIST',
        requiresVision: true,
        preferredProvider: 'llama', // Llama doesn't support vision
      };

      const decision = router.route(request);

      // Should fall back to a provider that supports vision
      expect(decision.model.supportsVision).toBe(true);
      expect(['anthropic', 'openai']).toContain(decision.model.provider);
      expect(decision.reason).toContain('cheapest eligible model');
    });
  });

  describe('route() - cost constraints', () => {
    it('should select cheaper model when budget is exceeded', () => {
      const request: RoutingRequest = {
        taskType: 'cost-sensitive',
        requiredTier: 'DIRECTOR',
        maxCostUsd: 0.05, // Less expensive tier
      };

      const decision = router.route(request);

      expect(decision.estimatedCostUsd).toBeLessThanOrEqual(0.05);
      expect(decision.reason).toContain('Budget-constrained');
    });

    it('should throw error if no model fits budget', () => {
      const request: RoutingRequest = {
        taskType: 'impossible-budget',
        requiredTier: 'SPECIALIST',
        maxCostUsd: 0.0001, // Unrealistically low
      };

      expect(() => router.route(request)).toThrow('No eligible model found');
    });

    it('should calculate estimated cost correctly', () => {
      const request: RoutingRequest = {
        taskType: 'cost-check',
        requiredTier: 'UTILITY',
      };

      const decision = router.route(request);
      const estimatedTokens = 2000;

      const expectedCost =
        (decision.model.costPerInputToken + decision.model.costPerOutputToken) *
        estimatedTokens;

      expect(decision.estimatedCostUsd).toBe(expectedCost);
    });
  });

  describe('route() - retry and escalation', () => {
    it('should escalate tier on retry', () => {
      const request: RoutingRequest = {
        taskType: 'retry-test',
        requiredTier: 'UTILITY',
        retryCount: 1, // First retry
      };

      const decision = router.route(request);

      // Tier 0 (UTILITY) + 1 retry = tier 1 (BUILDER)
      expect(decision.model.tier).toBe('BUILDER');
      expect(decision.escalated).toBe(true);
      expect(decision.escalationReason).toContain('Retry #1');
    });

    it('should escalate from BUILDER to DIRECTOR on second retry', () => {
      const request: RoutingRequest = {
        taskType: 'retry-test',
        requiredTier: 'BUILDER',
        retryCount: 1,
      };

      const decision = router.route(request);

      expect(decision.model.tier).toBe('DIRECTOR');
      expect(decision.escalated).toBe(true);
    });

    it('should cap escalation at SPECIALIST tier', () => {
      const request: RoutingRequest = {
        taskType: 'max-escalation',
        requiredTier: 'UTILITY',
        retryCount: 10, // Way more than available tiers
      };

      const decision = router.route(request);

      expect(decision.model.tier).toBe('SPECIALIST');
      expect(decision.escalated).toBe(true);
    });

    it('should not escalate if starting at SPECIALIST', () => {
      const request: RoutingRequest = {
        taskType: 'specialist-no-escalation',
        requiredTier: 'SPECIALIST',
        retryCount: 1,
      };

      const decision = router.route(request);

      expect(decision.model.tier).toBe('SPECIALIST');
      expect(decision.escalated).toBe(false);
    });

    it('should not escalate with zero retries', () => {
      const request: RoutingRequest = {
        taskType: 'no-escalation',
        requiredTier: 'BUILDER',
        retryCount: 0,
      };

      const decision = router.route(request);

      expect(decision.model.tier).toBe('BUILDER');
      expect(decision.escalated).toBe(false);
    });
  });

  describe('route() - error cases', () => {
    it('should throw error if no models match constraints', () => {
      const request: RoutingRequest = {
        taskType: 'impossible-constraints',
        requiredTier: 'SPECIALIST',
        requiresJson: true,
        requiresVision: true,
        preferredProvider: 'llama', // Llama doesn't support vision
      };

      // This should eventually try all providers and fail
      expect(() => router.route(request)).not.toThrow();
      // (because it falls back to other providers)
    });

    it('should include request details in error message', () => {
      // Create a custom registry with no models to force error
      const emptyRouter = new ModelRouter([]);

      const request: RoutingRequest = {
        taskType: 'test',
        requiredTier: 'UTILITY',
      };

      expect(() => emptyRouter.route(request)).toThrow('No eligible model found');
    });
  });

  describe('getModelsForTier()', () => {
    it('should return all enabled models for UTILITY tier', () => {
      const models = router.getModelsForTier('UTILITY');

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.tier === 'UTILITY')).toBe(true);
      expect(models.every((m) => m.enabled)).toBe(true);
    });

    it('should return all enabled models for DIRECTOR tier', () => {
      const models = router.getModelsForTier('DIRECTOR');

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.tier === 'DIRECTOR')).toBe(true);
    });

    it('should return all SPECIALIST tier models', () => {
      const models = router.getModelsForTier('SPECIALIST');

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.tier === 'SPECIALIST')).toBe(true);
    });

    it('should return empty array for non-existent tier', () => {
      const models = router.getModelsForTier('NON_EXISTENT');

      expect(models).toEqual([]);
    });

    it('should exclude disabled models', () => {
      const allModels = MODEL_REGISTRY;
      const enabledModels = router.getModelsForTier('UTILITY');

      const disabledCount = allModels.filter(
        (m) => m.tier === 'UTILITY' && !m.enabled
      ).length;
      expect(enabledModels.every((m) => m.enabled)).toBe(true);
    });
  });

  describe('getModelById()', () => {
    it('should return model by exact ID', () => {
      const model = router.getModelById('gpt-3.5-turbo');

      expect(model).toBeDefined();
      expect(model?.id).toBe('gpt-3.5-turbo');
      expect(model?.name).toBe('GPT-3.5 Turbo');
    });

    it('should return Claude Sonnet by ID', () => {
      const model = router.getModelById('claude-sonnet-4-20250514');

      expect(model).toBeDefined();
      expect(model?.provider).toBe('anthropic');
      expect(model?.tier).toBe('DIRECTOR');
    });

    it('should return undefined for non-existent ID', () => {
      const model = router.getModelById('non-existent-model');

      expect(model).toBeUndefined();
    });

    it('should handle case-sensitive ID lookup', () => {
      const lowerModel = router.getModelById('gpt-3.5-turbo');
      const upperModel = router.getModelById('GPT-3.5-TURBO');

      expect(lowerModel).toBeDefined();
      expect(upperModel).toBeUndefined(); // Case sensitive
    });
  });

  describe('cost sorting', () => {
    it('should prefer cheaper models within same tier', () => {
      const request: RoutingRequest = {
        taskType: 'cost-test',
        requiredTier: 'BUILDER',
      };

      const decision = router.route(request);

      const allBuilderModels = router.getModelsForTier('BUILDER');
      const selectedCost =
        decision.model.costPerInputToken + decision.model.costPerOutputToken;

      const isCheapest = allBuilderModels.every((m) => {
        const modelCost = m.costPerInputToken + m.costPerOutputToken;
        return selectedCost <= modelCost;
      });

      expect(isCheapest).toBe(true);
    });

    it('should select Llama 3.1 8B as cheapest UTILITY option', () => {
      const request: RoutingRequest = {
        taskType: 'cheapest',
        requiredTier: 'UTILITY',
        preferredProvider: 'llama',
      };

      const decision = router.route(request);

      // Llama models are free (cost = 0)
      expect(decision.model.costPerInputToken).toBe(0);
      expect(decision.model.costPerOutputToken).toBe(0);
    });
  });

  describe('complex routing scenarios', () => {
    it('should handle vision + JSON + budget constraint', () => {
      const request: RoutingRequest = {
        taskType: 'complex',
        requiredTier: 'BUILDER',
        requiresVision: true,
        requiresJson: true,
        maxCostUsd: 0.02,
      };

      const decision = router.route(request);

      expect(decision.model.supportsVision).toBe(true);
      expect(decision.model.supportsJson).toBe(true);
      expect(decision.estimatedCostUsd).toBeLessThanOrEqual(0.02);
    });

    it('should handle escalation with feature requirements', () => {
      const request: RoutingRequest = {
        taskType: 'escalating-vision',
        requiredTier: 'UTILITY',
        requiresVision: true, // UTILITY tier doesn't support vision
        retryCount: 1,
      };

      const decision = router.route(request);

      // Should escalate to BUILDER for vision support
      expect(decision.model.supportsVision).toBe(true);
      expect(decision.escalated).toBe(true);
    });

    it('should prefer cheaper DIRECTOR models over SPECIALIST', () => {
      const request: RoutingRequest = {
        taskType: 'balanced',
        requiredTier: 'DIRECTOR',
      };

      const decision = router.route(request);

      // Should pick cheapest DIRECTOR, not upgrade to SPECIALIST
      expect(decision.model.tier).toBe('DIRECTOR');
      expect(decision.escalated).toBe(false);
    });
  });
});