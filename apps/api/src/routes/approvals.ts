import type { FastifyInstance } from 'fastify';

export async function approvalRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, _reply) => {
    return { approvals: [] };
  });

  fastify.post('/', async (request, _reply) => {
    return { id: 'approval-1', ...request.body };
  });
}
