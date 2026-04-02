import { z } from 'zod';

export const DocumentTypeSchema = z.enum([
  'API',
  'USER_GUIDE',
  'DEVELOPER_GUIDE',
  'README',
  'CHANGELOG',
  'ARCHITECTURE',
  'CUSTOM'
]);

export const DocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: DocumentTypeSchema,
  content: z.string(),
  metadata: z.object({
    author: z.string().optional(),
    version: z.string(),
    lastUpdated: z.date(),
    tags: z.array(z.string()).optional()
  })
});

export const DocumentationProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  documents: z.array(DocumentSchema),
  generatedAt: z.date()
});

export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type DocumentationProject = z.infer<typeof DocumentationProjectSchema>;
