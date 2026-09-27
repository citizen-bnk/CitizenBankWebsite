import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, ArrowRight, ArrowLeft, X, AlertTriangle, Info, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "app";
import type { BoardMemberDocumentStatus } from "types";

interface TypeformDocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function TypeformDocumentUploadModal({ open, onClose, onComplete }: TypeformDocumentUploadModalProps) {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<BoardMemberDocumentStatus[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [skippedDocs, setSkippedDocs] = useState<Set<number>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadDocuments();
    }
  }, [open]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get_checklist({});
      const data = await res.json();
      
      // Filter to only show documents that need action (not submitted or rejected)
      const needsAction = data.documents?.filter((doc: BoardMemberDocumentStatus) => {
        return !doc.submission || 
               doc.submission.status === 'rejected' || 
               doc.submission.status === 'resubmission_required';
      }) || [];
      
      setDocuments(needsAction);
      
      // If no documents need action, complete immediately
      if (needsAction.length === 0) {
        toast.success("All documents are up to date!");
        onComplete();
      }
    } catch (error: any) {
      console.error("Failed to load documents:", error);
      toast.error("Failed to load document requirements");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const currentDoc = documents[currentStep];
    if (!currentDoc) return;

    try {
      setUploading(true);

      const response = await apiClient.upload_document(
        { requirement_id: currentDoc.requirement.id },
        { file }
      );

      if (response.ok) {
        toast.success("Document uploaded successfully!");
        // Move to next step
        nextStep();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const skipDocument = () => {
    const currentDoc = documents[currentStep];
    if (currentDoc) {
      setSkippedDocs(prev => new Set([...prev, currentDoc.requirement.id]));
      toast.info(`Skipped: ${currentDoc.requirement.title}`);
    }
    nextStep();
  };

  const nextStep = () => {
    if (currentStep < documents.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      // All done
      const skippedCount = skippedDocs.size;
      if (skippedCount > 0) {
        toast.warning(`You skipped ${skippedCount} document(s). You can upload them later from the Board Documents page.`);
      }
      onComplete();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const currentDoc = documents[currentStep];
  const progress = documents.length > 0 ? ((currentStep + 1) / documents.length) * 100 : 0;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="p-16 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading document requirements...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!currentDoc) {
    return null;
  }

  const getSeverityColor = (severity?: string | null) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'urgent':
        return 'text-orange-600 bg-orange-50';
      case 'important':
        return 'text-amber-600 bg-amber-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const isRejected = currentDoc.submission?.status === 'rejected' || 
                     currentDoc.submission?.status === 'resubmission_required';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <div className="bg-card">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Board Member Documents</h2>
                <p className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {documents.length}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">{Math.round(progress)}%</div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
            </div>
            <Progress value={progress} className="mt-4" />
          </div>

          {/* Document Upload Form */}
          <div className="p-8">
            <Card className={getSeverityColor(currentDoc.requirement.severity)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">
                      {currentDoc.requirement.title}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {currentDoc.requirement.description}
                    </CardDescription>
                  </div>
                  {currentDoc.requirement.severity && (
                    <Badge 
                      variant="secondary" 
                      className={getSeverityColor(currentDoc.requirement.severity)}
                    >
                      {currentDoc.requirement.severity.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Show rejection reason if applicable */}
                {isRejected && currentDoc.submission?.review_notes && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>Previously Rejected:</strong> {currentDoc.submission.review_notes}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Instructions */}
                {currentDoc.requirement.instructions && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {currentDoc.requirement.instructions}
                    </AlertDescription>
                  </Alert>
                )}

                {/* File Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    disabled={uploading}
                  />
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Upload Document</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Accepted formats: PDF, DOC, DOCX, JPG, PNG
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    size="lg"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Footer */}
          <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={currentStep === 0 || uploading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={skipDocument}
                disabled={uploading}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip for Now
              </Button>
              
              {currentStep === documents.length - 1 && (
                <Button
                  onClick={onComplete}
                  disabled={uploading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finish
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
