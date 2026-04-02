import type { FastifyInstance } from 'fastify';

export async function uiPipelineRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, _reply) => {
    return { uiPipeline: [] };
  });

  fastify.post('/', async (request, _reply) => {
    return { id: 'ui-pipeline-1', ...request.body };
  });
}
