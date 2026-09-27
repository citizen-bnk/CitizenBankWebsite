import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@stackframe/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { apiClient } from "app";
import { type NotificationData, useNotifications, clearNotificationCache } from 'utils/useNotifications';

interface Notification extends NotificationData {
  action: () => void;
}

export const NotificationBell = () => {
  const navigate = useNavigate();
  const user = useUser();
  const { notifications: notificationData, loading } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  // Convert notification data to notifications with actions
  useEffect(() => {
    const notificationsWithActions = notificationData.map(data => ({
      ...data,
      action: createAction(data)
    }));
    setNotifications(notificationsWithActions);
  }, [notificationData]);

  // Handle invitation acceptance
  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const response = await apiClient.accept_my_invitation({ invitationId });
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(data.message || 'Invitation accepted successfully');
        setOpen(false);
        
        // Clear cache and reload
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
  };

  // Helper function to create action based on notification type
  const createAction = (notificationData: NotificationData): (() => void) => {
    switch (notificationData.type) {
      case 'profile':
        return () => navigate('/profile');
      case 'documents':
        return () => navigate('/board-documents');
      case 'subscription':
        return () => navigate('/my-subscriptions');
      case 'invitation':
        return () => handleAcceptInvitation(notificationData.id);
      default:
        return () => {};
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'urgent':
        return 'text-orange-600';
      case 'normal':
      default:
        return 'text-blue-600';
    }
  };

  const notificationCount = notifications.length;

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-xs"
              variant="default"
            >
              {notificationCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Notifications</h3>
            {notificationCount > 0 && (
              <Badge variant="secondary">{notificationCount} pending</Badge>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading notifications...
            </div>
          ) : notificationCount === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No pending notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  {index > 0 && <Separator />}
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className={`font-medium ${getSeverityColor(notification.severity)}`}>
                          {notification.title}
                        </h4>
                        {notification.severity !== 'normal' && (
                          <Badge 
                            variant={notification.severity === 'critical' ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {notification.severity}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <Button 
                        onClick={() => {
                          notification.action();
                          setOpen(false);
                        }}
                        size="sm"
                        className="w-full mt-2"
                        variant={notification.severity === 'critical' ? 'destructive' : 'default'}
                      >
                        {notification.cta}
                      </Button>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
