import type { FastifyInstance } from 'fastify';

export async function campaignRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, _reply) => {
    return { campaigns: [] };
  });

  fastify.post('/', async (request, _reply) => {
    return { id: 'campaign-1', ...request.body };
  });
}
