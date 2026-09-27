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
  const { profile } = useUserProfile();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    console.log('🔔 [useNotifications] Starting notification fetch for user:', user.id);

    // Check session cache first
    const sessionKey = `citizen_bank_notifications_${user.id}`;
    const cached = sessionStorage.getItem(sessionKey);
    
    if (cached) {
      try {
        const { notifications: cachedNotifications } = JSON.parse(cached);
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
      console.log('📋 Profile fetched:', profileData);

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
                id: inv.id,
                title: 'Board Membership Invitation',
                message: `You have been invited to join the board as ${inv.role}. Accept to access the Board Portal.`,
                type: 'invitation',
                severity: 'urgent',
                cta: 'Accept Invitation',
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
        console.log('👤 Current profile data:', profileData);
        
        // Use the backend's calculated profile_completion_percentage
        const completionPercentage = profileData?.profile_completion_percentage || 0;
        console.log('👤 Profile completion:', completionPercentage + '%');
        
        if (completionPercentage < 100) {
          console.log('⚠️ Profile incomplete - adding notification');
          pendingNotifications.push({
            id: 'profile-incomplete',
            title: 'Complete Your Profile',
            message: `Your profile is ${completionPercentage}% complete. Please complete it to access all features.`,
            type: 'profile',
            severity: 'urgent',
            cta: 'Complete Profile',
            metadata: { completionPercentage }
          });
        } else {
          console.log('✅ Profile is complete');
        }
      } catch (error) {
        console.log('❌ Could not check profile:', error);
      }
      
      // 3. Check board documents for ALL users (not just those with board_member role)
      // Some users may have document requirements even before role assignment
      try {
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

      // 5. Check for admin-created subscriptions with incomplete profile
      try {
        const publicSubsRes = await brain.core_get_my_public_subscriptions();
        if (publicSubsRes.ok) {
          const publicSubsData = await publicSubsRes.json();
          
          // Check if user has admin-created subscriptions and incomplete profile
          if (publicSubsData.has_admin_created_subscriptions) {
            // Use backend's calculated profile completion percentage (not frontend calculation)
            const completionPercentage = profileData?.profile_completion_percentage || 0;
            
            if (completionPercentage < 100) {
              // Replace generic profile notification with this more specific one
              const genericProfileIndex = pendingNotifications.findIndex(n => n.id === 'profile-incomplete');
              if (genericProfileIndex !== -1) {
                pendingNotifications.splice(genericProfileIndex, 1);
              }
              
              pendingNotifications.push({
                id: 'admin-subscription-profile-incomplete',
                title: 'Complete Your Investment Profile',
                message: `Shares have been allocated to you. Please complete your profile (${completionPercentage}% complete) to finalize your investment.`,
                type: 'profile',
                severity: 'urgent',
                cta: 'Complete Profile',
                metadata: { completionPercentage }
              });
            }
          }
        }
      } catch (error) {
        console.log('Could not check admin-created subscriptions:', error);
      }

      // Sort by severity and type priority
      const sortedNotifications = sortNotificationsByPriority(pendingNotifications);

      // Store in sessionStorage
      sessionStorage.setItem(sessionKey, JSON.stringify({
        notifications: sortedNotifications,
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
    // Delay notification fetch by 3 seconds to let page render first
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
  }, [user?.id]);

  return {
    notifications,
    loading,
    refresh: fetchNotifications
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
  const sessionKey = `citizen_bank_notifications_${userId}`;
  sessionStorage.removeItem(sessionKey);
  console.log('🗑️ Notification cache cleared');
}
