import type { FastifyInstance } from 'fastify';
import { unavailable } from '../middleware/unavailable.js';

// The authoritative Headquarters owner must be connected before this route is enabled.
export async function taskRoutes(fastify: FastifyInstance) {
  fastify.get('/', unavailable);
  fastify.post('/', unavailable);
}
