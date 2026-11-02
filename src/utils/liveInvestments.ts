import {auth} from 'app/auth';
import {ecosystemUrls} from './bankingDestination';

/** The institutional ledger remains the investment system of record. */
export async function liveInvestments(signal?:AbortSignal){
 const token=await auth.getAuthToken();
 const response=await fetch(`${ecosystemUrls.hub}/api/website-investments`,{
  method:'GET',signal,cache:'no-store',headers:token?{Authorization:`Bearer ${token}`}:{},
 });
 if(!response.ok){const issue=await response.json().catch(()=>({}));throw new Error(issue.error||'Investment records are unavailable. Retry or return to the website.');}
 return response.json();
}
