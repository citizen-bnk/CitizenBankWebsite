import { describe, it, expect, vi } from 'vitest';
const request=vi.fn();
vi.mock('app',()=>({apiClient:{request:(...args:unknown[])=>request(...args)}}));
import { positionPayload, referenceRequest } from './referenceData';

describe('reference catalogue client',()=>{
  it('uses backend field names and never renames existing stable codes',()=>{
    const form={title:' Chairperson ',hierarchy_level:2,description:'Charter',position_code:'chairman',is_active:false,minimum_investment_shares:12};
    expect(positionPayload(form,true)).toEqual({position_name:'Chairperson',position_level:2,description:'Charter',position_code:'chairman',is_active:false,minimum_investment_shares:12});
    expect(positionPayload(form,false)).not.toHaveProperty('position_code');
  });
  it('readiness is a GET without an apply body',async()=>{
    request.mockResolvedValueOnce(new Response(JSON.stringify({checks:[]})));
    expect(await referenceRequest('readiness')).toEqual({checks:[]});
    expect(request).toHaveBeenLastCalledWith({path:'/reference-data/readiness',method:'GET'});
  });
  it('preserves actionable errors from the generated client',async()=>{
    request.mockRejectedValueOnce(new Response(JSON.stringify({detail:'Restore baseline schema'}),{status:409}));
    await expect(referenceRequest('seed',{apply:false})).rejects.toThrow('Restore baseline schema');
  });
  it('sends catalogue edits with PUT and the concurrency revision',async()=>{
    request.mockResolvedValueOnce(new Response(JSON.stringify({id:1})));
    const body={values:{description:'Reviewed'},revision:'current-revision'};
    await referenceRequest('catalogues/roles/1',body,'PUT');
    expect(request).toHaveBeenLastCalledWith(expect.objectContaining({path:'/reference-data/catalogues/roles/1',method:'PUT',body}));
  });
});
