import { useState, useEffect } from 'react';
import { apiClient } from "app";
import { useUserGuardContext } from 'app/auth';
import { ProfileDropdown } from 'components/ProfileDropdown';
import { BackOfficeNav } from 'components/BackOfficeNav';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { ResponsiveTable } from 'components/ResponsiveTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { UserPlus, FileText, TrendingUp, AlertCircle, Trash2, UserCheck, Home, Loader2, Users, ArrowLeft, Eye, Edit, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { BoardMemberWithInvestment, InvestmentStatus, DocumentCompliance, BoardPosition } from 'types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BackOfficeBoardMembers() {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();
  const [members, setMembers] = useState<BoardMemberWithInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [appointDialogOpen, setAppointDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<BoardMemberWithInvestment | null>(null);
  const [positions, setPositions] = useState<BoardPosition[]>([]);
  const [editForm, setEditForm] = useState({
    position_id: '', // This actually stores position_name, not ID
    term_end_date: '',
    status: ''
  });
  const [appointForm, setAppointForm] = useState({
    appointmentMethod: 'user', // 'user' or 'invitation'
    user_id: '',
    invitation_id: '',
    position: '',
    term_years: '3'
  });
  const [submitting, setSubmitting] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadBoardMembers();
    loadPositions();
  }, []);

  const loadBoardMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get_board_members_with_investment_status();
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error: any) {
      console.error('Error loading board members:', error);
      const errorMsg = error?.message || error?.detail || "Unable to load board members. Please try again.";
      setError(errorMsg);
      toast.error('Failed to load board members', { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const loadPositions = async () => {
    try {
      const response = await apiClient.list_board_positions();
      const data = await response.json();
      setPositions(data.positions || []);
    } catch (error: any) {
      console.error('Error loading positions:', error);
    }
  };

  const loadInvitations = async () => {
    try {
      const response = await apiClient.list_invitations({ status: 'pending' });
      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (error: any) {
      console.error('Error loading invitations:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiClient.get_available_users();
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
    }
  };

  const handleOpenAppointDialog = () => {
    setAppointForm({
      appointmentMethod: 'user',
      user_id: '',
      invitation_id: '',
      position: '',
      term_years: '3'
    });
    loadInvitations();
    loadUsers();
    setAppointDialogOpen(true);
  };

  const handleAppointMember = async () => {
    if (!appointForm.position) {
      toast.error('Please select a position');
      return;
    }

    if (appointForm.appointmentMethod === 'user' && !appointForm.user_id) {
      toast.error('Please select a user');
      return;
    }

    if (appointForm.appointmentMethod === 'invitation' && !appointForm.invitation_id) {
      toast.error('Please select an invitation');
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiClient.appoint_board_member_endpoint({
        user_id: appointForm.appointmentMethod === 'user' ? appointForm.user_id : null,
        invitation_id: appointForm.appointmentMethod === 'invitation' ? parseInt(appointForm.invitation_id) : null,
        position: appointForm.position,
        term_years: parseInt(appointForm.term_years)
      });

      if (response.ok) {
        toast.success('Board member appointed successfully');
        setAppointDialogOpen(false);
        await loadBoardMembers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to appoint board member');
      }
    } catch (error) {
      console.error('Failed to appoint member:', error);
      toast.error('Failed to appoint board member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (member: BoardMemberWithInvestment) => {
    setSelectedMember(member);
    setEditForm({
      position_id: member.position_name || '',
      term_end_date: member.term_end_date ? new Date(member.term_end_date).toISOString().split('T')[0] : '',
      status: member.status || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdateMember = async () => {
    if (!selectedMember || !selectedMember.user_id) {
      toast.error('Cannot update member: Missing user ID');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Build payload with only non-empty values
      const payload: any = {};
      
      if (editForm.position_id && editForm.position_id.trim()) {
        payload.position = editForm.position_id;
      }
      
      if (editForm.term_end_date && editForm.term_end_date.trim()) {
        payload.term_end_date = editForm.term_end_date;
      }
      
      if (editForm.status && editForm.status.trim()) {
        payload.status = editForm.status;
      }
      
      const response = await apiClient.update_board_member_endpoint(
        { memberUserId: selectedMember.user_id },
        payload
      );
      
      if (response.ok) {
        toast.success('Board member updated successfully');
        setEditDialogOpen(false);
        await loadBoardMembers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to update board member');
      }
    } catch (error) {
      console.error('Failed to update member:', error);
      toast.error('Failed to update board member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = (member: BoardMemberWithInvestment) => {
    setSelectedMember(member);
    setRemoveDialogOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!selectedMember || !selectedMember.user_id) {
      toast.error('Cannot remove member: Missing user ID');
      return;
    }
    
    try {
      setSubmitting(true);
      const response = await apiClient.remove_board_member_endpoint({ 
        memberUserId: selectedMember.user_id
      });
      
      if (response.ok) {
        toast.success('Board member removed successfully');
        setRemoveDialogOpen(false);
        await loadBoardMembers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to remove board member');
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove board member');
    } finally {
      setSubmitting(false);
    }
  };

  const getInvestmentBadge = (investmentStatus: InvestmentStatus | null) => {
    if (!investmentStatus) {
      return <Badge variant="outline" className="bg-gray-100">N/A</Badge>;
    }

    if (investmentStatus.meets_requirement) {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Compliant
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="bg-orange-600 hover:bg-orange-700">
          <XCircle className="h-3 w-3 mr-1" />
          Needs M{investmentStatus.investment_needed.toLocaleString()}
        </Badge>
      );
    }
  };

  const getProfileCompletionDisplay = (percentage: number | null) => {
    if (percentage === null || percentage === undefined) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline">No Profile</Badge>
        </div>
      );
    }

    const color = percentage >= 80 ? 'bg-green-600' : percentage >= 60 ? 'bg-yellow-600' : 'bg-red-600';
    
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
    );
  };

  const getDocumentComplianceBadge = (compliance: DocumentCompliance | null) => {
    if (!compliance) {
      return <Badge variant="outline">No Data</Badge>;
    }

    if (compliance.missing > 0) {
      return (
        <Badge variant="destructive" className="bg-red-600">
          {compliance.missing} Missing
        </Badge>
      );
    } else if (compliance.pending_review > 0) {
      return (
        <Badge variant="default" className="bg-yellow-600">
          <Clock className="h-3 w-3 mr-1" />
          {compliance.pending_review} Pending
        </Badge>
      );
    } else {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Complete
        </Badge>
      );
    }
  };

  // Define table columns for ResponsiveTable
  const columns = [
    {
      key: 'full_name',
      header: 'Name',
      render: (member: BoardMemberWithInvestment) => (
        <div>
          <div className="font-medium">{member.full_name}</div>
          <div className="text-xs text-muted-foreground">{member.email}</div>
        </div>
      )
    },
    {
      key: 'position_name',
      header: 'Position',
      render: (member: BoardMemberWithInvestment) => (
        <span className="font-medium">{member.position_name}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (member: BoardMemberWithInvestment) => {
        if (member.status === 'active') {
          return (
            <Badge className="bg-green-600 hover:bg-green-700">
              Active
            </Badge>
          );
        } else if (member.status === 'inactive') {
          return (
            <Badge variant="secondary">
              Inactive
            </Badge>
          );
        } else if (member.status === 'resigned') {
          return (
            <Badge variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-400">
              Resigned
            </Badge>
          );
        } else if (member.status === 'removed') {
          return (
            <Badge variant="destructive">
              Removed
            </Badge>
          );
        }
        return <Badge variant="outline">Unknown</Badge>;
      }
    },
    {
      key: 'investment_status',
      header: 'Investment',
      render: (member: BoardMemberWithInvestment) => getInvestmentBadge(member.investment_status)
    },
    {
      key: 'profile_completion',
      header: 'Profile',
      render: (member: BoardMemberWithInvestment) => getProfileCompletionDisplay(member.profile_completion_percentage)
    },
    {
      key: 'documents',
      header: 'Documents',
      render: (member: BoardMemberWithInvestment) => (
        <div className="space-y-1">
          {getDocumentComplianceBadge(member.document_compliance)}
          {member.document_compliance && (
            <div className="text-xs text-muted-foreground">
              {member.document_compliance.approved}/{member.document_compliance.total_required} approved
            </div>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (member: BoardMemberWithInvestment) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/board-member-detail?memberId=${member.board_member_id}`)}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(member)}
            title="Edit Member"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRemove(member)}
            title="Remove Member"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )
    }
  ];

  // Calculate stats
  const totalMembers = members.length;
  const investmentCompliant = members.filter(m => m.investment_status?.meets_requirement).length;
  const needsInvestment = members.filter(m => m.investment_status && !m.investment_status.meets_requirement).length;
  const documentCompliant = members.filter(m => m.document_compliance && m.document_compliance.missing === 0 && m.document_compliance.pending_review === 0).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <BackOfficeNav currentPage="Board Members" />
      
      <div className="page-container container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Board Members</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage board member profiles and compliance</p>
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
                onClick={handleOpenAppointDialog}
                className="text-xs sm:text-sm bg-purple-600 hover:bg-purple-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Appoint Member
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Total Members</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{totalMembers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Investment Compliant</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl text-green-600">
                {investmentCompliant}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Needs Investment</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl text-orange-600">
                {needsInvestment}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Document Compliant</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl text-green-600">
                {documentCompliant}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-4">Loading board members...</p>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-600">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>{error}</p>
                <Button onClick={loadBoardMembers} className="mt-4" variant="outline">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">All Board Members</CardTitle>
              <CardDescription className="text-sm">Review compliance status and manage profiles</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveTable
                columns={columns}
                data={members}
                keyExtractor={(member) => member.board_member_id}
                emptyMessage="No board members found"
                renderCard={(member: BoardMemberWithInvestment) => (
                  <Card key={member.board_member_id} className="mb-4">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{member.full_name}</CardTitle>
                          <CardDescription className="text-sm truncate">{member.email}</CardDescription>
                        </div>
                        <div className="flex-shrink-0">
                          {member.status === 'active' ? (
                            <Badge className="bg-green-600">Active</Badge>
                          ) : member.status === 'inactive' ? (
                            <Badge variant="secondary">Inactive</Badge>
                          ) : member.status === 'resigned' ? (
                            <Badge variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-400">Resigned</Badge>
                          ) : member.status === 'removed' ? (
                            <Badge variant="destructive">Removed</Badge>
                          ) : (
                            <Badge variant="outline">Unknown</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground mb-1">Position</div>
                          <div className="font-medium truncate">{member.position_name || 'No Position'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-1">Investment</div>
                          {getInvestmentBadge(member.investment_status)}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-muted-foreground text-sm mb-1">Profile Completion</div>
                        {getProfileCompletionDisplay(member.profile_completion_percentage)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground mb-1">Documents</div>
                          {getDocumentComplianceBadge(member.document_compliance)}
                        </div>
                        {member.document_compliance && (
                          <div>
                            <div className="text-muted-foreground mb-1">Approved</div>
                            <div className="font-medium">
                              {member.document_compliance.approved}/{member.document_compliance.total_required}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/board-member-detail?memberId=${member.board_member_id}`)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(member)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemove(member)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <Footer />
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Board Member</DialogTitle>
            <DialogDescription>
              Update board member position, term end date, or status.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select
                value={editForm.position_id}
                onValueChange={(value) => setEditForm({ ...editForm, position_id: value })}
              >
                <SelectTrigger id="position">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.position_name}>
                      {position.position_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="term_end_date">Term End Date</Label>
              <input
                id="term_end_date"
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={editForm.term_end_date}
                onChange={(e) => setEditForm({ ...editForm, term_end_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="removed">Removed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMember} disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Board Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedMember?.full_name}? This will set their status to 'removed' but preserve all historical records.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={submitting}>
              {submitting ? 'Removing...' : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appoint Board Member Dialog */}
      <Dialog open={appointDialogOpen} onOpenChange={setAppointDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appoint Board Member</DialogTitle>
            <DialogDescription>
              Appoint a new board member from an existing user or pending invitation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Appointment Method */}
            <div className="space-y-2">
              <Label>Appointment Method</Label>
              <RadioGroup
                value={appointForm.appointmentMethod}
                onValueChange={(value) => setAppointForm({ ...appointForm, appointmentMethod: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="user" id="method-user" />
                  <Label htmlFor="method-user" className="font-normal cursor-pointer">
                    Select from registered users
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="invitation" id="method-invitation" />
                  <Label htmlFor="method-invitation" className="font-normal cursor-pointer">
                    Accept pending invitation
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* User Selection */}
            {appointForm.appointmentMethod === 'user' && (
              <div className="space-y-2">
                <Label htmlFor="user">Select User</Label>
                <Select
                  value={appointForm.user_id}
                  onValueChange={(value) => setAppointForm({ ...appointForm, user_id: value })}
                >
                  <SelectTrigger id="user">
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: any) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.display_name || user.email} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Invitation Selection */}
            {appointForm.appointmentMethod === 'invitation' && (
              <div className="space-y-2">
                <Label htmlFor="invitation">Select Invitation</Label>
                <Select
                  value={appointForm.invitation_id}
                  onValueChange={(value) => setAppointForm({ ...appointForm, invitation_id: value })}
                >
                  <SelectTrigger id="invitation">
                    <SelectValue placeholder="Choose an invitation" />
                  </SelectTrigger>
                  <SelectContent>
                    {invitations.map((inv: any) => (
                      <SelectItem key={inv.id} value={inv.id.toString()}>
                        {inv.full_name || inv.email} - {inv.position || 'Board Member'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Position */}
            <div className="space-y-2">
              <Label htmlFor="appoint-position">Position</Label>
              <Select
                value={appointForm.position}
                onValueChange={(value) => setAppointForm({ ...appointForm, position: value })}
              >
                <SelectTrigger id="appoint-position">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.position_name}>
                      {position.position_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Term Years */}
            <div className="space-y-2">
              <Label htmlFor="term-years">Term Duration (Years)</Label>
              <Input
                id="term-years"
                type="number"
                min="1"
                max="10"
                value={appointForm.term_years}
                onChange={(e) => setAppointForm({ ...appointForm, term_years: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAppointDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleAppointMember} disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
              {submitting ? 'Appointing...' : 'Appoint Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
