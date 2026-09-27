import { useEffect, useRef, useState } from 'react';
import { useUser } from '@stackframe/react';
import brain from 'brain';
import { VerificationModal } from 'components/VerificationModal';

/**
 * Hook to check for pending invitations after user logs in
 * and show verification modal if any are found.
 */
export function usePendingInvitationCheck() {
  const user = useUser();
  const hasChecked = useRef(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState<any>(null);

  useEffect(() => {
    const checkPendingInvitations = async () => {
      // Only run once per session when user logs in
      // Also check that user has required properties to prevent auth errors
      if (!user || !user.id || hasChecked.current) {
        return;
      }

      try {
        hasChecked.current = true;
        
        const response = await brain.get_my_pending_invitations();
        const data = await response.json();

        console.log('📨 Pending invitations check:', data);

        // If user has pending invitations, show verification modal for the first one
        if (data.invitations && data.invitations.length > 0) {
          const invitation = data.invitations[0];
          setPendingInvitation(invitation);
          setShowModal(true);
        }
      } catch (error) {
        console.error('Failed to check pending invitations:', error);
        // Reset hasChecked so it can try again if needed
        hasChecked.current = false;
      }
    };

    checkPendingInvitations();
  }, [user]);

  const handleClose = () => {
    setShowModal(false);
    setPendingInvitation(null);
  };

  const handleSuccess = () => {
    // Reset so it can check again if needed
    hasChecked.current = false;
  };

  return (
    showModal && pendingInvitation ? (
      <VerificationModal
        open={showModal}
        onClose={handleClose}
        token={pendingInvitation.token}
        invitationDetails={{
          email: pendingInvitation.email,
          role: pendingInvitation.role,
          position: pendingInvitation.position,
          invited_by_name: pendingInvitation.invited_by_name
        }}
        onSuccess={handleSuccess}
      />
    ) : null
  );
}
