import { z } from 'zod';

export const CreativeTypeSchema = z.enum([
  'COPYWRITING',
  'DESIGN',
  'VIDEO',
  'PHOTOGRAPHY',
  'ANIMATION',
  'AUDIO',
  'INTERACTIVE'
]);

export const CreativeSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: CreativeTypeSchema,
  description: z.string().optional(),
  content: z.string(),
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED']),
  author: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  tags: z.array(z.string()).optional()
});

export type CreativeType = z.infer<typeof CreativeTypeSchema>;
export type Creative = z.infer<typeof CreativeSchema>;
