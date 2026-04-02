import { z } from 'zod';

export const AdFormatSchema = z.enum([
  'BANNER',
  'INTERSTITIAL',
  'NATIVE',
  'VIDEO',
  'CAROUSEL',
  'COLLECTION'
]);

export const AdSchema = z.object({
  id: z.string(),
  format: AdFormatSchema,
  headline: z.string(),
  description: z.string(),
  creative: z.string(),
  targetAudience: z.array(z.string()),
  budget: z.number(),
  startDate: z.date(),
  endDate: z.date(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']),
  metrics: z.object({
    impressions: z.number().default(0),
    clicks: z.number().default(0),
    conversions: z.number().default(0)
  }).optional()
});

export type AdFormat = z.infer<typeof AdFormatSchema>;
export type Ad = z.infer<typeof AdSchema>;
