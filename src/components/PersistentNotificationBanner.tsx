import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@stackframe/react';
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '../extensions/shadcn/components/button';
import { type NotificationData, useNotifications, clearNotificationCache } from 'utils/useNotifications';
import { toast } from 'sonner';
import { apiClient } from 'app';

export const PersistentNotificationBanner = () => {
  const navigate = useNavigate();
  const user = useUser();
  const { notifications, loading } = useNotifications();
  const [currentNotification, setCurrentNotification] = useState<NotificationData | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Load dismissed notifications from sessionStorage
  useEffect(() => {
    if (!user) return;
    
    const dismissedKey = `notification_banner_dismissed_${user.id}`;
    const stored = sessionStorage.getItem(dismissedKey);
    
    if (stored) {
      try {
        setDismissed(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse dismissed notifications:', e);
      }
    }
  }, [user?.id]);

  // Update current notification based on available notifications and dismissed list
  useEffect(() => {
    if (loading || !notifications.length) {
      setCurrentNotification(null);
      setIsVisible(false);
      return;
    }

    // Find first notification that hasn't been dismissed
    const nextNotification = notifications.find(n => !dismissed.includes(n.id));
    
    if (nextNotification && nextNotification.id !== currentNotification?.id) {
      // Fade out current, then show new
      setIsVisible(false);
      setTimeout(() => {
        setCurrentNotification(nextNotification);
        setIsVisible(true);
      }, 300);
    } else if (!nextNotification && currentNotification) {
      // No more notifications
      setIsVisible(false);
      setTimeout(() => setCurrentNotification(null), 300);
    }
  }, [notifications, dismissed, loading]);

  const handleDismiss = () => {
    if (!currentNotification || !user) return;

    // Add to dismissed list
    const newDismissed = [...dismissed, currentNotification.id];
    setDismissed(newDismissed);

    // Save to sessionStorage
    const dismissedKey = `notification_banner_dismissed_${user.id}`;
    sessionStorage.setItem(dismissedKey, JSON.stringify(newDismissed));

    // Animate out
    setIsVisible(false);
  };

  const handleAction = async () => {
    if (!currentNotification) return;

    // Handle different notification types
    switch (currentNotification.type) {
      case 'profile':
        navigate('/profile');
        handleDismiss();
        break;
        
      case 'documents':
        navigate('/board-documents');
        handleDismiss();
        break;
        
      case 'subscription':
        navigate('/my-subscriptions');
        handleDismiss();
        break;
        
      case 'invitation':
        // Accept invitation
        try {
          const response = await apiClient.accept_my_invitation({ invitationId: currentNotification.id });
          const data = await response.json();
          
          if (response.ok && data.success) {
            toast.success(data.message || 'Invitation accepted successfully');
            handleDismiss();
            
            // Clear cache and reload to reflect new roles
            if (user) {
              clearNotificationCache(user.id);
            }
            window.location.reload();
          } else {
            toast.error(data.message || 'Failed to accept invitation');
          }
        } catch (error) {
          console.error('Error accepting invitation:', error);
          toast.error('An unexpected error occurred');
        }
        break;
        
      default:
        handleDismiss();
    }
  };

  // Don't render if no user or no notification
  if (!user || !currentNotification) {
    return null;
  }

  // Get colors and icons based on severity
  const getBannerStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-600',
          text: 'text-white',
          icon: AlertCircle,
          border: 'border-red-700'
        };
      case 'urgent':
        return {
          bg: 'bg-orange-600',
          text: 'text-white',
          icon: AlertTriangle,
          border: 'border-orange-700'
        };
      case 'normal':
      default:
        return {
          bg: 'bg-blue-600',
          text: 'text-white',
          icon: Info,
          border: 'border-blue-700'
        };
    }
  };

  const styles = getBannerStyles(currentNotification.severity);
  const Icon = styles.icon;

  return (
    <div
      className={`
        sticky top-16 z-40 w-full shadow-lg border-b-2 ${styles.border}
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={`${styles.bg} ${styles.text} px-4 py-3`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Icon + Message */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm md:text-base">
                {currentNotification.title}
              </p>
              <p className="text-xs md:text-sm opacity-90 truncate">
                {currentNotification.message}
              </p>
            </div>
          </div>

          {/* Right: CTA + Dismiss */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleAction}
              variant="secondary"
              size="sm"
              className="bg-white text-gray-900 hover:bg-gray-100 font-medium"
              aria-label={currentNotification.cta}
            >
              {currentNotification.cta}
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-white/20 text-white"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
