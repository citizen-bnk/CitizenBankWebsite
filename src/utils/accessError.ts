import {isServiceUnavailable,serviceMessage} from '../lib/service-availability';
export class AccessError extends Error {
  constructor(message:string,public code?:string,public status?:number){super(message);}
}
/** Retain recovery codes without exposing provider details. */
export async function accessError(cause:unknown):Promise<Error>{
  if(cause instanceof Response){
    const body=await cause.clone().json().catch(()=>null);
    return new AccessError(isServiceUnavailable(body)?serviceMessage:typeof body?.detail==='string'?body.detail:'Access could not be checked. Please retry.',body?.code,cause.status);
  }
  return cause instanceof Error?cause:new Error('Access could not be checked. Please retry.');
}
