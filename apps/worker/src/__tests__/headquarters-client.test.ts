import { describe,expect,it,vi } from 'vitest';
import { dispatchOnce,HeadquartersClient,HeadquartersTransportError,UncertainExecutionError,type HeadquartersLease } from '../headquarters-client.js';

const config={url:'https://hq.example',anonKey:'anon-public',email:'worker@example.invalid',password:'vault-delivered',projectId:7,environment:'staging' as const};
const auth={access_token:'machine-access-token-value',expires_in:3600};
const lease=(attemptId:string):HeadquartersLease=>({replayed:false,runId:19,projectId:7,environment:'staging',attemptId,objective:'Verify bounded work',capability:'test',modelProfile:'qa-v1',budgetCents:25,currencyCode:'CAD',policyVersion:2,agentVersion:3,organizationPolicyVersion:4,deadlineAt:'2099-01-01T00:00:00Z'});
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});

describe('Headquarters machine transport',()=>{
 it('authenticates a separate identity and atomically claims only its configured scope',async()=>{
  const calls:Array<{url:string;init:RequestInit}>=[];
  const fetcher=vi.fn(async(url:URL|string,init?:RequestInit)=>{
   calls.push({url:String(url),init:init??{}});
   if(String(url).includes('/auth/'))return json(auth);
   if(String(url).endsWith('hq_get_claimed_audit_context'))return json(null);
   const attempt=JSON.parse(String(init?.body)).p_attempt_id;return json(lease(attempt));
  }) as unknown as typeof fetch;
  const result=await new HeadquartersClient(config,fetcher).claimNext();
  expect(result?.projectId).toBe(7);expect(result?.environment).toBe('staging');
  expect(calls.map(call=>call.url)).toEqual(['https://hq.example/auth/v1/token?grant_type=password','https://hq.example/rest/v1/rpc/hq_claim_next_run','https://hq.example/rest/v1/rpc/hq_get_claimed_audit_context']);
  expect(calls[1].init.redirect).toBe('error');expect(calls[1].init.headers).toMatchObject({apikey:'anon-public',Authorization:'Bearer machine-access-token-value'});
 });
 it('never executes replayed, foreign, malformed or unavailable claims',async()=>{
  for(const mutation of [{replayed:true},{projectId:8},{environment:'production'},{deadlineAt:'2020-01-01T00:00:00Z'},{capability:'deploy'}]){
   const fetcher=vi.fn(async(url:URL|string,init?:RequestInit)=>String(url).includes('/auth/')?json(auth):json({...lease(JSON.parse(String(init?.body)).p_attempt_id),...mutation})) as unknown as typeof fetch;
   await expect(new HeadquartersClient(config,fetcher).claimNext()).rejects.toBeInstanceOf(HeadquartersTransportError);
   expect(fetcher).toHaveBeenCalledTimes(2);
  }
  const failed=vi.fn(async(url:URL|string)=>String(url).includes('/auth/')?json(auth):json({private:'detail'},503)) as unknown as typeof fetch;
  await expect(new HeadquartersClient(config,failed).claimNext()).rejects.not.toThrow(/private/);
  expect(failed).toHaveBeenCalledTimes(2);
 });
 it('settles the exact immutable receipt once after execution',async()=>{
  let claimed:HeadquartersLease|undefined;const calls:string[]=[];
  const fetcher=vi.fn(async(url:URL|string,init?:RequestInit)=>{
   calls.push(String(url));if(String(url).includes('/auth/'))return json(auth);
   const body=JSON.parse(String(init?.body));if(String(url).endsWith('hq_claim_next_run'))return json(lease(body.p_attempt_id));
   if(String(url).endsWith('hq_get_claimed_audit_context'))return json(null);
   return json({runId:19,status:'completed',settled:true,costCents:4});
  }) as unknown as typeof fetch;
  const result=await dispatchOnce(new HeadquartersClient(config,fetcher),async current=>{
   claimed=current;return {runId:current.runId,attemptId:current.attemptId,outcome:'completed',costCents:4,evidenceRef:'s3://evidence/19.json',artifactDigest:'sha256:'+'a'.repeat(64)};
  });
  expect(claimed?.runId).toBe(19);expect(result).toMatchObject({status:'completed',costCents:4});
  expect(calls.filter(url=>url.endsWith('hq_settle_run'))).toHaveLength(1);
 });
 it('atomically settles a monthly audit and its immutable truthful report',async()=>{
  const calls:string[]=[];const fetcher=vi.fn(async(url:URL|string,init?:RequestInit)=>{
   calls.push(String(url));if(String(url).includes('/auth/'))return json(auth);const body=JSON.parse(String(init?.body));
   if(String(url).endsWith('hq_claim_next_run'))return json(lease(body.p_attempt_id));
   if(String(url).endsWith('hq_get_claimed_audit_context'))return json({workOrderId:31,period:'2099-01',area:'performance'});
   expect(body.p_work_order_id).toBe(31);expect(body.p_observations[0]).toMatchObject({state:'unavailable',value:null});
   return json({runId:19,status:'completed',settled:true,costCents:4,reportId:51});
  }) as unknown as typeof fetch;
  const result=await dispatchOnce(new HeadquartersClient(config,fetcher),async current=>({runId:current.runId,attemptId:current.attemptId,outcome:'completed',costCents:4,evidenceRef:'s3://evidence/19.json',artifactDigest:'sha256:'+'a'.repeat(64),auditReport:{summary:'No approved source was available.',observations:[{metric:'largest_contentful_paint_ms',state:'unavailable',value:null,unit:'ms',observedAt:'2099-01-05T12:00:00Z',reason:'Approved measurement source was unavailable'}]}}));
  expect(result).toMatchObject({status:'completed',reportId:51});expect(calls.filter(url=>url.endsWith('hq_settle_audit_run'))).toHaveLength(1);expect(calls.some(url=>url.endsWith('hq_settle_run'))).toBe(false);
 });
 it('records ambiguous provider work without inventing cost or retrying execution',async()=>{
  let executions=0;const calls:string[]=[];
  const fetcher=vi.fn(async(url:URL|string,init?:RequestInit)=>{
   calls.push(String(url));if(String(url).includes('/auth/'))return json(auth);const body=JSON.parse(String(init?.body));
   if(String(url).endsWith('hq_claim_next_run'))return json(lease(body.p_attempt_id));
   if(String(url).endsWith('hq_get_claimed_audit_context'))return json(null);
   expect(body.p_known_cost_cents).toBeNull();return json({runId:19,status:'uncertain',knownCostCents:null});
  }) as unknown as typeof fetch;
  const result=await dispatchOnce(new HeadquartersClient(config,fetcher),async()=>{executions++;throw new UncertainExecutionError('evidence/provider-timeout','request-unknown');});
  expect(executions).toBe(1);expect(result).toEqual({runId:19,status:'uncertain',knownCostCents:null});
  expect(calls.filter(url=>url.endsWith('hq_report_run_uncertainty'))).toHaveLength(1);expect(calls.some(url=>url.endsWith('hq_settle_run'))).toBe(false);
 });
 it('marks only an owner-confirmed expired attempt uncertain during recovery',async()=>{
  const fetcher=vi.fn(async(url:URL|string)=>String(url).includes('/auth/')?json(auth):json({runId:22,status:'uncertain',knownCostCents:null})) as unknown as typeof fetch;
  await expect(new HeadquartersClient(config,fetcher).recoverExpired('worker-recovery:test')).resolves.toEqual({runId:22,status:'uncertain',knownCostCents:null});
  expect(String(fetcher.mock.calls[1][0])).toMatch(/hq_report_expired_run_uncertainty$/);
 });
});
