import { z } from 'zod';
import { PipelineTypeSchema, WorkflowStatusSchema } from './enums.js';

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  type: PipelineTypeSchema,
  projectId: z.string().cuid(),
  input: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const WorkflowFilterSchema = z.object({
  projectId: z.string().cuid().optional(),
  type: PipelineTypeSchema.optional(),
  status: WorkflowStatusSchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type CreateWorkflow = z.infer<typeof CreateWorkflowSchema>;
export type WorkflowFilter = z.infer<typeof WorkflowFilterSchema>;
