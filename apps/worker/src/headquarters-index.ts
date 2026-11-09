import { hostname } from 'node:os';
import { getLogger } from '@samar/observability';
import { HeadquartersClient,dispatchOnce } from './headquarters-client.js';
import { HeadquartersExecutor } from './headquarters-executor.js';

const logger=getLogger('headquarters-dispatcher');
const environment=(value:string|undefined):'development'|'staging'|'production'=>{
 if(value==='development'||value==='staging'||value==='production')return value;throw new Error('Exact Headquarters environment is not configured');
};
const positiveInteger=(value:string|undefined):number=>{const parsed=Number(value);if(!Number.isSafeInteger(parsed)||parsed<1)throw new Error('Exact Headquarters project is not configured');return parsed;};
const required=(name:string):string=>{const value=process.env[name];if(!value)throw new Error(`${name} is not configured`);return value;};
const delay=(milliseconds:number,signal:AbortSignal)=>new Promise<void>(resolve=>{const timer=setTimeout(resolve,milliseconds);signal.addEventListener('abort',()=>{clearTimeout(timer);resolve();},{once:true});});

export async function runHeadquartersDispatcher(signal:AbortSignal):Promise<void>{
 if(process.env.ENABLE_HEADQUARTERS_EXECUTION!=='true')throw new Error('Headquarters execution is disabled pending scoped integration acceptance');
 const client=new HeadquartersClient({url:required('HQ_SUPABASE_URL'),anonKey:required('HQ_SUPABASE_ANON_KEY'),email:required('HQ_MACHINE_EMAIL'),password:required('HQ_MACHINE_PASSWORD'),projectId:positiveInteger(process.env.HQ_PROJECT_ID),environment:environment(process.env.HQ_ENVIRONMENT)});
 const executor=new HeadquartersExecutor();const recoveryEvidence=`worker-recovery:${hostname()}`;
 while(!signal.aborted){
  try{
   const recovered=await client.recoverExpired(recoveryEvidence);
   if(recovered){logger.warn({runId:recovered.runId},'Expired Headquarters attempt marked uncertain');continue;}
   const result=await dispatchOnce(client,lease=>executor.execute(lease));
   if(result==='idle')await delay(2000,signal);else logger.info({runId:result.runId,status:result.status},'Headquarters dispatch outcome recorded');
  }catch{logger.error('Headquarters dispatcher cycle failed closed');await delay(5000,signal);}
 }
}

const controller=new AbortController();process.once('SIGTERM',()=>controller.abort());process.once('SIGINT',()=>controller.abort());
runHeadquartersDispatcher(controller.signal).catch(()=>{logger.error('Headquarters dispatcher stopped during startup');process.exitCode=1;});
