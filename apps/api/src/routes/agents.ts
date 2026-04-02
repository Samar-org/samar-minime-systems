import type { FastifyInstance } from 'fastify';

export async function agentRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, _reply) => {
    return { agents: [] };
  });

  fastify.post('/', async (request, _reply) => {
    return { id: 'agent-1', ...request.body };
  });
}
