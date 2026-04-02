import { z } from 'zod';

export const AssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['image', 'video', 'document', 'font', 'icon']),
  url: z.string().url(),
  size: z.number(),
  uploadedBy: z.string(),
  tags: z.array(z.string()),
  createdAt: z.date()
});

export type Asset = z.infer<typeof AssetSchema>;

export const AssetLibrarySchema = z.object({
  id: z.string(),
  name: z.string(),
  assets: z.array(AssetSchema),
  createdAt: z.date()
});

export type AssetLibrary = z.infer<typeof AssetLibrarySchema>;
