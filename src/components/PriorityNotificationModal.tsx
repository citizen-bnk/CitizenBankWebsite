import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from 'components/SeverityBadge';
import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';

type SeverityLevel = 'critical' | 'urgent' | 'important' | 'normal' | 'info';

interface PopupNotification {
  id: number;
  email_subject: string;
  email_content: string;
  email_type: string;
  severity_level: SeverityLevel;
  popup_is_blocking: boolean;
  created_at: string;
  metadata?: {
    action?: string;
    url?: string;
    cta_text?: string;
    [key: string]: any;
  };
  related_document_request_id?: number;
}

interface Props {
  notification: PopupNotification | null;
  isOpen: boolean;
  onDismiss: (notificationId: number, snoozeHours?: number) => Promise<void>;
  onAction?: (notification: PopupNotification) => void;
}

export function PriorityNotificationModal({ notification, isOpen, onDismiss, onAction }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

  if (!notification) return null;

  const isBlocking = notification.popup_is_blocking || notification.severity_level === 'critical';
  const isCritical = notification.severity_level === 'critical';

  const handleDismiss = async (snoozeHours?: number) => {
    setIsLoading(true);
    try {
      await onDismiss(notification.id, snoozeHours);
      setShowSnoozeOptions(false);
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = () => {
    if (onAction) {
      onAction(notification);
    }
    handleDismiss();
  };

  const snoozeOptions = [
    { hours: 1, label: '1 hour' },
    { hours: 4, label: '4 hours' },
    { hours: 24, label: '1 day' },
    { hours: 72, label: '3 days' },
  ];

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Prevent closing blocking modals
        if (!open && isBlocking) return;
        if (!open && !isBlocking) handleDismiss();
      }}
    >
      <DialogContent 
        className="sm:max-w-[500px]"
        // Disable ESC key and overlay click for blocking modals
        onEscapeKeyDown={(e) => isBlocking && e.preventDefault()}
        onPointerDownOutside={(e) => isBlocking && e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isCritical && <AlertCircle className="h-5 w-5 text-red-600" />}
              <DialogTitle className="text-xl">{notification.email_subject}</DialogTitle>
            </div>
            <SeverityBadge severity={notification.severity_level} />
          </div>
          
          {isCritical && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3 mt-2">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                ⚠️ This is a critical notification that requires your immediate attention.
              </p>
            </div>
          )}
        </DialogHeader>

        <DialogDescription className="text-base text-foreground whitespace-pre-wrap">
          {notification.email_content}
        </DialogDescription>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          {/* Primary Action Button (if metadata has action) */}
          {notification.metadata?.url && (
            <Button 
              onClick={handleAction}
              disabled={isLoading}
              className="w-full"
              variant={isCritical ? 'default' : 'default'}
            >
              {notification.metadata.cta_text || 'Take Action'}
            </Button>
          )}

          {/* Snooze Options */}
          {!isBlocking && !showSnoozeOptions && (
            <Button
              variant="outline"
              onClick={() => setShowSnoozeOptions(true)}
              disabled={isLoading}
              className="w-full"
            >
              🔔 Snooze
            </Button>
          )}

          {showSnoozeOptions && (
            <div className="w-full space-y-2">
              <p className="text-sm text-muted-foreground">Remind me in:</p>
              <div className="grid grid-cols-2 gap-2">
                {snoozeOptions.map((option) => (
                  <Button
                    key={option.hours}
                    variant="outline"
                    size="sm"
                    onClick={() => handleDismiss(option.hours)}
                    disabled={isLoading}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSnoozeOptions(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Dismiss Button */}
          {!isBlocking && !showSnoozeOptions && (
            <Button
              variant="ghost"
              onClick={() => handleDismiss()}
              disabled={isLoading}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
          )}

          {/* Blocking modal only shows action button */}
          {isBlocking && !notification.metadata?.url && (
            <Button
              variant="default"
              onClick={() => handleDismiss()}
              disabled={isLoading}
              className="w-full"
            >
              I Understand
            </Button>
          )}
        </DialogFooter>

        {isBlocking && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            🔒 This notification cannot be dismissed without action
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
