import {useCallback,useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {apiClient} from 'app';
import {auth} from 'app/auth';
import {useUserRoles} from '@/utils/useUserRoles';
import {accessError} from '@/utils/accessError';
import {investorInvitationPath,managesInvestorInvitations,onlyInvestorInvitations} from '@/utils/invitationList';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {QuickInviteDialog} from './QuickInviteDialog';
import {UserPlus,ExternalLink,Loader2} from 'lucide-react';
type Invitation={id:number;status:string;role?:string;invitation_type?:string};
export function InvitationCard({variant='secondary'}:{variant?:'primary'|'secondary'}){
 const navigate=useNavigate(),{roles,loading:rolesLoading}=useUserRoles();
 const manage=managesInvestorInvitations(roles),destination=investorInvitationPath(roles);
 const [records,setRecords]=useState<Invitation[]>([]),[loading,setLoading]=useState(true),[issue,setIssue]=useState(''),[showInviteDialog,setShowInviteDialog]=useState(false);
 const load=useCallback(async()=>{
  setLoading(true);setIssue('');
  try{
   if(manage){
    const response=await fetch('/api/platform/investor-administration',{method:'POST',headers:{'Content-Type':'application/json',Authorization:await auth.getAuthHeaderValue()},body:JSON.stringify({operation:'investment.directory',data:{}}),signal:AbortSignal.timeout(45000)});
    if(!response.ok)throw await accessError(response);
    const data=await response.json();if(!Array.isArray(data.invitations))throw Error('The invitation list could not be confirmed. Please retry.');setRecords(data.invitations);
   }else{
    const response=await apiClient.list_invitations({});if(!response.ok)throw await accessError(response);
    const data=await response.json();if(!Array.isArray(data.invitations))throw Error('The invitation list could not be confirmed. Please retry.');setRecords(onlyInvestorInvitations(data.invitations));
   }
  }catch(error){setIssue(error instanceof Error?error.message:'Invitations could not be loaded. Please retry.');}finally{setLoading(false);}
 },[manage]);
 useEffect(()=>{if(!rolesLoading)void load();},[load,rolesLoading]);
 const pending=records.filter(r=>['pending','sent'].includes(r.status)).length;
 return <><Card><CardHeader><CardTitle className="flex items-center gap-3 text-xl"><UserPlus className="h-7 w-7 text-[#6d52a2]"/>Investor Invitations</CardTitle><CardDescription>{manage?'Manage investor invitations and acceptance.':'Manage the investor invitations you sent.'}</CardDescription></CardHeader>
 <CardContent className="space-y-4">
  {loading||rolesLoading?<div role="status" className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin"/>Loading invitations…</div>:issue?<div role="alert" className="space-y-3"><p>{issue}</p><Button variant="outline" onClick={()=>void load()}>Retry loading invitations</Button></div>:<button type="button" onClick={()=>navigate(destination)} className="w-full rounded-xl bg-[#6d52a2]/10 p-4 text-left"><strong className="block text-2xl text-[#6d52a2]">{records.length}</strong><span>{pending} awaiting acceptance · {records.filter(r=>r.status==='accepted').length} accepted</span></button>}
  <div className="flex flex-wrap gap-3 pt-2"><Button onClick={()=>manage?navigate('/back-office-investors?invite=1'):setShowInviteDialog(true)} className="bg-[#6d52a2] hover:bg-[#5a4289]"><UserPlus className="mr-2 h-4 w-4"/>Invite investor</Button><Button variant="outline" onClick={()=>navigate(destination)}>View all invitations<ExternalLink className="ml-2 h-4 w-4"/></Button></div>
 </CardContent></Card>{!manage&&<QuickInviteDialog open={showInviteDialog} onOpenChange={setShowInviteDialog} onSuccess={()=>{setShowInviteDialog(false);void load();}}/>}</>;
}
