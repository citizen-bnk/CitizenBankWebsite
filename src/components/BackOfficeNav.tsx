import {Link,useLocation} from 'react-router-dom';
import {backOfficeWorkspaces,workspaceItems,activeWorkspace} from '@/utils/backOfficeWorkspaces';
import {useUserRoles} from '@/utils/useUserRoles';
import './back-office-navigation.css';
/** One entry per workspace; actions belong on its dashboard. */
export function BackOfficeNav(_props:{currentPage?:string}){
 const {roles}=useUserRoles(),location=useLocation();
 const active=location.pathname.startsWith('/back-office-workspace/')?location.pathname.split('/').pop():activeWorkspace(location.pathname);
 return <nav className="citizen-backoffice-nav" aria-label="Back Office">
  <Link className={!active?'selected':''} to="/back-office-dashboard">Overview</Link>
  {backOfficeWorkspaces.filter(w=>workspaceItems(w.id,roles).length).map(w=><Link key={w.id} className={active===w.id?'selected':''} aria-current={active===w.id?'page':undefined} to={'/back-office-workspace/'+w.id}>{w.label}</Link>)}
 </nav>;
}
