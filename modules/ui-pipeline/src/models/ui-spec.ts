import { z } from 'zod';

export const UIComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['BUTTON', 'CARD', 'FORM', 'LAYOUT', 'MODAL', 'CUSTOM']),
  props: z.record(z.any()).optional(),
  children: z.array(z.lazy(() => UIComponentSchema)).optional(),
  styles: z.record(z.string()).optional()
});

export const UISpecSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  description: z.string(),
  components: z.array(UIComponentSchema),
  design: z.object({
    colors: z.array(z.string()).optional(),
    typography: z.object({
      fontFamily: z.string().optional(),
      sizes: z.array(z.number()).optional()
    }).optional(),
    spacing: z.array(z.number()).optional()
  }),
  version: z.string().default('1.0.0'),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type UIComponent = z.infer<typeof UIComponentSchema>;
export type UISpec = z.infer<typeof UISpecSchema>;
