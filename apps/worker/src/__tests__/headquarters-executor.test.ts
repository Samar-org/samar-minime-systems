import { describe,expect,it,vi } from 'vitest';
import { HeadquartersExecutor,profileReference } from '../headquarters-executor.js';
import { UncertainExecutionError,type HeadquartersLease } from '../headquarters-client.js';

const definition={id:'qa-v1',name:'Independent QA',tier:'SPECIALIST' as const,description:'Bounded evidence review',systemPrompt:'Review only the supplied objective and produce evidence.',capabilities:['test','independent_qa'],maxTokens:1000};
const reference=profileReference(definition);
const environment={MODEL_CATALOG_JSON:JSON.stringify([{id:'verified-model',provider:'openai',name:'Verified',tier:'SPECIALIST',costPerInputToken:.000001,costPerOutputToken:.000002,maxTokens:8000,supportsJson:true,supportsVision:false,enabled:true}]),HQ_AGENT_PROFILES_JSON:JSON.stringify([{...definition,reference}]),OPENAI_API_KEY:'runtime-injected',S3_ENDPOINT:'https://objects.example',S3_ACCESS_KEY:'runtime-injected',S3_SECRET_KEY:'runtime-injected',S3_BUCKET:'hq-evidence'};
const lease:HeadquartersLease={replayed:false,runId:41,projectId:7,environment:'staging',attemptId:'10000000-0000-4000-8000-000000000041',objective:'Verify the immutable release evidence',capability:'test',modelProfile:reference,budgetCents:20,currencyCode:'CAD',policyVersion:1,agentVersion:1,organizationPolicyVersion:1,deadlineAt:'2099-01-01T00:00:00Z'};
const output={content:'verified evidence',modelUsed:'verified-model',tier:'SPECIALIST' as const,promptTokens:100,completionTokens:20,totalTokens:120,costUsd:.034,latencyMs:10};

describe('Headquarters provider executor',()=>{
 it('binds a digest-addressed profile, records actual cents and persists immutable evidence first',async()=>{
  const execute=vi.fn(async()=>output),send=vi.fn(async()=>({}));
  const receipt=await new HeadquartersExecutor(environment,{runtime:{execute} as never,s3:{send} as never}).execute(lease);
  expect(execute).toHaveBeenCalledTimes(1);expect(receipt.costCents).toBe(4);expect(receipt.evidenceRef).toContain('/7/staging/41/');expect(receipt.artifactDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  expect(send).toHaveBeenCalledTimes(1);expect(send.mock.calls[0][0].input.IfNoneMatch).toBe('*');
 });
 it('never submits work for a mutable or capability-mismatched profile',async()=>{
  const execute=vi.fn(async()=>output),executor=new HeadquartersExecutor(environment,{runtime:{execute} as never,s3:{send:vi.fn()} as never});
  await expect(executor.execute({...lease,modelProfile:'qa-v1'})).rejects.toThrow(/Frozen agent profile/);
  await expect(executor.execute({...lease,capability:'code_fix'})).rejects.toThrow(/Frozen agent profile/);
  expect(execute).not.toHaveBeenCalled();
 });
 it('preserves unknown provider billing and known artifact-failure cost for reconciliation',async()=>{
  const providerFailure=new HeadquartersExecutor(environment,{runtime:{execute:vi.fn(async()=>{throw new Error('private provider detail');})} as never,s3:{send:vi.fn()} as never});
  await expect(providerFailure.execute(lease)).rejects.toMatchObject({knownCostCents:null,reason:'provider_outcome_unknown'} satisfies Partial<UncertainExecutionError>);
  const artifactFailure=new HeadquartersExecutor(environment,{runtime:{execute:vi.fn(async()=>output)} as never,s3:{send:vi.fn(async()=>{throw new Error('storage detail');})} as never});
  await expect(artifactFailure.execute(lease)).rejects.toMatchObject({knownCostCents:4,reason:'artifact_persistence_failed'} satisfies Partial<UncertainExecutionError>);
 });
});
