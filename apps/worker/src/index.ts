import { NativeConnection, Worker } from '@temporalio/worker';
import { fileURLToPath } from 'node:url';
import * as activities from './activities.js';
import { getLogger } from '@samar/observability';
const logger=getLogger('temporal-worker');
/** Recovery spec §3: connection and activity bindings use the installed Temporal API. */
async function run():Promise<void>{
 if(process.env.ENABLE_AGENT_EXECUTION!=='true')throw new Error('Worker execution is disabled pending scoped integration acceptance');
 const connection=await NativeConnection.connect({address:process.env.TEMPORAL_ADDRESS??'localhost:7233'});
 try{
  const worker=await Worker.create({connection,workflowsPath:fileURLToPath(new URL('./workflows.js',import.meta.url)),activities,
   taskQueue:process.env.TASK_QUEUE??'samar-minime-main',namespace:process.env.TEMPORAL_NAMESPACE??'samar-minime'});
  await worker.run();
 }finally{await connection.close();}
}
run().catch(error=>{logger.error({error:error instanceof Error?error.message:'Worker startup failed'},'Worker stopped');process.exitCode=1;});
