import { useState, useEffect } from "react";
import { useUserGuardContext, auth } from "app/auth";
import brain from "brain";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { FileText, CheckCircle, XCircle, AlertCircle, Users, Download, Send, Settings, ArrowLeft, Eye, ExternalLink, Share2, MoreVertical, Loader2, Mail, MessageSquare, MessageCircle } from "lucide-react";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { BackOfficeNav } from "components/BackOfficeNav";
import { RequirementsManager } from "components/RequirementsManager";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_URL } from "app";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export default function BackOfficeBoardDocuments() {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState("review-queue");
  const [loading, setLoading] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  
  // Review Queue State
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  
  // Members Overview State
  const [membersStatus, setMembersStatus] = useState<any[]>([]);
  const [memberFilter, setMemberFilter] = useState("");
  
  // Readiness Report State
  const [readinessReport, setReadinessReport] = useState<any>(null);
  
  // Settings State
  const [settings, setSettings] = useState<any[]>([]);
  const [editingSetting, setEditingSetting] = useState<any>(null);
  const [editSeverity, setEditSeverity] = useState('normal');
  const [editPopupBehavior, setEditPopupBehavior] = useState('badge');
  const [editReminderDays, setEditReminderDays] = useState<string>('');
  const [editEscalationEnabled, setEditEscalationEnabled] = useState(false);
  
  // Broadcast State
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [broadcastRequirements, setBroadcastRequirements] = useState<number[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSeverity, setBroadcastSeverity] = useState("normal");
  const [broadcastChannel, setBroadcastChannel] = useState("email");
  const [allRequirements, setAllRequirements] = useState<any[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Individual Request State
  const [showIndividualRequestDialog, setShowIndividualRequestDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [individualRequirements, setIndividualRequirements] = useState<number[]>([]);
  const [individualMessage, setIndividualMessage] = useState("");
  const [individualSeverity, setIndividualSeverity] = useState("normal");

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    loadRequirements();
  }, []);

  // Check for viewDocument query param
  useEffect(() => {
    const viewDocId = searchParams.get('viewDocument');
    if (viewDocId) {
      // Small delay to ensure everything is mounted
      setTimeout(() => {
        handleViewDocument({ 
          document_id: parseInt(viewDocId), 
          file_name: 'Shared Document' // Placeholder name
        });
        // Clean up URL
        navigate('/back-office-board-documents', { replace: true });
      }, 500);
    }
  }, [searchParams]);

  const loadRequirements = async () => {
    try {
      const response = await brain.list_requirements();
      const data = await response.json();
      setAllRequirements(data || []);
    } catch (error) {
      console.error("Error loading requirements:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "review-queue") {
        const response = await brain.get_review_queue();
        const data = await response.json();
        setReviewQueue(data || []);
      } else if (activeTab === "members-overview") {
        const response = await brain.get_all_members_status();
        const data = await response.json();
        setMembersStatus(data || []);
      } else if (activeTab === "readiness-report") {
        const response = await brain.get_readiness_report();
        const data = await response.json();
        setReadinessReport(data);
      } else if (activeTab === "settings") {
        const response = await brain.list_requirement_settings();
        const data = await response.json();
        setSettings(data || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDocument = async () => {
    if (!selectedDoc || !reviewAction) return;

    const documentId = selectedDoc.document_id || selectedDoc.id;
    if (!documentId) {
      toast.error("Document ID not found");
      return;
    }

    try {
      const response = await brain.review_document(
        { documentId },
        {
          action: reviewAction,
          rejection_reason: reviewAction === "reject" ? reviewNotes : undefined,
          review_notes: reviewNotes || undefined
        }
      );

      await response.json();
      toast.success(`Document ${reviewAction === "approve" ? "approved" : "rejected"} successfully`);
      setSelectedDoc(null);
      setReviewAction(null);
      setReviewNotes("");
      loadData();
    } catch (error) {
      console.error("Error reviewing document:", error);
      toast.error("Failed to review document");
    }
  };

  const handleViewDocument = async (doc: any) => {
    try {
      const docId = doc.document_id || doc.id;
      if (!docId) {
        toast.error("Document ID not found");
        return;
      }

      setViewingId(docId);
      // toast.info("Opening Document", {
      //   description: `Retrieving ${doc.file_name || 'document'}...`
      // });

      const token = await auth.getAuthToken();
      const response = await fetch(`${API_URL}/board-documents/documents/${docId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Revoke URL after a delay to ensure it loads
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);

    } catch (err: any) {
      console.error('Document view error:', err);
      toast.error("Failed to Open Document", {
        description: "Could not retrieve the document. Please try again."
      });
    } finally {
      setViewingId(null);
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    try {
      const docId = doc.document_id || doc.id;
      if (!docId) {
        toast.error("Document ID not found");
        return;
      }

      toast.info("Downloading Document", {
        description: `Starting download for ${doc.file_name || 'document'}...`
      });

      setDownloadingId(docId);

      const token = await auth.getAuthToken();
      const response = await fetch(`${API_URL}/board-documents/documents/${docId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name || 'document.pdf';
      a.target = '_blank'; // Optional, but good for some browsers
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Revoke URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      
      toast.success('Document download started');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleShareDocument = async (doc: any) => {
    try {
      const shareUrl = `${window.location.origin}/back-office-board-documents?viewDocument=${doc.document_id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Internal portal link copied!', {
        description: 'Authorized users can view this document by pasting the link.'
      });
    } catch (error) {
      console.error('Error sharing document:', error);
      toast.error('Failed to copy link to clipboard');
    }
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toUpperCase() || 'FILE';
  };

  const formatFileSize = (sizeInKb: number) => {
    if (sizeInKb < 1024) {
      return `${sizeInKb} KB`;
    } else {
      return `${(sizeInKb / 1024).toFixed(2)} MB`;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',', '');
  };

  const formatPosition = (position: string) => {
    return position
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const isMemberActive = (status: string) => {
    return status === 'active';
  };

  const handleBroadcastRequest = async () => {
    if (broadcastRequirements.length === 0) {
      toast.error("Please select at least one document type");
      return;
    }

    setIsBroadcasting(true);
    try {
      const response = await brain.broadcast_document_request({
        requirement_ids: broadcastRequirements,
        message: broadcastMessage || undefined,
        severity: broadcastSeverity,
        channel: broadcastChannel
      });

      const data = await response.json();
      
      // Build success message based on channel and results
      let successMsg = `✅ Broadcast sent to ${data.members_notified?.length || 0} members via ${broadcastChannel.toUpperCase()}.`;
      
      if (broadcastChannel === "email" && data.emails_sent) {
        successMsg += ` ${data.emails_sent} emails queued.`;
      } else if (broadcastChannel === "sms" && data.sms_sent) {
        successMsg += ` ${data.sms_sent} SMS sent.`;
      } else if (broadcastChannel === "whatsapp" && data.whatsapp_sent) {
        successMsg += ` ${data.whatsapp_sent} WhatsApp messages sent.`;
      }
      
      if (data.failed_deliveries && data.failed_deliveries.length > 0) {
        successMsg += ` ⚠️ ${data.failed_deliveries.length} failed.`;
        console.warn("Failed deliveries:", data.failed_deliveries);
      }
      
      toast.success(successMsg);
      setShowBroadcastDialog(false);
      setBroadcastRequirements([]);
      setBroadcastMessage("");
      setBroadcastSeverity("normal");
      setBroadcastChannel("email");
    } catch (error) {
      console.error("Error broadcasting request:", error);
      toast.error("Failed to broadcast request");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleIndividualRequest = async () => {
    if (individualRequirements.length === 0) {
      toast.error("Please select at least one document type");
      return;
    }

    if (!selectedMember) {
      toast.error("No member selected");
      return;
    }

    try {
      const response = await brain.send_individual_document_request({
        board_member_id: selectedMember.board_member_id,
        requirement_ids: individualRequirements,
        message: individualMessage || undefined,
        severity: individualSeverity
      });

      const data = await response.json();
      toast.success(`Document request sent to ${data.board_member_name} for ${data.documents_requested} document(s)`);
      setShowIndividualRequestDialog(false);
      setSelectedMember(null);
      setIndividualRequirements([]);
      setIndividualMessage("");
      setIndividualSeverity("normal");
    } catch (error) {
      console.error("Error sending individual request:", error);
      toast.error("Failed to send document request");
    }
  };

  const handleEditSettingsOpen = (setting: any) => {
    setEditingSetting(setting);
    setEditSeverity(setting.default_severity);
    setEditPopupBehavior(setting.notification_popup_behavior);
    setEditReminderDays(setting.auto_reminder_interval_days?.toString() || '');
    setEditEscalationEnabled(setting.escalation_enabled);
  };

  const handleSaveSettings = async () => {
    if (!editingSetting) return;

    try {
      const response = await brain.update_requirement_settings(
        { requirementId: editingSetting.requirement_id },
        {
          default_severity: editSeverity,
          notification_popup_behavior: editPopupBehavior,
          auto_reminder_interval_days: editReminderDays ? parseInt(editReminderDays) : null,
          escalation_enabled: editEscalationEnabled
        }
      );

      await response.json();
      toast.success('Settings updated successfully');
      setEditingSetting(null);
      loadData();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "urgent": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "important": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "normal": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "submitted": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <BackOfficeNav />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Board Document Management</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Review and manage board member document submissions</p>
              </div>
              <Button 
                onClick={() => navigate('/back-office-dashboard')}
                variant="outline"
                className="text-xs sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="relative">
              <TabsList className="w-full inline-flex h-auto flex-nowrap overflow-x-auto pb-2 justify-start lg:grid lg:grid-cols-5 lg:w-auto scrollbar-hide">
                <TabsTrigger value="requirements-manager" className="flex items-center gap-2 whitespace-nowrap">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Requirements</span>
                  <span className="sm:hidden">Req</span>
                </TabsTrigger>
                <TabsTrigger value="review-queue" className="flex items-center gap-2 whitespace-nowrap">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Review Queue</span>
                  <span className="sm:hidden">Queue</span>
                </TabsTrigger>
                <TabsTrigger value="members-overview" className="flex items-center gap-2 whitespace-nowrap">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Members Overview</span>
                  <span className="sm:hidden">Members</span>
                </TabsTrigger>
                <TabsTrigger value="readiness-report" className="flex items-center gap-2 whitespace-nowrap">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Readiness Report</span>
                  <span className="sm:hidden">Report</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2 whitespace-nowrap">
                  <AlertCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Notifications</span>
                  <span className="sm:hidden">Notif</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Requirements Manager Tab */}
            <TabsContent value="requirements-manager">
              <RequirementsManager 
                requirements={allRequirements}
                loading={loading}
                onRefresh={() => {
                  loadData();
                  loadRequirements();
                }}
              />
            </TabsContent>

            {/* Review Queue Tab */}
            <TabsContent value="review-queue" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Documents Pending Review</h2>
                <Button onClick={() => setShowBroadcastDialog(true)} className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Broadcast Request
                </Button>
              </div>

              {loading ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Loading documents...
                  </CardContent>
                </Card>
              ) : reviewQueue.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No documents pending review</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {reviewQueue.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="font-semibold">{doc.requirement_name}</h3>
                              <Badge className={getStatusColor(doc.status)}>
                                {doc.status}
                              </Badge>
                              {doc.severity && (
                                <Badge className={getSeverityColor(doc.severity)}>
                                  {doc.severity}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground break-words">
                              <strong>Board Member:</strong> {doc.board_member_name} ({doc.board_member_email})
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <strong>Submitted:</strong> {new Date(doc.submitted_at).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-muted-foreground break-all">
                              <strong>File:</strong> {doc.file_name} ({formatFileSize(doc.file_size_kb)})
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {getFileExtension(doc.file_name)}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Desktop buttons - hidden on mobile */}
                          <div className="hidden sm:flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => {
                                setSelectedDoc(doc);
                                setReviewAction("approve");
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => {
                                setSelectedDoc(doc);
                                setReviewAction("reject");
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              onClick={() => handleViewDocument(doc)}
                              disabled={viewingId === doc.document_id}
                            >
                              {viewingId === doc.document_id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4 mr-2" />
                              )}
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600 border-orange-600 hover:bg-orange-50"
                              onClick={() => handleDownloadDocument(doc)}
                              disabled={downloadingId === (doc.document_id || doc.id)}
                            >
                              {downloadingId === (doc.document_id || doc.id) ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 mr-2" />
                              )}
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-purple-600 border-purple-600 hover:bg-purple-50"
                              onClick={() => handleShareDocument(doc)}
                            >
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </Button>
                          </div>

                          {/* Mobile dropdown menu - hidden on desktop */}
                          <div className="sm:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {isMemberActive(doc.board_member_status) && (
                                  <>
                                    <DropdownMenuItem
                                      className="text-green-600 cursor-pointer"
                                      onClick={() => {
                                        setSelectedDoc(doc);
                                        setReviewAction("approve");
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600 cursor-pointer"
                                      onClick={() => {
                                        setSelectedDoc(doc);
                                        setReviewAction("reject");
                                      }}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem
                                  className="text-blue-600 cursor-pointer"
                                  onClick={() => handleViewDocument(doc)}
                                  disabled={viewingId === doc.document_id}
                                >
                                  {viewingId === doc.document_id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Eye className="h-4 w-4 mr-2" />
                                  )}
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-orange-600 cursor-pointer"
                                  onClick={() => handleDownloadDocument(doc)}
                                  disabled={downloadingId === (doc.document_id || doc.id)}
                                >
                                  {downloadingId === (doc.document_id || doc.id) ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                  )}
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-purple-600 cursor-pointer"
                                  onClick={() => handleShareDocument(doc)}
                                >
                                  <Share2 className="h-4 w-4 mr-2" />
                                  Share
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Members Overview Tab */}
            <TabsContent value="members-overview" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">All Board Members</h2>
                <Input
                  placeholder="Filter by name or email..."
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  className="max-w-xs"
                />
              </div>

              {loading ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Loading members...
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {membersStatus
                    .filter(m => 
                      memberFilter === "" || 
                      m.full_name?.toLowerCase().includes(memberFilter.toLowerCase()) ||
                      m.email?.toLowerCase().includes(memberFilter.toLowerCase())
                    )
                    .map((member) => {
                      const pendingReview = member.total_submitted - member.total_approved - member.total_rejected;
                      
                      return (
                        <Card key={member.board_member_id}>
                          <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h3 className="font-semibold text-lg">{member.full_name}</h3>
                                  <Badge className={getStatusColor(member.status)}>
                                    {member.status.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                                <p className="text-sm text-muted-foreground">
                                  <strong>Position:</strong> {formatPosition(member.position)}
                                </p>
                                {member.last_activity && (
                                  <p className="text-sm text-muted-foreground">
                                    <strong>Last Activity:</strong> {formatDateTime(member.last_activity)}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-2 text-xs mt-2">
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                                    📄 {member.total_required} Required
                                  </Badge>
                                  <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                                    📤 {member.total_submitted} Submitted
                                  </Badge>
                                  <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200">
                                    ✓ {member.total_approved} Approved
                                  </Badge>
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200">
                                    ⏳ {pendingReview} Pending
                                  </Badge>
                                  <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-200">
                                    ✗ {member.total_rejected} Rejected
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-center lg:text-right space-y-2">
                                <div className="flex items-center justify-center lg:justify-end gap-4">
                                  <div>
                                    <p className="text-3xl font-bold">{member.completion_percentage.toFixed(0)}%</p>
                                    <p className="text-xs text-muted-foreground">Complete</p>
                                  </div>
                                  <div className="h-20 w-20 rounded-full border-4 flex items-center justify-center" style={{
                                    borderColor: member.completion_percentage >= 80 ? "#22c55e" : 
                                                member.completion_percentage >= 50 ? "#f59e0b" : "#ef4444"
                                  }}>
                                    <span className="text-sm font-bold">{member.total_approved}/{member.total_required}</span>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full mt-3"
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setShowIndividualRequestDialog(true);
                                  }}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Send Request
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </TabsContent>

            {/* Readiness Report Tab */}
            <TabsContent value="readiness-report" className="space-y-4">
              <h2 className="text-xl font-semibold">License Readiness by Jurisdiction</h2>

              {loading ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Loading report...
                  </CardContent>
                </Card>
              ) : readinessReport ? (
                <div className="space-y-4">
                  <Card className="bg-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Overall Compliance</span>
                        <span className="text-3xl font-bold">{readinessReport.overall_compliance}%</span>
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  {readinessReport.jurisdictions?.map((jurisdiction: any) => (
                    <Card key={jurisdiction.jurisdiction}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{jurisdiction.jurisdiction}</span>
                          <Badge className={jurisdiction.compliance_percentage >= 80 ? "bg-green-500" : "bg-orange-500"}>
                            {jurisdiction.compliance_percentage}% Complete
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {jurisdiction.total_approved} of {jurisdiction.total_required} documents approved
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {jurisdiction.missing_critical?.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-red-600 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Critical Missing Documents:
                            </p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                              {jurisdiction.missing_critical.map((doc: string, idx: number) => (
                                <li key={idx}>{doc}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <h2 className="text-xl font-semibold">Document Requirement Settings</h2>
              <p className="text-sm text-muted-foreground">Configure notification behavior and severity for each document type</p>

              {loading ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Loading settings...
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {settings.map((setting) => (
                    <Card key={setting.requirement_id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h3 className="font-semibold">{setting.requirement_name}</h3>
                            <div className="flex gap-2 text-sm">
                              <Badge className={getSeverityColor(setting.default_severity)}>
                                Severity: {setting.default_severity}
                              </Badge>
                              <Badge variant="outline">
                                Popup: {setting.notification_popup_behavior}
                              </Badge>
                              {setting.auto_reminder_interval_days && (
                                <Badge variant="outline">
                                  Reminder: Every {setting.auto_reminder_interval_days} days
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditSettingsOpen(setting)}
                          >
                            Edit
                          </Button>
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

      {/* Review Dialog */}
      <Dialog open={selectedDoc !== null} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve" : "Reject"} Document
            </DialogTitle>
            <DialogDescription>
              {selectedDoc?.requirement_name} - {selectedDoc?.board_member_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Notes {reviewAction === "reject" && "(Required for rejection)"}:</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewAction === "approve" ? "Optional notes..." : "Please provide a reason for rejection..."}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDoc(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReviewDocument}
              disabled={reviewAction === "reject" && !reviewNotes}
              className={reviewAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {reviewAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Dialog */}
      <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Broadcast Document Request</DialogTitle>
            <DialogDescription>
              Send document requests to all active board members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Types (Select Multiple)</Label>
              <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                {allRequirements.map((req) => (
                  <div key={req.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={broadcastRequirements.includes(req.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBroadcastRequirements([...broadcastRequirements, req.id]);
                        } else {
                          setBroadcastRequirements(broadcastRequirements.filter(id => id !== req.id));
                        }
                      }}
                    />
                    <label className="text-sm">{req.name}</label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Communication Channel</Label>
              <Select value={broadcastChannel} onValueChange={setBroadcastChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      SMS
                    </div>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {broadcastChannel === "email" && "Emails will be queued and sent in the background"}
                {broadcastChannel === "sms" && "SMS will be sent to mobile numbers on file (SA: +27, Lesotho: +266)"}
                {broadcastChannel === "whatsapp" && "WhatsApp messages will be sent to mobile numbers on file"}
              </p>
            </div>
            <div>
              <Label>Severity Level</Label>
              <Select value={broadcastSeverity} onValueChange={setBroadcastSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Optional message to board members..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBroadcastDialog(false)} disabled={isBroadcasting}>
              Cancel
            </Button>
            <Button onClick={handleBroadcastRequest} disabled={isBroadcasting}>
              {isBroadcasting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Broadcast
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual Document Request Dialog */}
      <Dialog open={showIndividualRequestDialog} onOpenChange={setShowIndividualRequestDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Document Request</DialogTitle>
            <DialogDescription>
              Send document request to {selectedMember?.full_name}
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="rounded-lg border bg-muted/50 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{selectedMember.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Position: {formatPosition(selectedMember.position)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{selectedMember.completion_percentage.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>Select Documents to Request</Label>
              <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                {allRequirements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No document requirements available
                  </p>
                ) : (
                  allRequirements.map((req) => (
                    <div key={req.id} className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded">
                      <input
                        type="checkbox"
                        id={`req-${req.id}`}
                        checked={individualRequirements.includes(req.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setIndividualRequirements([...individualRequirements, req.id]);
                          } else {
                            setIndividualRequirements(individualRequirements.filter(id => id !== req.id));
                          }
                        }}
                        className="mt-1"
                      />
                      <label htmlFor={`req-${req.id}`} className="flex-1 cursor-pointer">
                        <p className="text-sm font-medium">{req.name}</p>
                        {req.description && (
                          <p className="text-xs text-muted-foreground mt-1">{req.description}</p>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {individualRequirements.length} document(s) selected
              </p>
            </div>

            <div>
              <Label>Priority Level</Label>
              <Select value={individualSeverity} onValueChange={setIndividualSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">🔴 Critical - Immediate action required</SelectItem>
                  <SelectItem value="urgent">🟠 Urgent - Required within 48 hours</SelectItem>
                  <SelectItem value="important">🟡 Important - Required within a week</SelectItem>
                  <SelectItem value="normal">🔵 Normal - Standard request</SelectItem>
                  <SelectItem value="info">ℹ️ Info - For your information</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Custom Message (Optional)</Label>
              <Textarea
                value={individualMessage}
                onChange={(e) => setIndividualMessage(e.target.value)}
                placeholder="Add a personalized message or specific instructions..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This message will be included in the email notification
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowIndividualRequestDialog(false);
                setSelectedMember(null);
                setIndividualRequirements([]);
                setIndividualMessage("");
                setIndividualSeverity("normal");
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleIndividualRequest}
              disabled={individualRequirements.length === 0}
              className="w-full sm:w-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Request ({individualRequirements.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
