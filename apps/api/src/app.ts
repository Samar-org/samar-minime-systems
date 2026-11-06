import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { errorHandler } from './plugins/error-handler.js';
import { validateRequest } from './middleware/validate.js';
import { requireHeadquartersBridge } from './middleware/unavailable.js';
import { authRoutes } from './routes/auth.js';
import { projectRoutes } from './routes/projects.js';
import { workflowRoutes } from './routes/workflows.js';
import { taskRoutes } from './routes/tasks.js';
import { agentRoutes } from './routes/agents.js';
import { researchRoutes } from './routes/research.js';
import { campaignRoutes } from './routes/campaigns.js';
import { crmRoutes } from './routes/crm.js';
import { approvalRoutes } from './routes/approvals.js';
import { metricsRoutes } from './routes/metrics.js';
import { creativeRoutes } from './routes/creative.js';
import { uiPipelineRoutes } from './routes/ui-pipeline.js';
import { healthRoutes } from './routes/health.js';

export async function buildServer() {
  const server = Fastify({
    logger: true,
  });

  // Register plugins
  await server.register(cors);
  await server.register(helmet);
  await server.register(errorHandler);

  // Global middleware
  server.addHook('preHandler', validateRequest);
  server.addHook('preHandler', requireHeadquartersBridge);

  // Register routes
  await server.register(healthRoutes, { prefix: '/health' });
  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(projectRoutes, { prefix: '/projects' });
  await server.register(workflowRoutes, { prefix: '/workflows' });
  await server.register(taskRoutes, { prefix: '/tasks' });
  await server.register(agentRoutes, { prefix: '/agents' });
  await server.register(researchRoutes, { prefix: '/research' });
  await server.register(campaignRoutes, { prefix: '/campaigns' });
  await server.register(crmRoutes, { prefix: '/crm' });
  await server.register(approvalRoutes, { prefix: '/approvals' });
  await server.register(metricsRoutes, { prefix: '/metrics' });
  await server.register(creativeRoutes, { prefix: '/creative' });
  await server.register(uiPipelineRoutes, { prefix: '/ui-pipeline' });

  return server;
}
