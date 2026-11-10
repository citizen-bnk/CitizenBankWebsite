import { describe,it,expect,vi } from 'vitest';
import { checkedResponse,stableSubmissionKey,completeSubmission } from './formSubmission';
import { webcrypto } from 'node:crypto';

describe('form save confirmation',()=>{
  it('refuses a business failure even when HTTP succeeds',async()=>{
    await expect(checkedResponse(Promise.resolve(Response.json({success:false,message:'Upload not saved'}))))
      .rejects.toThrow('Upload not saved');
  });
  it('extracts the actual validation issue from generated-client exceptions',async()=>{
    await expect(checkedResponse(Promise.reject(Response.json({detail:[{loc:['body','phone'],msg:'Required'}]},{status:422}))))
      .rejects.toThrow('phone: Required');
  });
  it('does not consume the successful response',async()=>{
    const response=await checkedResponse(Promise.resolve(Response.json({subscription_id:'SUB-test'})));
    expect((await response.json()).subscription_id).toBe('SUB-test');
  });
  it('reuses the operation key after a lost response and stores no form details',async()=>{
    const storage=new Map<string,string>();
    vi.stubGlobal('crypto',webcrypto);
    vi.stubGlobal('sessionStorage',{getItem:(key:string)=>storage.get(key),setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)});
    try {
      const first=await stableSubmissionKey('test',{email:'private@example.com'});
      expect(await stableSubmissionKey('test',{email:'private@example.com'})).toBe(first);
      expect([...storage.values()].join('')).not.toContain('private@example.com');
      completeSubmission('test');
      expect(await stableSubmissionKey('test',{email:'private@example.com'})).not.toBe(first);
    } finally {vi.unstubAllGlobals();}
  });
});
