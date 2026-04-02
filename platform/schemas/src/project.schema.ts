import { z } from 'zod';
import { ProjectStatusSchema } from './enums.js';

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  orgId: z.string().cuid(),
  budgetLimitUsd: z.number().min(0).default(100),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().omit({ orgId: true });

export const ProjectFilterSchema = z.object({
  status: ProjectStatusSchema.optional(),
  orgId: z.string().cuid().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
export type ProjectFilter = z.infer<typeof ProjectFilterSchema>;
