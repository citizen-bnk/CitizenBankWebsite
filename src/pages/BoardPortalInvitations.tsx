import { useState, useEffect } from 'react';
import { apiClient } from 'app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mail, UserPlus, X, Send, Loader2, ArrowLeft } from 'lucide-react';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { ResponsiveTable } from 'components/ResponsiveTable';
import { useNavigate } from 'react-router-dom';

interface Invitation {
  id: number;
  email: string;
  full_name?: string;
  role: string;
  position?: string;
  invited_by_name: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export default function BoardPortalInvitations() {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [error, setError] = useState<string | null>(null);
  const [permittedRoles, setPermittedRoles] = useState<string[]>([]);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('board_member');
  const [position, setPosition] = useState<string>('member');
  const [expiryDate, setExpiryDate] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadInvitations();
    loadPermittedRoles();
    // Set default expiry date to 7 days from now
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 7);
    setExpiryDate(defaultExpiry.toISOString().split('T')[0]);
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.list_invitations({});
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

  const loadPermittedRoles = async () => {
    try {
      // Get all roles and check which ones we can invite
      const rolesResponse = await apiClient.list_all_roles();
      const allRoles = await rolesResponse.json();
      
      // Check permission for each role
      const permitted: string[] = [];
      for (const roleObj of allRoles) {
        try {
          const checkResponse = await apiClient.check_invitation_permission({ targetRole: roleObj.role_name });
          const checkData = await checkResponse.json();
          if (checkData.can_invite) {
            permitted.push(roleObj.role_name);
          }
        } catch (e) {
          // Skip if permission check fails
          console.log(`Cannot invite ${roleObj.role_name}`);
        }
      }
      
      setPermittedRoles(permitted);
      
      // Set default role to first permitted role
      if (permitted.length > 0 && !permitted.includes(role)) {
        setRole(permitted[0]);
      }
    } catch (error) {
      console.error('Error loading permitted roles:', error);
      // Default to board_member if error
      setPermittedRoles(['board_member']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate permissions first
    if (!permittedRoles.includes(role)) {
      toast.error(`You don't have permission to invite ${role}s`);
      return;
    }
    
    try {
      setSending(true);
      const response = await apiClient.create_invitation_endpoint({
        full_name: fullName,
        email,
        role,
        position: role === 'board_member' ? position : undefined,
        expires_at: expiryDate,
        message: message || undefined
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Check if there was an email warning
        if (result.email_warning) {
          toast.warning(result.email_warning);
        } else {
          toast.success(result.message || 'Invitation sent successfully');
        }
        
        setIsDialogOpen(false);
        resetForm();
        loadInvitations();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to send invitation');
      }
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setSending(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      const response = await apiClient.cancel_invitation({ invitationId });
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

  const handleResendEmail = async (invitation: Invitation) => {
    try {
      setResendingEmail(invitation.id);
      const response = await apiClient.resend_invitation_email({ invitationId: invitation.id });
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(data.message || `Invitation email resent to ${invitation.email}`);
        loadInvitations();
      } else {
        toast.error(data.detail || 'Failed to resend invitation email');
      }
    } catch (error: any) {
      console.error('Error resending email:', error);
      toast.error(error.message || 'Failed to resend invitation email');
    } finally {
      setResendingEmail(null);
    }
  };

  const getStatusBadge = (status: string) => {
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
    
    if (status === 'accepted') {
      return (
        <Badge className="bg-green-600 text-white hover:bg-green-700">
          ACCEPTED
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        {status.toUpperCase()}
      </Badge>
    );
  };

  // Filter invitations by tab
  const getFilteredInvitations = (tab: string) => {
    switch (tab) {
      case 'pending':
        return invitations.filter(inv => inv.status === 'pending');
      case 'accepted':
        return invitations.filter(inv => inv.status === 'accepted');
      case 'expired':
        return invitations.filter(inv => inv.status === 'expired' || inv.status === 'cancelled');
      default:
        return invitations;
    }
  };

  const pendingCount = invitations.filter(inv => inv.status === 'pending').length;
  const acceptedCount = invitations.filter(inv => inv.status === 'accepted').length;
  const expiredCount = invitations.filter(inv => inv.status === 'expired' || inv.status === 'cancelled').length;

  // Render card for mobile view
  const renderInvitationCard = (invitation: Invitation, index: number) => (
    <Card key={invitation.id} className="mb-4">
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Email and Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {invitation.full_name || invitation.email}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {invitation.email}
              </div>
              <div className="text-xs text-gray-500">
                {invitation.role.replace('_', ' ').toUpperCase()}
                {invitation.position && ` • ${invitation.position.charAt(0).toUpperCase() + invitation.position.slice(1)}`}
              </div>
            </div>
            {getStatusBadge(invitation.status)}
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Created:</span>
              <div className="font-medium">{new Date(invitation.created_at).toLocaleDateString()}</div>
            </div>
            <div>
              <span className="text-gray-500">Expires:</span>
              <div className="font-medium">{new Date(invitation.expires_at).toLocaleDateString()}</div>
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
                Resend
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
      key: 'name',
      header: 'Name',
      render: (inv: Invitation) => inv.full_name || 'N/A',
    },
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
      key: 'created_at',
      header: 'Created',
      render: (inv: Invitation) => new Date(inv.created_at).toLocaleDateString(),
    },
    {
      key: 'expires_at',
      header: 'Expires',
      render: (inv: Invitation) => new Date(inv.expires_at).toLocaleDateString(),
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
              >
                {resendingEmail === inv.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
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

  const getRoleDisplayName = (roleName: string) => {
    return roleName.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="page-container container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">My Invitations</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage invitations you've sent to others</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => navigate('/board-portal')} 
                variant="outline"
                className="text-xs sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Board Portal
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
                    <DialogTitle>Send Invitation</DialogTitle>
                    <DialogDescription>
                      Invite someone to join Citizen Bank. You can invite: {permittedRoles.map(r => getRoleDisplayName(r)).join(', ')}
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
                          {permittedRoles.map(r => (
                            <SelectItem key={r} value={r}>
                              {getRoleDisplayName(r)}
                            </SelectItem>
                          ))}
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
                            <SelectItem value="chairman">Chairman</SelectItem>
                            <SelectItem value="vice_chairman">Vice Chairman</SelectItem>
                            <SelectItem value="secretary">Secretary</SelectItem>
                            <SelectItem value="treasurer">Treasurer</SelectItem>
                            <SelectItem value="director">Director</SelectItem>
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
        ) : error ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-red-600">
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Invitation History</CardTitle>
                  <CardDescription className="text-sm">View and manage invitations you've sent</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="pending" className="relative">
                    Pending
                    {pendingCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {pendingCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="accepted" className="relative">
                    Accepted
                    {acceptedCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {acceptedCount}
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

                {/* Pending Tab */}
                <TabsContent value="pending" className="space-y-4">
                  <ResponsiveTable
                    columns={columns}
                    data={getFilteredInvitations('pending')}
                    keyExtractor={(inv) => inv.id}
                    renderCard={renderInvitationCard}
                    emptyMessage="No pending invitations"
                  />
                </TabsContent>

                {/* Accepted Tab */}
                <TabsContent value="accepted" className="space-y-4">
                  <ResponsiveTable
                    columns={columns}
                    data={getFilteredInvitations('accepted')}
                    keyExtractor={(inv) => inv.id}
                    renderCard={renderInvitationCard}
                    emptyMessage="No accepted invitations"
                  />
                </TabsContent>

                {/* Expired/Cancelled Tab */}
                <TabsContent value="expired" className="space-y-4">
                  <ResponsiveTable
                    columns={columns}
                    data={getFilteredInvitations('expired')}
                    keyExtractor={(inv) => inv.id}
                    renderCard={renderInvitationCard}
                    emptyMessage="No expired or cancelled invitations"
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
