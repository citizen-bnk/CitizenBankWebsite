import { useEffect, useRef } from 'react';
import { useUser } from '@stackframe/react';
import brain from 'brain';
import { toast } from 'sonner';

/**
 * Hook to auto-link pending messages and notifications on login
 * and show a toast if there are pending messages
 */
export const useLoginMessageLink = () => {
  const user = useUser();
  const hasLinked = useRef(false);

  useEffect(() => {
    const linkPendingMessages = async () => {
      // Only run once per session when user logs in
      if (!user || hasLinked.current) {
        return;
      }

      try {
        hasLinked.current = true;
        
        const response = await brain.link_pending_notifications();
        const data = await response.json();

        console.log('📬 Message linking result:', data);

        // Show toast if user has pending messages
        if (data.has_pending) {
          toast.info('You have new messages', {
            description: 'Check your profile for important updates.',
            duration: 5000,
          });
        }

        // Log linking activity
        if (data.notifications_linked > 0 || data.messages_linked > 0) {
          console.log(
            `✅ Linked ${data.notifications_linked} notifications and ${data.messages_linked} messages`
          );
        }
      } catch (error) {
        console.error('Error linking pending messages:', error);
        // Don't show error to user - this is a background process
      }
    };

    linkPendingMessages();
  }, [user]);
};
