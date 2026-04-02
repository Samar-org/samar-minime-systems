import { z } from 'zod';

export const PlatformSchema = z.enum([
  'TWITTER',
  'INSTAGRAM',
  'LINKEDIN',
  'FACEBOOK',
  'TIKTOK',
  'YOUTUBE'
]);

export const PostStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'FAILED'
]);

export const PostSchema = z.object({
  id: z.string(),
  content: z.string(),
  platform: PlatformSchema,
  status: PostStatusSchema,
  scheduledAt: z.date().optional(),
  publishedAt: z.date().optional(),
  media: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  engagement: z.object({
    likes: z.number().default(0),
    shares: z.number().default(0),
    comments: z.number().default(0)
  }).optional()
});

export type Platform = z.infer<typeof PlatformSchema>;
export type PostStatus = z.infer<typeof PostStatusSchema>;
export type Post = z.infer<typeof PostSchema>;
