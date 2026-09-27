import { useState, useEffect } from 'react';
import brain from 'brain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Clock, FileText, Download, Home, ArrowLeft } from 'lucide-react';
import { ProfileDropdown } from 'components/ProfileDropdown';
import { BackOfficeNav } from 'components/BackOfficeNav';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { ResponsiveTable } from 'components/ResponsiveTable';
import { useNavigate } from 'react-router-dom';

interface Document {
  id: number;
  user_id: string;
  full_name: string;
  email: string;
  position: string;
  document_type_name: string;
  file_name: string;
  file_url: string;
  status: string;
  submitted_at: string;
  reviewed_at?: string;
  review_notes?: string;
}

interface MemberReadiness {
  user_id: string;
  full_name: string;
  email: string;
  position: string;
  total_required: number;
  submitted: number;
  approved: number;
  pending_review: number;
  needs_resubmission: number;
  readiness_percentage: number;
  is_ready: boolean;
}

interface ReadinessSummary {
  total_members: number;
  members_ready: number;
  overall_readiness_percentage: number;
  total_documents_required_per_member: number;
}

export default function BackOfficeLicenseDocuments() {
  const navigate = useNavigate();
  const [pendingDocs, setPendingDocs] = useState<Document[]>([]);
  const [readiness, setReadiness] = useState<{ summary: ReadinessSummary; member_readiness: MemberReadiness[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'resubmission_required'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);

  // Document request state
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');
  const [requestDocumentType, setRequestDocumentType] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestDeadline, setRequestDeadline] = useState('');
  const [requestIsUrgent, setRequestIsUrgent] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);

  // Email state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Document types for license application
  const documentTypes = [
    'National ID',
    'Proof of Address',
    'Bank Statement',
    'Tax Clearance Certificate',
    'Police Clearance Certificate',
    'CV/Resume',
    'Qualification Certificates',
    'Reference Letters',
    'Financial Statements',
    'Business Plan',
    'Other'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pendingResponse, readinessResponse, templatesResponse] = await Promise.all([
        brain.get_review_queue(),
        brain.get_readiness_report(),
        brain.list_email_templates().catch(() => ({ json: async () => ({ templates: [] }) }))
      ]);
      
      const pendingData = await pendingResponse.json();
      const readinessData = await readinessResponse.json();
      const templatesData = await templatesResponse.json();
      
      setPendingDocs(pendingData.documents || []);
      setReadiness(readinessData);
      setEmailTemplates(templatesData.templates || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      const errorMsg = error?.message || error?.detail || "Unknown error occurred";
      toast.error(`Failed to load data: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const openRequestDialog = (memberId: string = '') => {
    setSelectedMember(memberId);
    setRequestDocumentType('');
    setRequestReason('');
    setRequestDeadline('');
    setRequestIsUrgent(false);
    setRequestDialogOpen(true);
  };
  
  const handleCreateRequest = async () => {
    if (!selectedMember || !requestDocumentType) {
      toast.error('Please select a member and document type');
      return;
    }
    
    try {
      setCreatingRequest(true);
      const response = await brain.create_document_request({
        board_member_id: selectedMember,
        document_type: requestDocumentType,
        reason: requestReason || undefined,
        deadline: requestDeadline || undefined,
        is_urgent: requestIsUrgent
      });
      
      const result = await response.json();
      
      if (result.id) {
        toast.success('Document request created successfully');
        setRequestDialogOpen(false);
        loadData();
      } else {
        toast.error('Failed to create document request');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to create document request');
    } finally {
      setCreatingRequest(false);
    }
  };
  
  const openEmailDialog = (memberIds: string[] = []) => {
    setEmailRecipients(memberIds);
    setSelectedTemplate(null);
    setEmailDialogOpen(true);
  };
  
  const handleSendEmail = async () => {
    if (!selectedTemplate || emailRecipients.length === 0) {
      toast.error('Please select a template and recipients');
      return;
    }
    
    try {
      setSendingEmail(true);
      const response = await brain.send_email_from_template({
        template_id: selectedTemplate,
        recipient_ids: emailRecipients,
        custom_variables: {}
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Email sent to ${result.sent_count} recipients`);
        setEmailDialogOpen(false);
      } else {
        toast.error('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const openReviewDialog = (doc: Document) => {
    setSelectedDoc(doc);
    setReviewStatus('approved');
    setReviewNotes('');
    setReviewDialogOpen(true);
  };

  const handleReview = async () => {
    if (!selectedDoc) return;
    
    try {
      setReviewing(true);
      const response = await brain.review_document(
        { documentId: selectedDoc.id },
        {
          status: reviewStatus,
          review_notes: reviewNotes || undefined
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Document reviewed successfully');
        setReviewDialogOpen(false);
        loadData();
      } else {
        toast.error('Failed to review document');
      }
    } catch (error) {
      console.error('Error reviewing document:', error);
      toast.error('Failed to review document');
    } finally {
      setReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      approved: { icon: <CheckCircle2 className="h-3 w-3" />, variant: 'default', label: 'Approved' },
      pending: { icon: <Clock className="h-3 w-3" />, variant: 'outline', label: 'Pending' },
      rejected: { icon: <XCircle className="h-3 w-3" />, variant: 'destructive', label: 'Rejected' },
      resubmission_required: { icon: <XCircle className="h-3 w-3" />, variant: 'secondary', label: 'Resubmission Required' }
    };
    
    const { icon, variant, label } = config[status] || config.pending;
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {icon}
        {label}
      </Badge>
    );
  };

  // Define columns for ResponsiveTable
  const columns = [
    {
      key: 'full_name',
      header: 'Member',
      render: (doc: Document) => (
        <div>
          <div className="font-medium">{doc.full_name}</div>
          <div className="text-xs text-muted-foreground">{doc.email}</div>
        </div>
      )
    },
    {
      key: 'position',
      header: 'Position',
      render: (doc: Document) => doc.position || 'N/A'
    },
    {
      key: 'document_type_name',
      header: 'Document Type',
      render: (doc: Document) => doc.document_type_name
    },
    {
      key: 'file_name',
      header: 'File',
      render: (doc: Document) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="truncate max-w-[150px]" title={doc.file_name}>
            {doc.file_name}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (doc: Document) => getStatusBadge(doc.status)
    },
    {
      key: 'submitted_at',
      header: 'Submitted',
      render: (doc: Document) => new Date(doc.submitted_at).toLocaleDateString()
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (doc: Document) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(doc.file_url, '_blank')}
          >
            <Download className="h-4 w-4" />
          </Button>
          {doc.status === 'pending' && (
            <Button
              size="sm"
              onClick={() => openReviewDialog(doc)}
            >
              Review
            </Button>
          )}
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <BackOfficeNav currentPage="License Documents" />
        
        <div className="page-container container mx-auto px-4 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">License Documents</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Review and manage licensing requirements</p>
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
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs sm:text-sm">Total Documents</CardDescription>
                <CardTitle className="text-2xl sm:text-3xl">{pendingDocs.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs sm:text-sm">Pending Review</CardDescription>
                <CardTitle className="text-2xl sm:text-3xl text-orange-600">
                  {pendingDocs.filter(d => d.status === 'pending').length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs sm:text-sm">Approved</CardDescription>
                <CardTitle className="text-2xl sm:text-3xl text-green-600">
                  {pendingDocs.filter(d => d.status === 'approved').length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs sm:text-sm">Rejected</CardDescription>
                <CardTitle className="text-2xl sm:text-3xl text-red-600">
                  {pendingDocs.filter(d => d.status === 'rejected').length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading documents...</p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Document Submissions</CardTitle>
                <CardDescription className="text-sm">Review uploaded licensing documents</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveTable
                  columns={columns}
                  data={pendingDocs}
                  keyExtractor={(doc) => doc.id}
                  emptyMessage="No documents submitted yet"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="page-container container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">License Documents</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Review and manage licensing requirements</p>
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
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Total Documents</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{pendingDocs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Pending Review</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl text-orange-600">
                {pendingDocs.filter(d => d.status === 'pending').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Approved</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl text-green-600">
                {pendingDocs.filter(d => d.status === 'approved').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Rejected</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl text-red-600">
                {pendingDocs.filter(d => d.status === 'rejected').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading documents...</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Document Submissions</CardTitle>
              <CardDescription className="text-sm">Review uploaded licensing documents</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveTable
                columns={columns}
                data={pendingDocs}
                keyExtractor={(doc) => doc.id}
                emptyMessage="No documents submitted yet"
              />
            </CardContent>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
}
