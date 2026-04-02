import type { FastifyInstance } from 'fastify';

export async function crmRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, _reply) => {
    return { crm: [] };
  });

  fastify.post('/', async (request, _reply) => {
    return { id: 'crm-1', ...request.body };
  });
}
