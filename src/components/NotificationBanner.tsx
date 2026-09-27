import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from 'components/SeverityBadge';
import { X, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';

type SeverityLevel = 'important' | 'normal' | 'info';

interface BannerNotification {
  id: number;
  email_subject: string;
  email_content: string;
  severity_level: SeverityLevel;
  metadata?: {
    url?: string;
    cta_text?: string;
    auto_dismiss_seconds?: number;
    [key: string]: any;
  };
}

interface Props {
  notification: BannerNotification | null;
  onDismiss: (notificationId: number) => void;
  onAction?: (notification: BannerNotification) => void;
}

export function NotificationBanner({ notification, onDismiss, onAction }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);

      // Auto-dismiss after configured time (default 10 seconds for normal, 30 for important)
      const autoDismissSeconds = 
        notification.metadata?.auto_dismiss_seconds ||
        (notification.severity_level === 'important' ? 30 : 10);

      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissSeconds * 1000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (notification) {
        onDismiss(notification.id);
      }
    }, 300); // Wait for animation
  };

  const handleAction = () => {
    if (onAction && notification) {
      onAction(notification);
    }
    handleDismiss();
  };

  if (!notification) return null;

  const getBannerStyle = (severity: SeverityLevel) => {
    switch (severity) {
      case 'important':
        return 'border-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-700';
      case 'normal':
        return 'border-blue-600 bg-blue-50 dark:bg-blue-950 dark:border-blue-700';
      case 'info':
        return 'border-gray-400 bg-gray-50 dark:bg-gray-900 dark:border-gray-600';
      default:
        return 'border-border bg-background';
    }
  };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <Alert className={`rounded-none border-b-2 ${getBannerStyle(notification.severity_level)} shadow-md`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 flex items-start gap-3">
            <SeverityBadge severity={notification.severity_level} className="mt-0.5" />
            
            <div className="flex-1">
              <AlertTitle className="text-base font-semibold mb-1">
                {notification.email_subject}
              </AlertTitle>
              <AlertDescription className="text-sm">
                {notification.email_content}
              </AlertDescription>

              {notification.metadata?.url && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleAction}
                  className="px-0 mt-2 h-auto font-semibold"
                >
                  {notification.metadata.cta_text || 'View Details'}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-6 w-6 rounded-full hover:bg-background/80"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </div>
  );
}
