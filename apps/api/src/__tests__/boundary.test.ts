import { describe, it, expect } from 'vitest';
import { buildServer } from '../app';

describe('unconfigured API boundary',()=>{
 it('reports liveness separately from readiness without a JWT secret or database',async()=>{
  const app=await buildServer();
  try {
   const live=await app.inject({method:'GET',url:'/health'});
   expect(live.statusCode).toBe(200);expect(live.json()).toEqual({status:'ok'});
   const ready=await app.inject({method:'GET',url:'/health/ready'});
   expect(ready.statusCode).toBe(503);expect(ready.json().ready).toBe(false);
  } finally {await app.close();}
 });
 it('never returns invented IDs or starts caller-selected workflows',async()=>{
  const app=await buildServer();
  try {
   for(const url of ['/projects','/agents','/approvals','/workflows','/campaigns','/creative','/crm','/tasks','/research','/ui-pipeline']) {
    const result=await app.inject({method:'POST',url,headers:{authorization:'Bearer untrusted'},payload:{type:'arbitraryWorkflow',args:[]}});
    expect(result.statusCode).toBe(503);expect(result.json()).not.toHaveProperty('id');
    expect(result.json()).not.toHaveProperty('workflowId');
   }
   expect((await app.inject({method:'GET',url:'/projects'})).statusCode).toBe(503);
   expect((await app.inject({method:'POST',url:'/auth/login',payload:{email:'test@example.invalid',password:'test-only'}})).statusCode).toBe(503);
  } finally {await app.close();}
 });
 it('rejects malformed JSON and incompatible content types',async()=>{
  const app=await buildServer();
  try {
   const invalid=await app.inject({method:'POST',url:'/projects',headers:{'content-type':'application/json'},payload:'{'});
   expect(invalid.statusCode).toBe(400);
   const text=await app.inject({method:'POST',url:'/projects',headers:{'content-type':'text/plain'},payload:'text'});
   expect(text.statusCode).toBe(415);
  } finally {await app.close();}
 });
});
