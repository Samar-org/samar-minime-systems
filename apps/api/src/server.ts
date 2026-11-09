import { buildServer } from './app.js';
export { buildServer } from './app.js';
const PORT = parseInt(process.env.API_PORT ?? '3000', 10);
const HOST = process.env.API_HOST ?? '0.0.0.0';
async function start() {
 const server=await buildServer();
 await server.listen({port:PORT,host:HOST});
}
start().catch(error=>{console.error(error);process.exit(1);});
