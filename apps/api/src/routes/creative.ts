import type { FastifyInstance } from 'fastify';

export async function creativeRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, _reply) => {
    return { creative: [] };
  });

  fastify.post('/', async (request, _reply) => {
    return { id: 'creative-1', ...request.body };
  });
}
