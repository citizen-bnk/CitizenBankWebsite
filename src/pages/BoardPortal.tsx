import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from 'app';
import { useUserGuardContext } from 'app/auth';
import { useUserRoles } from 'utils/useUserRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { FileText, TrendingUp, User, Shield, Calendar, AlertCircle, UserPlus, Home, Loader2, CheckCircle, XCircle, Users, Clock, FolderLock, Mail, ListTodo, MapPin, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useCurrency } from "components/CurrencyProvider";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { TypeformDocumentUploadModal } from 'components/TypeformDocumentUploadModal';
import { showErrorToast, showSuccessToast } from 'utils/errorHandling';
import type { DocumentStatusSummary } from 'types';
import { cn } from "utils/cn";

interface BoardProfile {
  position: string;
  appointed_date: string;
  term_end_date: string;
  status: string;
  total_shares: number;
  investment_status?: {
    required_shares: number;
    meets_requirement: boolean;
    shares_needed: number;
    investment_needed: number;
  };
}

function BoardPortalContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserGuardContext();
  const { roles, loading: rolesLoading } = useUserRoles();
  const [profile, setProfile] = useState<BoardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useCurrency();
  
  // License compliance dialog state
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  
  // Document upload modal state
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [documentUploadChecked, setDocumentUploadChecked] = useState(false);
  
  // Board Chair approval state
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [isChair, setIsChair] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState<{open: boolean, member: any, approved: boolean}>({open: false, member: null, approved: false});
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);

  // Invite member state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    full_name: '',
    email: '',
    position: '',
    message: '',
    expires_at: '',
  });
  
  // Document summary state
  const [documentSummary, setDocumentSummary] = useState<DocumentStatusSummary | null>(null);

  // Next Meeting State
  const [nextMeeting, setNextMeeting] = useState<any>(null);

  // Check board_member role
  const hasBoardAccess = roles.includes('board_member');

  useEffect(() => {
    if (!rolesLoading && hasBoardAccess) {
      loadDashboard();
    }
  }, [rolesLoading, hasBoardAccess]);
  
  // Reload dashboard when returning from profile page
  useEffect(() => {
    if (location.state?.refreshDashboard) {
      console.log('Refreshing dashboard after profile update');
      loadDashboard();
      // Clear the state to prevent repeated refreshes
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Combined dashboard loader - single API call
  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      const response = await apiClient.get_board_dashboard();
      const data = await response.json();
      
      // Set all data from single response
      if (data.profile) {
        setProfile(data.profile);
      }
      
      if (data.is_chair && data.pending_approvals) {
        setIsChair(true);
        setPendingApprovals(data.pending_approvals);
      } else {
        setIsChair(false);
      }
      
      // Store document summary
      if (data.document_summary) {
        setDocumentSummary(data.document_summary);
      }
      
      // Store next meeting
      if (data.next_meeting) {
        setNextMeeting(data.next_meeting);
      }
      
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      showErrorToast(error, 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Check if documents need to be uploaded after profile is complete
  useEffect(() => {
    const checkDocumentUpload = async () => {
      // Only check once when we haven't checked yet
      if (!documentUploadChecked && !loading) {
        setDocumentUploadChecked(true);
        
        try {
          // Check if there are documents that need action
          const res = await apiClient.get_checklist({});
          const data = await res.json();
          
          const needsAction = data.documents?.filter((doc: any) => {
            return !doc.submission || 
                   doc.submission.status === 'rejected' || 
                   doc.submission.status === 'resubmission_required';
          }) || [];
          
          // If there are documents that need action, show the modal
          if (needsAction.length > 0) {
            setShowDocumentUpload(true);
          }
        } catch (error) {
          console.error('Failed to check document status:', error);
          // Don't show error - this is a nice-to-have feature
        }
      }
    };
    
    checkDocumentUpload();
  }, [loading, documentUploadChecked]);

  const handleDocumentUploadComplete = async () => {
    setShowDocumentUpload(false);
    showSuccessToast('Documents updated successfully!');
    // Reload dashboard to reflect document completion
    await loadDashboard();
  };

  const handleApprovalAction = (member: any, approved: boolean) => {
    setApprovalDialog({ open: true, member, approved });
    setApprovalNotes('');
  };

  const confirmApproval = async () => {
    if (!approvalDialog.member) return;

    try {
      setProcessingApproval(true);
      const response = await apiClient.approve_board_member({
        boardMemberId: approvalDialog.member.id,
        approved: approvalDialog.approved,
        notes: approvalNotes || undefined,
      });

      if (response.ok) {
        toast.success(
          approvalDialog.approved 
            ? `${approvalDialog.member.full_name} approved as board member`
            : `${approvalDialog.member.full_name} membership rejected`
        );
        
        // Reload the dashboard
        await loadDashboard();
        setApprovalDialog({ open: false, member: null, approved: false });
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to process approval');
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleSendInvite = async () => {
    // Validate form
    if (!inviteForm.full_name || !inviteForm.email || !inviteForm.position) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSending(true);
      const response = await apiClient.create_invitation_endpoint({
        full_name: inviteForm.full_name,
        email: inviteForm.email,
        role: 'board_member',
        position: inviteForm.position,
        message: inviteForm.message || '',
        expires_at: inviteForm.expires_at || undefined,
      });

      if (response.ok) {
        toast.success('Invitation sent successfully');
        setShowInviteDialog(false);
        // Reset form
        setInviteForm({
          full_name: '',
          email: '',
          position: '',
          message: '',
          expires_at: '',
        });
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to send invitation' }));
        toast.error(errorData.detail || 'Failed to send invitation');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return <Badge variant="outline">N/A</Badge>;
    }
    if (status === 'active') {
      return <Badge variant="default" className="bg-green-600">ACTIVE</Badge>;
    }
    return <Badge variant="secondary">{status.toUpperCase()}</Badge>;
  };

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="page-container container mx-auto px-4 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 lg:pt-24">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Board Portal</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Manage board activities and governance</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline"
                  className="text-xs sm:text-sm"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#6d52a2]" />
          </div>
        </div>
      </div>
    );
  }

  // Calculate days until term end
  const daysUntilTermEnd = profile?.term_end_date 
    ? Math.ceil(
        (new Date(profile.term_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const isMeetingToday = nextMeeting && new Date(nextMeeting.meeting_date).toDateString() === new Date().toDateString();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Document Upload Modal */}
      <TypeformDocumentUploadModal
        open={showDocumentUpload}
        onClose={() => setShowDocumentUpload(false)}
        onComplete={handleDocumentUploadComplete}
      />
      
      <div className="page-container container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 lg:pt-24">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Board Portal</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage board activities and governance</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => navigate('/')} 
                variant="outline"
                className="text-xs sm:text-sm"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              <Button
                onClick={() => setShowLicenseDialog(true)}
                variant={documentSummary && documentSummary.needs_action > 0 ? "default" : "outline"}
                className="text-xs sm:text-sm"
              >
                <Shield className="h-4 w-4 mr-2" />
                Banking License
                {documentSummary && documentSummary.needs_action > 0 && (
                  <Badge className="ml-2 bg-orange-500" variant="secondary">
                    {documentSummary.needs_action}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Banking License Compliance Dialog */}
        <Dialog open={showLicenseDialog} onOpenChange={setShowLicenseDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#6d52a2]" />
                Banking License Compliance
              </DialogTitle>
              <DialogDescription>
                Track your required board member documents for banking license compliance
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {documentSummary ? (
                <div className="space-y-6">
                  {/* Compliance Status Overview */}
                  <div className="bg-gradient-to-br from-[#6d52a2]/10 to-[#4a3470]/10 border border-[#6d52a2]/20 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Overall Compliance Status</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Your document submission progress</p>
                      </div>
                      <Badge 
                        variant={documentSummary.completion_percentage === 100 ? "default" : documentSummary.completion_percentage >= 75 ? "secondary" : "destructive"}
                        className={documentSummary.completion_percentage === 100 ? "bg-green-600 text-lg px-4 py-2" : "text-lg px-4 py-2"}
                      >
                        {documentSummary.completion_percentage}%
                      </Badge>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">Progress</span>
                        <span className="font-medium">{documentSummary.approved} of {documentSummary.total_required} approved</span>
                      </div>
                      <Progress value={documentSummary.completion_percentage} className="h-3" />
                    </div>
                  </div>

                  {/* Document Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{documentSummary.total_required}</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Required</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-green-900 dark:text-green-100">{documentSummary.approved}</p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">Approved</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{documentSummary.pending_review}</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">Under Review</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                      <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-red-900 dark:text-red-100">{documentSummary.needs_action}</p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">Needs Action</p>
                    </div>
                  </div>

                  {/* Critical Missing Documents */}
                  {documentSummary.critical_missing && documentSummary.critical_missing.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-950/50 border-2 border-red-300 dark:border-red-700 rounded-lg p-5">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900 dark:text-red-100 mb-3 text-lg">Critical Documents Missing</h4>
                          <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                            These documents are required for banking license compliance and must be submitted urgently.
                          </p>
                          <ul className="space-y-2">
                            {documentSummary.critical_missing.map((docName, idx) => (
                              <li key={idx} className="text-sm text-red-900 dark:text-red-100 flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded">
                                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                <span className="font-medium">{docName}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expiring Soon */}
                  {documentSummary.expiring_soon && documentSummary.expiring_soon.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-5">
                      <div className="flex items-start gap-3">
                        <Clock className="h-6 w-6 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-3 text-lg">Documents Expiring Soon</h4>
                          <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                            Please renew these documents before they expire to maintain compliance.
                          </p>
                          <div className="space-y-2">
                            {documentSummary.expiring_soon.map((doc, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded border border-amber-200 dark:border-amber-800">
                                <span className="text-sm font-medium text-amber-900 dark:text-amber-100">{doc.document_name}</span>
                                <Badge 
                                  variant={doc.severity === 'critical' ? 'destructive' : 'secondary'}
                                  className={doc.severity === 'urgent' ? 'bg-orange-600' : ''}
                                >
                                  {doc.days_until_expiry <= 0 
                                    ? 'EXPIRED' 
                                    : doc.days_until_expiry === 1
                                    ? '1 day left'
                                    : `${doc.days_until_expiry} days left`
                                  }
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* All Clear Message */}
                  {documentSummary.completion_percentage === 100 && (!documentSummary.expiring_soon || documentSummary.expiring_soon.length === 0) && (
                    <div className="bg-green-50 dark:bg-green-950/50 border-2 border-green-300 dark:border-green-700 rounded-lg p-5">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 text-lg">✅ Fully Compliant</h4>
                          <p className="text-sm text-green-800 dark:text-green-200">
                            Congratulations! You have submitted all required documents for banking license compliance. All documents are approved and up to date.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <Button 
                      onClick={() => {
                        setShowLicenseDialog(false);
                        navigate('/board-documents');
                      }}
                      className="flex-1 bg-[#6d52a2] hover:bg-[#5a4387]"
                      size="lg"
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      {documentSummary.needs_action > 0 
                        ? `Upload ${documentSummary.needs_action} Document${documentSummary.needs_action > 1 ? 's' : ''}` 
                        : 'View All Documents'}
                    </Button>
                    <Button 
                      onClick={() => setShowLicenseDialog(false)}
                      variant="outline"
                      size="lg"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#6d52a2] mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading compliance status...</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Next Meeting Card - Prominent if exists */}
        {nextMeeting && (
          <Card className={cn("mb-6 border-l-4 shadow-md", isMeetingToday ? "border-l-green-600 bg-green-50/50 dark:bg-green-950/20" : "border-l-blue-600")}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Calendar className={cn("h-5 w-5", isMeetingToday ? "text-green-600" : "text-blue-600")} />
                    {isMeetingToday ? "Board Meeting Today" : "Upcoming Board Meeting"}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {isMeetingToday ? "Please ensure you have reviewed all materials before the meeting starts." : "Mark your calendar and review materials."}
                  </CardDescription>
                </div>
                {isMeetingToday && (
                  <Badge className="bg-green-600 animate-pulse">HAPPENING TODAY</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-center bg-white dark:bg-gray-800 p-4 rounded-lg border">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{nextMeeting.title}</h3>
                  <div className="flex flex-wrap gap-y-2 gap-x-6 mt-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {new Date(nextMeeting.meeting_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <span>at {nextMeeting.meeting_time.substring(0, 5)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{nextMeeting.location || "Virtual Meeting"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">{nextMeeting.meeting_type}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Button 
                    onClick={() => navigate(`/board-meetings`)}
                    className="flex-1 sm:flex-none"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Agenda & Materials
                  </Button>
                  {nextMeeting.virtual_link && (
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(nextMeeting.virtual_link, '_blank')}
                      className="flex-1 sm:flex-none"
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Join Meeting
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consolidated Profile Overview Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">Your Board Profile</CardTitle>
                <CardDescription className="text-sm">Position, status, and shareholdings</CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate('/profile')}
                className="text-xs sm:text-sm w-full sm:w-auto"
              >
                <User className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Profile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Position</p>
                </div>
                <p className="font-semibold text-base sm:text-lg capitalize">{profile?.position?.replace('_', ' ') || 'Not Set'}</p>
                <div className="mt-2">{getStatusBadge(profile?.status || null)}</div>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Shares</p>
                </div>
                <p className="font-semibold text-base sm:text-lg">{profile?.total_shares?.toLocaleString() || 0}</p>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency((profile?.total_shares || 0) * 10, 'LSL')}</p>
              </div>
              
              <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Term Status</p>
                </div>
                <p className="font-semibold text-base sm:text-lg">
                  {daysUntilTermEnd !== null ? `${daysUntilTermEnd} days` : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {profile?.term_end_date ? `Until ${new Date(profile.term_end_date).toLocaleDateString()}` : 'No end date'}
                </p>
              </div>
              
              <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-amber-600" />
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Appointed</p>
                </div>
                <p className="font-semibold text-xs sm:text-sm">
                  {profile?.appointed_date ? new Date(profile.appointed_date).toLocaleDateString('en-ZA', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 'Not set'}
                </p>
              </div>
            </div>
            
            {/* Class C Access Badge */}
            {profile?.status === 'active' && (
              <div className="border-l-4 border-blue-600 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      🎉 Class C Internal Shares Available
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      As an active board member, you can invest in Class C shares reserved exclusively for board members and employees.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/board-investment')}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    Invest Now
                  </Button>
                </div>
              </div>
            )}
            
            {/* Investment Requirement Section */}
            {profile?.investment_status && profile.investment_status.required_shares > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Investment Requirement
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Required Investment</p>
                    <p className="font-semibold text-base mt-1">
                      {profile.investment_status.required_shares.toLocaleString()} shares
                    </p>
                    <p className="text-xs text-gray-500">{formatCurrency(profile.investment_status.required_shares * 10, 'LSL')}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Compliance Status</p>
                    <div className="mt-1">
                      {profile.investment_status.meets_requirement ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Compliant
                        </Badge>
                      ) : (
                        <div className="space-y-2">
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Short {profile.investment_status.shares_needed} shares
                          </Badge>
                          <p className="text-xs text-gray-600">
                            Additional investment needed: {formatCurrency(profile.investment_status.investment_needed, 'LSL')}
                          </p>
                          <Button 
                            size="sm" 
                            onClick={() => navigate('/board-investment')}
                            className="mt-2"
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Complete Investment
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Invite Member Card */}
          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <UserPlus className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Invite Board Member</CardTitle>
                  <CardDescription>Send invitation to join the board</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Invite Board Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join Citizen Bank's board
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={inviteForm.full_name}
                        onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Position *</Label>
                      <Select
                        value={inviteForm.position}
                        onValueChange={(value) => setInviteForm({ ...inviteForm, position: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chairman">Chairman</SelectItem>
                          <SelectItem value="vice_chairman">Vice Chairman</SelectItem>
                          <SelectItem value="secretary">Secretary</SelectItem>
                          <SelectItem value="treasurer">Treasurer</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="message">Message (Optional)</Label>
                      <Textarea
                        id="message"
                        value={inviteForm.message}
                        onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                        placeholder="Add a personal message..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expires_at">Expiry Date (Optional)</Label>
                      <Input
                        id="expires_at"
                        type="date"
                        value={inviteForm.expires_at}
                        onChange={(e) => setInviteForm({ ...inviteForm, expires_at: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSendInvite}
                        disabled={sending}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        {sending ? 'Sending...' : 'Send Invitation'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowInviteDialog(false)}
                        disabled={sending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* My Invitations Card */}
          <Card className="cursor-pointer hover:bg-accent transition-colors border-green-200 dark:border-green-800" onClick={() => navigate('/board-portal-invitations')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>My Invitations</CardTitle>
                  <CardDescription>View invitations you've sent</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">View Invitations →</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate('/complete-profile?edit=true')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>My Profile</CardTitle>
                  <CardDescription>View your board member details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">View Profile →</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate('/board-documents')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Submit Documents</CardTitle>
                  <CardDescription>Upload required license documents</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">Upload Documents →</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate('/board-investment')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Invest in Shares</CardTitle>
                  <CardDescription>Purchase Class A, B, or C shares</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {profile.status === 'active' ? (
                <div className="space-y-2">
                  <Badge variant="default" className="bg-blue-600">
                    <Shield className="h-3 w-3 mr-1" />
                    Class C Available
                  </Badge>
                  <Button variant="ghost" className="w-full">View Options →</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Only active members can invest</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent transition-colors border-indigo-200 dark:border-indigo-800" onClick={() => navigate('/governance')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                  <ListTodo className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <CardTitle>Governance & Voting</CardTitle>
                  <CardDescription>Participate in board decisions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">View Proposals →</Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function BoardPortal() {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <BoardPortalContent />
  );
}
