'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import './investor-directory.css';

type Profile = {
  person_id: string; account_id: string | null; full_name: string;
  email: string | null; phone: string | null; country: string | null;
  investment_purpose: string | null; relationship: string;
  version: number; account_version: number | null; account_status: string | null;
  activation_status: string; contact_status: string; entity_type: string;
};

type Invitation = {
  id: number; full_name: string | null; email: string; status: string;
  email_status: string | null; account_confirmed: boolean;
  sent_at: string | null; expires_at: string | null; provider_message_id?:string|null;
};

type Records = { investors: Profile[]; invitations: Invitation[] };
type Props = {
  request: (operation: string, data?: Record<string, unknown>) => Promise<unknown>;
  accountUrl: string;
  initialTab?: 'profiles'|'invitations';
  emailLogUrl?: string;
  onPortfolio: (personId: string) => void;
};

const accountLabels: Record<string, string> = {
  linked: 'Linked account', provisioned: 'Account prepared', pending: 'Awaiting setup',
  excluded: 'Excluded', review: 'Needs review',
};
const contactLabels: Record<string, string> = {
  unique_email: 'Individual email', shared_contact: 'Shared email',
  missing: 'Contact missing', review: 'Contact needs review',
};
const invitationLabels: Record<string, string> = {
  pending: 'Awaiting acceptance', sent: 'Awaiting acceptance', accepted: 'Accepted',
  expired: 'Expired', cancelled: 'Cancelled',
};
const emailLabels: Record<string, string> = {
  sent: 'Sent to email service', pending: 'Queued', processing: 'Sending',
  retrying: 'Retry scheduled', failed: 'Send failed',
};
const showDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeZone: 'Africa/Maseru' }).format(new Date(value))
  : '—';

