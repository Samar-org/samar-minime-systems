import type { FastifyInstance } from 'fastify';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: { email: string; password: string } }>('/login', async (request, reply) => {
    // Auth implementation
    return { token: 'placeholder' };
  });

  fastify.post<{ Body: { email: string } }>('/logout', async (request, reply) => {
    return { success: true };
  });
}
