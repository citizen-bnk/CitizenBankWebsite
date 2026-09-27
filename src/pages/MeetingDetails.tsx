import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from 'app';
import { Header } from 'components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, Calendar, Clock, MapPin, Video, FileText, Users, 
  CheckCircle2, Plus, Save, Edit, Trash2, AlertCircle, Mail, XCircle, HelpCircle, Send
} from 'lucide-react';
import { useUserGuardContext } from 'app/auth';
import { toast } from 'sonner';
import { 
  MeetingResponse, 
  AgendaItemResponse, 
  MinutesResponse, 
  AttendanceResponse, 
  ActionItemResponse,
  InviteeResponse
} from 'types';

const MeetingDetails = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const meetingId = searchParams.get('id');
  const { user } = useUserGuardContext();
  
  const [meeting, setMeeting] = useState<MeetingResponse | null>(null);
  const [agenda, setAgenda] = useState<AgendaItemResponse[]>([]);
  const [minutes, setMinutes] = useState<MinutesResponse | null>(null);
  const [attendance, setAttendance] = useState<AttendanceResponse[]>([]);
  const [actionItems, setActionItems] = useState<ActionItemResponse[]>([]);
  const [invitees, setInvitees] = useState<InviteeResponse[]>([]);
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Form states
  const [minutesContent, setMinutesContent] = useState('');
  const [newActionItem, setNewActionItem] = useState({
    title: '',
    description: '',
    assigned_to: user.id,
    due_date: '',
    priority: 'medium',
  });

  useEffect(() => {
    if (meetingId) {
      loadMeetingData();
    }
  }, [meetingId]);

  const loadMeetingData = async () => {
    if (!meetingId) return;
    
    try {
      setLoading(true);
      
      // Load meeting details
      const meetingRes = await apiClient.get_meeting({ meeting_id: meetingId });
      const meetingData = await meetingRes.json();
      setMeeting(meetingData);

      // Load agenda
      const agendaRes = await apiClient.get_agenda({ meeting_id: meetingId });
      const agendaData = await agendaRes.json();
      setAgenda(agendaData || []);

      // Load minutes (if available)
      try {
        const minutesRes = await apiClient.get_minutes({ meeting_id: meetingId });
        if (minutesRes.ok) {
          const minutesData = await minutesRes.json();
          setMinutes(minutesData);
          setMinutesContent(minutesData.content);
        }
      } catch (err) {
        // Minutes not found - that's okay
      }

      // Load attendance
      const attendanceRes = await apiClient.get_attendance({ meeting_id: meetingId });
      const attendanceData = await attendanceRes.json();
      setAttendance(attendanceData || []);

      // Load action items
      const actionItemsRes = await apiClient.list_meeting_action_items({ meeting_id: meetingId });
      const actionItemsData = await actionItemsRes.json();
      setActionItems(actionItemsData || []);
      
      // Load invitees
      const inviteesRes = await apiClient.get_meeting_invitees({ meetingId });
      const inviteesData = await inviteesRes.json();
      setInvitees(inviteesData || []);
      
    } catch (error) {
      console.error('Failed to load meeting data:', error);
      toast.error('Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMinutes = async () => {
    if (!meetingId || !minutesContent) {
      toast.error('Please enter meeting minutes');
      return;
    }

    try {
      const response = await apiClient.record_minutes(
        { meeting_id: meetingId },
        { content: minutesContent }
      );

      if (response.ok) {
        const data = await response.json();
        setMinutes(data);
        toast.success('Minutes saved successfully');
      } else {
        toast.error('Failed to save minutes');
      }
    } catch (error) {
      console.error('Error saving minutes:', error);
      toast.error('An error occurred while saving minutes');
    }
  };

  const handleApproveMinutes = async () => {
    if (!meetingId) return;

    try {
      const response = await apiClient.approve_minutes({ meeting_id: meetingId });
      
      if (response.ok) {
        const data = await response.json();
        setMinutes(data);
        toast.success('Minutes approved successfully');
      } else {
        toast.error('Failed to approve minutes');
      }
    } catch (error) {
      console.error('Error approving minutes:', error);
      toast.error('An error occurred while approving minutes');
    }
  };

  const handleCreateActionItem = async () => {
    if (!meetingId || !newActionItem.title) {
      toast.error('Please enter action item title');
      return;
    }

    try {
      const response = await apiClient.create_action_item(
        { meeting_id: meetingId },
        {
          title: newActionItem.title,
          description: newActionItem.description || null,
          assigned_to: newActionItem.assigned_to,
          due_date: newActionItem.due_date || null,
          priority: newActionItem.priority,
        }
      );

      if (response.ok) {
        const data = await response.json();
        setActionItems([...actionItems, data]);
        setNewActionItem({
          title: '',
          description: '',
          assigned_to: user.id,
          due_date: '',
          priority: 'medium',
        });
        toast.success('Action item created successfully');
      } else {
        toast.error('Failed to create action item');
      }
    } catch (error) {
      console.error('Error creating action item:', error);
      toast.error('An error occurred while creating action item');
    }
  };

  const handleUpdateActionItem = async (itemId: string, status: string) => {
    try {
      const response = await apiClient.update_action_item(
        { action_item_id: itemId },
        { status }
      );

      if (response.ok) {
        const data = await response.json();
        setActionItems(actionItems.map(item => item.id === itemId ? data : item));
        toast.success('Action item updated');
      } else {
        toast.error('Failed to update action item');
      }
    } catch (error) {
      console.error('Error updating action item:', error);
      toast.error('An error occurred while updating action item');
    }
  };

  const handleSelectAllInvitees = (checked: boolean) => {
    if (checked) {
      setSelectedInvitees(invitees.map(inv => inv.id));
    } else {
      setSelectedInvitees([]);
    }
  };

  const handleSelectInvitee = (inviteeId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvitees([...selectedInvitees, inviteeId]);
    } else {
      setSelectedInvitees(selectedInvitees.filter(id => id !== inviteeId));
    }
  };

  const handleResendInvitations = async () => {
    if (!meetingId || selectedInvitees.length === 0) {
      toast.error('Please select at least one invitee');
      return;
    }

    try {
      const response = await apiClient.resend_meeting_invitations(
        { meetingId },
        { invitee_ids: selectedInvitees }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.resent_count > 0) {
          toast.success(`Successfully resent ${data.resent_count} invitation(s)`);
        }
        
        if (data.failed_count > 0) {
          toast.error(`Failed to send ${data.failed_count} invitation(s)`);
          if (data.errors && data.errors.length > 0) {
            console.error('Resend errors:', data.errors);
          }
        }
        
        // Refresh invitees list
        const inviteesRes = await apiClient.get_meeting_invitees({ meetingId });
        const inviteesData = await inviteesRes.json();
        setInvitees(inviteesData || []);
        
        // Clear selection
        setSelectedInvitees([]);
      } else {
        toast.error('Failed to resend invitations');
      }
    } catch (error) {
      console.error('Error resending invitations:', error);
      toast.error('An error occurred while resending invitations');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  const getMeetingTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      regular: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      special: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      emergency: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      agm: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      egm: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    };
    return colors[type] || colors.regular;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      postponed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    };
    return colors[status] || colors.scheduled;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return colors[priority] || colors.medium;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading meeting details...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">Meeting not found</p>
          <Button onClick={() => navigate('/board-meetings')} className="mt-4">
            Back to Meetings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8 pt-[calc(88px+2rem)] sm:pt-[calc(96px+2rem)] lg:pt-[calc(104px+2rem)]">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/board-meetings')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meetings
          </Button>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="agenda">Agenda ({agenda.length})</TabsTrigger>
            <TabsTrigger value="minutes">Minutes</TabsTrigger>
            <TabsTrigger value="attendance">Attendance ({attendance.length})</TabsTrigger>
            <TabsTrigger value="invitees">Invitees ({invitees.length})</TabsTrigger>
            <TabsTrigger value="actions">Action Items ({actionItems.length})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Agenda Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">{agenda.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">{attendance.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Action Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">{actionItems.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {actionItems.filter(i => i.status === 'completed').length} completed
                  </p>
                </CardContent>
              </Card>
            </div>

            {minutes && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Minutes Status</CardTitle>
                    {minutes.approved ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Version {minutes.version} • Recorded {formatDate(minutes.created_at)}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Agenda Tab */}
          <TabsContent value="agenda" className="space-y-4">
            {agenda.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-foreground">No agenda items yet</p>
                </CardContent>
              </Card>
            ) : (
              agenda.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded text-sm">
                            {item.item_number}
                          </span>
                          {item.title}
                        </CardTitle>
                        {item.description && (
                          <CardDescription className="mt-2">{item.description}</CardDescription>
                        )}
                      </div>
                      {item.duration_minutes && (
                        <Badge variant="outline">{item.duration_minutes} min</Badge>
                      )}
                    </div>
                  </CardHeader>
                  {item.presenter && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Presenter: {item.presenter}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          {/* Minutes Tab */}
          <TabsContent value="minutes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Meeting Minutes</CardTitle>
                  {minutes && !minutes.approved && (
                    <Button onClick={handleApproveMinutes} size="sm">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve Minutes
                    </Button>
                  )}
                </div>
                {minutes && (
                  <CardDescription>
                    Version {minutes.version} • {minutes.approved ? 'Approved' : 'Draft'}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter meeting minutes..."
                  rows={12}
                  value={minutesContent}
                  onChange={(e) => setMinutesContent(e.target.value)}
                  disabled={minutes?.approved}
                />
                {!minutes?.approved && (
                  <Button onClick={handleSaveMinutes}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Minutes
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4">
            {attendance.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-foreground">No attendance records yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {attendance.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium text-foreground">Board Member {record.board_member_id}</p>
                          {record.notes && (
                            <p className="text-sm text-muted-foreground">{record.notes}</p>
                          )}
                        </div>
                        <Badge className={getStatusColor(record.status)}>
                          {record.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Invitees Tab */}
          <TabsContent value="invitees" className="space-y-4">
            {invitees.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-foreground font-medium mb-2">No invitees yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Invite board members when scheduling a meeting
                  </p>
                  <Button onClick={() => navigate('/create-meeting')} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule New Meeting
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Meeting Invitees
                      </CardTitle>
                      <CardDescription>
                        {invitees.filter(i => i.rsvp_status === 'accepted').length} accepted • 
                        {invitees.filter(i => i.rsvp_status === 'declined').length} declined • 
                        {invitees.filter(i => i.rsvp_status === 'tentative').length} tentative • 
                        {invitees.filter(i => i.rsvp_status === 'pending').length} pending
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleResendInvitations}
                      disabled={selectedInvitees.length === 0}
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Resend ({selectedInvitees.length})
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 border-b">
                      <Checkbox
                        id="select-all"
                        checked={selectedInvitees.length === invitees.length && invitees.length > 0}
                        onCheckedChange={handleSelectAllInvitees}
                      />
                      <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                        Select All ({invitees.length})
                      </label>
                    </div>
                    {invitees.map((invitee) => {
                      const getRSVPBadge = (status: string) => {
                        const badges: Record<string, { icon: any; className: string; label: string }> = {
                          accepted: { 
                            icon: CheckCircle2, 
                            className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
                            label: 'Accepted'
                          },
                          declined: { 
                            icon: XCircle, 
                            className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
                            label: 'Declined'
                          },
                          tentative: { 
                            icon: HelpCircle, 
                            className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
                            label: 'Tentative'
                          },
                          pending: { 
                            icon: Clock, 
                            className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
                            label: 'Pending'
                          },
                        };
                        const badge = badges[status] || badges.pending;
                        const Icon = badge.icon;
                        return (
                          <Badge className={badge.className}>
                            <Icon className="h-3 w-3 mr-1" />
                            {badge.label}
                          </Badge>
                        );
                      };

                      return (
                        <div 
                          key={invitee.id} 
                          className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              id={`invitee-${invitee.id}`}
                              checked={selectedInvitees.includes(invitee.id)}
                              onCheckedChange={(checked) => handleSelectInvitee(invitee.id, checked as boolean)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <p className="font-medium text-foreground">{invitee.email}</p>
                                {getRSVPBadge(invitee.rsvp_status)}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  Invited {formatDate(invitee.invitation_sent_at || invitee.created_at)}
                                </span>
                                {invitee.rsvp_at && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    RSVP {formatDate(invitee.rsvp_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Action Items Tab */}
          <TabsContent value="actions" className="space-y-4">
            {/* Create New Action Item */}
            <Card>
              <CardHeader>
                <CardTitle>Create Action Item</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    placeholder="Action item title"
                    value={newActionItem.title}
                    onChange={(e) => setNewActionItem({ ...newActionItem, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Action item description"
                    rows={3}
                    value={newActionItem.description}
                    onChange={(e) => setNewActionItem({ ...newActionItem, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={newActionItem.due_date}
                      onChange={(e) => setNewActionItem({ ...newActionItem, due_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={newActionItem.priority}
                      onValueChange={(value) => setNewActionItem({ ...newActionItem, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreateActionItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Action Item
                </Button>
              </CardContent>
            </Card>

            {/* Action Items List */}
            {actionItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-foreground">No action items yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {actionItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-foreground">{item.title}</h4>
                            <Badge className={getPriorityColor(item.priority)}>
                              {item.priority.toUpperCase()}
                            </Badge>
                            <Badge className={getStatusColor(item.status)}>
                              {item.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                          )}
                          {item.due_date && (
                            <p className="text-xs text-muted-foreground">
                              Due: {formatDate(item.due_date)}
                            </p>
                          )}
                        </div>
                        {item.status !== 'completed' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateActionItem(item.id, 'completed')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MeetingDetails;
