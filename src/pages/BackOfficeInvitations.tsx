import { useState, useEffect } from 'react';
import brain from 'brain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mail, UserPlus, X, Send, Loader2, Home, ArrowLeft, RefreshCw } from 'lucide-react';
import { ProfileDropdown } from 'components/ProfileDropdown';
import { BackOfficeNav } from 'components/BackOfficeNav';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { ResponsiveTable } from 'components/ResponsiveTable';
import { useNavigate } from 'react-router-dom';

interface Invitation {
  id: number;
  email: string;
  role: string;
  position?: string;
  invited_by_name: string;
  status: string;
  created_at: string;
  expires_at: string;
  accepted_at?: string;
  token?: string;
  user_resend_count: number;
  total_codes_generated?: number;
  codes_used?: number;
  codes_expired?: number;
  codes_active?: number;
  reminder_metadata?: {
    reminder_count: number;
    last_reminder_sent_at: string | null;
    next_reminder_at: string | null;
  };
}

export default function BackOfficeInvitations() {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [resendingCode, setResendingCode] = useState<number | null>(null);
  const [resendingEmail, setResendingEmail] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('new');
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('board_member');
  const [position, setPosition] = useState<string>('member');
  const [expiryDate, setExpiryDate] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadInvitations();
    // Set default expiry date to 7 days from now
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 7);
    setExpiryDate(defaultExpiry.toISOString().split('T')[0]);
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await brain.list_invitations({});
      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (error: any) {
      console.error('Error loading invitations:', error);
      const errorMsg = error?.message || error?.detail || "Unable to load invitations. Please try again.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncInvitations = async () => {
    try {
      setSyncing(true);
      const response = await brain.sync_invitations_with_board_members();
      const data = await response.json();
      
      if (data.success) {
        if (data.synced_count > 0) {
          toast.success(data.message || `Synced ${data.synced_count} invitation(s)`, {
            description: `Matched ${data.synced_count} pending invitation(s) with existing board members.`,
            duration: 5000
          });
        } else {
          toast.info('No invitations to sync', {
            description: 'All pending invitations have no matching board members yet.',
            duration: 4000
          });
        }
        // Reload invitations to reflect changes
        await loadInvitations();
      } else {
        toast.error('Failed to sync invitations');
      }
    } catch (error: any) {
      console.error('Error syncing invitations:', error);
      toast.error(error?.message || 'Failed to sync invitations with board members');
    } finally {
      setSyncing(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName) {
      toast.error('Full name is required');
      return;
    }
    
    if (!email) {
      toast.error('Email is required');
      return;
    }

    if (!expiryDate) {
      toast.error('Expiry date is required');
      return;
    }
    
    try {
      setSending(true);
      const response = await brain.create_invitation_endpoint({
        full_name: fullName,
        email,
        role,
        position: role === 'board_member' ? position : undefined,
        expires_at: expiryDate,
        message: message || undefined
      });
      
      // Check HTTP status code
      if (response.ok) {
        const result = await response.json();
        
        // Show appropriate message based on email status
        if (result.email_warning) {
          toast.warning(result.message || 'Invitation created but email sending failed');
        } else {
          toast.success(result.message || 'Invitation sent successfully!');
        }
        
        // Close dialog and reset form
        setIsDialogOpen(false);
        setFullName('');
        setEmail('');
        setRole('board_member');
        setPosition('member');
        const defaultExpiry = new Date();
        defaultExpiry.setDate(defaultExpiry.getDate() + 7);
        setExpiryDate(defaultExpiry.toISOString().split('T')[0]);
        setMessage('');
        
        // Reload invitations to show the new one
        loadInvitations();
      } else {
        // Handle different error status codes
        if (response.status === 403) {
          toast.error('You do not have permission to send invitations. Please contact an administrator.');
        } else if (response.status === 400) {
          const errorData = await response.json();
          toast.error(errorData.detail || 'Invalid invitation data');
        } else {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          toast.error(errorData.detail || 'Failed to send invitation. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      const response = await brain.cancel_invitation({ invitationId });
      const result = await response.json();
      
      if (result.success) {
        toast.success('Invitation cancelled');
        loadInvitations();
      } else {
        toast.error('Failed to cancel invitation');
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const handleResendCode = async (invitation: Invitation) => {
    if (!invitation.token) {
      toast.error('Cannot resend code: invitation token missing');
      return;
    }

    try {
      setResendingCode(invitation.id);
      const response = await brain.generate_verification_code({ 
        token: invitation.token, 
        admin_override: true 
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(
          `Verification code resent to ${invitation.email}. Admin override - no limit applied.`,
          { duration: 5000 }
        );
        // Reload invitations to update the badges
        loadInvitations();
      }
    } catch (error: any) {
      console.error('Error resending code:', error);
      toast.error(error.message || 'Failed to resend verification code');
    } finally {
      setResendingCode(null);
    }
  };

  const handleResendEmail = async (invitation: Invitation) => {
    try {
      setResendingEmail(invitation.id);
      const response = await brain.manual_resend_invitation({ invitationId: invitation.id });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || `Reminder sent successfully to ${invitation.email}`, {
          description: `Reminder #${data.reminder_count} sent. Next reminder in 36 hours.`,
          duration: 5000
        });
        // Reload invitations to update reminder metadata
        loadInvitations();
      } else if (response.status === 429) {
        const data = await response.json();
        toast.warning('Rate limit reached', {
          description: data.detail,
          duration: 5000
        });
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to resend invitation');
      }
    } catch (error: any) {
      console.error('Error resending email:', error);
      toast.error(error.message || 'Failed to resend invitation email');
    } finally {
      setResendingEmail(null);
    }
  };

  const getStatusBadge = (status: string) => {
    // CANCELLED should be red, EXPIRED should be orange
    if (status === 'cancelled') {
      return (
        <Badge className="bg-red-600 text-white hover:bg-red-700">
          CANCELLED
        </Badge>
      );
    }
    
    if (status === 'expired') {
      return (
        <Badge className="bg-orange-600 text-white hover:bg-orange-700">
          EXPIRED
        </Badge>
      );
    }
    
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      accepted: 'default'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  // Filter invitations by tab
  const getFilteredInvitations = (tab: string) => {
    switch (tab) {
      case 'new':
        // New invitations: pending status and never resent (user_resend_count = 0)
        return invitations.filter(inv => inv.status === 'pending' && inv.user_resend_count === 0);
      case 'resent':
        // Resent invitations: pending status and has been resent (user_resend_count > 0)
        return invitations.filter(inv => inv.status === 'pending' && inv.user_resend_count > 0);
      case 'expired':
        // Expired and cancelled invitations
        return invitations.filter(inv => inv.status === 'expired' || inv.status === 'cancelled');
      default:
        return invitations;
    }
  };

  const newCount = invitations.filter(inv => inv.status === 'pending' && inv.user_resend_count === 0).length;
  const resentCount = invitations.filter(inv => inv.status === 'pending' && inv.user_resend_count > 0).length;
  const expiredCount = invitations.filter(inv => inv.status === 'expired' || inv.status === 'cancelled').length;

  // Render card for mobile view
  const renderInvitationCard = (invitation: Invitation, index: number) => (
    <Card key={invitation.id} className="mb-4">
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Email and Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{invitation.email}</div>
              <div className="text-xs text-gray-500 mt-1">
                {invitation.role.replace('_', ' ').toUpperCase()}
                {invitation.position && ` • ${invitation.position.charAt(0).toUpperCase() + invitation.position.slice(1)}`}
              </div>
            </div>
            {getStatusBadge(invitation.status)}
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Invited by:</span>
              <div className="font-medium">{invitation.invited_by_name || 'Unknown'}</div>
            </div>
            <div>
              <span className="text-gray-500">Reminders:</span>
              <div className="font-medium">{invitation.reminder_metadata?.reminder_count || 0}</div>
            </div>
            <div>
              <span className="text-gray-500">Created:</span>
              <div className="font-medium">{new Date(invitation.created_at).toLocaleDateString()}</div>
            </div>
            <div>
              <span className="text-gray-500">Last Reminder:</span>
              <div className="font-medium">
                {invitation.reminder_metadata?.last_reminder_sent_at 
                  ? new Date(invitation.reminder_metadata.last_reminder_sent_at).toLocaleDateString()
                  : 'Never'}
              </div>
            </div>
          </div>

          {/* Actions */}
          {invitation.status === 'pending' && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => handleResendEmail(invitation)}
                disabled={resendingEmail === invitation.id}
              >
                {resendingEmail === invitation.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Resend {invitation.reminder_metadata && invitation.reminder_metadata.reminder_count > 0 && `(${invitation.reminder_metadata.reminder_count})`}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleCancelInvitation(invitation.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Define columns for ResponsiveTable
  const columns = [
    {
      key: 'email',
      header: 'Email',
      render: (inv: Invitation) => inv.email,
    },
    {
      key: 'role',
      header: 'Role',
      render: (inv: Invitation) => inv.role?.replace('_', ' ').toUpperCase(),
    },
    {
      key: 'position',
      header: 'Position',
      render: (inv: Invitation) => inv.position ? inv.position.charAt(0).toUpperCase() + inv.position.slice(1) : 'N/A',
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv: Invitation) => getStatusBadge(inv.status),
    },
    {
      key: 'invited_by_name',
      header: 'Invited By',
      render: (inv: Invitation) => inv.invited_by_name || 'Unknown',
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (inv: Invitation) => new Date(inv.created_at).toLocaleDateString(),
    },
    {
      key: 'reminder_count',
      header: 'Reminders',
      render: (inv: Invitation) => (
        <div className="text-center">
          <Badge variant="secondary">
            {inv.reminder_metadata?.reminder_count || 0}
          </Badge>
        </div>
      ),
    },
    {
      key: 'last_reminder',
      header: 'Last Reminder',
      render: (inv: Invitation) => (
        <div className="text-xs">
          {inv.reminder_metadata?.last_reminder_sent_at 
            ? new Date(inv.reminder_metadata.last_reminder_sent_at).toLocaleString()
            : 'Never'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (inv: Invitation) => (
        <div className="flex gap-2">
          {inv.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleResendEmail(inv)}
                disabled={resendingEmail === inv.id}
                title={`Send reminder ${inv.reminder_metadata && inv.reminder_metadata.reminder_count > 0 ? '#' + (inv.reminder_metadata.reminder_count + 1) : ''}`}
              >
                {resendingEmail === inv.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {inv.reminder_metadata && inv.reminder_metadata.reminder_count > 0 && (
                      <span className="ml-1 text-xs">({inv.reminder_metadata.reminder_count})</span>
                    )}
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleCancelInvitation(inv.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <BackOfficeNav currentPage="Invitations" />
      
      <div className="page-container container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Board Invitations</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage board member invitation requests</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => navigate('/back-office-dashboard')} 
                variant="outline"
                className="text-xs sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button
                onClick={handleSyncInvitations}
                variant="secondary"
                disabled={syncing || loading}
                className="text-xs sm:text-sm"
                title="Sync pending invitations with existing board members by email"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check for Updates
                  </>
                )}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="text-xs sm:text-sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Send Invitation
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Send Board Member Invitation</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join the board. The recipient will receive an email with instructions.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSendInvitation} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        required
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="board_member">Board Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {role === 'board_member' && (
                      <div className="space-y-2">
                        <Label htmlFor="position">Position</Label>
                        <Select value={position} onValueChange={setPosition}>
                          <SelectTrigger id="position">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="chairperson">Chairperson</SelectItem>
                            <SelectItem value="vice_chairperson">Vice Chairperson</SelectItem>
                            <SelectItem value="secretary">Secretary</SelectItem>
                            <SelectItem value="treasurer">Treasurer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date *</Label>
                      <Input
                        id="expiryDate"
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Custom Message (Optional)</Label>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Add a personal message to the invitation email..."
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={sending}>
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
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading invitations...</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Invitation Management</CardTitle>
                  <CardDescription className="text-sm">Review and manage board member invitations by status</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="new" className="relative">
                    New
                    {newCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {newCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="resent" className="relative">
                    Resent
                    {resentCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {resentCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="expired" className="relative">
                    Expired/Cancelled
                    {expiredCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {expiredCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* New Invitations Tab */}
                <TabsContent value="new" className="space-y-4">
                  <ResponsiveTable
                    columns={columns}
                    data={getFilteredInvitations('new')}
                    keyExtractor={(inv) => inv.id}
                    renderCard={renderInvitationCard}
                    emptyMessage="No new invitations found"
                  />
                </TabsContent>

                {/* Resent Invitations Tab */}
                <TabsContent value="resent" className="space-y-4">
                  <ResponsiveTable
                    columns={columns}
                    data={getFilteredInvitations('resent')}
                    keyExtractor={(inv) => inv.id}
                    renderCard={renderInvitationCard}
                    emptyMessage="No resent invitations found"
                  />
                </TabsContent>

                {/* Expired/Cancelled Invitations Tab */}
                <TabsContent value="expired" className="space-y-4">
                  <ResponsiveTable
                    columns={columns}
                    data={getFilteredInvitations('expired')}
                    keyExtractor={(inv) => inv.id}
                    renderCard={renderInvitationCard}
                    emptyMessage="No expired or cancelled invitations found"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
}
