import type { FastifyRequest, FastifyReply } from 'fastify';

export async function validateRequest(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  // Validate Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    if (!request.headers['content-type']?.split(';')[0]?.trim().toLowerCase().match(/^application\/json$/)) {
      return _reply.code(415).send({ error: 'Content-Type must be application/json' });
    }
  }

  // Additional validation can be added here
  // For example: request signing, rate limiting, etc.
}
