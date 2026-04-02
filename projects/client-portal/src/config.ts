import { z } from 'zod';

const clientPortalConfigSchema = z.object({
  projectId: z.string(),
  reportingFrequency: z.enum(['daily', 'weekly', 'monthly']),
  agents: z.object({
    reporting: z.string(),
    onboarding: z.string(),
    support: z.string(),
  }),
});

export type ClientPortalConfig = z.infer<typeof clientPortalConfigSchema>;

export function loadClientPortalConfig(): ClientPortalConfig {
  return clientPortalConfigSchema.parse({
    projectId: process.env.PROJECT_ID,
    reportingFrequency: process.env.REPORTING_FREQUENCY || 'monthly',
    agents: {
      reporting: process.env.REPORTING_AGENT_ID || 'reporting-portal',
      onboarding: process.env.ONBOARDING_AGENT_ID || 'onboarding-portal',
      support: process.env.SUPPORT_AGENT_ID || 'support-portal',
    },
  });
}
