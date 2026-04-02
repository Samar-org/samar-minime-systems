import type { FastifyInstance } from 'fastify';

export async function researchRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, _reply) => {
    return { research: [] };
  });

  fastify.post('/', async (request, _reply) => {
    return { id: 'research-1', ...request.body };
  });
}
