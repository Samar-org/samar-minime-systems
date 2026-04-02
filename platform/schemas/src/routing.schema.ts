import { z } from 'zod';
import { AgentTierSchema } from './enums.js';

export const ModelSpecSchema = z.object({
  id: z.string(),
  provider: z.enum(['openai', 'anthropic', 'llama']),
  name: z.string(),
  tier: AgentTierSchema,
  costPerInputToken: z.number(),
  costPerOutputToken: z.number(),
  maxTokens: z.number().int(),
  supportsJson: z.boolean().default(true),
  supportsVision: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

export const RoutingRequestSchema = z.object({
  taskType: z.string(),
  requiredTier: AgentTierSchema.optional(),
  maxCostUsd: z.number().optional(),
  retryCount: z.number().int().default(0),
  confidenceThreshold: z.number().min(0).max(100).default(70),
  requiresJson: z.boolean().default(true),
  requiresVision: z.boolean().default(false),
  preferredProvider: z.enum(['openai', 'anthropic', 'llama']).optional(),
});

export const RoutingDecisionSchema = z.object({
  model: ModelSpecSchema,
  reason: z.string(),
  estimatedCostUsd: z.number(),
  escalated: z.boolean(),
  escalationReason: z.string().optional(),
});

export type ModelSpec = z.infer<typeof ModelSpecSchema>;
export type RoutingRequest = z.infer<typeof RoutingRequestSchema>;
export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;
