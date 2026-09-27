import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from "app";
import { useUser } from '@stackframe/react';

interface Props {
  /** Whether to show the popup immediately on mount */
  autoShow?: boolean;
}

/**
 * ProfileCompletionPopup Component
 * 
 * Shows a modal to users with incomplete profiles explaining the importance
 * of completing their profile. Only shows once per session.
 * 
 * Features:
 * - Checks profile completeness on mount
 * - Session storage to prevent repeated popups
 * - Clear call-to-action buttons
 * - Explains why profile completion matters
 */
export function ProfileCompletionPopup({ autoShow = true }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = useUser();

  useEffect(() => {
    if (!autoShow || !user) {
      setLoading(false);
      return;
    }

    // Check if user has already dismissed this session
    const dismissed = sessionStorage.getItem('profile_popup_dismissed');
    if (dismissed) {
      setLoading(false);
      return;
    }

    // Check profile completeness
    checkProfileCompleteness();
  }, [autoShow, user]);

  const checkProfileCompleteness = async () => {
    try {
      const response = await apiClient.get_user_profile();
      const profile = await response.json();

      // Show popup if profile is incomplete
      // Consider profile incomplete if:
      // 1. Profile completion percentage < 100
      // 2. Email or mobile not verified
      const isIncomplete = 
        (profile.profile_completion_percentage || 0) < 100 ||
        !profile.email_verified ||
        !profile.mobile_verified;

      if (isIncomplete) {
        setOpen(true);
      }
    } catch (error) {
      console.error('Failed to check profile completeness:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = () => {
    sessionStorage.setItem('profile_popup_dismissed', 'true');
    setOpen(false);
    navigate('/complete-profile');
  };

  const handleDismiss = () => {
    sessionStorage.setItem('profile_popup_dismissed', 'true');
    setOpen(false);
  };

  if (loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-500" />
            </div>
            <DialogTitle className="text-xl">Complete Your Profile</DialogTitle>
          </div>
          <DialogDescription className="text-base space-y-4 pt-4">
            <p>
              Your profile is incomplete. To unlock all features and ensure a seamless banking experience, 
              please take a moment to complete your profile.
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
              <p className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Why complete your profile?
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-6 list-disc">
                <li>Required for board appointments</li>
                <li>Required to subscribe to shares</li>
                <li>Enables full access to banking services</li>
                <li>Ensures secure and verified transactions</li>
                <li>Helps us serve you better</li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> You will not be able to be appointed to the board or subscribe to shares 
              until your profile is 100% complete and verified.
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="w-full sm:w-auto"
          >
            Do This Later
          </Button>
          <Button
            onClick={handleCompleteProfile}
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"
          >
            Complete Profile Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
