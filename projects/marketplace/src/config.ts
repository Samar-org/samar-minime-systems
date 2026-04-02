import { z } from 'zod';

const marketplaceConfigSchema = z.object({
  projectId: z.string(),
  platforms: z.array(z.string()),
  agents: z.object({
    growth: z.string(),
    vendor: z.string(),
    content: z.string(),
    support: z.string(),
  }),
});

export type MarketplaceConfig = z.infer<typeof marketplaceConfigSchema>;

export function loadMarketplaceConfig(): MarketplaceConfig {
  return marketplaceConfigSchema.parse({
    projectId: process.env.PROJECT_ID,
    platforms: (process.env.PLATFORMS || 'shopify').split(','),
    agents: {
      growth: process.env.GROWTH_AGENT_ID || 'growth-marketplace',
      vendor: process.env.VENDOR_AGENT_ID || 'vendor-marketplace',
      content: process.env.CONTENT_AGENT_ID || 'content-marketplace',
      support: process.env.SUPPORT_AGENT_ID || 'support-marketplace',
    },
  });
}
