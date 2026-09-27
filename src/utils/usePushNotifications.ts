import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@stackframe/react';
import { pushwoosh, getPushwooshConfig } from './pushwoosh';

/**
 * React hook for managing push notifications
 * 
 * ANTI-STORM DESIGN:
 * - Only initializes once per app load
 * - Only registers device once per browser
 * - Cached in localStorage
 */
export const usePushNotifications = () => {
  const user = useUser();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Pushwoosh SDK once
  useEffect(() => {
    const initializePushwoosh = async () => {
      if (isInitialized) return;

      try {
        const config = await getPushwooshConfig(); // Now async
        
        // Only initialize if we have valid config
        if (!config.applicationCode) {
          console.warn('[Push] Pushwoosh not configured (missing APP_CODE)');
          return;
        }

        await pushwoosh.initialize(config);
        setIsSupported(pushwoosh.isSupported());
        setPermission(pushwoosh.getPermissionStatus());
        setIsInitialized(true);

        // Check subscription status
        const subscribed = await pushwoosh.isSubscribed();
        setIsSubscribed(subscribed);
      } catch (error) {
        console.error('[Push] Initialization failed:', error);
      }
    };

    initializePushwoosh();
  }, [isInitialized]);

  // Request permission and register device
  const requestPermission = useCallback(async () => {
    if (!user?.id) {
      console.warn('[Push] User not logged in');
      return false;
    }

    setIsLoading(true);
    try {
      const success = await pushwoosh.requestPermissionAndRegister(user.id);
      
      if (success) {
        setPermission('granted');
        setIsSubscribed(true);
      }

      return success;
    } catch (error) {
      console.error('[Push] Permission request failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Unsubscribe from notifications
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      await pushwoosh.unsubscribe();
      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set user tags for targeting
  const setTags = useCallback((tags: Record<string, any>) => {
    pushwoosh.setTags(tags);
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    unsubscribe,
    setTags,
  };
};
