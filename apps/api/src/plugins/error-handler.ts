import type { FastifyInstance } from 'fastify';

export async function errorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';

    fastify.log.error(error);

    reply.status(statusCode).send({
      error: {
        statusCode,
        message,
      },
    });
  });
}
