import type { FastifyInstance } from 'fastify';

export async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, _reply) => {
    return { metrics: [] };
  });
}
