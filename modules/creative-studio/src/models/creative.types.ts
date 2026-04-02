import { z } from 'zod';

export const CreativeAssetSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['image', 'video', 'text', 'audio']),
  url: z.string().url(),
  createdBy: z.string(),
  tags: z.array(z.string()),
  createdAt: z.date()
});

export type CreativeAsset = z.infer<typeof CreativeAssetSchema>;

export const CreativeProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  assets: z.array(CreativeAssetSchema),
  status: z.enum(['draft', 'review', 'approved', 'published']),
  createdAt: z.date()
});

export type CreativeProject = z.infer<typeof CreativeProjectSchema>;
