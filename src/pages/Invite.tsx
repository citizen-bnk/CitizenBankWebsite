import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Redirect page for /invite?token=xxx URLs sent in emails.
 * Redirects to InviteAcceptance page which handles the full flow.
 */
export default function Invite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      // Redirect to the InviteAcceptance page with token as query param
      navigate(`/invite-acceptance?token=${token}`, { replace: true });
    } else {
      // No token, redirect to home
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading invitation...</p>
      </div>
    </div>
  );
}
