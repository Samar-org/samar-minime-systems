import { z } from 'zod';

export const ProjectPhaseSchema = z.enum([
  'INTAKE',
  'STRATEGY',
  'PRODUCT',
  'DESIGN',
  'ENGINEERING',
  'QA',
  'RELEASE',
  'GROWTH',
  'OPS',
  'RETROSPECTIVE',
]);

export type ProjectPhase = z.infer<typeof ProjectPhaseSchema>;

export const ProjectConfigSchema = z.object({
  slug: z.string().describe('URL-friendly project identifier'),
  name: z.string(),
  description: z.string().optional(),
  modules: z.array(z.string()).describe('Feature modules/epics'),
  pipelines: z.array(z.string()).describe('Associated workflow pipeline types'),
  budgetUsd: z.number().default(100),
  agentPreferences: z
    .object({
      preferredTier: z.string().optional(),
      modelPreference: z.string().optional(),
    })
    .optional(),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export const PhaseGateSchema = z.object({
  phase: ProjectPhaseSchema,
  requiredApprovals: z.array(z.string()).default([]).describe('User roles that must approve'),
  requiredArtifacts: z.array(z.string()).default([]).describe('Artifact types that must exist'),
  autoAdvance: z.boolean().default(false).describe('Auto-advance to next phase if gates met'),
});

export type PhaseGate = z.infer<typeof PhaseGateSchema>;

export const ProjectStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']);

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const PhaseStatusSchema = z.object({
  phase: ProjectPhaseSchema,
  completionPercent: z.number().min(0).max(100),
  blockingItems: z.array(z.string()),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  duration: z.object({
    plannedDays: z.number(),
    actualDays: z.number().optional(),
  }),
});

export type PhaseStatus = z.infer<typeof PhaseStatusSchema>;

export const ProjectDashboardSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  currentPhase: ProjectPhaseSchema,
  status: ProjectStatusSchema,
  phaseStatus: PhaseStatusSchema,
  workflowCount: z.number(),
  taskCount: z.number(),
  totalCostUsd: z.number(),
  budgetRemainingUsd: z.number(),
  qualityScore: z.number().min(0).max(100).optional(),
  lastUpdated: z.date(),
});

export type ProjectDashboard = z.infer<typeof ProjectDashboardSchema>;
