import {Link,useParams} from 'react-router-dom';
import {useState} from 'react';
import {Header} from '@/components/Header';
import {BackOfficeNav} from '@/components/BackOfficeNav';
import {RoleGuard} from '@/components/RoleGuard';
import {useUserRoles} from '@/utils/useUserRoles';
import {backOfficeWorkspaces,workspaceItems} from '@/utils/backOfficeWorkspaces';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

function Workspace(){
 const {section}=useParams(),{roles}=useUserRoles(),[search,setSearch]=useState('');
 const workspace=backOfficeWorkspaces.find(w=>w.id===section);
 const items=workspaceItems(section||'',roles).filter(i=>(i.label+' '+i.description).toLowerCase().includes(search.toLowerCase()));
 return <><Header/><BackOfficeNav/><main className="backoffice-workspace">
  <div className="backoffice-workspace-heading"><div><h1 className="text-3xl font-bold">{workspace?.label||'Back Office'}</h1><p className="mt-2 text-muted-foreground">{workspace?.description||'Choose a workspace.'}</p></div><Button asChild variant="outline"><Link to="/back-office-dashboard">Back to overview</Link></Button></div>
  <Input aria-label="Find an action" placeholder="Find an action…" value={search} onChange={e=>setSearch(e.target.value)} className="mb-5 max-w-md"/>
  <div className="backoffice-workspace-grid">{items.map(i=><Link className="backoffice-workspace-card" key={i.path} to={i.path}><strong>{i.label} →</strong><span>{i.description}</span></Link>)}</div>
  {!items.length&&<p role="status">No matching actions are available for your role.</p>}
 </main></>;
}
export default function BackOfficeWorkspace(){return <RoleGuard allowedRoles={['admin','super_admin','staff','back_office']}><Workspace/></RoleGuard>;}
