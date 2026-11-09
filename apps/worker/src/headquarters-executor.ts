import { createHash } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { AgentRuntime,type AgentDefinition } from '@samar/agent-core';
import { createProviders } from '@samar/providers';
import { ModelRouter } from '@samar/routing';
import { ModelSpecSchema } from '@samar/schemas';
import type { HeadquartersAuditReport,HeadquartersLease,HeadquartersReceipt } from './headquarters-client.js';
import { UncertainExecutionError } from './headquarters-client.js';

type Tier='DIRECTOR'|'BUILDER'|'UTILITY'|'SPECIALIST';
interface Profile extends AgentDefinition {reference:string;tier:Tier;maxTokens:number;}
const tiers=new Set<Tier>(['DIRECTOR','BUILDER','UTILITY','SPECIALIST']);
const safeId=/^[a-z0-9][a-z0-9._-]{1,39}$/;
const safeBucket=/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

function canonicalProfile(profile:Omit<Profile,'reference'>):string{
 return JSON.stringify({id:profile.id,name:profile.name,tier:profile.tier,description:profile.description,systemPrompt:profile.systemPrompt,capabilities:profile.capabilities,maxTokens:profile.maxTokens});
}
export function profileReference(profile:Omit<Profile,'reference'>):string{
 return `${profile.id}@sha256:${createHash('sha256').update(canonicalProfile(profile)).digest('hex')}`;
}
function loadProfiles(raw:string|undefined):Map<string,Profile>{
 let value:unknown;try{value=JSON.parse(raw??'');}catch{throw new Error('Verified Headquarters agent profiles are not configured');}
 if(!Array.isArray(value)||value.length<1)throw new Error('Verified Headquarters agent profiles are not configured');
 const profiles=new Map<string,Profile>();
 for(const item of value){
  if(!item||typeof item!=='object')throw new Error('Invalid Headquarters agent profile');const v=item as Record<string,unknown>;
  if(typeof v.id!=='string'||!safeId.test(v.id)||typeof v.name!=='string'||v.name.length<2||v.name.length>120||
   typeof v.tier!=='string'||!tiers.has(v.tier as Tier)||typeof v.description!=='string'||v.description.length>1000||
   typeof v.systemPrompt!=='string'||v.systemPrompt.length<10||v.systemPrompt.length>20_000||!Array.isArray(v.capabilities)||
   !v.capabilities.every(capability=>typeof capability==='string')||!Number.isSafeInteger(v.maxTokens)||Number(v.maxTokens)<1||Number(v.maxTokens)>100_000||typeof v.reference!=='string')throw new Error('Invalid Headquarters agent profile');
  const profile=v as unknown as Profile;if(profile.reference!==profileReference(profile))throw new Error('Headquarters agent profile digest mismatch');
  if(profiles.has(profile.reference))throw new Error('Duplicate Headquarters agent profile');profiles.set(profile.reference,profile);
 }
 return profiles;
}
function httpsOrigin(value:string|undefined):string{
 let url:URL;try{url=new URL(value??'');}catch{throw new Error('Evidence object storage is not configured');}
 if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash)throw new Error('Evidence object storage is not configured');return url.origin;
}
function parseAuditReport(content:string):HeadquartersAuditReport{
 let value:unknown;try{value=JSON.parse(content);}catch{throw new Error('Audit provider output is not valid JSON');}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Audit provider output is invalid');const report=value as Record<string,unknown>;
 if(Object.keys(report).some(key=>!['summary','observations'].includes(key))||typeof report.summary!=='string'||report.summary.length<3||report.summary.length>5000||!Array.isArray(report.observations)||report.observations.length<1||report.observations.length>200)throw new Error('Audit provider output is invalid');
 const metrics=new Set<string>();for(const item of report.observations){
  if(!item||typeof item!=='object'||Array.isArray(item))throw new Error('Audit observation is invalid');const observation=item as Record<string,unknown>;
  if(Object.keys(observation).some(key=>!['metric','state','value','unit','observedAt','evidenceRef','method','reason','baselineValue','baselineEvidenceRef'].includes(key))||typeof observation.metric!=='string'||!/^[a-z][a-z0-9_]{1,79}$/.test(observation.metric)||metrics.has(observation.metric)||!['measured','estimated','unavailable'].includes(String(observation.state))||typeof observation.unit!=='string'||observation.unit.length<1||observation.unit.length>40||typeof observation.observedAt!=='string'||!Number.isFinite(Date.parse(observation.observedAt)))throw new Error('Audit observation is invalid');
  metrics.add(observation.metric);const state=observation.state;
  if(state==='measured'&&(typeof observation.value!=='number'||!Number.isFinite(observation.value)||typeof observation.evidenceRef!=='string'||observation.evidenceRef.length<3||observation.method!=null))throw new Error('Measured audit observation lacks evidence');
  if(state==='estimated'&&(typeof observation.value!=='number'||!Number.isFinite(observation.value)||typeof observation.evidenceRef!=='string'||observation.evidenceRef.length<3||typeof observation.method!=='string'||observation.method.length<3))throw new Error('Estimated audit observation lacks method');
  if(state==='unavailable'&&(observation.value!=null||typeof observation.reason!=='string'||observation.reason.length<3))throw new Error('Unavailable audit observation is not truthful');
  if(observation.baselineValue!=null&&(typeof observation.baselineValue!=='number'||!Number.isFinite(observation.baselineValue)||typeof observation.baselineEvidenceRef!=='string'||observation.baselineEvidenceRef.length<3))throw new Error('Audit baseline lacks evidence');
 }
 return value as HeadquartersAuditReport;
}

