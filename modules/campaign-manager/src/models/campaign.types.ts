import { z } from 'zod';

export const CampaignStatusSchema = z.enum([
  'PLANNING',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'ARCHIVED'
]);

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: CampaignStatusSchema,
  startDate: z.date(),
  endDate: z.date(),
  objective: z.string(),
  targetAudience: z.array(z.string()),
  budget: z.number(),
  channels: z.array(z.string()),
  metrics: z.object({
    reach: z.number().default(0),
    engagement: z.number().default(0),
    conversions: z.number().default(0),
    roi: z.number().default(0)
  }).optional()
});

export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
export type Campaign = z.infer<typeof CampaignSchema>;
