import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';
import { apiClient } from 'app';

interface QuickInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QuickInviteDialog({ open, onOpenChange, onSuccess }: QuickInviteDialogProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Set default expiry to 7 days from now
  const getDefaultExpiryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };

  const [expiryDate, setExpiryDate] = useState(getDefaultExpiryDate());

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setMessage('');
    setExpiryDate(getDefaultExpiryDate());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!expiryDate) {
      toast.error('Expiry date is required');
      return;
    }

    // Validate expiry date is in the future
    const expiry = new Date(expiryDate);
    const now = new Date();
    if (expiry <= now) {
      toast.error('Expiry date must be in the future');
      return;
    }

    try {
      setSending(true);
      const response = await apiClient.create_invitation_endpoint({
        full_name: fullName,
        email,
        role: 'investor', // Fixed to investor role for investor portal
        expires_at: expiryDate,
        message: message || undefined,
      });

      if (response.ok) {
        const result = await response.json();

        if (result.duplicate_prevented) {
          toast.info(result.message || 'This invitation already exists');
          resetForm();
          onSuccess();
          onOpenChange(false); // Close dialog - no action needed
        } else if (result.email_warning) {
          toast.warning(result.message || 'Invitation created but email sending failed');
          // Don't close dialog or call onSuccess - let user see the warning
        } else {
          toast.success(result.message || 'Invitation sent successfully!');
          resetForm();
          onSuccess();
          onOpenChange(false); // Close dialog only on full success
        }
      } else {
        if (response.status === 403) {
          toast.error('You do not have permission to send investor invitations.');
        } else if (response.status === 400) {
          const errorData = await response.json();
          toast.error(errorData.detail || 'Invalid invitation data');
        } else {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          toast.error(errorData.detail || 'Failed to send invitation. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite New Investor</DialogTitle>
          <DialogDescription>
            Send an invitation to join as an investor at Citizen Bank
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
              disabled={sending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
              disabled={sending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate">Invitation Expiry Date *</Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
              disabled={sending}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-gray-500">
              The invitation link will expire on this date
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to the invitation email..."
              rows={3}
              disabled={sending}
            />
            <p className="text-xs text-gray-500">
              This message will be included in the invitation email
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={sending}
              className="bg-[#6d52a2] hover:bg-[#5a4289]"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
