import { useEffect, useRef } from 'react';
import { useUser } from '@stackframe/react';
import brain from 'brain';

/**
 * Hook to automatically track user logins.
 * Call this once in the AppProvider.
 */
export function useLoginTracker() {
  const user = useUser();
  const hasTrackedLogin = useRef(false);

  useEffect(() => {
    if (user && !hasTrackedLogin.current) {
      // Track login
      brain.track_login().catch(err => {
        console.error('Failed to track login:', err);
      });
      hasTrackedLogin.current = true;
    }
  }, [user]);
}
