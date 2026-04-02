import type { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, _reply) => {
    return { status: 'ok' };
  });

  fastify.get('/ready', async (_request, _reply) => {
    // Add readiness checks here
    return { ready: true };
  });
}
