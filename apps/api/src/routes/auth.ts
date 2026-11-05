import type { FastifyInstance } from 'fastify';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: { email: string; password: string } }>('/login', async (request, reply) => {
    // Auth implementation
    reply.code(503); return { error: 'Use the configured headquarters Google identity provider' };
  });

  fastify.post<{ Body: { email: string } }>('/logout', async (request, reply) => {
    reply.code(503); return { error: 'Identity provider session management is not connected' };
  });
}
