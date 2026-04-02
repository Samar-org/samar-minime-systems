import { z } from 'zod';

export const AdCreativeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  format: z.enum(['text', 'image', 'video', 'carousel']),
  targetAudience: z.string(),
  createdAt: z.date()
});

export type AdCreative = z.infer<typeof AdCreativeSchema>;

export const AdCampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  creatives: z.array(AdCreativeSchema),
  budget: z.number(),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
  createdAt: z.date()
});

export type AdCampaign = z.infer<typeof AdCampaignSchema>;
