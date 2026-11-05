import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Header } from '@/components/Header';
import { RoleGuard } from '@/components/RoleGuard';
import { ReferenceDataSetup } from '@/components/ReferenceDataSetup';
import { InvitationPermissionsManager } from '@/components/InvitationPermissionsManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { referenceRequest } from '@/lib/referenceData';

type Catalogue = 'categories'|'roles';
type RecordRow = {id:number;revision:string;category_name?:string;role_name?:string;description:string|null;display_order?:number;is_active?:boolean};
type Form = {name:string;description:string;order:number;active:boolean};
const editors = [
  ['Board positions','/admin-board-positions'], ['Document requirements','/back-office-board-documents'],
  ['Share offers','/back-office-share-classes'], ['Payment destinations','/back-office-bank-accounts'],
  ['Certificate templates','/back-office-certificate-templates'], ['Data room','/back-office-data-room'],
  ['Communication settings','/back-office-engagement'],
];

function Settings() {
  const [catalogue,setCatalogue]=useState<Catalogue>('categories');
  const [rows,setRows]=useState<RecordRow[]>([]);
  const [search,setSearch]=useState(''),[status,setStatus]=useState('all');
  const [issue,setIssue]=useState(''),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
  const [editing,setEditing]=useState<RecordRow|null|undefined>(undefined);
  const [form,setForm]=useState<Form>({name:'',description:'',order:0,active:true});
  const [permissions,setPermissions]=useState(false);
  const load=useCallback(async()=>{
    setLoading(true);setIssue('');
    try {const result=await referenceRequest(`catalogues/${catalogue}`);setRows(result.records);}
    catch(e){setIssue(e instanceof Error?e.message:'Settings could not be loaded.');setRows([]);}
    finally{setLoading(false);}
  },[catalogue]);
  useEffect(()=>{void load();},[load]);
  function edit(row:RecordRow|null){setEditing(row);setIssue('');setForm({name:row?.category_name||row?.role_name||'',description:row?.description||'',order:row?.display_order||0,active:row?.is_active!==false});}
  async function save(){
    setSaving(true);setIssue('');
    try{
      const values=catalogue==='roles'?{description:form.description}:{category_name:form.name,description:form.description,display_order:form.order,is_active:form.active};
      await referenceRequest(`catalogues/${catalogue}${editing?`/${editing.id}`:''}`,{values,revision:editing?.revision||''},editing?'PUT':'POST');
      setEditing(undefined);await load();
    }catch(e){setIssue(e instanceof Error?e.message:'Changes could not be saved.');}
    finally{setSaving(false);}
  }
  const visible=rows.filter(r=>(`${r.category_name||r.role_name} ${r.description||''}`).toLowerCase().includes(search.toLowerCase()) &&
    (catalogue==='roles'||status==='all'||(status==='active'?r.is_active!==false:r.is_active===false)));
  return <><Header/><main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <Button asChild variant="outline"><Link to="/website-settings">Back to settings</Link></Button>
    <h1 className="text-3xl font-bold">Reference settings</h1>
    <p className="text-muted-foreground">Maintain shared choices used by investment and board services.</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{editors.map(([label,path])=><Button className="h-auto justify-start whitespace-normal p-4" variant="outline" asChild key={path}><Link to={path}>{label}</Link></Button>)}
      <Button className="h-auto justify-start p-4" variant="outline" onClick={()=>setPermissions(true)}>Invitation permissions</Button>
    </div>
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap gap-3">{(['categories','roles'] as const).map(name=><Button key={name} disabled={loading} variant={name===catalogue?'default':'outline'} onClick={()=>{setRows([]);setCatalogue(name);setStatus('all');}}>{name==='categories'?'Data-room categories':'Role descriptions'}</Button>)}
        {catalogue==='categories'&&<Button className="sm:ml-auto" onClick={()=>edit(null)}><Plus className="mr-2 h-4 w-4"/>Add category</Button>}
      </div>
      <div className="flex flex-wrap gap-3"><Input className="sm:max-w-sm" aria-label="Search reference records" placeholder="Search by name or description" value={search} onChange={e=>setSearch(e.target.value)}/>
        {catalogue==='categories'&&<select className="rounded-md border bg-background px-3 py-2" aria-label="Category status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="archived">Archived</option></select>}
      </div>
      {issue&&editing===undefined&&<p role="alert">{issue} <Button variant="outline" onClick={()=>void load()}>Retry</Button></p>}
      {loading?<p role="status">Loading settings…</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Name</th><th className="p-3">Description</th><th className="p-3">Status</th><th className="w-16 p-3 text-right">Actions</th></tr></thead><tbody>
        {visible.map(row=><tr key={row.id} className="border-t"><td className="p-3 font-medium">{row.category_name||row.role_name}</td><td className="max-w-sm p-3">{row.description||'—'}</td><td className="p-3">{row.is_active===false?'Archived':'Active'}</td><td className="p-3 text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="outline" aria-label={`Actions for ${row.category_name||row.role_name}`}><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end" sideOffset={6}><DropdownMenuItem onSelect={()=>edit(row)}>Edit{catalogue==='categories'?' or archive':''}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td></tr>)}
        {!visible.length&&<tr><td colSpan={4} className="p-5 text-center">No matching records.</td></tr>}
      </tbody></table></div>}
    </section>
    <ReferenceDataSetup onApplied={()=>void load()}/>
    <Dialog open={editing!==undefined} onOpenChange={open=>{if(!open&&!saving)setEditing(undefined);}}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?'Edit':'Add'} {catalogue==='roles'?'role description':'category'}</DialogTitle><DialogDescription>{catalogue==='roles'?'Role codes and access rights stay controlled.':'Archived categories remain linked to existing documents.'}</DialogDescription></DialogHeader>
      <form className="space-y-5" onSubmit={e=>{e.preventDefault();void save();}}>
        <div className="space-y-2"><Label htmlFor="reference-name">{catalogue==='roles'?'Role code':'Name'}</Label><Input id="reference-name" disabled={catalogue==='roles'||saving} required minLength={2} maxLength={100} placeholder="e.g. Corporate & Governance" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div className="space-y-2"><Label htmlFor="reference-description">Description</Label><Textarea id="reference-description" maxLength={1000} placeholder="e.g. Company registration and governance records" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
        {catalogue==='categories'&&<><div className="space-y-2"><Label htmlFor="reference-order">Display order</Label><Input id="reference-order" type="number" min={0} max={10000} placeholder="e.g. 10" value={form.order} onChange={e=>setForm({...form,order:Number(e.target.value)})}/></div><label className="flex items-center gap-3"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/>Available for new documents</label></>}
        {issue&&<p role="alert" className="text-red-700">{issue}</p>}
        <div className="flex justify-end gap-3 pt-3"><Button type="button" variant="outline" disabled={saving} onClick={()=>setEditing(undefined)}>Cancel</Button><Button disabled={saving}>{saving?'Saving…':'Save changes'}</Button></div>
      </form>
    </DialogContent></Dialog>
    <Dialog open={permissions} onOpenChange={setPermissions}><DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Invitation permissions</DialogTitle><DialogDescription>Manage which roles may invite investors or institutional users.</DialogDescription></DialogHeader><InvitationPermissionsManager/></DialogContent></Dialog>
  </main></>;
}
export default function ReferenceSettings(){return <RoleGuard allowedRoles={['super_admin']}><Settings/></RoleGuard>;}
