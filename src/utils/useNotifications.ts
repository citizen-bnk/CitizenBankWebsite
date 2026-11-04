import { useState, useEffect } from 'react';
import { useUser } from '@stackframe/react';
import { useUserRoles } from 'utils/useUserRoles';
import { useUserProfile, calculateProfileCompletion } from 'utils/userProfile';
import brain from 'brain';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'profile' | 'documents' | 'subscription' | 'invitation';
  severity: 'normal' | 'urgent' | 'critical';
  cta: string;
  metadata?: any;
}

export interface UseNotificationsResult {
  notifications: NotificationData[];
  loading: boolean;
  refresh: () => void;
}

/**
 * Shared hook for fetching and managing notifications.
 * Used by both NotificationBell and NotificationBanner components.
 * 
 * Caching strategy:
 * - Fetches once per session and stores in sessionStorage
 * - Can be manually refreshed via refresh() function
 * - Cache is cleared on session end (browser close)
 */
export function useNotifications(): UseNotificationsResult {
  const user = useUser();
  const { roles } = useUserRoles();
  const { profile, activeStage } = useUserProfile();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    console.log('🔔 [useNotifications] Starting notification fetch for user:', user.id);

    // Check session cache first
    const sessionKey = `citizen_bank_notifications_v2_${user.id}_${activeStage}_${profile?.version || 0}_${roles.slice().sort().join("-")}`;
    const cached = sessionStorage.getItem(sessionKey);
    
    if (cached) {
      try {
        const { notifications: cachedNotifications, cachedAt } = JSON.parse(cached);
        if (!cachedAt || Date.now() - cachedAt > 60_000) throw new Error("Expired notifications");
        console.log(`✅ Using cached notifications from session (${cachedNotifications.length} items)`);
        setNotifications(cachedNotifications);
        return; // Don't fetch again this session
      } catch (parseError) {
        console.warn('Failed to parse cached notifications, fetching fresh:', parseError);
        sessionStorage.removeItem(sessionKey);
      }
    }
    
    console.log('📡 No cache found - fetching fresh notifications');
    
    // Not in session cache - fetch fresh
    setLoading(true);
    const pendingNotifications: NotificationData[] = [];

    try {
      // Fetch profile data fresh from API (don't rely on zustand state)
      console.log('📋 Fetching user profile...');
      const profileResponse = await brain.get_user_profile();
      
      // Handle case where user is authenticated but has no profile yet
      if (!profileResponse.ok) {
        if (profileResponse.status === 404) {
          console.warn('⚠️ User authenticated but has no profile - redirecting to profile completion');
          // Redirect to CompleteProfile page
          window.location.href = `${import.meta.env.BASE_URL}complete-profile`;
          return;
        }
        // Other errors - just log and continue
        console.error('Failed to fetch profile:', profileResponse.status);
        setLoading(false);
        return;
      }
      
      const profileData = await profileResponse.json();

      // 1. Check for Pending Invitations (CRITICAL - Always show)
      let hasPendingInvitations = false;
      try {
        console.log('📨 Checking for pending invitations...');
        const invitationsRes = await brain.get_current_user_pending_invitations();
        if (invitationsRes.ok) {
          const invitations = await invitationsRes.json();
          console.log('📨 Invitations found:', invitations.length);
          if (invitations.length > 0) {
            hasPendingInvitations = true;
            invitations.forEach((inv: any) => {
              pendingNotifications.push({
                id: inv.token,
                title: inv.role === 'investor' ? 'Investor invitation' : 'Board membership invitation',
                message: inv.role === 'investor' ? 'Your private investment invitation is ready.' : 'Review your invitation to the Board Portal.',
                type: 'invitation',
                severity: 'urgent',
                cta: inv.role === 'investor' ? 'View investment invitation' : 'Accept invitation',
                metadata: { role: inv.role }
              });
            });
          }
        }
      } catch (error) {
        console.log('❌ Could not fetch invitations:', error);
      }

      // 2. Check profile completion for ALL users (not just board members)
      // This is the fix for the original issue - everyone should complete their profile
      try {
        console.log('👤 Checking profile completion...');
        
        // Use the backend's calculated profile_completion_percentage
        const completionPercentage = calculateProfileCompletion(profileData, activeStage);
        console.log('👤 Profile completion:', completionPercentage + '%');
        
        if (completionPercentage < 100) {
          console.log('⚠️ Profile incomplete - adding notification');
          pendingNotifications.push({
            id: 'profile-incomplete',
            title: `Complete your ${activeStage} profile`,
            message: `Your ${activeStage} profile is ${completionPercentage}% complete. Add the remaining details when convenient.`,
            type: 'profile',
            severity: 'normal',
            cta: 'Update profile',
            metadata: { completionPercentage, profileStage: activeStage }
          });
        } else {
          console.log('✅ Profile is complete');
        }
      } catch (error) {
        console.log('❌ Could not check profile:', error);
      }
      
      // 3. Check board documents for ALL users (not just those with board_member role)
      // Some users may have document requirements even before role assignment
      if (roles.includes('board_member')) try {
        console.log('📄 Checking for board document requirements...');
        const statusRes = await brain.get_my_status();
        const statusData = await statusRes.json();
        console.log('📄 Document status:', statusData);

        if (statusData.missing_requirements && statusData.missing_requirements.length > 0) {
          const missingCount = statusData.missing_requirements.length;
          console.log(`⚠️ Found ${missingCount} missing document requirements`);
          pendingNotifications.push({
            id: 'documents-overdue',
            title: 'Document Submission Required',
            message: `You have ${missingCount} required document${missingCount > 1 ? 's' : ''} pending submission.`,
            type: 'documents',
            severity: 'urgent',
            cta: 'Submit Documents'
          });
        } else {
          console.log('✅ No missing document requirements');
        }
      } catch (error) {
        console.log('❌ Could not fetch document status:', error);
      }

      // 4. Check share subscription if investor
      if (roles.includes('investor')) {
        try {
          const subsRes = await brain.get_my_subscriptions();
          const subsData = await subsRes.json();

          // Check for pending payment subscriptions
          const pendingPayment = subsData.subscriptions?.filter(
            (sub: any) => sub.status === 'pending_payment'
          );

          if (pendingPayment && pendingPayment.length > 0) {
            pendingNotifications.push({
              id: 'subscription-overdue',
              title: 'Share Subscription Payment Overdue',
              message: `You have ${pendingPayment.length} subscription${pendingPayment.length > 1 ? 's' : ''} awaiting payment.`,
              type: 'subscription',
              severity: 'critical',
              cta: 'Complete Payment'
            });
          }
        } catch (error) {
          console.log('Could not fetch subscription status:', error);
        }
      }

      // Sort by severity and type priority
      const sortedNotifications = sortNotificationsByPriority(pendingNotifications);

      // Store in sessionStorage
      sessionStorage.setItem(sessionKey, JSON.stringify({
        notifications: sortedNotifications,
        cachedAt: Date.now(),
        timestamp: Date.now()
      }));
      
      setNotifications(sortedNotifications);
      console.log(`✅ Notifications loaded and cached (${sortedNotifications.length} items)`);
    } catch (error) {
      console.error('Error checking notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when user changes
  useEffect(() => {
    setNotifications(previous => previous.filter(item => item.type !== 'profile'));
    // Fetch the currently displayed profile section after the page renders.
    const timer = setTimeout(() => {
      // Use requestIdleCallback if available for better performance
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          fetchNotifications();
        });
      } else {
        fetchNotifications();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [user?.id, profile?.version, activeStage, roles.join(",")]);

  return {
    notifications,
    loading,
    refresh: () => { if (user) clearNotificationCache(user.id); void fetchNotifications(); }
  };
}

/**
 * Sort notifications by priority:
 * 1. Severity: critical > urgent > normal
 * 2. Type (within same severity): invitation > profile > documents > subscription
 */
function sortNotificationsByPriority(notifications: NotificationData[]): NotificationData[] {
  const severityOrder = { critical: 0, urgent: 1, normal: 2 };
  const typeOrder = { invitation: 0, profile: 1, documents: 2, subscription: 3 };

  return [...notifications].sort((a, b) => {
    // First sort by severity
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;

    // If same severity, sort by type
    return typeOrder[a.type] - typeOrder[b.type];
  });
}

/**
 * Clear notification cache - useful after user completes an action
 * that should update notifications (e.g., completing profile, accepting invitation)
 */
export function clearNotificationCache(userId: string) {
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key === `citizen_bank_notifications_${userId}` || key?.startsWith(`citizen_bank_notifications_v2_${userId}_`)) sessionStorage.removeItem(key);
  }
}
