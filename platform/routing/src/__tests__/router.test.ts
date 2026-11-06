import {describe,it,expect} from 'vitest';
import {ModelRouter} from '../router.js';
import {MODEL_REGISTRY} from '../model-registry.js';
import type {ModelSpec} from '@samar/schemas';
// Synthetic test pricing/capacity; never a provider availability or production pricing claim.
const fixture=(id:string,tier:ModelSpec['tier'],provider:ModelSpec['provider'],rate:number,vision=false):ModelSpec=>({id,name:id,tier,provider,costPerInputToken:rate,costPerOutputToken:rate,maxTokens:4096,enabled:true,supportsJson:true,supportsVision:vision});
const models=[fixture('utility','UTILITY','openai',.000001),fixture('builder','BUILDER','openai',.000002,true),fixture('director','DIRECTOR','anthropic',.000003,true),fixture('specialist','SPECIALIST','anthropic',.000004,true)];
describe('routing contract independent of live provider catalog',()=>{
 it('applies request defaults and selects cheapest eligible tier',()=>{expect(new ModelRouter(models).route({taskType:'test'}).model.id).toBe('utility');});
 for(const requiredTier of ['UTILITY','BUILDER','DIRECTOR','SPECIALIST'] as const)it(`respects ${requiredTier} minimum`,()=>{
  expect(new ModelRouter(models).route({taskType:'test',requiredTier}).model.tier).toBe(requiredTier);
 });
 it('filters capability and enabled state',()=>{
  const r=new ModelRouter([...models,{...models[0],id:'disabled',enabled:false,costPerInputToken:0,costPerOutputToken:0}]);
  expect(r.route({taskType:'image',requiresVision:true}).model.id).toBe('builder');expect(r.getModelById('disabled')).toBeUndefined();
 });
 it('prefers provider but can fall back when it has no eligible model',()=>{
  const r=new ModelRouter(models);
  expect(r.route({taskType:'test',preferredProvider:'anthropic'}).model.id).toBe('director');
  expect(r.route({taskType:'test',preferredProvider:'llama',requiresVision:true}).model.id).toBe('builder');
 });
 it('fails a budget rather than returning an unaffordable model',()=>{
  const r=new ModelRouter(models);
  for(const maxCostUsd of [0,-1,.000001])expect(()=>r.route({taskType:'test',maxCostUsd})).toThrow();
  expect(r.route({taskType:'test',maxCostUsd:.01}).estimatedCostUsd).toBeLessThanOrEqual(.01);
 });
 it('caps retry escalation without losing the required tier',()=>{
  const r=new ModelRouter(models);
  expect(r.route({taskType:'test',retryCount:1}).model.tier).toBe('BUILDER');
  expect(r.route({taskType:'test',retryCount:20}).model.tier).toBe('SPECIALIST');
  expect(r.route({taskType:'test',requiredTier:'SPECIALIST',retryCount:1}).escalated).toBe(false);
 });
 it('does not leak prompt text in errors or route an unverified default catalog',()=>{
  expect(()=>new ModelRouter().route({taskType:'PRIVATE CUSTOMER INPUT'})).toThrow('No eligible model');
  expect(MODEL_REGISTRY.every(m=>!m.enabled)).toBe(true);
  try{new ModelRouter([]).route({taskType:'PRIVATE CUSTOMER INPUT'});}catch(e){expect(String(e)).not.toContain('PRIVATE CUSTOMER INPUT');}
 });
 it('rejects active catalog entries without known limits and prices',()=>{
  expect(()=>new ModelRouter([{...models[0],maxTokens:0}])).toThrow();
  expect(()=>new ModelRouter([{...models[0],costPerInputToken:NaN}])).toThrow();
 });
});
