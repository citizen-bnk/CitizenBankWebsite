import {Link,useParams} from 'react-router-dom';
import {useEffect,useState} from 'react';
import {apiClient} from 'app';
import type {GetDashboardStatsData} from 'types';
import {Header} from '@/components/Header';
import {BackOfficeNav} from '@/components/BackOfficeNav';
import {RoleGuard} from '@/components/RoleGuard';
import {useUserRoles} from '@/utils/useUserRoles';
import {backOfficeWorkspaces,workspaceItems} from '@/utils/backOfficeWorkspaces';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

function Overview(){
 const {roles}=useUserRoles();
 const [stats,setStats]=useState<GetDashboardStatsData>(),[summaryUnavailable,setSummaryUnavailable]=useState(false);
 useEffect(()=>{let active=true;void apiClient.get_dashboard_stats().then(r=>r.json()).then(data=>{if(active)setStats(data);}).catch(()=>{if(active)setSummaryUnavailable(true);});return ()=>{active=false;};},[]);
 return <><Header/><BackOfficeNav/><main className="backoffice-workspace">
  <div className="backoffice-workspace-heading"><div><h1 className="text-3xl font-bold">Back Office</h1><p className="mt-2 text-muted-foreground">Choose the work you want to do.</p></div>
   <div className="flex flex-wrap gap-3">{roles.some(r=>['admin','super_admin'].includes(r))&&<Button asChild><Link to="/back-office-investor-invitations">Invited investors</Link></Button>}<Button asChild variant="outline"><Link to={roles.some(r=>['admin','super_admin'].includes(r))?'/back-office-investors?invite=1':'/back-office-investor-leads'}>Invite investor</Link></Button></div>
  </div>
  {stats&&<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" aria-label="Current business summary">
   {[['Active subscriptions',stats.subscriptions.active,'/back-office-subscriptions'],['Board members',stats.board_members.active,'/back-office-board-members'],['Board invitations',stats.invitations.pending,'/back-office-invitations'],['Documents to review',stats.documents.pending,'/back-office-license-documents']].map(([label,count,path])=><Link className="backoffice-workspace-card" key={String(path)} to={String(path)}><strong>{count}</strong><span>{label}</span></Link>)}
  </div>}
  {summaryUnavailable&&<p role="status" className="text-sm text-muted-foreground mb-5">The summary is temporarily unavailable. Choose a workspace to continue.</p>}
  <div className="backoffice-workspace-grid">{backOfficeWorkspaces.filter(w=>workspaceItems(w.id,roles).length).map(w=><Link className="backoffice-workspace-card" key={w.id} to={'/back-office-workspace/'+w.id}><strong>{w.label} →</strong><span>{w.description}</span></Link>)}</div>
 </main></>;
}
export default function BackOfficeDashboard(){return <RoleGuard allowedRoles={['admin','super_admin','staff','back_office']}><Overview/></RoleGuard>;}
