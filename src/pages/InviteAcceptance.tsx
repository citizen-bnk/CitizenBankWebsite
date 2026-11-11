import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {Eye,EyeOff,Mail,ShieldCheck} from 'lucide-react';

export async function onboardingRequest(data:Record<string,unknown>) {
  const response=await fetch('/api/platform/invitation-onboarding',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),
    signal:AbortSignal.timeout(45000),
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result)throw new Error(result?.detail||'The request could not be confirmed. Keep your entries and retry.');
  return result;
}

export function AccountRecovery() {
  const [email,setEmail]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  return <form className="space-y-5" onSubmit={async event=>{
    event.preventDefault();setBusy(true);setError('');
    try{const result=await onboardingRequest({action:'recover',email});setMessage(result.message);}
    catch(cause){setError(cause instanceof Error?cause.message:'Recovery unavailable.');}
    finally{setBusy(false);}
  }}>
    <h1 className="text-2xl font-semibold">Recover your Citizen account</h1>
    <Label htmlFor="recovery-email">Email</Label>
    <Input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/>
    {message&&<p role="status">{message}</p>}
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-4"><Button disabled={busy}>{busy?'Requesting…':'Send recovery email'}</Button><Button asChild variant="outline"><Link to="/auth/sign-in">Sign in</Link></Button></div>
  </form>;
}

export default function InviteAcceptance() {
  const [params]=useSearchParams();
  const token=params.get('token');
  const setup=params.get('setup');
  const [invitation,setInvitation]=useState<{recipient:string;role:string;position?:string;accepted:boolean}>();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [next,setNext]=useState('');
  const [visible,setVisible]=useState(false);
  const [profile,setProfile]=useState({full_name:'',phone:'',country:''});

  async function load() {
    setError('');setBusy(true);
    try {
      if(setup) {
        const data=await onboardingRequest({action:'setup_details',code:setup});
        setProfile({full_name:data.profile.full_name||'',phone:data.profile.phone||'',country:data.profile.country||''});
      } else if(token) {
        setInvitation(await onboardingRequest({action:'inspect',token}));
      } else {throw new Error('Open the complete invitation or setup link from your email.');}
    } catch(cause){setError(cause instanceof Error?cause.message:'Invitation unavailable.');}
    finally{setBusy(false);}
  }
  useEffect(()=>{void load();},[token,setup]);

  async function accept(action:'accept'|'resend_setup') {
    setBusy(true);setError('');
    try {
      const result=await onboardingRequest({action,token});
      setInvitation(current=>current?{...current,accepted:result.accepted}:current);
      setMessage(result.message);
    } catch(cause){setError(cause instanceof Error?cause.message:'Acceptance unavailable.');}
    finally{setBusy(false);}
  }

  return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
    <Card className="w-full max-w-xl">
      <CardHeader className="space-y-4"><Link to="/"><img src="/brand/logo.png" alt="Citizen Bank" className="h-12 w-auto"/></Link><ShieldCheck aria-hidden className="h-10 w-10 text-[#6d52a2]"/><CardTitle>{setup?'Set up your account':'Your Citizen invitation'}</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {error&&<div role="alert" className="space-y-4"><p className="text-red-700">{error}</p><Button variant="outline" disabled={busy} onClick={()=>void load()}>Retry</Button></div>}
        {message&&<p role="status">{message}</p>}
        {next?<Button asChild><Link to={next}>Sign in to your portal</Link></Button>:setup?
          <form className="space-y-5" onSubmit={async event=>{
            event.preventDefault();setError('');setBusy(true);
            const values=new FormData(event.currentTarget);
            try {
              const result=await onboardingRequest({action:'set_password',code:setup,password:values.get('password'),...profile});
              setMessage(result.message);setNext(result.next);
            } catch(cause){setError(cause instanceof Error?cause.message:'Account setup unavailable.');}
            finally{setBusy(false);}
          }}>
            <p className="text-sm text-gray-600">Your basic profile</p>
            {(['full_name','phone','country'] as const).map(field=><div className="space-y-2" key={field}><Label htmlFor={field}>{field==='full_name'?'Full name':field==='phone'?'Mobile number':'Country'}</Label><Input id={field} required value={profile[field]} onChange={e=>setProfile(current=>({...current,[field]:e.target.value}))} placeholder={field==='full_name'?'Thabo Mokoena':field==='phone'?'+266 5000 0000':'Lesotho'} autoComplete={field==='full_name'?'name':field==='phone'?'tel':'country-name'}/></div>)}
            <div className="space-y-2"><Label htmlFor="setup-password">Password</Label><div className="flex gap-3"><Input id="setup-password" name="password" required minLength={12} maxLength={128} type={visible?'text':'password'} autoComplete="new-password" placeholder="At least 12 characters"/><Button type="button" variant="outline" aria-label={visible?'Hide password':'Show password'} onClick={()=>setVisible(!visible)}>{visible?<EyeOff/>:<Eye/>}</Button></div></div>
            <Button disabled={busy}>{busy?'Saving…':'Save password and basic profile'}</Button>
          </form>:
          invitation?<section className="space-y-5">
            <p><Mail className="inline h-5 w-5 mr-2" aria-hidden/>{invitation.recipient}</p>
            <p>{invitation.role==='board_member'?'Board membership':'Investor'}{invitation.position?' · '+invitation.position.replaceAll('_',' '):''}</p>
            {!invitation.accepted?<Button disabled={busy} onClick={()=>void accept('accept')}>{busy?'Accepting…':'Accept invitation'}</Button>:
              <div className="flex flex-wrap gap-4"><Button disabled={busy} onClick={()=>void accept('resend_setup')}>Send account setup email</Button><Button asChild variant="outline"><Link to="/auth/sign-in">Already set up? Sign in</Link></Button></div>}
          </section>:!error?<p role="status">Loading invitation…</p>:null}
        <div className="flex flex-wrap gap-4 border-t pt-5"><Button asChild variant="outline"><Link to="/auth/forgot-password">Recover account</Link></Button><Button asChild variant="outline"><Link to="/">Back to website</Link></Button></div>
      </CardContent>
    </Card>
  </main>;
}
