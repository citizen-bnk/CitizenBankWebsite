import test from 'node:test';
import assert from 'node:assert/strict';
import {observeServiceFetch} from '../lib/service-observer';
test('a failed financial submission is observed once, never replayed, and stays readable',async()=>{
 const source=Response.json({code:'DATA_QUOTA_EXHAUSTED'},{status:503});let calls=0;const issues:string[]=[];
 const original:typeof fetch=async()=>{calls++;return source;};
 const observed=observeServiceFetch(original,'https://citizenbank.co.ls',code=>issues.push(code));
 const request=new Request('https://citizenbank.co.ls/api/subscriptions',{method:'POST',body:'private form data'});
 assert.equal(await observed(request),source);
 await new Promise(resolve=>setTimeout(resolve,25));
 assert.equal(calls,1);assert.equal(request.bodyUsed,false);assert.equal(source.bodyUsed,false);
 assert.deepEqual(issues,['DATA_QUOTA_EXHAUSTED']);assert.equal((await source.json()).code,'DATA_QUOTA_EXHAUSTED');
});
test('permission, AI-only, external and malformed failures do not become a platform outage',async()=>{
 const issues:string[]=[];
 for(const [url,body,status] of [
  ['/api/me','{"code":"ACCESS_DENIED"}',403],['/api/ai','{"code":"AI_CONNECTION_UNAVAILABLE"}',503],
  ['https://another.example/api/me','{"code":"DATA_QUOTA_EXHAUSTED"}',503],['/api/me','not JSON',503],
 ] as const){
  const original:typeof fetch=async()=>new Response(body,{status});
  await observeServiceFetch(original,'https://citizenbank.co.ls',code=>issues.push(code))(url);
 }
 await new Promise(resolve=>setTimeout(resolve,25));assert.deepEqual(issues,[]);
});
