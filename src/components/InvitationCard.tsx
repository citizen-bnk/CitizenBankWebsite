import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from 'app';
import { toast } from 'sonner';
import { QuickInviteDialog } from './QuickInviteDialog';

interface Invitation {
  id: number;
  status: string;
}

interface InvitationCardProps {
  /** Whether to show as primary card (replaces board investment) or secondary */
  variant?: 'primary' | 'secondary';
}

export function InvitationCard({ variant = 'secondary' }: InvitationCardProps) {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  useEffect(() => {
    loadPendingCount();
  }, []);

  const loadPendingCount = async () => {
    try {
      setLoading(true);
      const response = await apiClient.list_invitations({});
      const data = await response.json();
      const pending = (data.invitations || []).filter((inv: Invitation) => inv.status === 'pending');
      setPendingCount(pending.length);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
      // Don't show error toast - fail silently for better UX
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationSent = () => {
    // Refresh the pending count after successful invitation
    loadPendingCount();
    setShowInviteDialog(false);
  };

  const isPrimary = variant === 'primary';

  return (
    <>
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <UserPlus className="h-8 w-8 text-[#6d52a2]" />
            <CardTitle className="text-xl">Investor Invitations</CardTitle>
          </div>
          <CardDescription>
            {isPrimary 
              ? 'Invite new investors to join Citizen Bank'
              : 'Manage your investor invitations'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#6d52a2]" />
            </div>
          ) : (
            <>
              {/* Pending Invitations Count */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#6d52a2]/10 to-[#5a4289]/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-[#6d52a2]" />
                  <div>
                    <p className="text-sm text-gray-600">Pending Invitations</p>
                    <p className="text-2xl font-bold text-[#6d52a2]">{pendingCount}</p>
                  </div>
                </div>
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="bg-[#6d52a2] text-white">
                    {pendingCount} Active
                  </Badge>
                )}
              </div>

              {/* Description */}
              {isPrimary && (
                <div className="text-sm text-gray-600 space-y-2">
                  <p>As a board member, you can invite new investors to participate in Citizen Bank's growth.</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Send personalized invitation emails</li>
                    <li>Track invitation status</li>
                    <li>Manage pending invitations</li>
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={() => setShowInviteDialog(true)}
                  className="flex-1 bg-[#6d52a2] hover:bg-[#5a4289]"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
                <Button
                  onClick={() => navigate('/board-portal-invitations')}
                  variant="outline"
                  className="flex-1 border-[#6d52a2] text-[#6d52a2] hover:bg-[#6d52a2]/10"
                >
                  View All
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Invite Dialog */}
      <QuickInviteDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onSuccess={handleInvitationSent}
      />
    </>
  );
}
