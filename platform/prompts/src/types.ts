import { z } from 'zod';

export const PromptVariableTypeSchema = z.enum(['string', 'number', 'json', 'array']);

export type PromptVariableType = z.infer<typeof PromptVariableTypeSchema>;

export const PromptVariableSchema = z.object({
  name: z.string(),
  type: PromptVariableTypeSchema,
  required: z.boolean().default(true),
  description: z.string(),
  default: z.any().optional(),
});

export type PromptVariable = z.infer<typeof PromptVariableSchema>;

export const PromptTemplateConfigSchema = z.object({
  id: z.string().describe('Unique identifier for the template'),
  name: z.string(),
  category: z.string().describe('Category: research, ads, creative, seo, documentation, etc.'),
  template: z.string().describe('Template with {{variable}} placeholders'),
  variables: z.array(PromptVariableSchema),
  version: z.number().default(1),
  modelHints: z
    .object({
      preferredModel: z.string().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
    })
    .optional(),
});

export type PromptTemplateConfig = z.infer<typeof PromptTemplateConfigSchema>;

export const RenderVariablesSchema = z.record(z.any());

export type RenderVariables = z.infer<typeof RenderVariablesSchema>;