export function InvestorDirectory({ request, accountUrl, emailLogUrl, initialTab, onPortfolio }: Props) {
  const [records, setRecords] = useState<Records>();
  const [tab, setTab] = useState<'profiles' | 'invitations'>('profiles');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Profile>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState('');
  const [formIssue, setFormIssue] = useState('');
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const inviteDialog=useRef<HTMLDialogElement>(null);
  const [inviteError,setInviteError]=useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setIssue('');
    try {
      setRecords(await request('investment.directory') as Records);
    } catch (error) {
      setIssue(error instanceof Error ? error.message : 'Could not load investor records.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { void load(); }, [load]);
  useEffect(()=>{if(initialTab){setTab(initialTab);setPage(1);setStatus('');}},[initialTab]);
  useEffect(()=>{if(new URLSearchParams(window.location.search).get('invite')==='1')inviteDialog.current?.showModal();},[]);
  useEffect(() => {const sync=()=>{setTab(window.location.hash==='#invitations'?'invitations':'profiles');setPage(1);setStatus('');};sync();window.addEventListener('hashchange',sync);return ()=>window.removeEventListener('hashchange',sync);}, []);
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);

  function switchTab(next: 'profiles' | 'invitations') {
    window.history.replaceState(null,'',window.location.pathname+window.location.search+(next==='invitations'?'#invitations':''));
    setTab(next);
    setPage(1);
    setStatus('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy) return;
    const form = new FormData(event.currentTarget);
    const update: Record<string, unknown> = {
      user_id: selected.person_id, version: selected.version,
      account_version: selected.account_version,
      full_name: form.get('full_name'), phone: form.get('phone'),
      investment_purpose: form.get('investment_purpose'),
    };
    if (selected.account_id) update.country = form.get('country');
    if (!selected.account_id) {
      const email = String(form.get('contact_email') || '').trim().toLowerCase();
      if (email !== (selected.email || '').trim().toLowerCase()) update.contact_email = email || null;
    }
    setBusy(true);
    setFormIssue('');
    try {
      await request('investment.update', update);
      setSelected(undefined);
      setNotice('Investor profile saved.');
      await load();
    } catch (error) {
      setFormIssue(error instanceof Error ? error.message : 'Could not save this profile.');
    } finally {
      setBusy(false);
    }
  }

  async function createInvitation(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;const form=new FormData(event.currentTarget);
    setBusy(true);setInviteError('');
    try{const result=await request('invitation.create',{full_name:form.get('full_name'),email:form.get('email')}) as {message:string};
      inviteDialog.current?.close();setNotice(result.message);switchTab('invitations');await load();
    }catch(error){setInviteError(error instanceof Error?error.message:'The invitation could not be saved.');}finally{setBusy(false);}
  }

  async function invitationAction(operation: 'invitation.resend' | 'invitation.cancel', invitation: Invitation) {
    if (busy) return;
    if (operation === 'invitation.cancel' && !window.confirm('Cancel the invitation for ' + invitation.email + '?')) return;
    setBusy(true);
    setIssue('');
    try {
      const result = await request(operation, { invitation_id: invitation.id }) as { message: string };
      setNotice(result.message);
      await load();
    } catch (error) {
      setIssue(error instanceof Error ? error.message : 'Could not update this invitation.');
    } finally {
      setBusy(false);
    }
  }

  const matches = (...values: (string | null)[]) => {
    const term = search.trim().toLowerCase();
    return values.some(value => (value || '').toLowerCase().includes(term));
  };
  const profiles = (records?.investors || []).filter(p =>
    matches(p.full_name, p.email, p.phone) && (!status ||
      (status === 'contact_review' ? p.contact_status !== 'unique_email' : p.activation_status === status)));
  const invitations = (records?.invitations || []).filter(i =>
    matches(i.full_name, i.email) && (!status || (status === 'awaiting'
      ? ['pending','sent'].includes(i.status) : i.status === status)));
  const total = tab === 'profiles' ? profiles.length : invitations.length;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / 15)));
  const start = (currentPage - 1) * 15;

  return <section className="investor-directory" aria-label="Manage investors">
    <div className="investor-directory-controls">
      <button type="button" onClick={()=>{setInviteError('');inviteDialog.current?.showModal();}}>Invite investor</button>
      <button type="button" aria-pressed={tab === 'profiles'} onClick={() => switchTab('profiles')}>
        Investor profiles {records ? '(' + records.investors.length + ')' : ''}
      </button>
      <button type="button" aria-pressed={tab === 'invitations'} onClick={() => switchTab('invitations')}>
        Invited investors {records ? '(' + records.invitations.length + ')' : ''}
      </button>
      <button type="button" onClick={() => void load()} disabled={loading}>Refresh</button>
    </div>
    {issue && <p role="alert">{issue} <button onClick={() => void load()}>Retry</button></p>}
    {notice && <p role="status">{notice}</p>}
    {!records && loading && <p role="status">Loading investor records…</p>}
    {records && <>
      <div className="investor-directory-controls">
        <label>Search <input type="search" value={search} placeholder="Name, email or mobile"
          onChange={event => { setSearch(event.target.value); setPage(1); }}/></label>
        <label>Status <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {Object.entries(tab === 'profiles'
            ? { ...accountLabels, contact_review: 'Contact needs review' }
            : { awaiting: 'Awaiting acceptance', accepted: 'Accepted', expired: 'Expired', cancelled: 'Cancelled' }
          ).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
      </div>
      {tab === 'profiles' ? <ul className="investor-directory-rows">
        {profiles.slice(start, start + 15).map(profile => <li key={profile.person_id}>
          <div>
            <strong>{profile.full_name}</strong>
            <span>{profile.email || 'Email not recorded'}{profile.phone ? ' · ' + profile.phone : ''}</span>
            <span>{profile.entity_type === 'organisation' ? 'Organisation' : accountLabels[profile.activation_status] || profile.activation_status}
              {' · '}{contactLabels[profile.contact_status] || profile.contact_status}
              {profile.account_status === 'suspended' ? ' · Account suspended' : ''}</span>
          </div>
          <RecordActions label={profile.full_name}>
            <button type="button" onClick={() => { setFormIssue(''); setSelected(profile); }}>Manage profile</button>
            <button type="button" onClick={() => onPortfolio(profile.person_id)}>Portfolio</button>
          </RecordActions>
        </li>)}
      </ul> : <ul className="investor-directory-rows">
        {invitations.slice(start, start + 15).map(invitation => <li key={invitation.id}>
          <div><strong>{invitation.full_name || invitation.email}</strong><span>{invitation.email}</span>
            <span>{invitationLabels[invitation.status] || invitation.status}
              {invitation.status === 'accepted' ? invitation.account_confirmed ? ' · Account confirmed' : ' · Account setup pending' : ''}</span></div>
          <div><strong>{emailLabels[invitation.email_status || ''] || 'Email send not recorded'}</strong>
            <span>Sent {showDate(invitation.sent_at)} · Expires {showDate(invitation.expires_at)}</span>{invitation.provider_message_id&&<small>Provider ID: {invitation.provider_message_id}</small>}</div>
          <RecordActions label={invitation.full_name || invitation.email}>
            {invitation.status !== 'cancelled' && <button type="button" disabled={busy}
              onClick={() => void invitationAction('invitation.resend', invitation)}>
              {invitation.status === 'accepted' ? 'Send account setup email' : 'Resend invitation'}
            </button>}
            {['pending','sent','expired'].includes(invitation.status) && <button type="button" disabled={busy}
              onClick={() => void invitationAction('invitation.cancel', invitation)}>Cancel invitation</button>}
            <a href={(emailLogUrl||accountUrl.replace(/\/admin-users$/,'/back-office-sent-items')) + '?search=' + encodeURIComponent(invitation.email)}>View email history</a>
            <a href={accountUrl + '?search=' + encodeURIComponent(invitation.email)}>Manage account access</a>
          </RecordActions>
        </li>)}
      </ul>}
      {total === 0 && <p role="status">No matching {tab === 'profiles' ? 'profiles' : 'invitations'}.</p>}
      {total > 0 && <div className="investor-directory-controls">
        <span>{start + 1}–{Math.min(start + 15, total)} of {total}</span>
        <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
        <button type="button" disabled={start + 15 >= total} onClick={() => setPage(currentPage + 1)}>Next</button>
      </div>}
    </>}
    <dialog ref={dialog} aria-labelledby="manage-investor-title"
      onCancel={event => { event.preventDefault(); if (!busy) setSelected(undefined); }}>
      {selected && <form key={selected.person_id} onSubmit={save}>
        <h2 id="manage-investor-title">Manage investor profile</h2>
        <p>{selected.relationship}</p>
        <label>Full name <input name="full_name" required maxLength={150} defaultValue={selected.full_name}/></label>
        <label>{selected.account_id ? 'Sign-in email' : 'Contact email'} <input name="contact_email" type="email"
          readOnly={Boolean(selected.account_id)} defaultValue={selected.email || ''} placeholder="name@example.com"/></label>
        <label>Mobile <input name="phone" type="tel" maxLength={30} defaultValue={selected.phone || ''} placeholder="+266 5000 0000"/></label>
        {selected.account_id && <label>Country <input name="country" maxLength={100}
          defaultValue={selected.country || ''} placeholder="Lesotho"/></label>}
        <label>Investment purpose <textarea name="investment_purpose" maxLength={300}
          defaultValue={selected.investment_purpose || ''} placeholder="Long-term investment"/></label>
        {selected.account_id && selected.email && <a href={accountUrl + '?search=' + encodeURIComponent(selected.email)}>Manage password recovery, roles and account access</a>}
        {formIssue && <p role="alert">{formIssue}</p>}
        <div className="investor-directory-actions">
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          <button type="button" disabled={busy} onClick={() => setSelected(undefined)}>Close</button>
        </div>
      </form>}
    </dialog>
    <dialog ref={inviteDialog} aria-labelledby="invite-investor-title" onCancel={event=>{if(busy)event.preventDefault();}}>
      <form onSubmit={createInvitation}>
        <h2 id="invite-investor-title">Invite investor</h2>
        <label>Full name<input name="full_name" required minLength={2} maxLength={150} placeholder="Example: Thabo Mokoena"/></label>
        <label>Email<input name="email" type="email" required placeholder="name@example.com"/></label>
        {inviteError&&<p role="alert">{inviteError}</p>}
        <div className="investor-directory-actions"><button type="submit" disabled={busy}>{busy?'Saving…':'Save invitation'}</button><button type="button" disabled={busy} onClick={()=>inviteDialog.current?.close()}>Cancel</button></div>
      </form>
    </dialog>
  </section>;
}


function RecordActions({ label, children }: { label: string; children: ReactNode }) {
  return <details className="investor-record-actions" onToggle={event => {
    const details = event.currentTarget;
    const menu = details.querySelector<HTMLElement>('.investor-record-menu');
    if (menu && details.open) {
      const opensUp = details.getBoundingClientRect().bottom + 180 > window.innerHeight;
      menu.style.top = opensUp ? 'auto' : '100%';
      menu.style.bottom = opensUp ? '100%' : 'auto';
    }
  }}>
    <summary aria-label={'Actions for ' + label}>⋯</summary>
    <div className="investor-record-menu" onClick={event => {
      if ((event.target as HTMLElement).closest('button,a')) {
        event.currentTarget.closest('details')?.removeAttribute('open');
      }
    }}>{children}</div>
  </details>;
}
