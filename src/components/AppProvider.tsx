import { CurrencyProvider } from "./CurrencyProvider";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLoginTracker } from '../utils/useLoginTracker';
import { useEffect } from 'react';
import { pushwoosh, getPushwooshConfig } from '../utils/pushwoosh';
import { PersistentNotificationBanner } from './PersistentNotificationBanner';

interface Props {
  children: React.ReactNode;
}

const queryClient = new QueryClient();

export function AppProvider({ children }: Props) {
  // Auto-accept pending invitations removed to favor manual acceptance via NotificationBell
  useLoginTracker();
  
  // Initialize Pushwoosh SDK once on app load (ANTI-STORM: only once)
  useEffect(() => {
    const initPushwoosh = async () => {
      try {
        const config = await getPushwooshConfig(); // Now async
        
        // Only initialize if configured
        if (config.applicationCode) {
          await pushwoosh.initialize(config);
          console.log('[App] Pushwoosh initialized');
        } else {
          console.warn('[App] Pushwoosh not configured');
        }
      } catch (error) {
        console.error('[App] Pushwoosh initialization failed:', error);
      }
    };
    
    initPushwoosh();
  }, []); // Empty deps = run once
  
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <PersistentNotificationBanner />
        {children}
      </CurrencyProvider>
    </QueryClientProvider>
  );
}
