import type { FastifyInstance } from 'fastify';

export async function projectRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, _reply) => {
    return { projects: [] };
  });

  fastify.post('/', async (request, _reply) => {
    return { id: 'project-1', ...request.body };
  });
}
