import {useState} from 'react';
import {useUser} from '@stackframe/react';
import {useUserRoles} from 'utils/useUserRoles';
import {Button} from '@/components/ui/button';
export function EmailVerificationAction({compact=false}:{compact?:boolean}){
 const {roles}=useUserRoles();
 const user=useUser(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 if(!user||user.primaryEmailVerified||roles.includes('super_admin'))return null;
 async function send(){
  if(!user||busy)return;setBusy(true);setMessage('');
  try{const result=await user.sendVerificationEmail();setMessage(result?'Your email may already be verified. Select Check verification to refresh your session.':'Verification email requested. Open the link in your inbox, then select Check verification.');}
  catch{setMessage('The verification email could not be requested. Please try again.');}finally{setBusy(false);}
 }
 return <section className={compact?'mt-3 space-y-3':'mx-auto my-6 max-w-xl rounded-xl border bg-white p-6 space-y-4'} aria-label="Email verification">
  {!compact&&<><h2 className="text-xl font-semibold">Verify your email to open investor records</h2><p className="text-sm text-muted-foreground">Your account has access to this workspace. Verify {user.primaryEmail} to continue.</p></>}
  <div className="flex flex-wrap gap-3"><Button type="button" size="sm" disabled={busy} onClick={()=>void send()}>{busy?'Requesting…':'Send verification email'}</Button><Button type="button" size="sm" variant="outline" onClick={()=>window.location.reload()}>Check verification</Button></div>
  {message&&<p role="status" className="text-sm">{message}</p>}
 </section>;
}
