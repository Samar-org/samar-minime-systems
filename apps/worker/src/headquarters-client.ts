import { randomUUID } from 'node:crypto';

export type HeadquartersEnvironment = 'development' | 'staging' | 'production';
export interface HeadquartersLease {
  replayed: false;
  runId: number;
  projectId: number;
  environment: HeadquartersEnvironment;
  attemptId: string;
  objective: string;
  capability: 'monitor'|'triage'|'impact_assessment'|'test'|'code_fix'|'pull_request'|'independent_qa';
  modelProfile: string;
  budgetCents: number;
  currencyCode: string;
  policyVersion: number;
  agentVersion: number;
  organizationPolicyVersion: number;
  deadlineAt: string;
}
export interface HeadquartersReceipt {
  runId: number;
  attemptId: string;
  outcome: 'completed'|'failed';
  costCents: number;
  evidenceRef: string;
  artifactDigest: string;
}
export interface HeadquartersSettlement {runId:number;status:'completed'|'failed'|'reconciliation_required';settled:boolean;costCents:number;}
export interface HeadquartersUncertainty {runId:number;status:'uncertain';knownCostCents:number|null;}
export interface HeadquartersClientConfig {
  url:string;anonKey:string;email:string;password:string;projectId:number;environment:HeadquartersEnvironment;
}

export class HeadquartersTransportError extends Error {
  constructor(){super('Headquarters execution owner denied the request or is unavailable');}
}
const positive=(value:unknown):value is number=>Number.isSafeInteger(value)&&Number(value)>0;
const cents=(value:unknown):value is number=>Number.isSafeInteger(value)&&Number(value)>=0;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const digest=/^sha256:[a-f0-9]{64}$/;
const currency=/^[A-Z]{3}$/;
const environments=new Set(['development','staging','production']);
const capabilities=new Set(['monitor','triage','impact_assessment','test','code_fix','pull_request','independent_qa']);

function parseOrigin(value:string):URL{
  let origin:URL;try{origin=new URL(value);}catch{throw new HeadquartersTransportError();}
  if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash)throw new HeadquartersTransportError();
  return origin;
}
async function boundedJson(response:Response):Promise<unknown>{
  const declared=Number(response.headers.get('content-length')??'0');
  if(declared>32768)throw new HeadquartersTransportError();
  const text=await response.text();
  if(Buffer.byteLength(text,'utf8')>32768)throw new HeadquartersTransportError();
  try{return JSON.parse(text);}catch{throw new HeadquartersTransportError();}
}
function parseLease(value:unknown,scope:{projectId:number;environment:HeadquartersEnvironment;attemptId:string}):HeadquartersLease{
  if(!value||typeof value!=='object')throw new HeadquartersTransportError();
  const v=value as Record<string,unknown>;
  if(v.replayed!==false||v.projectId!==scope.projectId||v.environment!==scope.environment||v.attemptId!==scope.attemptId||
   !positive(v.runId)||typeof v.objective!=='string'||v.objective.length<3||v.objective.length>10000||
   typeof v.capability!=='string'||!capabilities.has(v.capability)||typeof v.modelProfile!=='string'||v.modelProfile.length<2||
   !positive(v.budgetCents)||typeof v.currencyCode!=='string'||!currency.test(v.currencyCode)||
   !positive(v.policyVersion)||!positive(v.agentVersion)||!positive(v.organizationPolicyVersion)||
   typeof v.deadlineAt!=='string'||!Number.isFinite(Date.parse(v.deadlineAt))||Date.parse(v.deadlineAt)<=Date.now())throw new HeadquartersTransportError();
  return v as unknown as HeadquartersLease;
}

