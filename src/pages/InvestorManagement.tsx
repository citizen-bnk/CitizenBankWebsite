import {BackOfficeNav} from '@/components/BackOfficeNav';
import {useUser} from '@stackframe/react';
import {useUserRoles} from 'utils/useUserRoles';
import {EmailVerificationAction} from '@/components/EmailVerificationAction';
import { useState } from 'react';
import { Link,useLocation,Navigate } from 'react-router-dom';
import {investorTransport as transport,investorRequest as request} from '@/utils/investorAdministration';
import { Header } from 'components/Header';
import { RoleGuard } from 'components/RoleGuard';
import { InvestorDirectory } from '@/components/investor-management/InvestorDirectory';
import { InvestorPortfolio } from '@/components/investor-management/InvestorPortfolio';
import { Button } from '@/components/ui/button';

function Management() {
  const user=useUser();
  const {roles}=useUserRoles();
  const location=useLocation();
  const [portfolio, setPortfolio] = useState<string>();
  return <>
    <Header/><BackOfficeNav/>
    <main className="max-w-6xl mx-auto p-5 md:p-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">Manage investors</h1>
        <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link to="/back-office-investor-invitations">Investor invitations</Link></Button><Button asChild variant="outline"><Link to="/back-office-investor-reconciliation">Source reconciliation</Link></Button><Button asChild variant="outline"><Link to="/back-office-sent-items">Email delivery</Link></Button>
          <Button asChild variant="outline"><Link to="/back-office-dashboard">Back Office</Link></Button>
          <Button asChild variant="outline"><Link to="/admin-users">User access</Link></Button>
        </div>
      </div>
      {user&&!user.primaryEmailVerified&&!roles.includes('super_admin')?<EmailVerificationAction/>:<InvestorDirectory request={request} accountUrl="/admin-users" initialTab={location.hash==='#invitations'?'invitations':'profiles'} onPortfolio={setPortfolio}/>}
      {portfolio && <InvestorPortfolio personId={portfolio} onClose={() => setPortfolio(undefined)} transport={transport}/>}
    </main>
  </>;
}

export default function InvestorManagement() {
  const location=useLocation();
  return <RoleGuard allowedRoles={['admin','super_admin']}>{location.hash==='#invitations'?<Navigate replace to="/back-office-investor-invitations"/>:<Management/>}</RoleGuard>;
}
