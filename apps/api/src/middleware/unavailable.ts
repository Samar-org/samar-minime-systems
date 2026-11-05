import type { FastifyReply, FastifyRequest } from 'fastify';

export async function unavailable(_request:FastifyRequest,reply:FastifyReply) {
 return reply.code(503).send({error:'Scoped Headquarters backend is not connected'});
}
/** No legacy token or runtime flag may bypass the missing tenant/budget bridge. */
export async function requireHeadquartersBridge(request:FastifyRequest,reply:FastifyReply) {
 const path=request.url.split('?')[0];
 if(['GET','HEAD'].includes(request.method)&&['/health','/health/','/health/ready'].includes(path))return;
 return unavailable(request,reply);
}