/** Provider execution without Prisma or service-role credentials; generated code is never run here. */
export class HeadquartersExecutor {
 private readonly runtime:Pick<AgentRuntime,'execute'>;private readonly profiles:Map<string,Profile>;private readonly s3:Pick<S3Client,'send'>;private readonly bucket:string;
 constructor(environment:NodeJS.ProcessEnv=process.env,dependencies?:{s3?:Pick<S3Client,'send'>;runtime?:Pick<AgentRuntime,'execute'>}){
  let catalog:unknown;try{catalog=JSON.parse(environment.MODEL_CATALOG_JSON??'');}catch{throw new Error('Verified model catalog is not configured');}
  const models=ModelSpecSchema.array().min(1).parse(catalog);this.profiles=loadProfiles(environment.HQ_AGENT_PROFILES_JSON);
  this.runtime=dependencies?.runtime??new AgentRuntime({router:new ModelRouter(models),providers:createProviders({openaiApiKey:environment.OPENAI_API_KEY??'',anthropicApiKey:environment.ANTHROPIC_API_KEY,llamaBaseUrl:environment.LLAMA_BASE_URL,llamaFleetEnabled:environment.LLAMA_FLEET_ENABLED==='true',llamaFleetUrl:environment.LLAMA_FLEET_URL,llamaFleetApiKey:environment.LLAMA_FLEET_API_KEY,groqApiKey:environment.GROQ_API_KEY})});
  if(!environment.S3_ACCESS_KEY||!environment.S3_SECRET_KEY||!environment.S3_BUCKET||!safeBucket.test(environment.S3_BUCKET))throw new Error('Evidence object storage is not configured');
  this.bucket=environment.S3_BUCKET;this.s3=dependencies?.s3??new S3Client({endpoint:httpsOrigin(environment.S3_ENDPOINT),region:environment.S3_REGION??'us-east-1',forcePathStyle:true,credentials:{accessKeyId:environment.S3_ACCESS_KEY,secretAccessKey:environment.S3_SECRET_KEY}});
 }
 async execute(lease:HeadquartersLease):Promise<HeadquartersReceipt>{
  const profile=this.profiles.get(lease.modelProfile);if(!profile||!profile.capabilities.includes(lease.capability))throw new Error('Frozen agent profile does not permit the leased capability');
  const remaining=Date.parse(lease.deadlineAt)-Date.now();if(!Number.isSafeInteger(remaining)||remaining<1)throw new Error('Execution lease expired before provider submission');
  let output:Awaited<ReturnType<AgentRuntime['execute']>>;
  const auditInstruction=lease.auditContext?`\nReturn only JSON {"summary":string,"observations":array}. Audit area: ${lease.auditContext.area}; period: ${lease.auditContext.period}. Each observation needs metric, state, unit and observedAt. Measured/estimated values require an evidenceRef; estimates also require method. If data is missing, use state "unavailable", null value and a truthful reason. Never invent a value or evidence.`:'';
  try{output=await this.runtime.execute(profile,{prompt:lease.objective+auditInstruction,maxCostUsd:lease.budgetCents/100,timeoutMs:Math.min(remaining,3_600_000)},{projectId:String(lease.projectId),workflowId:`hq:${lease.runId}`,taskId:lease.attemptId,budgetRemainingUsd:lease.budgetCents/100,retryCount:0,maxRetries:0});}
  catch{throw new UncertainExecutionError(`headquarters://runs/${lease.runId}/provider-outcome`);}
  const costCents=Math.ceil(output.costUsd*100-1e-9);if(!Number.isSafeInteger(costCents)||costCents<0)throw new UncertainExecutionError(`headquarters://runs/${lease.runId}/invalid-cost`);
  const artifact={schemaVersion:1,runId:lease.runId,projectId:lease.projectId,environment:lease.environment,attemptId:lease.attemptId,agentProfile:profile.reference,capability:lease.capability,model:output.modelUsed,promptTokens:output.promptTokens,completionTokens:output.completionTokens,totalTokens:output.totalTokens,costCents,output:output.content};
  const body=Buffer.from(JSON.stringify(artifact),'utf8'),artifactDigest=`sha256:${createHash('sha256').update(body).digest('hex')}`;
  const key=`headquarters/${lease.projectId}/${lease.environment}/${lease.runId}/${lease.attemptId}.json`,evidenceRef=`s3://${this.bucket}/${key}`;
  try{await this.s3.send(new PutObjectCommand({Bucket:this.bucket,Key:key,Body:body,ContentType:'application/json',Metadata:{runId:String(lease.runId),attemptId:lease.attemptId,digest:artifactDigest},IfNoneMatch:'*'}));}
  catch{throw new UncertainExecutionError(`pending:${evidenceRef}`,null,costCents,'artifact_persistence_failed');}
  let auditReport:HeadquartersAuditReport|undefined;
  if(lease.auditContext){try{auditReport=parseAuditReport(output.content);}catch{return {runId:lease.runId,attemptId:lease.attemptId,outcome:'failed',costCents,evidenceRef,artifactDigest};}}
  return {runId:lease.runId,attemptId:lease.attemptId,outcome:'completed',costCents,evidenceRef,artifactDigest,auditReport};
 }
}
