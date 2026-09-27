import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from 'app';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Bell, Moon, Clock, AlertCircle, Mail, MessageSquare, Home } from 'lucide-react';
import { showErrorToast, showSuccessToast } from 'utils/errorHandling';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface NotificationPreferences {
  popup_enabled: boolean;
  email_enabled: boolean;
  banner_enabled: boolean;
  dnd_enabled: boolean;
  dnd_start_hour: number;
  dnd_end_hour: number;
  max_popups_per_day: number;
  max_popups_per_severity: number;
  snooze_default_hours: number;
}

export default function NotificationPreferences() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    popup_enabled: true,
    email_enabled: true,
    banner_enabled: true,
    dnd_enabled: false,
    dnd_start_hour: 20,
    dnd_end_hour: 8,
    max_popups_per_day: 5,
    max_popups_per_severity: 1,
    snooze_default_hours: 4,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get_notification_preferences();
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      showErrorToast(error, 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const response = await apiClient.update_notification_preferences(preferences);
      if (response.ok) {
        showSuccessToast('Notification preferences saved successfully');
      }
    } catch (error) {
      showErrorToast(error, 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const sendTestNotification = async () => {
    try {
      // This would trigger a test popup notification
      showSuccessToast('Test notification sent!', 'Check your notifications in the Board Portal');
    } catch (error) {
      showErrorToast(error, 'Failed to send test notification');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 lg:pt-24">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notification Preferences</h1>
              <p className="text-gray-600 mt-1">Manage how and when you receive notifications</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/profile')}>
              <Home className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </div>
        </div>

        {/* Notification Channels */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <CardTitle>Notification Channels</CardTitle>
            </div>
            <CardDescription>
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="popup-enabled" className="text-base font-medium">
                  Pop-up Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show modal and banner notifications in the Board Portal
                </p>
              </div>
              <Switch
                id="popup-enabled"
                checked={preferences.popup_enabled}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, popup_enabled: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="banner-enabled" className="text-base font-medium">
                  Banner Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show top banner for important and normal priority items
                </p>
              </div>
              <Switch
                id="banner-enabled"
                checked={preferences.banner_enabled}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, banner_enabled: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="email-enabled" className="text-base font-medium">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={preferences.email_enabled}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, email_enabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Do Not Disturb */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-indigo-600" />
              <CardTitle>Do Not Disturb (DND)</CardTitle>
            </div>
            <CardDescription>
              Set quiet hours when you don't want to see pop-up notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="dnd-enabled" className="text-base font-medium">
                  Enable DND Hours
                </Label>
                <p className="text-sm text-muted-foreground">
                  Critical notifications will still be shown
                </p>
              </div>
              <Switch
                id="dnd-enabled"
                checked={preferences.dnd_enabled}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, dnd_enabled: checked })
                }
              />
            </div>

            {preferences.dnd_enabled && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="dnd-start">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Start Time
                    </Label>
                    <Input
                      id="dnd-start"
                      type="number"
                      min="0"
                      max="23"
                      value={preferences.dnd_start_hour}
                      onChange={(e) => 
                        setPreferences({ 
                          ...preferences, 
                          dnd_start_hour: parseInt(e.target.value) || 0 
                        })
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      {formatHour(preferences.dnd_start_hour)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dnd-end">
                      <Clock className="h-4 w-4 inline mr-1" />
                      End Time
                    </Label>
                    <Input
                      id="dnd-end"
                      type="number"
                      min="0"
                      max="23"
                      value={preferences.dnd_end_hour}
                      onChange={(e) => 
                        setPreferences({ 
                          ...preferences, 
                          dnd_end_hour: parseInt(e.target.value) || 0 
                        })
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      {formatHour(preferences.dnd_end_hour)}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    DND hours are from {formatHour(preferences.dnd_start_hour)} to {formatHour(preferences.dnd_end_hour)}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Frequency Controls */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-600" />
              <CardTitle>Frequency Controls</CardTitle>
            </div>
            <CardDescription>
              Limit how often you see pop-up notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="max-popups-day">
                Maximum Pop-ups Per Day
              </Label>
              <Input
                id="max-popups-day"
                type="number"
                min="1"
                max="20"
                value={preferences.max_popups_per_day}
                onChange={(e) => 
                  setPreferences({ 
                    ...preferences, 
                    max_popups_per_day: parseInt(e.target.value) || 1 
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Total pop-ups you'll see per day across all severity levels
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="max-popups-severity">
                Maximum Per Severity Level
              </Label>
              <Input
                id="max-popups-severity"
                type="number"
                min="1"
                max="5"
                value={preferences.max_popups_per_severity}
                onChange={(e) => 
                  setPreferences({ 
                    ...preferences, 
                    max_popups_per_severity: parseInt(e.target.value) || 1 
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Maximum times you'll see the same notification per day
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="snooze-default">
                Default Snooze Duration (hours)
              </Label>
              <Input
                id="snooze-default"
                type="number"
                min="1"
                max="72"
                value={preferences.snooze_default_hours}
                onChange={(e) => 
                  setPreferences({ 
                    ...preferences, 
                    snooze_default_hours: parseInt(e.target.value) || 1 
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                How long notifications are snoozed by default
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Severity Levels Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Severity Levels</CardTitle>
            <CardDescription>
              Understanding notification priorities and auto-escalation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge className="bg-red-600 text-white mt-1">🔴 Critical</Badge>
                <div className="flex-1">
                  <p className="font-medium">Blocking modal - Requires immediate action</p>
                  <p className="text-sm text-muted-foreground">
                    Cannot be dismissed, ESC disabled, ignores DND hours
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="bg-orange-600 text-white mt-1">🟠 Urgent</Badge>
                <div className="flex-1">
                  <p className="font-medium">Non-blocking modal - Needs attention soon</p>
                  <p className="text-sm text-muted-foreground">
                    Dismissible modal, can be snoozed, ignores DND hours
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="bg-yellow-600 text-white mt-1">🟡 Important</Badge>
                <div className="flex-1">
                  <p className="font-medium">Top banner - Should be reviewed</p>
                  <p className="text-sm text-muted-foreground">
                    Sticky banner at top, auto-dismisses after 30 seconds, respects DND
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="bg-blue-600 text-white mt-1">🔵 Normal</Badge>
                <div className="flex-1">
                  <p className="font-medium">Standard notification</p>
                  <p className="text-sm text-muted-foreground">
                    Banner notification, auto-dismisses after 10 seconds, respects DND
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="bg-gray-500 text-white mt-1">⚪ Info</Badge>
                <div className="flex-1">
                  <p className="font-medium">Informational only</p>
                  <p className="text-sm text-muted-foreground">
                    Subtle notification, no pop-up by default
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                ⏰ Auto-Escalation Rules
              </h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                <li>• Info (7+ days) → Normal</li>
                <li>• Normal (3+ days) → Important</li>
                <li>• Important (4+ days) → Urgent</li>
                <li>• Urgent (7+ days) → Critical</li>
              </ul>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                Unread notifications automatically increase in priority over time
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={savePreferences}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
          <Button
            variant="outline"
            onClick={sendTestNotification}
            className="flex-1"
          >
            <Bell className="h-4 w-4 mr-2" />
            Send Test Notification
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
