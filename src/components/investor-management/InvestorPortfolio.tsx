'use client';

import { useEffect, useRef, useState } from 'react';

type Portfolio = {
  person_id:string; name:string; email:string|null; contact_status:string; activation_status:string;
  holdings:{source_sheet:string;source_row:number;kind:string;quantity:number;reference:string|null;
    reconciliation_status:string;review_note:string|null;units_under_review:number|null}[];
  subscriptions:{subscription_id:string;num_shares:number;amount_paid:number;total_amount:number;status:string}[];
  certificates:{certificate_number:string;shares_count:number;share_class:string;status:string;issue_date:string}[];
  source_documents:{title:string;source_url:string;review_note:string}[];
  template_source:string;
};

async function action(operation:string,data:Record<string,unknown>) {
  const response=await fetch('/api/institutional-operations',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,data}),
    signal:AbortSignal.timeout(45000),
  });
  if(!response.ok) {
    const issue=await response.json().catch(()=>null);
    throw new Error(issue?.error||'The request could not be confirmed. Retry.');
  }
  return response;
}

export function InvestorPortfolio({personId,onClose,transport=action}:{personId:string;onClose:()=>void;transport?:(operation:string,data:Record<string,unknown>)=>Promise<Response>}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [portfolio,setPortfolio]=useState<Portfolio>();
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [pdf,setPdf]=useState<string>();
  const [notice,setNotice]=useState('');

  async function load() {
    setError('');
    try {
      const response=await transport('investment.portfolio',{person_id:personId});
      setPortfolio(await response.json());
    } catch(cause) {setError(cause instanceof Error?cause.message:'Portfolio unavailable.');}
  }

  useEffect(()=>{
    dialog.current?.showModal();
    void load();
  },[personId]);
  useEffect(()=>()=>{if(pdf)URL.revokeObjectURL(pdf);},[pdf]);

  async function certificate(record:Record<string,unknown>) {
    setBusy(true);setError('');
    try {
      const response=await transport('investment.certificate',{person_id:personId,...record});
      const blob=await response.blob();
      if(!blob.type.startsWith('application/pdf'))throw new Error('The certificate response was invalid.');
      setPdf(URL.createObjectURL(blob));
    } catch(cause) {setError(cause instanceof Error?cause.message:'Certificate unavailable.');}
    finally {setBusy(false);}
  }

  async function provision() {
    setBusy(true);setError('');
    try {
      const response=await transport('investment.provision',{person_id:personId});
      const result=await response.json();
      setNotice(result.message||'Account ready.');
      await load();
    } catch(cause) {setError(cause instanceof Error?cause.message:'Account setup unavailable.');}
    finally {setBusy(false);}
  }

  const number=(value:number)=>new Intl.NumberFormat('en-ZA').format(value);
  const labels:Record<string,string>={member_register:'Working register',early_subscription:'Early subscription',safe_schedule:'SAFE schedule',form_reconciliation:'Form reconciliation'};

  return <dialog ref={dialog} className="panel investor-portfolio-dialog" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <div className="button-row"><h2>{portfolio?.name||'Investor portfolio'}</h2><button className="button" disabled={busy} onClick={onClose}>Close</button></div>
    {error&&<p role="alert">{error} <button className="button" disabled={busy} onClick={()=>void load()}>Reload portfolio</button></p>}
    {notice&&<p role="status">{notice}</p>}
    {!portfolio&&!error&&<p role="status">Loading portfolio…</p>}
    {portfolio&&<>
      <p>{portfolio.email||'Contact details needed'} · {portfolio.activation_status}</p>
      {portfolio.contact_status==='unique_email'&&portfolio.activation_status==='pending'&&<button className="button" disabled={busy} onClick={()=>void provision()}>Enable account recovery</button>}
      <p><strong>{number(portfolio.holdings.filter(h=>h.kind==='member_register').reduce((sum,h)=>sum+Number(h.quantity),0))}</strong> shares in the working register · Pending reconciliation</p>
      <h3>Holdings and subscriptions</h3>
      {portfolio.holdings.map(h=><article className="activity-row" key={h.source_sheet+':'+h.source_row}>
        <strong>{labels[h.kind]} · {number(h.quantity)} units</strong>
        <small>{h.reference||'Source reference pending'} · {h.reconciliation_status.replaceAll('_',' ')}</small>
        {h.review_note&&<p>{h.review_note}</p>}
        {h.quantity>0&&!['excluded','withdrawn'].includes(h.reconciliation_status)&&
          <button className="button" disabled={busy} onClick={()=>void certificate({source_sheet:h.source_sheet,source_row:h.source_row})}>Preview certificate</button>}
      </article>)}
      {!portfolio.holdings.length&&<p>No holdings recorded for this profile.</p>}
      {portfolio.subscriptions.map(s=><article className="activity-row" key={s.subscription_id}><strong>{s.subscription_id}</strong><small>{number(s.num_shares)} shares · {s.status} · {number(s.amount_paid)} of {number(s.total_amount)} paid</small></article>)}
      <h3>Source certificate documents</h3>
      {(portfolio.source_documents||[]).map(document=><article className="activity-row" key={document.source_url}><strong>{document.title}</strong><small>{document.review_note}</small><a className="button" href={document.source_url} target="_blank" rel="noreferrer">Open source document</a></article>)}
      <h3>Issued certificates</h3>
      {portfolio.certificates.map(c=><article className="activity-row" key={c.certificate_number}><strong>{c.certificate_number}</strong><small>{number(c.shares_count)} shares · {c.status}</small><button className="button" disabled={busy} onClick={()=>void certificate({certificate_number:c.certificate_number})}>View certificate</button></article>)}
      {!portfolio.certificates.length&&<p>No issued certificates linked yet. Working previews are available above.</p>}
      {pdf&&<section aria-label="Certificate preview"><div className="button-row"><a className="button" href={pdf} download="citizen-certificate.pdf">Download PDF</a><button className="button" onClick={()=>setPdf(undefined)}>Close preview</button></div><iframe title="Citizen Bank certificate preview" src={pdf} style={{width:'100%',height:'65vh',border:0}}/></section>}
      <p><a className="button" href={portfolio.template_source} target="_blank" rel="noreferrer">Certificate template in Drive</a></p>
    </>}
  </dialog>;
}
