import { z } from 'zod';

export const SEOMetricSchema = z.object({
  keyword: z.string(),
  ranking: z.number().optional(),
  searchVolume: z.number().optional(),
  difficulty: z.number().optional(),
  ctr: z.number().optional()
});

export const SEOOptimizationSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  title: z.string(),
  metaDescription: z.string(),
  keywords: z.array(z.string()),
  headings: z.array(z.string()),
  internalLinks: z.array(z.string()).optional(),
  readabilityScore: z.number().optional(),
  createdAt: z.date()
});

export const SEOReportSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  metrics: z.array(SEOMetricSchema),
  optimizations: z.array(SEOOptimizationSchema),
  score: z.number().min(0).max(100),
  recommendations: z.array(z.string()).optional()
});

export type SEOMetric = z.infer<typeof SEOMetricSchema>;
export type SEOOptimization = z.infer<typeof SEOOptimizationSchema>;
export type SEOReport = z.infer<typeof SEOReportSchema>;
