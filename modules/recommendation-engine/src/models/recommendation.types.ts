import { z } from 'zod';

export const RecommendationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  score: z.number().min(0).max(1),
  reason: z.string(),
  timestamp: z.date()
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

export const RecommendationRequestSchema = z.object({
  userId: z.string(),
  count: z.number().default(5),
  filters: z.object({}).passthrough().optional()
});

export type RecommendationRequest = z.infer<typeof RecommendationRequestSchema>;
