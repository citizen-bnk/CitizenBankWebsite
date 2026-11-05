import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { referenceRequest } from '@/lib/referenceData';

export function ReferenceDataSetup({onApplied}: {onApplied:()=>void}) {
  const [report,setReport] = useState<any>(null);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [canApply,setCanApply] = useState(false);
  async function run(action:'readiness'|'history'|'preview'|'apply') {
    setBusy(true); setError(''); setCanApply(false);
    try {
      const result = await referenceRequest(action==='readiness' || action==='history' ? action:'seed',
        action==='readiness' || action==='history' ? undefined : {apply:action==='apply',confirmation:action==='apply'?'APPLY SAFE DEFAULTS':''});
      setReport(result);
      setCanApply(action==='preview' && !result.applied);
      if (action==='apply') onApplied();
    } catch (e) { setError(e instanceof Error ? e.message:'Setup could not be completed.'); }
    finally {setBusy(false);}
  }
  return <Card className="my-6">
    <CardHeader><CardTitle>Reference data setup</CardTitle><CardDescription>
      Super administrators only. Inspect existing catalogues, preview changes, then apply missing defaults.
      Existing records and archived choices are preserved. Document requirements are created as inactive drafts;
      no offers, payment destinations, user roles or communications are activated.
    </CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={()=>run('readiness')}>Check readiness</Button>
        <Button variant="outline" disabled={busy} onClick={()=>run('history')}>View change history</Button>
        <Button variant="outline" disabled={busy} onClick={()=>run('preview')}>Preview safe defaults</Button>
        <Button disabled={busy || !canApply} onClick={()=> {
          if(window.confirm('Apply the previewed missing defaults to this environment? Draft requirements will remain inactive.')) run('apply');
        }}>Apply safe defaults</Button>
      </div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {report && <div aria-live="polite">
        {report.preview_note && <p>{report.preview_note}</p>}
        {(report.runs || []).map((run:any)=><div key={run.id} className="py-2"><p>{run.version} — {run.applied_at}</p><ul className="list-disc pl-5">{run.changes.map((c:any,i:number)=><li key={i}>{c.action || 'seed'}: {c.table} {c.code || c.position_name || c.id}</li>)}</ul></div>)}
        <p className="font-medium">{report.applied ? 'Applied successfully' : report.changes ? 'Dry run: no catalogue changes saved' : report.runs ? 'Recent catalogue changes' : 'Readiness inventory — counts are not policy approval'}</p>
        <ul className="list-disc pl-5">{(report.changes || []).map((c:any,i:number)=><li key={i}>{c.table}: {c.code}{c.draft?' (inactive draft)':''}</li>)}</ul>
        <ul className="list-disc pl-5">{(report.checks || report.after || []).map((c:any)=><li key={c.table}>
          {c.table}: {c.exists ? `${c.count} records${c.active_count===null?'':`, ${c.active_count} active`}`:'missing table'}.
          {c.missing_columns?.length>0 && ` Missing columns: ${c.missing_columns.join(', ')}.`} {c.instruction}
        </li>)}</ul>
        <ul className="list-disc pl-5">{(report.review_required || []).map((text:string)=><li key={text}>{text}</li>)}</ul>
      </div>}
    </CardContent>
  </Card>;
}
