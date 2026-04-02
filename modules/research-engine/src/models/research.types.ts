import { z } from 'zod';

export const ResearchTypeSchema = z.enum([
  'MARKET_SCAN',
  'COMPETITOR_ANALYSIS',
  'AUDIENCE_ANALYSIS',
  'PRICING_ANALYSIS',
  'GAP_ANALYSIS',
  'TREND_ANALYSIS',
  'OPPORTUNITY_RANKING'
]);

export const ResearchFindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(100),
  sources: z.array(z.string()).optional(),
  impact: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional()
});

export const ResearchRequestSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  type: ResearchTypeSchema,
  scope: z.string(),
  parameters: z.record(z.any()).optional(),
  findings: z.array(ResearchFindingSchema).optional(),
  qualityScore: z.number().min(0).max(100).optional(),
  createdAt: z.date(),
  completedAt: z.date().optional()
});

export type ResearchType = z.infer<typeof ResearchTypeSchema>;
export type ResearchFinding = z.infer<typeof ResearchFindingSchema>;
export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;
