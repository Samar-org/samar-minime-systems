import { z } from 'zod';

export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  agentId: z.string().describe('Agent identifier or role'),
  tier: z.enum(['UTILITY', 'BUILDER', 'DIRECTOR', 'SPECIALIST']),
  dependsOn: z.array(z.string()).default([]).describe('Array of step IDs this step depends on'),
  budgetUsd: z.number().default(5),
  retryPolicy: z
    .object({
      maxAttempts: z.number().default(3),
      backoffMs: z.number().default(1000),
      escalateOnRetry: z.boolean().default(false),
    })
    .optional(),
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const RetryPolicySchema = z.object({
  maxAttempts: z.number().min(1).default(3),
  backoffMs: z.number().min(0).default(1000),
  escalateOnRetry: z.boolean().default(false),
});

export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

export const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  pipelineType: z.string().describe('Pipeline type: MARKET_RESEARCH, DEVELOPMENT, etc.'),
  steps: z.array(WorkflowStepSchema),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

export const WorkflowEventTypeSchema = z.enum([
  'STARTED',
  'STEP_COMPLETED',
  'STEP_FAILED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export type WorkflowEventType = z.infer<typeof WorkflowEventTypeSchema>;

export const WorkflowEventSchema = z.object({
  type: WorkflowEventTypeSchema,
  timestamp: z.date(),
  data: z.record(z.any()).optional(),
});

export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;
