import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import brain from 'brain';
import { useUserGuardContext, auth } from 'app/auth';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { API_URL } from "app";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  TrendingUp, 
  FileText, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Eye,
  Upload,
  Building
} from 'lucide-react';
import type { BoardMemberWithInvestment } from 'types';

export default function BoardMemberDetail() {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('memberId');
  
  const [member, setMember] = useState<BoardMemberWithInvestment | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<any>(null);
  const [documentStatus, setDocumentStatus] = useState<any>(null);

  useEffect(() => {
    if (memberId) {
      loadMemberDetails();
      loadDocumentDetails();
    } else {
      setError('No member ID provided');
      setLoading(false);
    }
  }, [memberId]);

  const loadMemberDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all members and find the specific one
      const response = await brain.get_board_members_with_investment_status();
      const data = await response.json();
      
      const foundMember = data.members?.find(
        (m: BoardMemberWithInvestment) => m.board_member_id.toString() === memberId
      );
      
      if (!foundMember) {
        setError('Board member not found');
        return;
      }
      
      setMember(foundMember);
    } catch (error: any) {
      console.error('Error loading member details:', error);
      const errorMsg = error?.message || error?.detail || 'Failed to load member details';
      setError(errorMsg);
      toast.error('Failed to load member details', { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentDetails = async () => {
    try {
      setDocumentsLoading(true);
      
      // Get document status for all members
      const statusResponse = await brain.get_all_members_status();
      const statusData = await statusResponse.json();
      
      // Find this member's status
      const memberStatus = statusData.members?.find(
        (m: any) => m.board_member_id.toString() === memberId
      );
      
      if (memberStatus) {
        setDocumentStatus(memberStatus);
      }
      
      // Get requirements list
      const reqResponse = await brain.list_board_document_requirements();
      const reqData = await reqResponse.json();
      setChecklist(reqData);
      
    } catch (error: any) {
      console.error('Error loading document details:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getInvestmentStatus = () => {
    if (!member?.investment_status) {
      return {
        badge: <Badge variant="outline">No Investment Data</Badge>,
        details: null
      };
    }

    const { meets_requirement, total_shares, investment_needed } = member.investment_status;

    if (meets_requirement) {
      return {
        badge: (
          <Badge className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Investment Compliant
          </Badge>
        ),
        details: (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Shares:</span>
              <span className="font-medium">{total_shares?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="text-green-600 font-medium">Meets Requirement</span>
            </div>
          </div>
        )
      };
    } else {
      return {
        badge: (
          <Badge variant="destructive" className="bg-orange-600 hover:bg-orange-700">
            <XCircle className="h-3 w-3 mr-1" />
            Needs M{investment_needed?.toLocaleString() || 0}
          </Badge>
        ),
        details: (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Shares:</span>
              <span className="font-medium">{total_shares?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Investment Needed:</span>
              <span className="text-orange-600 font-medium">M{investment_needed?.toLocaleString() || 0}</span>
            </div>
          </div>
        )
      };
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'pending_review':
        return (
          <Badge className="bg-yellow-600 hover:bg-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      case 'rejected':
      case 'resubmission_required':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Upload className="h-3 w-3 mr-1" />
            Not Submitted
          </Badge>
        );
    }
  };

  const investmentStatus = member ? getInvestmentStatus() : null;

  const handleViewDocument = async (doc: any) => {
    try {
      const docId = doc.id || doc.document_id;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-4">Loading member details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-600">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">{error || 'Member not found'}</p>
                <Button onClick={() => navigate('/back-office-board-members')} variant="outline" className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Board Members
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/back-office-board-members')} 
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Board Members
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{member.full_name}</h1>
              <p className="text-muted-foreground mt-1">{member.position_name || 'Board Member'}</p>
            </div>
            {investmentStatus && investmentStatus.badge}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Information */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium break-words">{member.email}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-start gap-2">
                    <Building className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Position</p>
                      <p className="text-sm font-medium">{member.position_name || 'Not Assigned'}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Appointed</p>
                      <p className="text-sm font-medium">{formatDate(member.appointed_at)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Completion */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Completion</CardTitle>
              </CardHeader>
              <CardContent>
                {member.profile_completion_percentage !== null && member.profile_completion_percentage !== undefined ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Overall Progress</span>
                        <span className="text-sm font-bold">{member.profile_completion_percentage}%</span>
                      </div>
                      <Progress value={member.profile_completion_percentage} className="h-3" />
                    </div>
                    
                    {member.profile_completion_percentage < 100 && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="text-sm text-orange-800">
                          <AlertCircle className="h-4 w-4 inline mr-1" />
                          Profile is incomplete. Member should update their information.
                        </p>
                      </div>
                    )}
                    
                    {member.profile_completion_percentage === 100 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          <CheckCircle className="h-4 w-4 inline mr-1" />
                          Profile is complete!
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No profile data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Investment Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Investment Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {investmentStatus?.details || (
                  <div className="text-center text-muted-foreground py-4">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No investment data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Document Compliance */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Document Requirements
                    </CardTitle>
                    <CardDescription>Track required documents and submission status</CardDescription>
                  </div>
                  {member.document_compliance && (
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {member.document_compliance.approved}/{member.document_compliance.total_required}
                      </p>
                      <p className="text-xs text-muted-foreground">Documents Approved</p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-sm text-muted-foreground mt-2">Loading documents...</p>
                  </div>
                ) : documentStatus ? (
                  <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Total Required</p>
                        <p className="text-2xl font-bold">{documentStatus.total_required || 0}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-green-700">Approved</p>
                        <p className="text-2xl font-bold text-green-600">{documentStatus.approved || 0}</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3">
                        <p className="text-xs text-yellow-700">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">{documentStatus.pending_review || 0}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <p className="text-xs text-red-700">Missing</p>
                        <p className="text-2xl font-bold text-red-600">{documentStatus.missing || 0}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Document List */}
                    <div>
                      <h3 className="font-semibold mb-3">Document Checklist</h3>
                      {documentStatus.documents && documentStatus.documents.length > 0 ? (
                        <div className="space-y-2">
                          {documentStatus.documents.map((doc: any, index: number) => (
                            <div 
                              key={index}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm">{doc.requirement_name}</p>
                                {doc.file_name && (
                                  <p className="text-xs text-muted-foreground mt-1">File: {doc.file_name}</p>
                                )}
                                {doc.submitted_at && (
                                  <p className="text-xs text-muted-foreground">Submitted: {formatDate(doc.submitted_at)}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {getDocumentStatusBadge(doc.status)}
                                {doc.file_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDocument(doc)}
                                    disabled={viewingId === (doc.id || doc.document_id)}
                                  >
                                    {viewingId === (doc.id || doc.document_id) ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No document requirements found</p>
                        </div>
                      )}
                    </div>

                    {/* Compliance Progress */}
                    {member.document_compliance && (
                      <div className="mt-6">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Document Compliance</span>
                          <span className="text-sm font-bold">
                            {member.document_compliance.compliance_percentage?.toFixed(0) || 0}%
                          </span>
                        </div>
                        <Progress 
                          value={member.document_compliance.compliance_percentage || 0} 
                          className="h-3" 
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No document status available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
