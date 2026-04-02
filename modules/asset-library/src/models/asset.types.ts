import { z } from 'zod';

export const AssetTypeSchema = z.enum([
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'DOCUMENT',
  'TEMPLATE',
  'FONT',
  'ICON',
  'OTHER'
]);

export const AssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AssetTypeSchema,
  url: z.string(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.string().default('1.0.0')
});

export const AssetLibrarySchema = z.object({
  id: z.string(),
  name: z.string(),
  assets: z.array(AssetSchema),
  createdAt: z.date()
});

export type AssetType = z.infer<typeof AssetTypeSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type AssetLibrary = z.infer<typeof AssetLibrarySchema>;
