import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from 'app/auth';
import { Header } from 'components/Header';
import { BackOfficeNav } from 'components/BackOfficeNav';
import { RoleGuard } from 'components/RoleGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Promotion = { id: string; title: string; price_per_share: number; audience: string;
  starts_at: string; ends_at: string; status: string };

function Promotions() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [audience, setAudience] = useState('invited_and_shareholders');
  const [endsAt, setEndsAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState('');

  const request = useCallback(async (path: string, method = 'GET', body?: object) => {
    const response = await fetch(`/api/share-promotions${path}`, {
      method, headers: { Authorization: await auth.getAuthHeaderValue(),
        ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'The promotion could not be saved. Retry.');
    return data;
  }, []);

  const reload = useCallback(async () => {
    try { setItems(await request('/admin')); setIssue(''); }
    catch (error) { setIssue(error instanceof Error ? error.message : 'Could not load promotions.'); }
  }, [request]);

  useEffect(() => { void reload(); }, [reload]);

  const launch = async () => {
    setBusy(true);
    try {
      await request('', 'POST', { title: title.trim(), price_per_share: Number(price),
        audience, ends_at: new Date(endsAt).toISOString() });
      setTitle(''); setPrice(''); setEndsAt(''); await reload();
    } catch (error) { setIssue(error instanceof Error ? error.message : 'Could not launch promotion.'); }
    finally { setBusy(false); }
  };

  const close = async (id: string) => {
    setBusy(true);
    try { await request(`/${id}/close`, 'POST'); await reload(); }
    catch (error) { setIssue(error instanceof Error ? error.message : 'Could not close promotion.'); }
    finally { setBusy(false); }
  };

  return <div className="min-h-screen bg-gray-50"><Header/><BackOfficeNav/>
    <main className="lg:ml-64 p-5 md:p-8 max-w-6xl space-y-7">
      <div><Link to="/back-office-dashboard" className="text-sm underline">Back to dashboard</Link>
        <h1 className="text-3xl font-bold mt-3">Share promotions</h1>
        <p className="text-gray-600 mt-2">Offer Class B shares to invited investors and shareholders.</p></div>
      {issue && <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{issue} <Button variant="outline" onClick={() => void reload()} className="ml-3">Retry</Button></div>}
      <section className="bg-white rounded-xl border p-5 space-y-5">
        <h2 className="text-xl font-semibold">Launch a promotion</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div><Label htmlFor="promotion-title">Title</Label><Input id="promotion-title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. November shareholder offer"/></div>
          <div><Label htmlFor="promotion-price">Price per share (R)</Label><Input id="promotion-price" type="number" min="0.01" max="10" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="e.g. 8.00"/></div>
          <div><Label htmlFor="promotion-audience">Who may buy?</Label><select id="promotion-audience" className="w-full h-10 rounded-md border px-3" value={audience} onChange={e=>setAudience(e.target.value)}>
            <option value="invited_and_shareholders">Invited investors and existing shareholders</option>
            <option value="existing_shareholders">Existing shareholders only</option></select></div>
          <div><Label htmlFor="promotion-end">Ends on</Label><Input id="promotion-end" type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)}/></div>
        </div>
        <Button disabled={busy || title.trim().length < 4 || !price || !endsAt} onClick={() => void launch()}>Launch promotion</Button>
      </section>
      <section className="bg-white rounded-xl border p-5 space-y-4"><h2 className="text-xl font-semibold">Promotion history</h2>
        {items.length === 0 && <p className="text-gray-600">No promotions yet.</p>}
        {items.map(item => <article key={item.id} className="border rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
          <div><h3 className="font-semibold">{item.title}</h3><p className="text-sm text-gray-600">R{item.price_per_share.toFixed(2)} per Class B share · {item.audience === 'existing_shareholders' ? 'Shareholders' : 'Invited investors and shareholders'} · Ends {new Date(item.ends_at).toLocaleString('en-ZA')}</p></div>
          <div className="flex items-center gap-3"><span className="rounded-full bg-gray-100 px-3 py-1 text-sm">{item.status}</span>
            {item.status === 'active' && <Button variant="outline" disabled={busy} onClick={() => void close(item.id)}>End promotion</Button>}</div>
        </article>)}
      </section>
    </main></div>;
}

export default function BackOfficeSharePromotions() {
  return <RoleGuard allowedRoles={['super_admin','staff']}><Promotions/></RoleGuard>;
}
