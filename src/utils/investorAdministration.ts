import {auth} from 'app/auth';
export async function investorTransport(operation:string,data:Record<string,unknown>={}){
 const response=await fetch('/api/platform/investor-administration',{method:'POST',headers:{'Content-Type':'application/json',Authorization:await auth.getAuthHeaderValue()},body:JSON.stringify({operation,data}),signal:AbortSignal.timeout(45000)});
 if(!response.ok){const issue=await response.json().catch(()=>null);throw Error((typeof issue?.detail==='string'?issue.detail:'The request could not be completed. Retry.')+(issue?.code?' (Issue: '+issue.code+')':''));}
 return response;
}
export async function investorRequest(operation:string,data:Record<string,unknown>={}){return (await investorTransport(operation,data)).json();}
