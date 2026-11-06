import type { AgentRunResult, AgentTier } from '@samar/schemas';
import type { ProviderAdapter } from '@samar/providers';
import { ModelRouter } from '@samar/routing';
import type { AgentDefinition } from './types.js';
export interface AgentTask { id:string; description:string; constraints?:{maxTokens?:number;maxCost?:number;maxLatency?:number}; }
export interface AgentInput { prompt:string; maxCostUsd:number; requiresJson?:boolean; timeoutMs?:number; }
export interface AgentRunContext { projectId:string;workflowId:string;taskId:string;budgetRemainingUsd:number;retryCount:number;maxRetries:number; }
export interface AgentOutput { content:string;modelUsed:string;tier:AgentTier;promptTokens:number;completionTokens:number;totalTokens:number;costUsd:number;latencyMs:number; }
interface RuntimeOptions {
 router:ModelRouter;providers:Map<string,ProviderAdapter>;
 onRunStart?:(agent:AgentDefinition,input:AgentInput,context:AgentRunContext)=>Promise<string>;
 onRunComplete?:(runId:string,output:AgentOutput)=>Promise<void>;
 onRunError?:(runId:string,error:Error)=>Promise<void>;
}
/** One provider execution boundary; never reports estimated usage as actual. Recovery spec §2. */
export class AgentRuntime {
 private router:ModelRouter;private adapters:Map<string,ProviderAdapter>;private options?:RuntimeOptions;
 constructor(input:ModelRouter|RuntimeOptions){
  if(input instanceof ModelRouter){this.router=input;this.adapters=new Map();}
  else{this.router=input.router;this.adapters=input.providers;this.options=input;}
 }
 /** Registers an explicitly configured provider; never discovers credentials. */
 registerAdapter(provider:string,adapter:ProviderAdapter):void{this.adapters.set(provider,adapter);}
 /** Executes once with budget preflight, a deadline and provider-backed usage. No tool or deployment permissions are granted here. */
 async execute(agent:AgentDefinition,input:AgentInput,context:AgentRunContext):Promise<AgentOutput>{
  const started=Date.now();let runId=context.taskId;
  const budget=Math.min(input.maxCostUsd,context.budgetRemainingUsd);
  if(!Number.isFinite(budget)||budget<=0)throw new RangeError('A positive finite budget is required');
  const timeout=input.timeoutMs??120000;
  if(!Number.isSafeInteger(timeout)||timeout<1||timeout>3600000)throw new RangeError('Invalid task timeout');
  const selected=this.router.route({taskType:input.prompt,requiredTier:agent.tier,maxCostUsd:budget,retryCount:context.retryCount,requiresJson:input.requiresJson??false});
  const model=selected.model,adapter=this.adapters.get(model.provider);
  if(!adapter)throw new Error(`No adapter configured for ${model.provider}`);
  if(!Number.isFinite(model.costPerInputToken)||!Number.isFinite(model.costPerOutputToken)||model.costPerInputToken<0||model.costPerOutputToken<0)throw new Error('Invalid model pricing');
  // Conservative UTF-8 byte bound plus message overhead. Prices still need provider verification before enablement.
  const inputBound=Buffer.byteLength(input.prompt+agent.systemPrompt,'utf8')+256;
  const requested=agent.maxTokens??4096;
  const affordable=model.costPerOutputToken>0?Math.floor((budget-inputBound*model.costPerInputToken)/model.costPerOutputToken):requested;
  const maxTokens=Math.min(requested,model.maxTokens-inputBound,affordable);
  if(!Number.isSafeInteger(maxTokens)||maxTokens<1||inputBound*model.costPerInputToken>budget)throw new RangeError('Task cannot fit its budget or model context');
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   runId=await this.options?.onRunStart?.(agent,input,context)??runId;
   const timeoutPromise=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Agent task deadline exceeded'));},timeout);});
   const response=await Promise.race([adapter.complete({model:model.id,messages:[{role:'system',content:agent.systemPrompt},{role:'user',content:input.prompt}],maxTokens,responseFormat:input.requiresJson?'json':'text',maxAttempts:1,signal:controller.signal}),timeoutPromise]);
   if(!Number.isSafeInteger(response.promptTokens)||response.promptTokens<=0||!Number.isSafeInteger(response.completionTokens)||response.completionTokens<0)throw new Error('Provider usage evidence missing or invalid');
   const cost=response.promptTokens*model.costPerInputToken+response.completionTokens*model.costPerOutputToken;
   if(cost>budget)throw new Error('Provider usage exceeded reservation; manual reconciliation required');
   const output:AgentOutput={content:response.content,modelUsed:model.id,tier:model.tier,promptTokens:response.promptTokens,completionTokens:response.completionTokens,totalTokens:response.promptTokens+response.completionTokens,costUsd:cost,latencyMs:Date.now()-started};
   await this.options?.onRunComplete?.(runId,output);return output;
  }catch(error){const failure=error instanceof Error?error:new Error(String(error));await this.options?.onRunError?.(runId,failure);throw failure;}
  finally{if(timer)clearTimeout(timer);}
 }
 /** Legacy caller adapter; failed runs carry unknown tier rather than invented success data. */
 async executeTask(task:AgentTask):Promise<AgentRunResult>{
  const started=Date.now();
  try{const out=await this.execute({id:'legacy-task',name:'Explicit task',tier:'UTILITY',description:task.description,systemPrompt:'Follow the task and permitted scope only.',capabilities:[],maxTokens:task.constraints?.maxTokens},
   {prompt:task.description,maxCostUsd:task.constraints?.maxCost??0,timeoutMs:task.constraints?.maxLatency},
   {projectId:'legacy',workflowId:task.id,taskId:task.id,budgetRemainingUsd:task.constraints?.maxCost??0,retryCount:0,maxRetries:0});
   return {agentRunId:task.id,status:'COMPLETED',modelUsed:out.modelUsed,tier:out.tier,promptTokens:out.promptTokens,completionTokens:out.completionTokens,totalTokens:out.totalTokens,costUsd:out.costUsd,latencyMs:out.latencyMs,output:out.content};
  }catch(error){return {agentRunId:task.id,status:'FAILED',modelUsed:'',tier:null,promptTokens:0,completionTokens:0,totalTokens:0,costUsd:0,latencyMs:Date.now()-started,error:error instanceof Error?error.message:'Execution failed'};}
 }
}
