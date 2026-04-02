import type { FastifyInstance } from 'fastify';
import { startWorkflow } from '../lib/temporal-client.js';

export async function workflowRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, _reply) => {
    return { workflows: [] };
  });

  fastify.post('/', async (request, _reply) => {
    const { type, args } = request.body as { type: string; args: unknown[] };
    const workflowId = await startWorkflow(type as any, args);
    return { workflowId };
  });
}
