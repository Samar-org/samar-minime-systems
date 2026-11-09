import { describe,it,expect,vi } from 'vitest';
import { AgentRuntime } from '../agent-runtime.js';
import { ModelRouter } from '@samar/routing';
const model={id:'test-model',provider:'openai' as const,name:'Test model',tier:'UTILITY' as const,costPerInputToken:0.000001,costPerOutputToken:0.000002,maxTokens:10000,supportsJson:true,supportsVision:false,enabled:true};
const agent={id:'qa',name:'Independent QA',tier:'UTILITY' as const,description:'Test',systemPrompt:'Review exact evidence',capabilities:['test'],maxTokens:100};
const context={projectId:'p',workflowId:'w',taskId:'t',budgetRemainingUsd:1,retryCount:0,maxRetries:0};
const response={id:'r',content:'Verified response',model:'test-model',promptTokens:10,completionTokens:5,totalTokens:15,finishReason:'stop',latencyMs:1};
function setup(complete=vi.fn().mockResolvedValue(response)){
 const adapter={name:'test',provider:'openai' as const,complete,isAvailable:async()=>true};
 return {runtime:new AgentRuntime({router:new ModelRouter([model]),providers:new Map([['openai',adapter]])}),complete};
}
describe('bounded real-runtime contract',()=>{
 it('records token-based cost and requests one cancellable provider attempt',async()=>{
  const {runtime,complete}=setup();const out=await runtime.execute(agent,{prompt:'Check candidate',maxCostUsd:1},context);
  expect(out.costUsd).toBeCloseTo(.00002);expect(out.totalTokens).toBe(15);
  expect(complete.mock.calls[0][0]).toMatchObject({maxAttempts:1,maxTokens:100});
  expect(complete.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);
 });
 it('rejects zero, negative and unavailable budgets before any provider call',async()=>{
  const {runtime,complete}=setup();
  for(const maxCostUsd of [0,-1,NaN])await expect(runtime.execute(agent,{prompt:'Check',maxCostUsd},context)).rejects.toThrow();
  expect(complete).not.toHaveBeenCalled();
 });
 it('does not report an unconfigured provider or missing usage as success',async()=>{
  const runtime=new AgentRuntime({router:new ModelRouter([model]),providers:new Map()});
  await expect(runtime.execute(agent,{prompt:'Check',maxCostUsd:1},context)).rejects.toThrow('No adapter');
  const {runtime:missing}=setup(vi.fn().mockResolvedValue({...response,promptTokens:0}));
  await expect(missing.execute(agent,{prompt:'Check',maxCostUsd:1},context)).rejects.toThrow('usage evidence');
 });
 it('aborts a provider at its deadline without a retry',async()=>{
  const complete=vi.fn((request)=>new Promise((_,reject)=>request.signal.addEventListener('abort',()=>reject(new Error('aborted')))));
  const {runtime}=setup(complete);
  await expect(runtime.execute(agent,{prompt:'Check',maxCostUsd:1,timeoutMs:10},context)).rejects.toThrow();
  expect(complete).toHaveBeenCalledTimes(1);
 });
 it('legacy failures have no invented tier or completion state',async()=>{
  const {runtime}=setup();const result=await runtime.executeTask({id:'t',description:'Unfunded task'});
  expect(result.status).toBe('FAILED');expect(result.tier).toBeNull();
 });
});
