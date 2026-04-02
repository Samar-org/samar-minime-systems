import type { FastifyRequest, FastifyReply } from 'fastify';

export async function validateRequest(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  // Validate Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    if (request.method !== 'GET' && !request.is('application/json')) {
      throw new Error('Content-Type must be application/json');
    }
  }

  // Additional validation can be added here
  // For example: request signing, rate limiting, etc.
}
