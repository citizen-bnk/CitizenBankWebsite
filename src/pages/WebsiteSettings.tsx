import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {auth} from 'app/auth';
import {Header} from 'components/Header';
import {RoleGuard} from 'components/RoleGuard';
import {useUserRoles} from 'utils/useUserRoles';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
type Settings={site_name:string;company_name:string;contact_email:string;notice:string;version:number};
function Settings(){const {isSuperAdmin}=useUserRoles();const [data,setData]=useState<Settings|null>(null),[issue,setIssue]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
 async function load(){try{const r=await fetch('/api/website-settings/admin',{headers:{Authorization:await auth.getAuthHeaderValue()}});const d=await r.json();if(!r.ok)throw Error(d.detail||'Settings unavailable.');setData(d);setIssue('');}catch(e){setIssue(e instanceof Error?e.message:'Settings unavailable.');}}
 useEffect(()=>{void load();},[]);
 return <><Header/><main className="max-w-2xl mx-auto p-6 space-y-5"><Button asChild variant="outline"><Link to="/back-office-dashboard">Back to administration</Link></Button><h1 className="text-3xl font-bold">Website settings</h1><p>Pre-licensing · Invitation-only investments</p>{issue&&<p role="alert">{issue} <Button variant="outline" onClick={()=>void load()}>Retry</Button></p>}{saved&&<p role="status">Settings saved.</p>}{data&&<form className="space-y-5" onSubmit={async e=>{e.preventDefault();setBusy(true);try{const r=await fetch('/api/website-settings/admin',{method:'PATCH',headers:{Authorization:await auth.getAuthHeaderValue(),'Content-Type':'application/json'},body:JSON.stringify({version:data.version,site_name:data.site_name,company_name:data.company_name,contact_email:data.contact_email,notice:data.notice})});const d=await r.json();if(!r.ok)throw Error(d.detail||'Could not save.');setSaved(true);await load();}catch(e){setIssue(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}}}>{(['site_name','company_name','contact_email','notice'] as const).map(key=><div key={key}><Label htmlFor={key}>{key.replaceAll('_',' ')}</Label><Input id={key} value={data[key]} disabled={!isSuperAdmin} onChange={e=>setData({...data,[key]:e.target.value})}/></div>)}{isSuperAdmin&&<Button disabled={busy}>{busy?'Saving…':'Save settings'}</Button>}</form>}<div className="flex flex-wrap gap-3">{isSuperAdmin&&<Button asChild><Link to="/reference-settings">Reference settings</Link></Button>}<Button asChild variant="outline"><Link to="/back-office-share-classes">Share offer settings</Link></Button><Button asChild variant="outline"><Link to="/admin-users">Manage users</Link></Button></div></main></>;}
export default function WebsiteSettings(){return <RoleGuard allowedRoles={['super_admin','admin','staff']}><Settings/></RoleGuard>;}
