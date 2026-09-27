import { useState } from "react";
import { apiClient } from "app";
import { auth } from "app/auth";
import { API_URL } from "app";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Plus, Edit, Trash2, Upload, Download, X, Loader2 } from "lucide-react";
import { showErrorToast, showSuccessToast, showWarningToast } from 'utils/errorHandling';
import type { BoardDocumentRequirement } from "types";

interface Props {
  requirements: BoardDocumentRequirement[];
  loading: boolean;
  onRefresh: () => void;
}

export function RequirementsManager({ requirements, loading, onRefresh }: Props) {
  const [showRequirementDialog, setShowRequirementDialog] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<BoardDocumentRequirement | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState<number | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState<number | null>(null);
  const [requirementForm, setRequirementForm] = useState({
    name: "",
    description: "",
    jurisdictions: [] as string[],
    file_formats_accepted: ["pdf"],
    max_file_size_mb: 10,
    is_required: true,
    requires_template: false,
    requires_certification: false,
    validity_period_days: null as number | null,
    display_order: 0
  });

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

  const handleOpenRequirementDialog = (requirement?: BoardDocumentRequirement) => {
    if (requirement) {
      setEditingRequirement(requirement);
      setRequirementForm({
        name: requirement.name,
        description: requirement.description || "",
        jurisdictions: requirement.jurisdictions || [],
        file_formats_accepted: requirement.file_formats_accepted || ["pdf"],
        max_file_size_mb: requirement.max_file_size_mb || 10,
        is_required: requirement.is_required ?? true,
        requires_template: requirement.requires_template ?? false,
        requires_certification: requirement.requires_certification ?? false,
        validity_period_days: requirement.validity_period_days || null,
        display_order: requirement.display_order || 0
      });
    } else {
      setEditingRequirement(null);
      setRequirementForm({
        name: "",
        description: "",
        jurisdictions: [],
        file_formats_accepted: ["pdf"],
        max_file_size_mb: 10,
        is_required: true,
        requires_template: false,
        requires_certification: false,
        validity_period_days: null,
        display_order: 0
      });
    }
    setShowRequirementDialog(true);
  };

  const handleSaveRequirement = async () => {
    if (!requirementForm.name) {
      showWarningToast('Document name is required');
      return;
    }

    try {
      if (editingRequirement) {
        await apiClient.update_requirement(
          { requirementId: editingRequirement.id! },
          requirementForm
        );
        showSuccessToast('Requirement updated successfully');
      } else {
        await apiClient.create_requirement(requirementForm);
        showSuccessToast('Requirement created successfully');
      }
      setShowRequirementDialog(false);
      setEditingRequirement(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error saving requirement:', error);
      showErrorToast(error, 'Unable to save requirement. Please try again.');
    }
  };

  const handleDeactivateRequirement = async (requirementId: number) => {
    if (!confirm('Are you sure you want to deactivate this requirement? It will no longer appear in member checklists.')) {
      return;
    }

    try {
      await apiClient.deactivate_requirement({ requirementId });
      showSuccessToast('Requirement deactivated successfully');
      onRefresh();
    } catch (error: any) {
      console.error('Error deactivating requirement:', error);
      showErrorToast(error, 'Unable to deactivate requirement. Please try again.');
    }
  };

  const handleUploadTemplate = async (requirementId: number, file: File) => {
    setUploadingTemplate(requirementId);
    try {
      await apiClient.upload_template(
        { requirementId },
        { file }
      );
      showSuccessToast('Template uploaded successfully');
      onRefresh();
    } catch (error: any) {
      console.error('Error uploading template:', error);
      showErrorToast(error, 'Failed to upload template');
    } finally {
      setUploadingTemplate(null);
    }
  };

  const handleDeleteTemplate = async (requirementId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }
    try {
      await apiClient.delete_template({ requirementId });
      showSuccessToast('Template deleted successfully');
      onRefresh();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      showErrorToast(error, 'Failed to delete template');
    }
  };

  const handleDownloadTemplate = async (requirementId: number) => {
    try {
      setDownloadingTemplate(requirementId);
      const token = await auth.getAuthToken();
      const response = await fetch(`${API_URL}/board-documents/requirements/${requirementId}/download-template`, {
         headers: {
            'Authorization': `Bearer ${token}`
         }
      });
      
      if (!response.ok) throw new Error("Failed to download template");
      
      const contentDisposition = response.headers.get('Content-Disposition');
      const contentType = response.headers.get('Content-Type');
      let filename = extractFilename(contentDisposition);

      if (filename) {
        filename = sanitizeFilename(filename);
      } else {
        const fallbackBase = `template_${requirementId}`;
        const inferredExt = extensionFromContentType(contentType);
        filename = sanitizeFilename(inferredExt ? `${fallbackBase}.${inferredExt}` : fallbackBase);
        console.warn('⚠️ Falling back to inferred filename:', filename);
      }
      
      const blob = await response.blob();
      console.log('📦 Blob type:', blob.type, '| Size:', blob.size, 'bytes');
      console.log('💾 Downloading as:', filename);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showSuccessToast('Template downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading template:', error);
      showErrorToast(error, 'Failed to download template');
    } finally {
      setDownloadingTemplate(null);
    }
  };

  const toggleJurisdiction = (jurisdiction: string) => {
    setRequirementForm(prev => ({
      ...prev,
      jurisdictions: prev.jurisdictions.includes(jurisdiction)
        ? prev.jurisdictions.filter(j => j !== jurisdiction)
        : [...prev.jurisdictions, jurisdiction]
    }));
  };

  const toggleFileFormat = (format: string) => {
    setRequirementForm(prev => ({
      ...prev,
      file_formats_accepted: prev.file_formats_accepted.includes(format)
        ? prev.file_formats_accepted.filter(f => f !== format)
        : [...prev.file_formats_accepted, format]
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Document Requirements Manager</h2>
          <p className="text-sm text-muted-foreground">Manage document types, jurisdictions, and validation rules</p>
        </div>
        <Button onClick={() => handleOpenRequirementDialog()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Requirement
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading requirements...
          </CardContent>
        </Card>
      ) : requirements.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No document requirements configured</p>
            <Button onClick={() => handleOpenRequirementDialog()} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Requirement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requirements.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{req.name}</h3>
                      {req.is_required && (
                        <Badge className="bg-red-100 text-red-800">Required</Badge>
                      )}
                      <Badge variant="outline">Order: {req.display_order}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{req.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <div className="text-xs">
                        <span className="font-semibold">Jurisdictions:</span>
                        {req.jurisdictions && req.jurisdictions.length > 0 ? (
                          req.jurisdictions.map(j => (
                            <Badge key={j} variant="outline" className="ml-1">{j}</Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground ml-1">None</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Formats: {req.file_formats_accepted?.join(", ") || "pdf"}</span>
                      <span>•</span>
                      <span>Max Size: {req.max_file_size_mb || 10}MB</span>
                      {req.validity_period_days && (
                        <>
                          <span>•</span>
                          <span>Valid for: {req.validity_period_days} days</span>
                        </>
                      )}
                    </div>
                    
                    {/* Template Section */}
                    {req.requires_template && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Template Required</span>
                          </div>
                          {req.template_file_name ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-blue-700 dark:text-blue-300">{req.template_file_name}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadTemplate(req.id!)}
                                disabled={downloadingTemplate === req.id}
                                className="h-7 text-xs"
                              >
                                {downloadingTemplate === req.id ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3 mr-1" />
                                )}
                                Download
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteTemplate(req.id!)}
                                className="h-7 text-xs text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                id={`template-upload-${req.id}`}
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadTemplate(req.id!, file);
                                }}
                                disabled={uploadingTemplate === req.id}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => document.getElementById(`template-upload-${req.id}`)?.click()}
                                disabled={uploadingTemplate === req.id}
                                className="h-7 text-xs"
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                {uploadingTemplate === req.id ? 'Uploading...' : 'Upload Template'}
                              </Button>
                            </div>
                          )}
                        </div>
                        {req.template_description && (
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">{req.template_description}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenRequirementDialog(req)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => handleDeactivateRequirement(req.id!)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Deactivate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Requirement Dialog */}
      <Dialog open={showRequirementDialog} onOpenChange={setShowRequirementDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRequirement ? "Edit Document Requirement" : "Add New Document Requirement"}
            </DialogTitle>
            <DialogDescription>
              Configure document type, validation rules, and jurisdiction requirements
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Document Name *</Label>
                <Input
                  value={requirementForm.name}
                  onChange={(e) => setRequirementForm({ ...requirementForm, name: e.target.value })}
                  placeholder="e.g., Certificate of Incorporation"
                />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={requirementForm.description}
                  onChange={(e) => setRequirementForm({ ...requirementForm, description: e.target.value })}
                  placeholder="Brief description of this document and its purpose..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Jurisdictions *</Label>
                <div className="border rounded-md p-3 space-y-2">
                  {["global", "lesotho", "south_africa", "botswana"].map((jurisdiction) => (
                    <div key={jurisdiction} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={requirementForm.jurisdictions.includes(jurisdiction)}
                        onChange={() => toggleJurisdiction(jurisdiction)}
                        id={`jurisdiction-${jurisdiction}`}
                      />
                      <label htmlFor={`jurisdiction-${jurisdiction}`} className="text-sm capitalize">
                        {jurisdiction.replace("_", " ")}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Accepted File Formats *</Label>
                <div className="border rounded-md p-3 space-y-2">
                  {["pdf", "jpg", "jpeg", "png", "docx"].map((format) => (
                    <div key={format} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={requirementForm.file_formats_accepted.includes(format)}
                        onChange={() => toggleFileFormat(format)}
                        id={`format-${format}`}
                      />
                      <label htmlFor={`format-${format}`} className="text-sm uppercase">
                        {format}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Max File Size (MB)</Label>
                <Input
                  type="number"
                  value={requirementForm.max_file_size_mb}
                  onChange={(e) => setRequirementForm({ ...requirementForm, max_file_size_mb: parseInt(e.target.value) || 10 })}
                  placeholder="10"
                />
              </div>
              <div>
                <Label>Validity Period (Days)</Label>
                <Input
                  type="number"
                  value={requirementForm.validity_period_days || ""}
                  onChange={(e) => setRequirementForm({ ...requirementForm, validity_period_days: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Leave empty for no expiry"
                />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={requirementForm.display_order}
                  onChange={(e) => setRequirementForm({ ...requirementForm, display_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  checked={requirementForm.is_required}
                  onChange={(e) => setRequirementForm({ ...requirementForm, is_required: e.target.checked })}
                  id="is-required"
                />
                <label htmlFor="is-required" className="text-sm font-medium">
                  Mark as Required Document
                </label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  checked={requirementForm.requires_certification}
                  onChange={(e) => setRequirementForm({ ...requirementForm, requires_certification: e.target.checked })}
                  id="requires-certification"
                />
                <label htmlFor="requires-certification" className="text-sm font-medium">
                  Requires Certified Copy
                </label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  checked={requirementForm.requires_template}
                  onChange={(e) => setRequirementForm({ ...requirementForm, requires_template: e.target.checked })}
                  id="requires-template"
                />
                <label htmlFor="requires-template" className="text-sm font-medium">
                  Requires Template
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequirementDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRequirement}>
              {editingRequirement ? "Update Requirement" : "Create Requirement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
