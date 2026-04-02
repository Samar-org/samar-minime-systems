import { z } from 'zod';

const ecommerceConfigSchema = z.object({
  projectId: z.string(),
  storeUrl: z.string().url(),
  apiKey: z.string(),
  platforms: z.array(z.enum(['shopify', 'woocommerce', 'custom'])),
  agents: z.object({
    research: z.string(),
    creative: z.string(),
    marketing: z.string(),
    analytics: z.string(),
  }),
});

export type EcommerceConfig = z.infer<typeof ecommerceConfigSchema>;

export function loadEcommerceConfig(): EcommerceConfig {
  return ecommerceConfigSchema.parse({
    projectId: process.env.PROJECT_ID,
    storeUrl: process.env.STORE_URL,
    apiKey: process.env.STORE_API_KEY,
    platforms: (process.env.PLATFORMS || 'shopify').split(','),
    agents: {
      research: process.env.RESEARCH_AGENT_ID || 'research-ecommerce',
      creative: process.env.CREATIVE_AGENT_ID || 'creative-ecommerce',
      marketing: process.env.MARKETING_AGENT_ID || 'marketing-ecommerce',
      analytics: process.env.ANALYTICS_AGENT_ID || 'analytics-ecommerce',
    },
  });
}
