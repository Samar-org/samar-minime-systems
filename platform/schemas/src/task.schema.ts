import { z } from 'zod';
import { TaskStatusSchema, AgentTierSchema } from './enums.js';

export const CreateTaskSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  projectId: z.string().cuid(),
  workflowId: z.string().cuid().optional(),
  parentTaskId: z.string().cuid().optional(),
  agentTier: AgentTierSchema.optional(),
  priority: z.number().int().min(0).max(100).default(0),
  maxRetries: z.number().int().min(0).max(10).default(3),
  budgetLimitUsd: z.number().min(0).default(5),
  input: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const TaskFilterSchema = z.object({
  projectId: z.string().cuid().optional(),
  workflowId: z.string().cuid().optional(),
  status: TaskStatusSchema.optional(),
  agentTier: AgentTierSchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type TaskFilter = z.infer<typeof TaskFilterSchema>;
