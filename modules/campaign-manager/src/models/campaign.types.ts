import { z } from 'zod';

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  budget: z.number(),
  startDate: z.date(),
  endDate: z.date(),
  status: z.enum(['planning', 'active', 'paused', 'completed']),
  createdAt: z.date()
});

export type Campaign = z.infer<typeof CampaignSchema>;

export const CampaignMetricsSchema = z.object({
  campaignId: z.string(),
  impressions: z.number(),
  clicks: z.number(),
  conversions: z.number(),
  spent: z.number()
});

export type CampaignMetrics = z.infer<typeof CampaignMetricsSchema>;
