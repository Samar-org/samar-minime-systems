import type { FastifyInstance } from 'fastify';

export async function taskRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, _reply) => {
    return { tasks: [] };
  });

  fastify.post('/', async (request, _reply) => {
    return { id: 'task-1', ...request.body };
  });
}
