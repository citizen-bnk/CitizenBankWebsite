/** A successful HTTP response must also confirm the business operation. */
export async function checkedResponse(request:Promise<Response>):Promise<Response> {
  let response:Response;
  try {response=await request;} catch(cause) {
    if(cause instanceof Response) response=cause;
    else throw cause instanceof Error ? cause : new Error('The request could not be confirmed. Keep this window open and retry.');
  }
  const body=await response.clone().json().catch(()=>null);
  if(!response.ok || body?.success===false || body?.ok===false) {
    const detail=body?.detail;
    const message=typeof detail==='string'?detail:
      Array.isArray(detail)?detail.map((item:{loc?:string[];msg?:string})=>`${item.loc?.slice(1).join(' ')||'Field'}: ${item.msg||'check the value'}`).join('; '):
      typeof body?.message==='string'?body.message:
      response.status===401?'Your session expired. Sign in again; your entries are still here.':
      response.status===403?'Your role cannot perform this action. Cancel or ask an authorised administrator.':
      'The save could not be confirmed. Keep your entries and retry, or cancel.';
    throw new Error(`${message}${body?.code?` (Issue: ${body.code})`:''}`);
  }
  return response;
}

/** Keep the same operation key after a lost response; never store form contents. */
export async function stableSubmissionKey(scope:string,values:unknown):Promise<string> {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(values)));
  const fingerprint=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  const storageKey=`citizen-operation:${scope}`;
  let prior:{fingerprint:string;key:string}|null=null;
  try {prior=JSON.parse(sessionStorage.getItem(storageKey)||'null');}catch {/* Ignore an invalid previous entry. */}
  if(prior?.fingerprint===fingerprint&&typeof prior.key==='string') return prior.key;
  const key=crypto.randomUUID();
  sessionStorage.setItem(storageKey,JSON.stringify({fingerprint,key}));
  return key;
}
export function completeSubmission(scope:string){sessionStorage.removeItem(`citizen-operation:${scope}`);}
