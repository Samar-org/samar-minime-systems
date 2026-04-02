import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { errorHandler } from './plugins/error-handler.js';
import { validateRequest } from './middleware/validate.js';
import { authenticate } from '@samar/auth';
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

const PORT = parseInt(process.env.API_PORT ?? '3000', 10);
const HOST = process.env.API_HOST ?? '0.0.0.0';

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
  server.addHook('preHandler', authenticate);

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

async function start() {
  const server = await buildServer();
  await server.listen({ port: PORT, host: HOST });
  console.log(`API server listening on ${HOST}:${PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
