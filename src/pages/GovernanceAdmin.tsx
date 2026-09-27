import { useEffect, useState } from 'react';
import { useUserGuardContext } from 'app/auth';
import { useNavigate } from 'react-router-dom';
import { apiClient } from "app";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ResultsChart } from 'components/ResultsChart';
import { Plus, Settings, Calendar, FileText, TrendingUp, Loader2, Trash2, Eye, Play, StopCircle, ExternalLink, Download, RotateCcw, XCircle, ArrowLeft, Edit, Send, Search, Mail, Clock, CheckCircle, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useUserRoles } from 'utils/useUserRoles';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function GovernanceAdmin() {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();
  const { roles } = useUserRoles();
  const isSuperAdmin = roles.includes('super_admin');
  const isStaff = roles.includes('staff');
  const canManageSessions = isSuperAdmin || isStaff;
  const [activeTab, setActiveTab] = useState('sessions');
  const [loading, setLoading] = useState(true);

  // Data states
  const [sessions, setSessions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionResults, setSessionResults] = useState<any>(null);
  const [availableSessionsForUpload, setAvailableSessionsForUpload] = useState<any[]>([]);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isItemsDialogOpen, setIsItemsDialogOpen] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);

  // Delete confirmation states
  const [deleteDocumentId, setDeleteDocumentId] = useState<number | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    opens_at: '',
    closes_at: '',
    voting_items: [] as any[],
  });

  // Email notification states for edit dialog
  const [editDialogTab, setEditDialogTab] = useState('details');
  const [boardMembersForNotification, setBoardMembersForNotification] = useState<any[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [emailPreview, setEmailPreview] = useState<any>(null);
  const [loadingBoardMembers, setLoadingBoardMembers] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('all');

  // Email queue states
  const [emailQueue, setEmailQueue] = useState<any[]>([]);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueStatusFilter, setQueueStatusFilter] = useState<string | null>(null);
  const [queueSessionFilter, setQueueSessionFilter] = useState<number | null>(null);

  // Form states
  const [sessionForm, setSessionForm] = useState({
    session_type: 'agm_vote',
    title: '',
    description: '',
    opens_at: '',
    closes_at: '',
  });

  const [itemForm, setItemForm] = useState({
    question: '',
    description: '',
    options: ['for', 'against', 'abstain'],
  });

  const [documentForm, setDocumentForm] = useState({
    file_name: '',
    description: '',
    file: null as File | null,
    approver_ids: [] as string[],
    sessionId: 3, // Default to "Unlinked Documents" session
  });

  const [availableApprovers, setAvailableApprovers] = useState<any[]>([]);
  const [sendingToMember, setSendingToMember] = useState<string | null>(null);
  const [previewingMember, setPreviewingMember] = useState<any>(null);
  const [emailPreviewDialogOpen, setEmailPreviewDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
    loadSessionsForUpload();
  }, []);

  // Load email queue when the email queue tab is active
  useEffect(() => {
    if (activeTab === 'queue') {
      loadEmailQueue();
    }
  }, [activeTab, queueStatusFilter, queueSessionFilter]);

  // Load board members when edit dialog opens
  useEffect(() => {
    if (isEditDialogOpen && selectedSession) {
      loadBoardMembersForNotification();
      // Reset filters when dialog opens
      setSearchTerm('');
      setPositionFilter('all');
    }
  }, [isEditDialogOpen, selectedSession]);

  // Reset filters when dialog closes
  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setSearchTerm('');
    setPositionFilter('all');
    setEditDialogTab('details');
  };

  const loadSessionsForUpload = async () => {
    try {
      const response = await apiClient.list_sessions_for_selection();
      if (response.ok) {
        const data = await response.json();
        setAvailableSessionsForUpload(data.sessions || []);
      }
    } catch (error) {
      console.error('Error loading sessions for upload:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [sessionsRes, approversRes] = await Promise.all([
        apiClient.list_sessions({}),
        apiClient.list_board_members({ limit: 100 }),
      ]);

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        
        setSessions(data.sessions || []);
        
        // Extract all documents from all sessions
        const allDocuments: any[] = [];
        const validSessions = (data.sessions || []).filter((s: any) => {
          const hasValidId = s && s.id && typeof s.id === 'number' && !isNaN(s.id);
          return hasValidId;
        });
        
        for (const session of validSessions) {
          const sessionDetailsRes = await apiClient.get_session_details({ sessionId: session.id });
          if (sessionDetailsRes.ok) {
            const sessionData = await sessionDetailsRes.json();
            const docs = sessionData.documents || [];
            // Add session info to each document
            docs.forEach((doc: any) => {
              allDocuments.push({
                ...doc,
                session_title: session.title,
                session_type: session.session_type
              });
            });
          }
        }
        setDocuments(allDocuments);
      }

      if (approversRes.ok) {
        const data = await approversRes.json();
        setAvailableApprovers(data.members || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load governance data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEmailQueue = async () => {
    try {
      setLoadingQueue(true);
      const params: any = {};
      if (queueStatusFilter) params.status = queueStatusFilter;
      if (queueSessionFilter) params.session_id = queueSessionFilter;
      
      const response = await apiClient.list_email_queue(params);
      if (response.ok) {
        const data = await response.json();
        setEmailQueue(data.emails || []);
        setQueueStats(data.stats || null);
      } else {
        toast.error('Failed to load email queue');
      }
    } catch (error) {
      console.error('Error loading email queue:', error);
      toast.error('Failed to load email queue');
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleCancelEmail = async (emailId: number) => {
    try {
      const response = await apiClient.cancel_queued_email({ emailId });
      if (response.ok) {
        toast.success('Email cancelled successfully');
        loadEmailQueue();
      } else {
        toast.error('Failed to cancel email');
      }
    } catch (error) {
      console.error('Error cancelling email:', error);
      toast.error('Failed to cancel email');
    }
  };

  const handleCreateSession = async () => {
    try {
      const response = await apiClient.create_session(sessionForm);

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Session Created',
          description: 'Governance session created successfully',
        });
        setIsCreateDialogOpen(false);
        setSessionForm({
          session_type: 'agm_vote',
          title: '',
          description: '',
          opens_at: '',
          closes_at: '',
        });
        loadData();

        // If it's an AGM vote, prompt to add items
        if (sessionForm.session_type === 'agm_vote') {
          setSelectedSession({ id: data.session_id });
          setIsItemsDialogOpen(true);
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to create session',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to create session',
        variant: 'destructive',
      });
    }
  };

  const handleAddItem = async () => {
    if (!selectedSession) return;

    try {
      const response = await apiClient.add_voting_items(selectedSession.id, {
        items: [{
          question: itemForm.question,
          description: itemForm.description,
          options: itemForm.options,
        }],
      });

      if (response.ok) {
        toast({
          title: 'Item Added',
          description: 'Voting item added successfully',
        });
        setItemForm({
          question: '',
          description: '',
          options: ['for', 'against', 'abstain'],
        });
        loadData();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to add item',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item',
        variant: 'destructive',
      });
    }
  };

  const handleUploadDocument = async () => {
    if (!documentForm.file) {
      toast({
        title: 'Error',
        description: 'Please select a file',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await apiClient.upload_governance_document({
        session_id: documentForm.session_id,
        document_type: 'minutes',
        file_url: '', // Will be set after upload
        file_name: documentForm.file_name || documentForm.file.name,
        description: documentForm.description,
      });

      if (response.ok) {
        toast({
          title: 'Document Uploaded',
          description: 'Document uploaded and approvers notified',
        });
        setIsDocumentDialogOpen(false);
        setDocumentForm({
          file_name: '',
          description: '',
          file: null,
          approver_ids: [],
          session_id: 3, // Reset to default
        });
        loadData();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to upload document',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload document',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSessionStatus = async (sessionId: number, status: string) => {
    try {
      const response = await apiClient.update_session_status({ sessionId }, {
        status: status as any,
      });

      if (response.ok) {
        toast({
          title: 'Status Updated',
          description: `Session ${status}`,
        });
        loadData();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to update status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleViewResults = async (sessionId: number) => {
    try {
      const response = await apiClient.get_vote_results({ sessionId });
      
      if (response.ok) {
        const data = await response.json();
        setSessionResults(data);
        setActiveTab('results');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load results',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading results:', error);
      toast({
        title: 'Error',
        description: 'Failed to load results',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocumentId) return;

    try {
      const response = await apiClient.delete_document({ documentId: deleteDocumentId });

      if (response.ok) {
        toast({
          title: 'Document Deleted',
          description: 'Document removed successfully',
        });
        setDeleteDocumentId(null);
        loadData();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to delete document',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteSessionId) return;

    try {
      const response = await apiClient.delete_session({ sessionId: deleteSessionId });

      if (response.ok) {
        toast({
          title: 'Session Deleted',
          description: 'Session removed successfully',
        });
        setDeleteSessionId(null);
        loadData();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to delete session',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete session',
        variant: 'destructive',
      });
    }
  };

  const handleDeactivateSession = async (sessionId: number) => {
    try {
      const response = await apiClient.update_session_status({ sessionId }, {
        status: 'draft',
      });

      if (response.ok) {
        toast({
          title: 'Session Deactivated',
          description: 'Session moved back to draft status',
        });
        loadData();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to deactivate session',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deactivating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to deactivate session',
        variant: 'destructive',
      });
    }
  };

  const handleEditSession = async (sessionId: number) => {
    try {
      const detailsResponse = await apiClient.get_session_details({ sessionId });
      
      if (!detailsResponse.ok) {
        toast({
          title: 'Error',
          description: 'Failed to load session details',
          variant: 'destructive',
        });
        return;
      }

      const details = await detailsResponse.json();
      setEditingSession(details.session);
      setEditForm({
        title: details.session.title || '',
        description: details.session.description || '',
        opens_at: details.session.opens_at ? new Date(details.session.opens_at).toISOString().slice(0, 16) : '',
        closes_at: details.session.closes_at ? new Date(details.session.closes_at).toISOString().slice(0, 16) : '',
        voting_items: details.items || [],
      });
      
      // Load board members for notification selection
      loadBoardMembersForNotification(sessionId);
      
      setIsEditDialogOpen(true);
    } catch (error) {
      console.error('Error loading session details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load session details',
        variant: 'destructive',
      });
    }
  };

  const loadBoardMembersForNotification = async (sessionId: number) => {
    try {
      setLoadingBoardMembers(true);
      const response = await apiClient.get_board_members_for_notification({ sessionId });
      
      if (response.ok) {
        const data = await response.json();
        // API returns direct array, not an object with board_members property
        setBoardMembersForNotification(data || []);
        // Pre-select all members by default (all returned members are already active)
        setSelectedRecipients(data.map((m: any) => m.user_id));
      }
    } catch (error) {
      console.error('Error loading board members:', error);
    } finally {
      setLoadingBoardMembers(false);
    }
  };

  const loadEmailPreview = async (sessionId: number, userId: string) => {
    try {
      setLoadingPreview(true);
      const response = await apiClient.preview_governance_session_email({ sessionId, userId });
      
      if (response.ok) {
        const data = await response.json();
        setEmailPreview(data);
      }
    } catch (error) {
      console.error('Error loading email preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleUpdateSession = async () => {
    if (!editingSession) return;

    try {
      // Update session details
      const sessionResponse = await apiClient.update_governance_session(
        { sessionId: editingSession.id },
        {
          title: editForm.title,
          description: editForm.description,
          opens_at: editForm.opens_at,
          closes_at: editForm.closes_at,
        }
      );

      if (!sessionResponse.ok) {
        const error = await sessionResponse.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to update session',
          variant: 'destructive',
        });
        return;
      }

      // Update voting items if any
      if (editForm.voting_items.length > 0) {
        for (const item of editForm.voting_items) {
          if (item.id) {
            // Update existing item
            const itemResponse = await apiClient.update_voting_item(
              { itemId: item.id },
              {
                question: item.question,
                description: item.description,
                options: item.options,
              }
            );

            if (!itemResponse.ok) {
              const error = await itemResponse.json();
              toast({
                title: 'Warning',
                description: `Failed to update item: ${item.question}`,
                variant: 'destructive',
              });
            }
          }
        }
      }

      toast({
        title: 'Session Updated',
        description: 'Session details updated successfully',
      });
      setIsEditDialogOpen(false);
      setEditingSession(null);
      loadData();
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to update session',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-500',
      active: 'bg-green-500',
      closed: 'bg-red-500',
      finalized: 'bg-blue-500',
      cancelled: 'bg-gray-400'
    };
    return colors[status] || 'bg-gray-500';
  };

  const handlePreviewEmail = async (member: BoardMemberForNotification) => {
    if (!editingSession) return;
    
    setPreviewingMember(member);
    setLoadingPreview(true);
    setEmailPreviewDialogOpen(true);
    
    try {
      const response = await apiClient.preview_governance_session_email({
        sessionId: editingSession.id,
        recipient_user_id: member.user_id,
      });
      const preview = await response.json();
      setEmailPreview(preview);
    } catch (error) {
      console.error("Failed to load preview:", error);
      toast.error("Failed to load email preview");
      setEmailPreviewDialogOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSendToMember = async (member: BoardMemberForNotification) => {
    if (!editingSession) return;
    
    setSendingToMember(member.user_id);
    
    try {
      await apiClient.send_governance_session_notification({
        sessionId: editingSession.id,
        memberIds: [member.user_id],
      });
      toast.success(`Notification sent to ${member.full_name}`);
    } catch (error) {
      console.error("Failed to send notification:", error);
      toast.error("Failed to send notification");
    } finally {
      setSendingToMember(null);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedRecipients(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const toggleAllMembers = () => {
    if (selectedRecipients.length === filteredBoardMembers.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(filteredBoardMembers.map(m => m.user_id));
    }
  };

  // Computed: Filter board members based on search and position
  const filteredBoardMembers = boardMembersForNotification.filter(member => {
    const matchesSearch = searchTerm === '' || 
      member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = positionFilter === 'all' || 
      (member.position || 'Board Member') === positionFilter;
    
    return matchesSearch && matchesPosition;
  });

  // Computed: Get unique positions for filter dropdown
  const uniquePositions = Array.from(
    new Set(
      boardMembersForNotification.map(m => m.position || 'Board Member')
    )
  ).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Back Button */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/back-office-dashboard')}
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Governance & Voting Administration</h1>
              <p className="text-muted-foreground mt-1">
                Manage AGM votes, board resolutions, and voting sessions
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sessions" className="gap-2">
              <Calendar className="h-4 w-4" />
              Sessions
              <Badge variant="secondary">{sessions.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents
              <Badge variant="secondary">{documents.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-2">
              <Mail className="h-4 w-4" />
              Email Queue
              {queueStats && (
                <Badge variant="secondary">{queueStats.pending_count}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>

          {/* Sessions Management */}
          <TabsContent value="sessions" className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Session
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Governance Session</DialogTitle>
                    <DialogDescription>
                      Create a new voting session, meeting, or resolution
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="session-type">Session Type *</Label>
                      <Select 
                        value={sessionForm.session_type} 
                        onValueChange={(value) => setSessionForm({ ...sessionForm, session_type: value })}
                      >
                        <SelectTrigger id="session-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agm_vote">AGM Vote (Shareholders)</SelectItem>
                          <SelectItem value="board_resolution">Board Resolution</SelectItem>
                          <SelectItem value="board_meeting">Board Meeting</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={sessionForm.title}
                        onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                        placeholder="e.g., Annual General Meeting 2024"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={sessionForm.description}
                        onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                        placeholder="Provide details about this session"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="opens-at">Opens At</Label>
                        <Input
                          id="opens-at"
                          type="datetime-local"
                          value={sessionForm.opens_at}
                          onChange={(e) => setSessionForm({ ...sessionForm, opens_at: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="closes-at">Closes At</Label>
                        <Input
                          id="closes-at"
                          type="datetime-local"
                          value={sessionForm.closes_at}
                          onChange={(e) => setSessionForm({ ...sessionForm, closes_at: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateSession}
                      disabled={!sessionForm.title || !sessionForm.session_type}
                    >
                      Create Session
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle>{session.title}</CardTitle>
                          <Badge className={getStatusColor(session.status)}>
                            {session.status.toUpperCase()}
                          </Badge>
                        </div>
                        <CardDescription className="capitalize">
                          {session.session_type.replace('_', ' ')}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {session.status === 'draft' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSession(session.id)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateSessionStatus(session.id, 'active')}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Activate
                            </Button>
                          </>
                        )}
                        {session.status !== 'draft' && canManageSessions && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivateSession(session.id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Deactivate
                          </Button>
                        )}
                        {session.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateSessionStatus(session.id, 'closed')}
                          >
                            <StopCircle className="h-4 w-4 mr-2" />
                            Close
                          </Button>
                        )}
                        {(session.status === 'closed' || session.status === 'finalized' || session.status === 'cancelled') && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewResults(session.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Results
                            </Button>
                            {canManageSessions && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateSessionStatus(session.id, 'active')}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reopen
                              </Button>
                            )}
                          </>
                        )}
                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteSessionId(session.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {session.description && (
                        <p className="text-sm text-muted-foreground">{session.description}</p>
                      )}
                      <div className="flex gap-6 text-sm text-muted-foreground">
                        {session.opens_at && (
                          <div>
                            Opens: {formatDistanceToNow(new Date(session.opens_at), { addSuffix: true })}
                          </div>
                        )}
                        {session.closes_at && (
                          <div>
                            Closes: {formatDistanceToNow(new Date(session.closes_at), { addSuffix: true })}
                          </div>
                        )}
                        {session.item_count !== undefined && (
                          <div>
                            {session.item_count} voting item(s)
                          </div>
                        )}
                        {session.vote_count !== undefined && (
                          <div>
                            {session.vote_count} vote(s) cast
                          </div>
                        )}
                      </div>

                      {session.session_type === 'agm_vote' && session.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSession(session);
                            setIsItemsDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Voting Items
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {sessions.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No sessions yet</p>
                    <p className="text-sm mt-1">Create your first governance session</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Management */}
          <TabsContent value="documents" className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Upload Document for Approval</DialogTitle>
                    <DialogDescription>
                      Upload meeting minutes or documents requiring board approval
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="session-select">Link to Session *</Label>
                      <Select
                        value={String(documentForm.session_id)}
                        onValueChange={(value) => setDocumentForm({ ...documentForm, session_id: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select session" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSessionsForUpload.map((session) => (
                            <SelectItem key={session.id} value={String(session.id)}>
                              {session.title} {session.metadata?.is_default_holding ? '(Default)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select "Unlinked Documents" to upload now and link to a session later
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="file">File *</Label>
                      <Input
                        id="file"
                        type="file"
                        onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files?.[0] || null })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="doc-name">Document Name</Label>
                      <Input
                        id="doc-name"
                        value={documentForm.file_name}
                        onChange={(e) => setDocumentForm({ ...documentForm, file_name: e.target.value })}
                        placeholder="Leave empty to use filename"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="doc-description">Description</Label>
                      <Textarea
                        id="doc-description"
                        value={documentForm.description}
                        onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                        placeholder="Describe the document"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Approvers *</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                        {availableApprovers.map((approver) => (
                          <div key={approver.user_id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`approver-${approver.user_id}`}
                              checked={documentForm.approver_ids.includes(approver.user_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setDocumentForm({
                                    ...documentForm,
                                    approver_ids: [...documentForm.approver_ids, approver.user_id]
                                  });
                                } else {
                                  setDocumentForm({
                                    ...documentForm,
                                    approver_ids: documentForm.approver_ids.filter(id => id !== approver.user_id)
                                  });
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <label 
                              htmlFor={`approver-${approver.user_id}`}
                              className="text-sm cursor-pointer"
                            >
                              {approver.full_name || approver.email}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDocumentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUploadDocument}
                      disabled={!documentForm.file}
                    >
                      Upload Document
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{doc.file_name}</CardTitle>
                        <CardDescription>{doc.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {doc.approval_count || 0} / {doc.required_approvals || 0} Approved
                        </Badge>
                        {doc.file_url && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(doc.file_url, '_blank')}
                              title="View document"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = doc.file_url;
                                link.download = doc.file_name || 'document';
                                link.target = '_blank';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              title="Download document"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteDocumentId(doc.id)}
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {doc.uploaded_at && (
                      <div className="text-sm text-muted-foreground">
                        Uploaded {formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {documents.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No documents uploaded</p>
                    <p className="text-sm mt-1">Upload documents for board approval</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Email Queue Tab */}
          <TabsContent value="queue" className="space-y-6">
            {/* Statistics Cards */}
            {queueStats && (
              <div className="grid grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs">Total</CardDescription>
                    <CardTitle className="text-2xl">{queueStats.total_count}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Pending
                    </CardDescription>
                    <CardTitle className="text-2xl text-orange-600">{queueStats.pending_count}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Sending
                    </CardDescription>
                    <CardTitle className="text-2xl text-blue-600">{queueStats.sending_count}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Sent
                    </CardDescription>
                    <CardTitle className="text-2xl text-green-600">{queueStats.sent_count}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Failed
                    </CardDescription>
                    <CardTitle className="text-2xl text-red-600">{queueStats.failed_count}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            )}

            {/* Filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Email Queue</CardTitle>
                    <CardDescription>Monitor and manage queued governance notifications</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={queueSessionFilter ? String(queueSessionFilter) : 'all'}
                      onValueChange={(value) => setQueueSessionFilter(value === 'all' ? null : parseInt(value))}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All Sessions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sessions</SelectItem>
                        {sessions.map((session) => (
                          <SelectItem key={session.id} value={String(session.id)}>
                            {session.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={queueStatusFilter || 'all'}
                      onValueChange={(value) => setQueueStatusFilter(value === 'all' ? null : value)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="sending">Sending</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={loadEmailQueue}
                      disabled={loadingQueue}
                    >
                      <RotateCcw className={`h-4 w-4 ${loadingQueue ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingQueue ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : emailQueue.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No emails in queue</p>
                    <p className="text-sm mt-1">Emails will appear here when governance notifications are sent</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Session</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Scheduled</TableHead>
                          <TableHead>Sent</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emailQueue.map((email) => (
                          <TableRow key={email.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{email.recipient_name}</div>
                                <div className="text-sm text-muted-foreground">{email.recipient_email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {sessions.find(s => s.id === email.session_id)?.title || `Session #${email.session_id}`}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={{
                                  pending: 'secondary',
                                  sending: 'default',
                                  sent: 'default',
                                  failed: 'destructive',
                                }[email.status] as any}
                                className={{
                                  pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
                                  sending: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                                  sent: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                                  failed: '',
                                }[email.status]}
                              >
                                {email.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                {email.status === 'sending' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                {email.status === 'sent' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {email.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                                {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {formatDistanceToNow(new Date(email.scheduled_at), { addSuffix: true })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(email.scheduled_at).toLocaleString('en-ZA', {
                                  timeZone: 'Africa/Johannesburg',
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              {email.sent_at ? (
                                <>
                                  <div className="text-sm">
                                    {formatDistanceToNow(new Date(email.sent_at), { addSuffix: true })}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(email.sent_at).toLocaleString('en-ZA', {
                                      timeZone: 'Africa/Johannesburg',
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    })}
                                  </div>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {email.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelEmail(email.id)}
                                  title="Cancel email"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              )}
                              {email.status === 'failed' && email.error_message && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <AlertCircle className="h-4 w-4 mr-1" />
                                      View Error
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Email Error Details</DialogTitle>
                                      <DialogDescription>
                                        Email to {email.recipient_name} ({email.recipient_email})
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                                      <p className="text-sm font-mono text-destructive">{email.error_message}</p>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results */}
          <TabsContent value="results">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Select Session</CardTitle>
                  <CardDescription>Choose a closed session to view voting results</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={sessionResults?.session?.id ? String(sessionResults.session.id) : ""}
                    onValueChange={(value) => {
                      const sessionId = parseInt(value);
                      if (!isNaN(sessionId)) {
                        handleViewResults(sessionId);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a closed session" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions
                        .filter((s) => s.status === 'closed' || s.status === 'finalized')
                        .map((session) => (
                          <SelectItem key={session.id} value={String(session.id)}>
                            {session.title} ({session.status})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {sessionResults ? (
                <ResultsChart
                  session={sessionResults.session}
                  totalPossibleVotingPower={sessionResults.total_voting_power}
                  results={sessionResults.results}
                  showVotingPower={sessionResults.session.session_type === 'agm_vote'}
                />
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No results selected</p>
                      <p className="text-sm mt-1">Select a closed session above to view results</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Email */}
          <TabsContent value="email" className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Board Members</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecipients.length} of {filteredBoardMembers.length} selected
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllMembers}
                  disabled={loadingBoardMembers || filteredBoardMembers.length === 0}
                >
                  {selectedRecipients.length === filteredBoardMembers.length ? "Deselect All" : "Select All"}
                </Button>
              </div>

              {/* Search and Filter Controls */}
              {!loadingBoardMembers && boardMembersForNotification.length > 0 && (
                <div className="mb-4 flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      {uniquePositions.map((position) => (
                        <SelectItem key={position} value={position}>
                          {position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {loadingBoardMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : boardMembersForNotification.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No board members found
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedRecipients.length === filteredBoardMembers.length && filteredBoardMembers.length > 0}
                            onCheckedChange={toggleAllMembers}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBoardMembers.map((member) => (
                        <TableRow key={member.user_id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRecipients.includes(member.user_id)}
                              onCheckedChange={() => toggleMemberSelection(member.user_id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{member.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">{member.email}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {member.board_position || "Board Member"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreviewEmail(member)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendToMember(member)}
                                disabled={sendingToMember === member.user_id}
                              >
                                {sendingToMember === member.user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <Send className="h-4 w-4 mr-1" />
                                )}
                                Send Now
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {filteredBoardMembers.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={async () => {
                      if (!editingSession) return;
                      try {
                        await apiClient.send_governance_session_notification({
                          sessionId: editingSession.id,
                          memberIds: selectedRecipients,
                        });
                        toast.success(`Notification sent to ${selectedRecipients.length} members`);
                      } catch (error) {
                        console.error("Failed to send notifications:", error);
                        toast.error("Failed to send notifications");
                      }
                    }}
                    disabled={selectedRecipients.length === 0}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send to {selectedRecipients.length} Selected
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Delete Document Confirmation */}
        <AlertDialog open={deleteDocumentId !== null} onOpenChange={(open) => !open && setDeleteDocumentId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the document and all related approvals.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteDocument} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Session Confirmation */}
        <AlertDialog open={deleteSessionId !== null} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Session?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Sessions with votes or documents cannot be deleted.
                You may need to move or delete documents first, or close the session instead.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Session Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            handleEditDialogClose();
          } else {
            setIsEditDialogOpen(true);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Governance Session</DialogTitle>
              <DialogDescription>
                Update session details and voting items (draft sessions only)
              </DialogDescription>
            </DialogHeader>

            <Tabs value={editDialogTab} onValueChange={setEditDialogTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Session Details</TabsTrigger>
                <TabsTrigger value="notifications">Email Notifications</TabsTrigger>
              </TabsList>

              {/* Session Details Tab */}
              <TabsContent value="details" className="space-y-6 py-4">
                {/* Session Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Session Details</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-title">Title *</Label>
                    <Input
                      id="edit-title"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="Enter session title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Enter session description"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-opens-at">Opens At *</Label>
                      <Input
                        id="edit-opens-at"
                        type="datetime-local"
                        value={editForm.opens_at}
                        onChange={(e) => setEditForm({ ...editForm, opens_at: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-closes-at">Closes At *</Label>
                      <Input
                        id="edit-closes-at"
                        type="datetime-local"
                        value={editForm.closes_at}
                        onChange={(e) => setEditForm({ ...editForm, closes_at: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Voting Items */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Voting Items</h3>
                  
                  {editForm.voting_items.map((item, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-sm">Item {index + 1}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <Label>Question *</Label>
                          <Input
                            value={item.question}
                            onChange={(e) => {
                              const updated = [...editForm.voting_items];
                              updated[index] = { ...updated[index], question: e.target.value };
                              setEditForm({ ...editForm, voting_items: updated });
                            }}
                            placeholder="Enter voting question"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={item.description || ''}
                            onChange={(e) => {
                              const updated = [...editForm.voting_items];
                              updated[index] = { ...updated[index], description: e.target.value };
                              setEditForm({ ...editForm, voting_items: updated });
                            }}
                            placeholder="Enter item description"
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Options (comma-separated)</Label>
                          <Input
                            value={Array.isArray(item.options) ? item.options.join(', ') : ''}
                            onChange={(e) => {
                              const updated = [...editForm.voting_items];
                              updated[index] = { 
                                ...updated[index], 
                                options: e.target.value.split(',').map(opt => opt.trim()).filter(Boolean)
                              };
                              setEditForm({ ...editForm, voting_items: updated });
                            }}
                            placeholder="Yes, No, Abstain"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Email Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6 py-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Select Recipients</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {selectedRecipients.length} selected
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleAllMembers}
                        disabled={loadingBoardMembers || boardMembersForNotification.length === 0}
                      >
                        {selectedRecipients.length === boardMembersForNotification.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                  </div>

                  {loadingBoardMembers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : boardMembersForNotification.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No board members found
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedRecipients.length === filteredBoardMembers.length && filteredBoardMembers.length > 0}
                                onCheckedChange={toggleAllMembers}
                              />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBoardMembers.map((member) => (
                            <TableRow key={member.user_id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedRecipients.includes(member.user_id)}
                                  onCheckedChange={() => toggleMemberSelection(member.user_id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{member.full_name}</TableCell>
                              <TableCell className="text-muted-foreground">{member.email}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {member.board_position || "Board Member"}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreviewEmail(member)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSendToMember(member)}
                                    disabled={sendingToMember === member.user_id}
                                  >
                                    {sendingToMember === member.user_id ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    ) : (
                                      <Send className="h-4 w-4 mr-1" />
                                    )}
                                    Send Now
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {filteredBoardMembers.length > 0 && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={async () => {
                          if (!editingSession) return;
                          try {
                            await apiClient.send_governance_session_notification({
                              sessionId: editingSession.id,
                              memberIds: selectedRecipients,
                            });
                            toast.success(`Notification sent to ${selectedRecipients.length} members`);
                          } catch (error) {
                            console.error("Failed to send notifications:", error);
                            toast.error("Failed to send notifications");
                          }
                        }}
                        disabled={selectedRecipients.length === 0}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send to {selectedRecipients.length} Selected
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingSession(null);
                  setEditDialogTab('details');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateSession}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Email Preview Dialog */}
        <Dialog open={emailPreviewDialogOpen} onOpenChange={setEmailPreviewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
              <DialogDescription>
                {previewingMember && `Personalized email for ${previewingMember.full_name}`}
              </DialogDescription>
            </DialogHeader>

            {loadingPreview ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : emailPreview ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold">To:</span> {emailPreview.to_email}
                    </div>
                    <div>
                      <span className="font-semibold">Subject:</span> {emailPreview.subject}
                    </div>
                  </div>
                </div>

                <div 
                  className="rounded-lg border border-border bg-background p-6"
                  dangerouslySetInnerHTML={{ __html: emailPreview.html_body }}
                />
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Failed to load preview
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailPreviewDialogOpen(false)}>
                Close
              </Button>
              {previewingMember && (
                <Button
                  onClick={() => {
                    setEmailPreviewDialogOpen(false);
                    if (previewingMember) {
                      handleSendToMember(previewingMember);
                    }
                  }}
                  disabled={!emailPreview}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send to {previewingMember.full_name}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
