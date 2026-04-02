import { z } from 'zod';
import { AgentTierSchema, AgentRunStatusSchema } from './enums.js';

export const AgentConfigSchema = z.object({
  name: z.string().min(1).max(100),
  tier: AgentTierSchema,
  description: z.string().max(1000).optional(),
  systemPrompt: z.string().optional(),
  defaultModel: z.string().min(1),
  maxTokens: z.number().int().min(1).max(128000).default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  capabilities: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const AgentRunResultSchema = z.object({
  agentRunId: z.string(),
  status: AgentRunStatusSchema,
  modelUsed: z.string(),
  tier: AgentTierSchema,
  promptTokens: z.number().int(),
  completionTokens: z.number().int(),
  totalTokens: z.number().int(),
  costUsd: z.number(),
  latencyMs: z.number().int(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  qualityScore: z.number().min(0).max(100).optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type AgentRunResult = z.infer<typeof AgentRunResultSchema>;