/** Fixed Supabase Auth/PostgREST transport. It has no service-role credential and never retries an RPC. */
export class HeadquartersClient {
  private readonly origin:URL;private accessToken:string|undefined;private expiresAt=0;
  constructor(private readonly config:HeadquartersClientConfig,private readonly fetcher:typeof fetch=fetch){
    this.origin=parseOrigin(config.url);
    if(!config.anonKey||!config.email||!config.password||!positive(config.projectId)||!environments.has(config.environment))throw new HeadquartersTransportError();
  }
  private async authenticate():Promise<void>{
    if(this.accessToken&&this.expiresAt>Date.now()+30_000)return;
    let response:Response;
    try{response=await this.fetcher(new URL('/auth/v1/token?grant_type=password',this.origin),{method:'POST',redirect:'error',signal:AbortSignal.timeout(10_000),headers:{apikey:this.config.anonKey,'Content-Type':'application/json'},body:JSON.stringify({email:this.config.email,password:this.config.password})});}
    catch{throw new HeadquartersTransportError();}
    if(!response.ok)throw new HeadquartersTransportError();
    const data=await boundedJson(response) as Record<string,unknown>;
    if(typeof data.access_token!=='string'||data.access_token.length<20||!positive(data.expires_in))throw new HeadquartersTransportError();
    this.accessToken=data.access_token;this.expiresAt=Date.now()+data.expires_in*1000;
  }
  private async rpc(name:'hq_claim_next_run'|'hq_settle_run'|'hq_report_run_uncertainty'|'hq_report_expired_run_uncertainty',body:Record<string,unknown>):Promise<unknown>{
    await this.authenticate();
    let response:Response;
    try{response=await this.fetcher(new URL(`/rest/v1/rpc/${name}`,this.origin),{method:'POST',redirect:'error',signal:AbortSignal.timeout(10_000),headers:{apikey:this.config.anonKey,Authorization:`Bearer ${this.accessToken}`,'Content-Type':'application/json'},body:JSON.stringify(body)});}
    catch{throw new HeadquartersTransportError();}
    if(!response.ok)throw new HeadquartersTransportError();
    return boundedJson(response);
  }
  async claimNext():Promise<HeadquartersLease|null>{
    const attemptId=randomUUID();
    const data=await this.rpc('hq_claim_next_run',{p_attempt_id:attemptId});
    if(data===null)return null;
    return parseLease(data,{projectId:this.config.projectId,environment:this.config.environment,attemptId});
  }
  async settle(receipt:HeadquartersReceipt):Promise<HeadquartersSettlement>{
    if(!positive(receipt.runId)||!uuid.test(receipt.attemptId)||!['completed','failed'].includes(receipt.outcome)||!cents(receipt.costCents)||
     typeof receipt.evidenceRef!=='string'||receipt.evidenceRef.length<3||receipt.evidenceRef.length>1000||!digest.test(receipt.artifactDigest))throw new HeadquartersTransportError();
    const data=await this.rpc('hq_settle_run',{p_run_id:receipt.runId,p_attempt_id:receipt.attemptId,p_outcome:receipt.outcome,p_cost_cents:receipt.costCents,p_evidence_ref:receipt.evidenceRef,p_artifact_digest:receipt.artifactDigest});
    if(!data||typeof data!=='object')throw new HeadquartersTransportError();
    const result=data as Record<string,unknown>;
    const validStatus=['completed','failed','reconciliation_required'].includes(String(result.status));
    if(result.runId!==receipt.runId||result.costCents!==receipt.costCents||!validStatus||typeof result.settled!=='boolean'||
     result.settled!==(result.status!=='reconciliation_required')||(receipt.outcome==='failed'&&result.status==='completed'))throw new HeadquartersTransportError();
    return result as unknown as HeadquartersSettlement;
  }
  async reportUncertain(lease:HeadquartersLease,input:{reason:'provider_outcome_unknown'|'artifact_persistence_failed';knownCostCents:number|null;evidenceRef:string;providerRequestId:string|null}):Promise<HeadquartersUncertainty>{
    if(input.knownCostCents!==null&&!cents(input.knownCostCents)||input.evidenceRef.length<3||input.evidenceRef.length>1000||input.providerRequestId!==null&&(input.providerRequestId.length<1||input.providerRequestId.length>200))throw new HeadquartersTransportError();
    const data=await this.rpc('hq_report_run_uncertainty',{p_run_id:lease.runId,p_attempt_id:lease.attemptId,p_reason:input.reason,p_known_cost_cents:input.knownCostCents,p_evidence_ref:input.evidenceRef,p_provider_request_id:input.providerRequestId});
    if(!data||typeof data!=='object')throw new HeadquartersTransportError();const result=data as Record<string,unknown>;
    if(result.runId!==lease.runId||result.status!=='uncertain'||result.knownCostCents!==input.knownCostCents)throw new HeadquartersTransportError();
    return result as unknown as HeadquartersUncertainty;
  }
  async recoverExpired(evidenceRef:string):Promise<HeadquartersUncertainty|null>{
    if(evidenceRef.length<3||evidenceRef.length>1000)throw new HeadquartersTransportError();
    const data=await this.rpc('hq_report_expired_run_uncertainty',{p_evidence_ref:evidenceRef});if(data===null)return null;
    if(!data||typeof data!=='object')throw new HeadquartersTransportError();const result=data as Record<string,unknown>;
    if(!positive(result.runId)||result.status!=='uncertain'||result.knownCostCents!==null)throw new HeadquartersTransportError();
    return result as unknown as HeadquartersUncertainty;
  }
}

export class UncertainExecutionError extends Error {
  constructor(readonly evidenceRef:string,readonly providerRequestId:string|null=null,readonly knownCostCents:number|null=null,readonly reason:'provider_outcome_unknown'|'artifact_persistence_failed'='provider_outcome_unknown'){super('Provider outcome requires reconciliation');}
}
export async function dispatchOnce(client:HeadquartersClient,execute:(lease:HeadquartersLease)=>Promise<HeadquartersReceipt>):Promise<'idle'|HeadquartersSettlement|HeadquartersUncertainty>{
  const lease=await client.claimNext();if(!lease)return 'idle';
  let receipt:HeadquartersReceipt;
  try{receipt=await execute(lease);}catch(error){if(error instanceof UncertainExecutionError)return client.reportUncertain(lease,error);throw error;}
  if(receipt.runId!==lease.runId||receipt.attemptId!==lease.attemptId)throw new HeadquartersTransportError();
  return client.settle(receipt);
}
