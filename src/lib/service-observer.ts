import {isServiceUnavailable} from './service-availability';
/** Inspect only safe response codes, preserving the original response and request. */
export function observeServiceFetch(original:typeof fetch,origin:string,onIssue:(code:string)=>void):typeof fetch {
  return async (...args)=>{
    const response=await original(...args);
    const input=args[0];
    const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,origin);
    if(response.status===503 && url.origin===origin && url.pathname.startsWith('/api/')) {
      void response.clone().json().then(body=>{
        if(isServiceUnavailable(body))onIssue(String(body.code ?? body.issue));
      }).catch(()=>{});
    }
    return response;
  };
}
