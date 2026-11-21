import {BackOfficeNav} from '@/components/BackOfficeNav';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from 'app/auth';
import { Header } from 'components/Header';
import { RoleGuard } from 'components/RoleGuard';
import { InvestorDirectory } from '@/components/investor-management/InvestorDirectory';
import { InvestorPortfolio } from '@/components/investor-management/InvestorPortfolio';
import { Button } from '@/components/ui/button';

async function transport(operation: string, data?: Record<string, unknown>) {
  const response = await fetch('/api/platform/investor-administration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: await auth.getAuthHeaderValue() },
    body: JSON.stringify({ operation, data: data || {} }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) {
    const issue = await response.json().catch(() => null);
    throw new Error(typeof issue?.detail === 'string' ? issue.detail : 'The request could not be completed. Retry.');
  }
  return response;
}

async function request(operation: string, data?: Record<string, unknown>) {
  return (await transport(operation, data)).json();
}

function Management() {
  const [portfolio, setPortfolio] = useState<string>();
  return <>
    <Header/><BackOfficeNav/>
    <main className="max-w-6xl mx-auto p-5 md:p-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">Manage investors</h1>
        <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link to="/back-office-sent-items">Email delivery</Link></Button>
          <Button asChild variant="outline"><Link to="/back-office-dashboard">Back Office</Link></Button>
          <Button asChild variant="outline"><Link to="/admin-users">User access</Link></Button>
        </div>
      </div>
      <InvestorDirectory request={request} accountUrl="/admin-users" onPortfolio={setPortfolio}/>
      {portfolio && <InvestorPortfolio personId={portfolio} onClose={() => setPortfolio(undefined)} transport={transport}/>}
    </main>
  </>;
}

export default function InvestorManagement() {
  return <RoleGuard allowedRoles={['admin','super_admin']}><Management/></RoleGuard>;
}
