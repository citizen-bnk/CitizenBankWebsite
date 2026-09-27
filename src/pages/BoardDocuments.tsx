import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, CheckCircle, XCircle, Clock, AlertCircle, FileText, AlertTriangle, ArrowLeft, Info, Download, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUserGuardContext, auth } from "app/auth";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { apiClient } from "app";
import type { ChecklistResponse, MyStatusResponse, BoardMemberDocumentStatus } from "types";
import { toast } from 'sonner';
import { API_URL } from "app";

const BoardDocuments = () => {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<ChecklistResponse | null>(null);
  const [status, setStatus] = useState<MyStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [checklistRes, statusRes] = await Promise.all([
        apiClient.get_checklist({}),
        apiClient.get_my_status()
      ]);

      const checklistData: ChecklistResponse = await checklistRes.json();
      const statusData: MyStatusResponse = await statusRes.json();

      setChecklist(checklistData);
      setStatus(statusData);
    } catch (err: any) {
      console.error('Failed to load board documents:', err);
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (requirementId: number, file: File) => {
    try {
      setUploadingId(requirementId);
      
      const response = await apiClient.upload_document({ requirement_id: requirementId }, { file });
      
      if (response.ok) {
        toast.success("Document Uploaded Successfully", {
          description: "Your document has been submitted and is now under review by our compliance team."
        });
        await loadData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error("Upload Failed", {
        description: err.message || 'Failed to upload document. Please try again.'
      });
    } finally {
      setUploadingId(null);
    }
  };

  const handleTemplateDownload = async (requirementId: number, requirementName: string) => {
    const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const extractFilename = (contentDisposition: string | null) => {
      if (!contentDisposition) return null;
      const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utfMatch) {
        try {
          return decodeURIComponent(utfMatch[1]);
        } catch (err) {
          console.warn('⚠️ Failed to decode UTF-8 filename:', err);
        }
      }
      const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
      return asciiMatch ? asciiMatch[1] : null;
    };
    const extensionFromContentType = (contentType: string | null) => {
      if (!contentType) return null;
      const map: Record<string, string> = {
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp'
      };
      return map[contentType.toLowerCase()] || null;
    };
    
    try {
      toast.info("Downloading Template", {
        description: `Preparing ${requirementName} template...`
      });
      
      const token = await auth.getAuthToken();
      const response = await fetch(`${API_URL}/board-documents/requirements/${requirementId}/download-template`, {
         headers: {
            'Authorization': `Bearer ${token}`
         }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to download template';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }
      
      const contentDisposition = response.headers.get('Content-Disposition');
      const contentType = response.headers.get('Content-Type');
      let filename = extractFilename(contentDisposition);
      
      if (filename) {
        filename = sanitizeFilename(filename);
      } else {
        const fallbackBase = sanitizeFilename(`${requirementName}_template`);
        const inferredExt = extensionFromContentType(contentType);
        filename = inferredExt ? `${fallbackBase}.${inferredExt}` : fallbackBase;
        console.warn('⚠️ Falling back to inferred filename:', filename);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Template Downloaded", {
        description: "Please complete the template and upload it back."
      });
    } catch (err: any) {
      console.error('Template download error:', err);
      toast.error("Download Failed", {
        description: err.message || 'Failed to download template. Please try again.'
      });
    }
  };

  const handleViewDocument = async (documentId: number, fileName: string) => {
    try {
      setViewingId(documentId);
      // Removed the toast as the button spinner is better feedback
      // toast.info("Opening Document", {
      //   description: `Retrieving ${fileName}...`
      // });

      const token = await auth.getAuthToken();
      const response = await fetch(`${API_URL}/board-documents/documents/${documentId}/download`, {
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

  const getStatusBadge = (item: BoardMemberDocumentStatus) => {
    if (!item.submission) {
      return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Not Submitted</Badge>;
    }

    switch (item.submission.status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><Clock className="h-3 w-3 mr-1" />Under Review</Badge>;
      case 'submitted':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'resubmission_required':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100"><AlertCircle className="h-3 w-3 mr-1" />Resubmit Required</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getSeverityBadge = (severity: string | null | undefined) => {
    if (!severity) return null;
    
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-600 text-white hover:bg-red-700"><AlertTriangle className="h-3 w-3 mr-1" />CRITICAL</Badge>;
      case 'urgent':
        return <Badge className="bg-orange-600 text-white hover:bg-orange-700"><AlertTriangle className="h-3 w-3 mr-1" />URGENT</Badge>;
      case 'important':
        return <Badge className="bg-amber-600 text-white hover:bg-amber-700">IMPORTANT</Badge>;
      case 'normal':
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700">NORMAL</Badge>;
      default:
        return null;
    }
  };

  const getSeverityPriority = (severity: string | null | undefined): number => {
    switch (severity) {
      case 'critical': return 1;
      case 'urgent': return 2;
      case 'important': return 3;
      case 'normal': return 4;
      default: return 5;
    }
  };

  const needsAction = (item: BoardMemberDocumentStatus): boolean => {
    return !item.submission || 
           item.submission.status === 'rejected' || 
           item.submission.status === 'resubmission_required' ||
           (item.days_until_expiry !== null && item.days_until_expiry !== undefined && item.days_until_expiry <= 30);
  };

  const getExpiryWarning = (item: BoardMemberDocumentStatus) => {
    if (!item.days_until_expiry) return null;
    
    if (item.days_until_expiry <= 0) {
      return <span className="text-red-600 text-sm font-medium">Expired</span>;
    } else if (item.days_until_expiry <= 30) {
      return <span className="text-orange-600 text-sm font-medium">Expires in {item.days_until_expiry} days</span>;
    } else if (item.days_until_expiry <= 90) {
      return <span className="text-yellow-700 text-sm">Expires in {item.days_until_expiry} days</span>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-grow flex items-center justify-center p-6">
          <Card className="max-w-lg w-full shadow-lg">
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                  <FileText className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Error Loading Documents
                </h2>
                <p className="text-gray-600 mb-6">
                  {error}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="default" onClick={loadData}>
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/board-portal')}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Back to Portal
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/'}>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="relative flex-grow container mx-auto px-4 max-w-7xl pt-24 md:pt-28 pb-24">
        {/* Page Header */}
        <section id="page-header" aria-labelledby="board-documents-title" className="mb-8 scroll-mt-28">
          <div className="flex items-start justify-between">
            <div>
              <h1 id="board-documents-title" className="text-3xl md:text-4xl font-bold mb-2 text-gray-900">
                Board Member Document Portal
              </h1>
              <p className="text-gray-600 text-lg">
                Submit and manage your regulatory compliance documents
              </p>
            </div>
          </div>
        </section>

        {/* Progress Summary */}
        {status && (
          <section id="progress-summary" aria-labelledby="progress-summary-title" className="scroll-mt-28">
            <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle id="progress-summary-title" className="text-xl text-gray-900">Your Document Completion Status</CardTitle>
                <CardDescription>Track your progress in submitting and getting approved all required board member documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-gray-900 mb-2">
                      <span className="font-medium">Approval Progress</span>
                      <span className="font-bold text-lg">{status.summary.completion_percentage}%</span>
                    </div>
                    <Progress value={status.summary.completion_percentage} className="h-3" />
                    <p className="text-sm text-gray-600 mt-2">
                      {status.summary.approved} of {status.summary.total_required} documents approved
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                    <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-blue-200">
                      <div className="text-3xl font-bold text-blue-600">{status.summary.total_required}</div>
                      <div className="text-xs text-gray-600 mt-1 font-medium">Total Required</div>
                      <div className="text-xs text-gray-500 mt-1">Documents needed</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-indigo-200">
                      <div className="text-3xl font-bold text-indigo-600">{status.summary.submitted || 0}</div>
                      <div className="text-xs text-gray-600 mt-1 font-medium">Submitted</div>
                      <div className="text-xs text-gray-500 mt-1">Documents uploaded</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-gray-200">
                      <div className="text-3xl font-bold text-gray-600">{status.summary.total_remaining || 0}</div>
                      <div className="text-xs text-gray-600 mt-1 font-medium">Remaining</div>
                      <div className="text-xs text-gray-500 mt-1">Not yet uploaded</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-green-200">
                      <div className="text-3xl font-bold text-green-600">{status.summary.approved}</div>
                      <div className="text-xs text-gray-600 mt-1 font-medium">Approved</div>
                      <div className="text-xs text-gray-500 mt-1">Verified & accepted</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-yellow-200">
                      <div className="text-3xl font-bold text-yellow-600">{status.summary.pending_review}</div>
                      <div className="text-xs text-gray-600 mt-1 font-medium">Under Review</div>
                      <div className="text-xs text-gray-500 mt-1">Being processed</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-red-200">
                      <div className="text-3xl font-bold text-red-600">{status.summary.rejected}</div>
                      <div className="text-xs text-gray-600 mt-1 font-medium">Needs Action</div>
                      <div className="text-xs text-gray-500 mt-1">Requires resubmit</div>
                    </div>
                  </div>
                  
                  {/* Missing Critical Documents Alert */}
                  {status.missing_requirements && status.missing_requirements.length > 0 && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertTitle className="text-red-900">Critical Documents Required</AlertTitle>
                      <AlertDescription className="text-red-800">
                        You have {status.missing_requirements.length} critical/urgent document{status.missing_requirements.length > 1 ? 's' : ''} that need{status.missing_requirements.length === 1 ? 's' : ''} immediate attention. Please scroll down to upload them.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Documents</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!loading && !error && checklist && (
          <>
            {/* Priority Section - Critical and Urgent Items */}
            {checklist.items.filter(item => 
              needsAction(item) && 
              (item.requirement.severity === 'critical' || item.requirement.severity === 'urgent')
            ).length > 0 && (
              <section id="priority-items" aria-labelledby="priority-items-title" className="scroll-mt-28">
                <Card className="mb-8 border-2 border-red-500 bg-red-50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                      <CardTitle id="priority-items-title" className="text-2xl text-red-900">⚠️ Immediate Action Required</CardTitle>
                    </div>
                    <CardDescription className="text-red-800">
                      The following documents require your immediate attention to maintain compliance.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {checklist.items
                        .filter(item => 
                          needsAction(item) && 
                          (item.requirement.severity === 'critical' || item.requirement.severity === 'urgent')
                        )
                        .sort((a, b) => 
                          getSeverityPriority(a.requirement.severity) - getSeverityPriority(b.requirement.severity)
                        )
                        .map((item) => (
                          <div key={item.requirement.id} className="bg-white p-4 rounded-lg border-2 border-red-200 shadow-sm">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <h3 className="text-gray-900 font-semibold text-lg">{item.requirement.name}</h3>
                                  {getSeverityBadge(item.requirement.severity)}
                                  {item.is_required && <span className="text-red-600 text-sm font-medium">* Required</span>}
                                </div>
                                <p className="text-gray-700 text-sm mb-3">{item.requirement.description || 'This document is required for regulatory compliance and board member verification.'}</p>
                                {item.requirement.requires_certification && (
                                  <Alert className="mb-3 bg-amber-50 border-amber-500">
                                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                                    <AlertDescription className="text-sm text-amber-900">
                                      <strong>⚠️ Certification Required:</strong> This document must be a certified copy. Please have it certified by an authorized official (e.g., notary, commissioner of oaths, or authorized government officer) before uploading.
                                    </AlertDescription>
                                  </Alert>
                                )}
                                {item.requirement.validity_period_days && (
                                  <p className="text-gray-600 text-xs mb-2">
                                    <Clock className="h-3 w-3 inline mr-1" />
                                    Valid for {item.requirement.validity_period_days} days after approval
                                  </p>
                                )}
                                <div className="flex gap-2 flex-wrap items-center">
                                  {getStatusBadge(item)}
                                  {getExpiryWarning(item)}
                                </div>
                                {item.submission?.rejection_reason && (
                                  <Alert className="mt-3 bg-red-50 border-red-200">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    <AlertTitle className="text-sm font-semibold text-red-900">Rejection Reason</AlertTitle>
                                    <AlertDescription className="text-sm text-red-800">
                                      {item.submission.rejection_reason}
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                              <div className="flex-shrink-0 flex flex-col gap-2">
                                {item.submission?.file_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDocument(item.submission!.id!, item.submission!.file_name || 'document')}
                                    disabled={viewingId === item.submission!.id!}
                                    className="border-green-600 text-green-600 hover:bg-green-50"
                                  >
                                    {viewingId === item.submission!.id! ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <Eye className="h-4 w-4 mr-2" />
                                    )}
                                    View
                                  </Button>
                                )}
                                {item.requirement.requires_template && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTemplateDownload(item.requirement.id, item.requirement.name)}
                                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Get Template
                                  </Button>
                                )}
                                {uploadingId === item.requirement.id ? (
                                  <Button disabled className="border-gray-400">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Uploading...
                                  </Button>
                                ) : (
                                  <>
                                    <input
                                      type="file"
                                      id={`priority-file-${item.requirement.id}`}
                                      className="hidden"
                                      accept={item.requirement.file_formats_accepted.map(f => `.${f}`).join(',')}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleFileUpload(item.requirement.id, file);
                                          e.target.value = '';
                                        }
                                      }}
                                    />
                                    <Button
                                      onClick={() => document.getElementById(`priority-file-${item.requirement.id}`)?.click()}
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                      {item.submission?.status === 'rejected' || item.submission?.status === 'resubmission_required' ? (
                                        <><Upload className="h-4 w-4 mr-2" />Resubmit Now</>
                                      ) : (
                                        <><Upload className="h-4 w-4 mr-2" />Upload Now</>
                                      )}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Main Document Checklist */}
            <section id="document-checklist" aria-labelledby="document-checklist-title" className="scroll-mt-28">
              <Card>
                <CardHeader>
                  <CardTitle id="document-checklist-title" className="text-2xl text-gray-900">
                    Complete Document Checklist ({checklist.jurisdiction})
                  </CardTitle>
                  <CardDescription>
                    All required documents for your jurisdiction. Click upload to submit each document.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Desktop Table View (hidden on mobile and tablet) */}
                  <div className="hidden lg:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="text-gray-900 font-semibold">Document Name</TableHead>
                          <TableHead className="text-gray-900 font-semibold">Description</TableHead>
                          <TableHead className="text-gray-900 font-semibold">Priority</TableHead>
                          <TableHead className="text-gray-900 font-semibold">Status</TableHead>
                          <TableHead className="text-gray-900 font-semibold">Expiry</TableHead>
                          <TableHead className="text-right text-gray-900 font-semibold">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {checklist.items
                          .sort((a, b) => getSeverityPriority(a.requirement.severity) - getSeverityPriority(b.requirement.severity))
                          .map((item) => (
                            <TableRow 
                              key={item.requirement.id} 
                              className={needsAction(item) ? "bg-yellow-50 hover:bg-yellow-100" : "hover:bg-gray-50"}
                            >
                              <TableCell className="text-gray-900 font-medium">
                                {item.requirement.name}
                                {item.is_required && <span className="text-red-600 ml-1">*</span>}
                              </TableCell>
                              <TableCell className="text-gray-700 text-sm max-w-md">
                                <div>
                                  <p>{item.requirement.description || 'Required for regulatory compliance and board member verification.'}</p>
                                  {item.requirement.requires_certification && (
                                    <Alert className="mt-2 bg-amber-50 border-amber-500">
                                      <AlertTriangle className="h-4 w-4 text-amber-700" />
                                      <AlertDescription className="text-xs text-amber-900">
                                        <strong>Certification Required:</strong> Must be certified by authorized official
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                  {item.requirement.validity_period_days && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      <Clock className="h-3 w-3 inline mr-1" />
                                      Valid for {item.requirement.validity_period_days} days
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getSeverityBadge(item.requirement.severity)}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {getStatusBadge(item)}
                                  {item.submission?.rejection_reason && (
                                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-1">
                                      <strong>Reason:</strong> {item.submission.rejection_reason}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-700 text-sm">
                                {getExpiryWarning(item)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-col gap-2 items-end">
                                  {item.submission?.file_url && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewDocument(item.submission!.id!, item.submission!.file_name || 'document')}
                                      disabled={viewingId === item.submission!.id!}
                                      className="border-green-600 text-green-600 hover:bg-green-50"
                                    >
                                      {viewingId === item.submission!.id! ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      ) : (
                                        <Eye className="h-4 w-4 mr-2" />
                                      )}
                                      View
                                    </Button>
                                  )}
                                  {item.requirement.requires_template && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTemplateDownload(item.requirement.id, item.requirement.name)}
                                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Template
                                    </Button>
                                  )}
                                  {uploadingId === item.requirement.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin inline text-blue-600" />
                                  ) : (
                                    <>
                                      <input
                                        type="file"
                                        id={`file-${item.requirement.id}`}
                                        className="hidden"
                                        accept={item.requirement.file_formats_accepted.map(f => `.${f}`).join(',')}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleFileUpload(item.requirement.id, file);
                                            e.target.value = '';
                                          }
                                        }}
                                      />
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => document.getElementById(`file-${item.requirement.id}`)?.click()}
                                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                      >
                                        {item.submission?.status === 'rejected' || item.submission?.status === 'resubmission_required' ? (
                                          <><Upload className="h-4 w-4 mr-2" />Resubmit</>
                                        ) : item.submission ? (
                                          <><FileText className="h-4 w-4 mr-2" />Replace</>
                                        ) : (
                                          <><Upload className="h-4 w-4 mr-2" />Upload</>
                                        )}
                                      </Button>
                                    </>
                                  )}
                                </div>
                                {item.submission?.file_name && (
                                  <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                                    <p className="text-xs text-gray-600 mb-1">Uploaded File:</p>
                                    <p className="text-sm text-gray-900 font-medium">{item.submission.file_name}</p>
                                    {item.submission.submitted_at && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Submitted: {new Date(item.submission.submitted_at).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile/Tablet Card View (visible on mobile and tablet only) */}
                  <div className="lg:hidden space-y-4">
                    {checklist.items
                      .sort((a, b) => getSeverityPriority(a.requirement.severity) - getSeverityPriority(b.requirement.severity))
                      .map((item) => (
                        <Card 
                          key={item.requirement.id} 
                          className={needsAction(item) ? "border-2 border-yellow-400 bg-yellow-50" : ""}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Document Name & Required Badge */}
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-base font-semibold text-gray-900">
                                  {item.requirement.name}
                                  {item.is_required && <span className="text-red-600 ml-1">*</span>}
                                </h3>
                                {getSeverityBadge(item.requirement.severity)}
                              </div>

                              {/* Description */}
                              <p className="text-sm text-gray-700">{item.requirement.description || 'Required for regulatory compliance and board member verification.'}</p>

                              {/* Certification Warning */}
                              {item.requirement.requires_certification && (
                                <Alert className="bg-amber-50 border-amber-500">
                                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                                  <AlertDescription className="text-sm text-amber-900">
                                    <strong>⚠️ Certification Required:</strong> This document must be a certified copy from an authorized official.
                                  </AlertDescription>
                                </Alert>
                              )}

                              {/* Validity Period */}
                              {item.requirement.validity_period_days && (
                                <p className="text-xs text-gray-600">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  Valid for {item.requirement.validity_period_days} days after approval
                                </p>
                              )}

                              {/* Status & Expiry */}
                              <div className="flex flex-wrap gap-2 items-center">
                                {getStatusBadge(item)}
                                {getExpiryWarning(item)}
                              </div>

                              {/* Uploaded File Info */}
                              {item.submission?.file_name && (
                                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                                  <p className="text-xs text-gray-600 mb-1">Uploaded File:</p>
                                  <p className="text-sm text-gray-900 font-medium">{item.submission.file_name}</p>
                                  {item.submission.submitted_at && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Submitted: {new Date(item.submission.submitted_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Rejection Reason */}
                              {item.submission?.rejection_reason && (
                                <Alert className="bg-red-50 border-red-200">
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                  <AlertTitle className="text-sm font-semibold text-red-900">Rejection Reason</AlertTitle>
                                  <AlertDescription className="text-sm text-red-800">
                                    {item.submission.rejection_reason}
                                  </AlertDescription>
                                </Alert>
                              )}

                              {/* Action Buttons */}
                              <div className="pt-2 space-y-2">
                                {item.submission?.file_url && (
                                  <Button
                                    variant="outline"
                                    onClick={() => handleViewDocument(item.submission!.id!, item.submission!.file_name || 'document')}
                                    disabled={viewingId === item.submission!.id!}
                                    className="w-full border-green-600 text-green-600 hover:bg-green-50"
                                  >
                                    {viewingId === item.submission!.id! ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <Eye className="h-4 w-4 mr-2" />
                                    )}
                                    View Document
                                  </Button>
                                )}
                                {item.requirement.requires_template && (
                                  <Button
                                    variant="outline"
                                    onClick={() => handleTemplateDownload(item.requirement.id, item.requirement.name)}
                                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Template
                                  </Button>
                                )}
                                {uploadingId === item.requirement.id ? (
                                  <Button disabled className="w-full bg-gray-400">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Uploading...
                                  </Button>
                                ) : (
                                  <>
                                    <input
                                      type="file"
                                      id={`mobile-file-${item.requirement.id}`}
                                      className="hidden"
                                      accept={item.requirement.file_formats_accepted.map(f => `.${f}`).join(',')}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleFileUpload(item.requirement.id, file);
                                          e.target.value = '';
                                        }
                                      }}
                                    />
                                    <Button
                                      onClick={() => document.getElementById(`mobile-file-${item.requirement.id}`)?.click()}
                                      className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                                      variant="outline"
                                    >
                                      {item.submission?.status === 'rejected' || item.submission?.status === 'resubmission_required' ? (
                                        <><Upload className="h-4 w-4 mr-2" />Resubmit Document</>
                                      ) : item.submission ? (
                                        <><FileText className="h-4 w-4 mr-2" />Replace Document</>
                                      ) : (
                                        <><Upload className="h-4 w-4 mr-2" />Upload Document</>
                                      )}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BoardDocuments;
