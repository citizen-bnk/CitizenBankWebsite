import {useState} from 'react';
import {auth} from 'app/auth';
import {Button} from '@/components/ui/button';
type Connection={provider?:string;sender?:string;project?:string;service?:string;account_label?:string|null;connection_reference?:string|null;read_status?:string;domains?:{name:string;status:string}[];last_event?:string};
export function EmailConnection({messageId}:{messageId?:string}){
 const [data,setData]=useState<Connection>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function check(){setBusy(true);setError('');try{
  const response=await fetch('/api/platform/email-delivery'+(messageId?'?message_id='+encodeURIComponent(messageId):''),{headers:{Authorization:await auth.getAuthHeaderValue()},cache:'no-store',signal:AbortSignal.timeout(20000)});
  const result=await response.json();if(!response.ok)throw Error(result.detail||'Email connection details are temporarily unavailable.');setData(result);
 }catch(error){setError(error instanceof Error?error.message:'Connection unavailable.');}finally{setBusy(false);}}
 return <section className="rounded-xl border p-5 space-y-3" aria-label={messageId?'Provider delivery status':'Email sending connection'}>
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{messageId?'Provider delivery status':'Email sending connection'}</h2><Button type="button" variant="outline" disabled={busy} onClick={()=>void check()}>{busy?'Checking…':messageId?'Check delivery':'Check connection'}</Button></div>
  {!messageId&&<p className="text-sm text-muted-foreground">Resend through Citizen Core · invitations@citizenbank.co.ls</p>}
  {data&&<dl className="grid gap-2 text-sm"><div><dt className="font-semibold">Resend account</dt><dd>{data.account_label||'Account owner has not been verified. The sending address does not identify the Resend login.'}</dd></div>
   {data.connection_reference&&<div><dt className="font-semibold">Connection reference</dt><dd>{data.project} · {data.connection_reference}</dd></div>}
   {data.sender&&<div><dt className="font-semibold">Sender</dt><dd>{data.sender}</dd></div>}
   {data.domains?.map(d=><div key={d.name}><dt className="font-semibold">{d.name}</dt><dd>{d.status}</dd></div>)}
   {data.last_event&&<div><dt className="font-semibold">Last provider event</dt><dd>{data.last_event.replaceAll('_',' ')}</dd></div>}
   {data.read_status!=='available'&&<div role="status">{data.read_status==='read_permission_required'?'The sending key cannot read provider records. This does not mean sending failed. Open the matching Resend team to inspect delivery.':'Provider details could not be confirmed. Check again later.'}</div>}
  </dl>}
  {error&&<p role="alert">{error}</p>}
  <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><a href="https://resend.com/emails" target="_blank" rel="noreferrer">Open Resend email log ↗</a></Button>{!messageId&&<Button asChild variant="outline"><a href="https://vercel.com/smart-my-co/citizenbankcore/settings/environment-variables" target="_blank" rel="noreferrer">Core sending settings ↗</a></Button>}</div>
  <p className="text-xs text-muted-foreground">Sent means accepted by the email service. Delivery, bouncing and inbox placement are separate outcomes.</p>
 </section>;
}
