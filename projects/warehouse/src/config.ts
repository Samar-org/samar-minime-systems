import { z } from 'zod';

const warehouseConfigSchema = z.object({
  projectId: z.string(),
  teamSize: z.number(),
  agents: z.object({
    documentation: z.string(),
    training: z.string(),
    ops: z.string(),
  }),
});

export type WarehouseConfig = z.infer<typeof warehouseConfigSchema>;

export function loadWarehouseConfig(): WarehouseConfig {
  return warehouseConfigSchema.parse({
    projectId: process.env.PROJECT_ID,
    teamSize: parseInt(process.env.TEAM_SIZE || '10', 10),
    agents: {
      documentation: process.env.DOCS_AGENT_ID || 'docs-warehouse',
      training: process.env.TRAINING_AGENT_ID || 'training-warehouse',
      ops: process.env.OPS_AGENT_ID || 'ops-warehouse',
    },
  });
}
