import { z } from 'zod';

export const DatasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  samples: z.number(),
  format: z.enum(['json', 'csv', 'parquet']),
  createdAt: z.date()
});

export type Dataset = z.infer<typeof DatasetSchema>;

export const TrainingJobSchema = z.object({
  id: z.string(),
  datasetId: z.string(),
  modelType: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  metrics: z.object({}).passthrough().optional()
});

export type TrainingJob = z.infer<typeof TrainingJobSchema>;
