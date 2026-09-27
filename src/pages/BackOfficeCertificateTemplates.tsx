import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import brain from 'brain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CheckCircle2, Upload, Eye, Trash2, FileText, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { BackOfficeNav } from 'components/BackOfficeNav';

interface Template {
  id: number;
  template_name: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  version: number;
  description?: string;
  template_type: 'html' | 'pdf';
  share_class?: string;
}

interface FullTemplate extends Template {
  template_html?: string;
  pdf_storage_key?: string;
}

export default function BackOfficeCertificateTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; templateId?: number; templateName?: string }>({ open: false });
  
  // Form state
  const [templateName, setTemplateName] = useState('');
  const [templateHtml, setTemplateHtml] = useState('');
  const [description, setDescription] = useState('');
  const [shareClass, setShareClass] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [uploadType, setUploadType] = useState<'html' | 'pdf'>('html');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFields, setPdfFields] = useState<string[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await brain.list_templates();
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (!pdfFile) {
      toast.error('PDF file is required');
      return;
    }

    try {
      setUploading(true);
      
      // PDF upload using brain client
      const response = await brain.upload_pdf_template({
        file: pdfFile!,
        template_name: templateName,
        description: description || null,
        share_class: shareClass || null
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('PDF template uploaded successfully!');
        
        // Load PDF fields for display
        try {
          const fieldsResponse = await brain.get_pdf_fields({ templateId: data.id });
          const fieldsData = await fieldsResponse.json();
          setPdfFields(fieldsData.field_names);
          toast.success(`Found ${fieldsData.field_names.length} fillable fields in PDF`);
        } catch (e) {
          console.error('Failed to load PDF fields:', e);
        }
        
        resetForm();
        loadTemplates();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to upload PDF');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload template');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTemplateName('');
    setDescription('');
    setShareClass('');
    setPdfFile(null);
    setPdfFields([]);
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.pdf')) {
        toast.error('Only PDF files are allowed');
        return;
      }
      setPdfFile(file);
      toast.success(`PDF selected: ${file.name}`);
    }
  };

  const handleActivate = async (templateId: number) => {
    try {
      const response = await brain.activate_certificate_template({ templateId });
      if (response.ok) {
        toast.success('Template activated successfully');
        loadTemplates();
      } else {
        toast.error('Failed to activate template');
      }
    } catch (error) {
      console.error('Activation error:', error);
      toast.error('Failed to activate template');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.templateId) return;

    try {
      const response = await brain.delete_certificate_template({ templateId: deleteDialog.templateId });
      if (response.ok) {
        toast.success('Template deleted successfully');
        loadTemplates();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeleteDialog({ open: false });
    }
  };

  const handleViewTemplate = async (templateId: number) => {
    try {
      const response = await brain.get_template({ templateId });
      const data: FullTemplate = await response.json();
      
      setTemplateName(data.template_name);
      setDescription(data.description || '');
      setShareClass(data.share_class || '');
      setSelectedTemplateId(templateId);
      
      // Load PDF fields
      try {
        const fieldsResponse = await brain.get_pdf_fields({ templateId });
        const fieldsData = await fieldsResponse.json();
        setPdfFields(fieldsData.field_names);
      } catch (e) {
        console.error('Failed to load PDF fields:', e);
      }
    } catch (error) {
      console.error('Failed to load template:', error);
      toast.error('Failed to load template');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <BackOfficeNav currentPage="Certificate Templates" />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Certificate Templates</h1>
                <p className="text-muted-foreground">Manage share certificate templates</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="upload">Upload New</TabsTrigger>
            </TabsList>

            {/* Templates List Tab */}
            <TabsContent value="templates" className="space-y-4">
              {loading ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Loading templates...</p>
                  </CardContent>
                </Card>
              ) : templates.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center space-y-2">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">No templates found</p>
                      <Button onClick={() => document.querySelector<HTMLButtonElement>('[value="upload"]')?.click()}>
                        Upload First Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className={template.is_active ? 'border-green-500' : ''}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CardTitle>{template.template_name}</CardTitle>
                              {template.is_active && (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                              <Badge variant="outline">v{template.version}</Badge>
                            </div>
                            {template.description && (
                              <CardDescription>{template.description}</CardDescription>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Created {new Date(template.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewTemplate(template.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {!template.is_active && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleActivate(template.id)}
                                >
                                  Activate
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setDeleteDialog({ 
                                    open: true, 
                                    templateId: template.id,
                                    templateName: template.template_name 
                                  })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upload PDF Certificate Template</CardTitle>
                  <CardDescription>
                    Upload a PDF template with fillable form fields for share certificates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      placeholder="e.g., Class B Shares Certificate"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shareClass">Share Class (Optional)</Label>
                    <Input
                      id="shareClass"
                      placeholder="e.g., Class A, Class B, Ordinary"
                      value={shareClass}
                      onChange={(e) => setShareClass(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      placeholder="Brief description of this template"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pdfFile">PDF File</Label>
                    <Input
                      id="pdfFile"
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfFileChange}
                      className="cursor-pointer"
                    />
                    {pdfFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  <Card className="bg-blue-50 dark:bg-blue-950">
                    <CardContent className="pt-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        PDF Requirements
                      </h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>PDF must have fillable form fields</li>
                        <li>Field names should match data points (e.g., "shareholder_name")</li>
                        <li>System will automatically populate fields when generating certificates</li>
                      </ul>
                    </CardContent>
                  </Card>

                  {pdfFields.length > 0 && (
                    <Card className="bg-green-50 dark:bg-green-950">
                      <CardContent className="pt-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Detected PDF Fields ({pdfFields.length})
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {pdfFields.map((field, idx) => (
                            <code key={idx} className="bg-white dark:bg-gray-800 p-1 rounded">
                              {field}
                            </code>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Button
                    onClick={handleUpload}
                    disabled={uploading || !templateName.trim() || !pdfFile}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload PDF Template'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{deleteDialog.templateName}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
      <Footer />
    </div>
  );
}
