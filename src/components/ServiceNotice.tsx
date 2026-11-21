"use client";
import {observeServiceFetch} from '../lib/service-observer';
import {useLayoutEffect,useRef,useState} from 'react';
import {serviceMessage,serviceTitle} from '../lib/service-availability';

/** Observes response codes only. Never reads requests, replays writes or unmounts forms. */
export default function ServiceNotice({statusUrl='/api/service-status',websiteUrl='https://citizenbank.co.ls'}:{statusUrl?:string;websiteUrl?:string}) {
  const noticeRef=useRef<HTMLElement>(null);
  const [issue,setIssue]=useState<string|null>(null);
  const [dismissed,setDismissed]=useState<string|null>(null);
  const [checking,setChecking]=useState(false);
  const [result,setResult]=useState('');
  useLayoutEffect(()=>{
    const original=window.fetch;
    let active=true;
    const observe=observeServiceFetch(original,window.location.origin,code=>{if(active)setIssue(code);});
    window.fetch=observe;
    const open=()=>{setDismissed(null);setIssue(current=>current || 'DATABASE_UNAVAILABLE');requestAnimationFrame(()=>noticeRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));};
    window.addEventListener('citizen:service-status',open);
    return ()=>{active=false;if(window.fetch===observe)window.fetch=original;window.removeEventListener('citizen:service-status',open);};
  },[]);
  useLayoutEffect(()=>{
    const element=noticeRef.current;if(!element)return;
    const measure=()=>document.documentElement.style.setProperty('--citizen-notice-height',element.getBoundingClientRect().height+'px');
    measure();const observer=new ResizeObserver(measure);observer.observe(element);
    return ()=>{observer.disconnect();document.documentElement.style.removeProperty('--citizen-notice-height');};
  },[issue,dismissed]);
  async function check() {
    if(checking)return;
    setChecking(true);setResult('');
    try {
      const response=await fetch(statusUrl,{cache:'no-store',signal:AbortSignal.timeout(10000)});
      const body=await response.json();
      setResult(response.ok && (body.status==='ready' || body.ok===true)
        ? 'Services are responding again. Check your request’s status before submitting it again.'
        : 'Some services are still unavailable. Please try again later.');
    } catch {setResult('We could not check availability. Please try again later.');}
    finally {setChecking(false);}
  }
  if(!issue || dismissed===issue)return null;
  const button={minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #82709e',background:'#fff',color:'#382357',fontWeight:600,cursor:'pointer'} as const;
  return <aside ref={noticeRef} aria-label="Service availability" style={{background:'#f4effb',color:'#302044',borderBottom:'1px solid #d8cee7',padding:'18px clamp(16px,4vw,48px)',fontFamily:'system-ui'}}>
    <div style={{maxWidth:1100,margin:'auto'}}><div role="status" aria-live="polite"><strong>{serviceTitle}</strong><p style={{margin:'6px 0 12px',lineHeight:1.5}}>{serviceMessage}</p></div>
      <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center'}}>
        <button type="button" style={{...button,background:'#563487',color:'#fff'}} disabled={checking} onClick={()=>void check()}>{checking?'Checking…':'Check availability'}</button>
        <a style={{...button,display:'inline-flex',alignItems:'center',textDecoration:'none'}} href={websiteUrl}>Citizen Bank website</a>
        <button type="button" style={button} onClick={()=>{setDismissed(issue);setResult('');}}>Dismiss notice</button>
      </div>
      {result && <p role="status" style={{marginTop:12}}>{result}</p>}
      <details style={{marginTop:12,fontSize:12}}><summary>Support reference</summary>{issue}</details>
    </div>
  </aside>;
}
