












import { useState, useEffect } from "react";
import { useUserGuardContext } from "app/auth";
import brain from "brain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FolderPlus, FileText, Edit, Trash2, CheckCircle2, Brain, Link, Settings, Play, RefreshCw, ExternalLink, AlertCircle, TrendingUp, Info, Lock } from "lucide-react";
import { toast } from "sonner";
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { BackOfficeNav } from 'components/BackOfficeNav';
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { API_URL, auth } from "app";

interface Category {
  id: number;
  category_name: string;
  description: string | null;
  display_order: number;
  parent_category_id: number | null;
}

interface Document {
  id: number;
  category_id: number | null;
  category_name: string | null;
  document_name: string;
  file_url: string;
  file_size: number | null;
  uploaded_by: string;
  uploaded_at: string;
  version: string;
  status: string;
  description: string | null;
  is_required_for_license: boolean;
}

const BackOfficeDataRoom = () => {
  const { user } = useUserGuardContext();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  
  // Category dialog
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "", displayOrder: 0 });
  
  // Edit category dialog
  const [editCategoryDialog, setEditCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryData, setEditCategoryData] = useState({ name: "", description: "", displayOrder: 0 });
  
  // Upload dialog
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({
    document_name: "",
    category_id: "",
    description: "",
    version: "1.0",
    is_required_for_license: false
  });
  
  const [uploading, setUploading] = useState(false);

  // AI Processing state
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [aiConfigLoading, setAiConfigLoading] = useState(false);
  const [processingQueue, setProcessingQueue] = useState<any[]>([]);
  const [processingLogs, setProcessingLogs] = useState<any[]>([]);
  const [processingStats, setProcessingStats] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [configData, setConfigData] = useState({
    dump_folder_id: "",
    dataroom_folder_id: "",
    ai_model: "gpt-4o-mini",
    confidence_threshold: 80,
    auto_process_enabled: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesRes, documentsRes] = await Promise.all([
        brain.list_categories(),
        brain.list_documents({ status: "active" })
      ]);
      
      const categoriesData = await categoriesRes.json();
      const documentsData = await documentsRes.json();
      
      setCategories(categoriesData);
      setDocuments(documentsData.documents || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data room information");
    } finally {
      setLoading(false);
    }
  };

  // AI Processing functions
  const loadAiConfig = async () => {
    setAiConfigLoading(true);
    try {
      const response = await brain.get_config();
      const config = await response.json();
      setAiConfig(config);
      
      if (config.dump_folder_id) {
        setConfigData(prev => ({
          ...prev,
          dump_folder_id: config.dump_folder_id || "",
          dataroom_folder_id: config.dataroom_folder_id || "",
          ai_model: config.ai_model,
          confidence_threshold: config.confidence_threshold,
          auto_process_enabled: config.auto_process_enabled
        }));
      }
    } catch (error) {
      console.error("Error loading AI config:", error);
      toast.error("Failed to load AI configuration");
    } finally {
      setAiConfigLoading(false);
    }
  };

  const loadProcessingQueue = async (status?: string) => {
    try {
      const response = await brain.get_queue({ status: status || undefined });
      const data = await response.json();
      setProcessingQueue(data.items || []);
    } catch (error) {
      console.error("Error loading queue:", error);
    }
  };

  const loadProcessingLogs = async (status?: string) => {
    try {
      const response = await brain.get_processing_logs({ status: status || undefined });
      const data = await response.json();
      setProcessingLogs(data.logs || []);
    } catch (error) {
      console.error("Error loading logs:", error);
    }
  };

  const loadProcessingStats = async () => {
    try {
      const response = await brain.get_processing_stats();
      const data = await response.json();
      setProcessingStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleConnectGoogleDrive = async () => {
    try {
      const response = await brain.get_auth_url();
      const data = await response.json();
      const popup = window.open(data.auth_url, "_blank", "width=600,height=600");
      toast.success("Opening Google authorization window...");
      
      // Poll the popup window to detect when it closes
      if (popup) {
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            // Reload config after popup closes
            setTimeout(() => {
              loadAiConfig();
              toast.info("Checking connection status...");
            }, 1000);
          }
        }, 500);
      } else {
        // Fallback if popup was blocked
        setTimeout(() => loadAiConfig(), 3000);
      }
    } catch (error) {
      console.error("Error connecting to Google Drive:", error);
      toast.error("Failed to initiate Google Drive connection");
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    if (!confirm("Are you sure you want to disconnect Google Drive?")) return;
    
    try {
      await brain.disconnect();
      toast.success("Disconnected from Google Drive");
      loadAiConfig();
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Failed to disconnect from Google Drive");
    }
  };

  const handleUpdateConfig = async () => {
    try {
      await brain.update_config({
        dump_folder_id: configData.dump_folder_id || null,
        dataroom_folder_id: configData.dataroom_folder_id || null,
        ai_model: configData.ai_model || null,
        confidence_threshold: configData.confidence_threshold || null,
        auto_process_enabled: configData.auto_process_enabled || null
      });
      toast.success("Configuration updated successfully");
      loadAiConfig();
    } catch (error) {
      console.error("Error updating config:", error);
      toast.error("Failed to update configuration");
    }
  };

  const handleProcessDocuments = async () => {
    setProcessing(true);
    try {
      const response = await brain.trigger_processing();
      const data = await response.json();
      toast.success(data.message);
      loadProcessingQueue();
      loadProcessingLogs();
      loadProcessingStats();
    } catch (error) {
      console.error("Error processing documents:", error);
      toast.error("Failed to process documents");
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveDocument = async (logId: number) => {
    try {
      const response = await brain.approve_document(logId, { use_suggested_category: true });
      const data = await response.json();
      toast.success(data.message);
      loadProcessingQueue();
      loadProcessingLogs();
      loadProcessingStats();
      loadData();
    } catch (error) {
      console.error("Error approving document:", error);
      toast.error("Failed to approve document");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    
    try {
      await brain.create_category({
        category_name: newCategory.name,
        description: newCategory.description || null,
        display_order: newCategory.displayOrder
      });
      
      toast.success("Category created successfully");
      setCategoryDialog(false);
      setNewCategory({ name: "", description: "", displayOrder: 0 });
      loadData();
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Failed to create category");
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditCategoryData({
      name: category.category_name,
      description: category.description || "",
      displayOrder: category.display_order
    });
    setEditCategoryDialog(true);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editCategoryData.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    
    try {
      await brain.update_category({ categoryId: editingCategory.id }, {
        category_name: editCategoryData.name,
        description: editCategoryData.description || null,
        display_order: editCategoryData.displayOrder
      });
      
      toast.success("Category updated successfully");
      setEditCategoryDialog(false);
      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm("Are you sure you want to delete this category? This will only work if there are no documents in this category.")) return;
    
    try {
      await brain.delete_category({ categoryId: categoryId });
      toast.success("Category deleted successfully");
      loadData();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category. Make sure there are no documents in this category.");
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadFile || !uploadData.document_name.trim()) {
      toast.error("Please select a file and provide a document name");
      return;
    }
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("document_name", uploadData.document_name);
      formData.append("version", uploadData.version);
      formData.append("is_required_for_license", String(uploadData.is_required_for_license));
      
      if (uploadData.category_id) {
        formData.append("category_id", uploadData.category_id);
      }
      if (uploadData.description) {
        formData.append("description", uploadData.description);
      }
      
      // Get auth token for protected endpoint
      const token = await auth.getAuthToken();
      
      // Use full API URL with auth token
      const response = await fetch(`${API_URL}/data-room/admin/documents`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Upload failed with status:", response.status, errorData);
        throw new Error(errorData?.detail || `Upload failed with status ${response.status}`);
      }
      
      toast.success("Document uploaded successfully");
      setUploadDialog(false);
      resetUploadForm();
      loadData();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadData({
      document_name: "",
      category_id: "",
      description: "",
      version: "1.0",
      is_required_for_license: false
    });
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      await brain.delete_data_room_document({ documentId });
      toast.success("Document deleted successfully");
      loadData();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-ZA', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Johannesburg'
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading data room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <BackOfficeNav />
      <div className="flex-1">
        <div className="container mx-auto py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Data Room Management</h1>
            <p className="text-muted-foreground">
              Manage banking license documents and categories
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{documents.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{categories.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Required Docs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {documents.filter(d => d.is_required_for_license).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {documents.length > 0 ? Math.round((documents.filter(d => d.is_required_for_license).length / documents.length) * 100) : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="ai-processing" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ai-processing">AI Processing</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>

            {/* AI Processing Tab */}
            <TabsContent value="ai-processing">
              <div className="space-y-6">
                {/* Environment Indicator */}
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          Environment: {aiConfig?.environment === 'prod' ? 'Production' : 'Development'}
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {aiConfig?.environment === 'prod' 
                            ? 'You are configuring production Google Drive storage. Real documents will be processed here.'
                            : 'You are configuring development Google Drive storage. Demo/test documents will be processed here.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Configuration Section */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-xl">
                      <Settings className="h-6 w-6 mr-3" />
                      Configuration
                    </CardTitle>
                    <CardDescription className="text-base">
                      Set up Google Drive integration and AI processing settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Google Drive Connection Card */}
                      <Card className="border-2">
                        <CardContent className="py-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <Link className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-lg">Google Drive</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {aiConfig?.is_connected ? (
                                    <span className="text-green-600 dark:text-green-400 font-medium">✓ Connected</span>
                                  ) : (
                                    <span className="text-orange-600 dark:text-orange-400 font-medium">○ Not connected</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div>
                              {aiConfig?.is_connected ? (
                                <Button variant="outline" onClick={handleDisconnectGoogleDrive} className="h-11">
                                  Disconnect
                                </Button>
                              ) : (
                                <Button onClick={handleConnectGoogleDrive} className="h-11">
                                  Connect to Google Drive
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {aiConfig?.is_connected && (
                        <>
                          {/* Folder Configuration */}
                          <Card className="border-2">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Google Drive Folders</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                              <div>
                                <Label htmlFor="dump_folder_id" className="text-base font-medium">Dump Folder ID</Label>
                                <Input
                                  id="dump_folder_id"
                                  value={configData.dump_folder_id}
                                  onChange={(e) => setConfigData(prev => ({ ...prev, dump_folder_id: e.target.value }))}
                                  placeholder="Paste Google Drive folder ID"
                                  className="mt-2 h-11"
                                />
                                <p className="text-sm text-muted-foreground mt-2">
                                  📁 Upload documents here for AI processing
                                </p>
                              </div>

                              <div>
                                <Label htmlFor="dataroom_folder_id" className="text-base font-medium">Data Room Folder ID</Label>
                                <Input
                                  id="dataroom_folder_id"
                                  value={configData.dataroom_folder_id}
                                  onChange={(e) => setConfigData(prev => ({ ...prev, dataroom_folder_id: e.target.value }))}
                                  placeholder="Paste Google Drive folder ID"
                                  className="mt-2 h-11"
                                />
                                <p className="text-sm text-muted-foreground mt-2">
                                  📂 Organized documents will be moved here
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          {/* AI Settings */}
                          <Card className="border-2">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">AI Processing Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                              <div>
                                <Label htmlFor="ai_model" className="text-base font-medium">AI Model</Label>
                                <Select
                                  value={configData.ai_model}
                                  onValueChange={(value) => setConfigData(prev => ({ ...prev, ai_model: value }))}
                                >
                                  <SelectTrigger className="mt-2 h-11">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast & Cost-effective)</SelectItem>
                                    <SelectItem value="gpt-4o">GPT-4o (More Accurate)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="confidence_threshold" className="text-base font-medium">
                                  Confidence Threshold: {configData.confidence_threshold}%
                                </Label>
                                <Slider
                                  id="confidence_threshold"
                                  min={50}
                                  max={100}
                                  step={5}
                                  value={[configData.confidence_threshold]}
                                  onValueChange={(value) => setConfigData(prev => ({ ...prev, confidence_threshold: value[0] }))}
                                  className="mt-4"
                                />
                                <p className="text-sm text-muted-foreground mt-3">
                                  Documents with confidence below {configData.confidence_threshold}% will require manual review
                                </p>
                              </div>

                              <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                  <p className="font-medium text-base">Auto-Process New Documents</p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Automatically process documents when uploaded to dump folder
                                  </p>
                                </div>
                                <Switch
                                  checked={configData.auto_process_enabled}
                                  onCheckedChange={(checked) => setConfigData(prev => ({ ...prev, auto_process_enabled: checked }))}
                                />
                              </div>
                            </CardContent>
                          </Card>

                          <div className="flex justify-end">
                            <Button onClick={handleUpdateConfig} size="lg" className="h-11 px-8">
                              <Settings className="h-4 w-4 mr-2" />
                              Save Configuration
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Processing Controls */}
                {aiConfig?.is_connected && aiConfig?.dump_folder_id && aiConfig?.dataroom_folder_id && (
                  <Card className="border-2 border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center text-xl">
                            <Play className="h-6 w-6 mr-3 text-blue-600" />
                            Process Documents
                          </CardTitle>
                          <CardDescription className="text-base mt-2">
                            Scan dump folder and process new documents with AI
                          </CardDescription>
                        </div>
                        <Button onClick={handleProcessDocuments} disabled={processing} size="lg" className="h-11">
                          {processing ? (
                            <><RefreshCw className="h-5 w-5 mr-2 animate-spin" />Processing...</>
                          ) : (
                            <><Play className="h-5 w-5 mr-2" />Process Now</>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                )}

                {/* Statistics Dashboard */}
                {processingStats && (
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center text-xl">
                        <TrendingUp className="h-6 w-6 mr-3" />
                        Processing Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <Card className="border-2">
                          <CardContent className="pt-6 pb-6 text-center">
                            <p className="text-3xl font-bold">{processingStats.total_processed}</p>
                            <p className="text-sm text-muted-foreground mt-2">Total Processed</p>
                          </CardContent>
                        </Card>
                        <Card className="border-2 border-green-200 dark:border-green-800">
                          <CardContent className="pt-6 pb-6 text-center">
                            <p className="text-3xl font-bold text-green-600">{processingStats.auto_categorized}</p>
                            <p className="text-sm text-muted-foreground mt-2">Auto-Categorized</p>
                          </CardContent>
                        </Card>
                        <Card className="border-2 border-orange-200 dark:border-orange-800">
                          <CardContent className="pt-6 pb-6 text-center">
                            <p className="text-3xl font-bold text-orange-600">{processingStats.needs_review}</p>
                            <p className="text-sm text-muted-foreground mt-2">Needs Review</p>
                          </CardContent>
                        </Card>
                        <Card className="border-2 border-blue-200 dark:border-blue-800">
                          <CardContent className="pt-6 pb-6 text-center">
                            <p className="text-3xl font-bold text-blue-600">{processingStats.average_confidence.toFixed(1)}%</p>
                            <p className="text-sm text-muted-foreground mt-2">Avg Confidence</p>
                          </CardContent>
                        </Card>
                      </div>

                      {processingStats.recent_activity.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-lg mb-4">Recent Activity</h4>
                          <div className="space-y-3">
                            {processingStats.recent_activity.slice(0, 5).map((activity: any, idx: number) => (
                              <Card key={idx} className="border-2">
                                <CardContent className="py-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <p className="font-semibold">{activity.file_name}</p>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {activity.category} • {activity.confidence}% confidence
                                      </p>
                                    </div>
                                    <Badge variant={activity.status === 'success' ? 'default' : 'secondary'} className="h-6">
                                      {activity.status}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Review Queue */}
                {processingQueue.filter((item: any) => item.status === 'review_needed').length > 0 && (
                  <Card className="border-2 border-orange-200 dark:border-orange-800">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center text-xl">
                        <AlertCircle className="h-6 w-6 mr-3 text-orange-600" />
                        Review Queue ({processingQueue.filter((item: any) => item.status === 'review_needed').length})
                      </CardTitle>
                      <CardDescription className="text-base">
                        Documents that need manual review before categorization
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {processingLogs
                          .filter((log: any) => log.status === 'review_required')
                          .slice(0, 10)
                          .map((log: any) => (
                            <Card key={log.id} className="border-2">
                              <CardContent className="py-4">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-4 flex-1">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                      <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-semibold text-base">{log.original_file_name}</p>
                                      <div className="flex items-center gap-3 mt-1">
                                        <Badge variant={log.confidence_score >= 70 ? 'default' : 'secondary'} className="h-6">
                                          {log.confidence_score}%
                                        </Badge>
                                        <Badge variant="outline" className="h-6">
                                          {log.suggested_category || 'Unknown'}
                                        </Badge>
                                        {log.description && (
                                          <Badge variant="secondary" className="h-6">
                                            <Lock className="h-3 w-3 mr-1" />
                                            Restricted
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-2">
                                        Uploaded {formatDate(log.uploaded_at)}
                                        {log.file_size && ` • ${(log.file_size / 1024).toFixed(1)} KB`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleApproveDocument(log.id)}
                                      className="h-9"
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => window.open(`https://drive.google.com/file/d/${log.drive_file_id}/view`, '_blank')}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Processing History */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity (Last 10)</CardTitle>
                    <CardDescription>
                      Recently processed documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {processingLogs.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No processing history yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {processingLogs.map((log: any) => (
                          <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{log.file_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {log.category_name}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {log.confidence_score}% confidence
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={
                                  log.status === 'success' ? 'default' : 
                                  log.status === 'review' ? 'secondary' : 
                                  'destructive'
                                }
                                className="text-xs"
                              >
                                {log.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(log.processed_at)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Comprehensive Audit Trail */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      AI Processing Audit Trail
                    </CardTitle>
                    <CardDescription>
                      Complete history of all AI document processing activities and folder movements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {processingLogs.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No audit trail entries yet
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b">
                            <tr className="text-left">
                              <th className="pb-3 font-semibold">Processed Date</th>
                              <th className="pb-3 font-semibold">Document Name</th>
                              <th className="pb-3 font-semibold">Original Name</th>
                              <th className="pb-3 font-semibold">AI Category</th>
                              <th className="pb-3 font-semibold">Confidence</th>
                              <th className="pb-3 font-semibold">Status</th>
                              <th className="pb-3 font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {processingLogs.map((log: any) => (
                              <tr key={log.id} className="border-b hover:bg-muted/50">
                                <td className="py-3">
                                  <div className="text-sm">
                                    {new Date(log.processed_at).toLocaleDateString('en-ZA', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(log.processed_at).toLocaleTimeString('en-ZA', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3">
                                  <p className="font-medium max-w-xs truncate" title={log.file_name}>
                                    {log.file_name}
                                  </p>
                                </td>
                                <td className="py-3">
                                  <p className="text-muted-foreground max-w-xs truncate" title={log.original_file_name}>
                                    {log.original_file_name || '-'}
                                  </p>
                                </td>
                                <td className="py-3">
                                  <Badge variant="outline">
                                    {log.category_name}
                                  </Badge>
                                </td>
                                <td className="py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-muted rounded-full h-2 max-w-[80px]">
                                      <div 
                                        className="bg-primary h-2 rounded-full transition-all"
                                        style={{ width: `${log.confidence_score}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium">
                                      {log.confidence_score}%
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3">
                                  <Badge 
                                    variant={
                                      log.status === 'success' ? 'default' : 
                                      log.status === 'review' ? 'secondary' : 
                                      'destructive'
                                    }
                                  >
                                    {log.status === 'success' ? '✓ Auto-moved' : 
                                     log.status === 'review' ? '⏸ Needs Review' : 
                                     '✗ Error'}
                                  </Badge>
                                </td>
                                <td className="py-3">
                                  {log.drive_file_id && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => window.open(`https://drive.google.com/file/d/${log.drive_file_id}/view`, '_blank')}
                                      className="h-8"
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      View in Drive
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Data Room Documents</CardTitle>
                      <CardDescription className="text-base mt-1">
                        Manage and organize documents for investor access
                      </CardDescription>
                    </div>
                    <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
                      <DialogTrigger asChild>
                        <Button size="lg" className="h-11">
                          <Upload className="h-5 w-5 mr-2" />
                          Upload Document
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-lg">No documents uploaded yet</p>
                      <p className="text-sm text-muted-foreground mt-2">Upload your first document to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc: any) => (
                        <Card key={doc.id} className="border-2">
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-base">{doc.document_name}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <Badge variant="outline" className="h-6">
                                      {doc.category_name}
                                    </Badge>
                                    {doc.is_required_for_license && (
                                      <Badge variant="default" className="h-6 bg-green-600">
                                        Required for License
                                      </Badge>
                                    )}
                                    {doc.restricted_access && (
                                      <Badge variant="secondary" className="h-6">
                                        <Lock className="h-3 w-3 mr-1" />
                                        Restricted
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-2">
                                    Uploaded {formatDate(doc.uploaded_at)}
                                    {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(1)} KB`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {doc.storage_url && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(doc.storage_url, '_blank')}
                                    className="h-9"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Categories</CardTitle>
                      <CardDescription>Organize documents by category</CardDescription>
                    </div>
                    <Button onClick={() => setCategoryDialog(true)}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categories.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No categories created yet
                      </p>
                    ) : (
                      categories.map((category) => (
                        <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">{category.category_name}</h4>
                            {category.description && (
                              <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Display Order: {category.display_order}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">
                              {documents.filter(d => d.category_id === category.id).length} docs
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditCategory(category)}
                              className="h-9"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a new document to the data room
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">File *</Label>
              <Input 
                id="file"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setUploadFile(file || null);
                  if (file && !uploadData.document_name) {
                    setUploadData(prev => ({ ...prev, document_name: file.name }));
                  }
                }}
                className="mt-2"
              />
              {uploadFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="document_name">Document Name *</Label>
              <Input 
                id="document_name"
                value={uploadData.document_name}
                onChange={(e) => setUploadData(prev => ({ ...prev, document_name: e.target.value }))}
                placeholder="e.g., Certificate of Incorporation"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select 
                value={uploadData.category_id} 
                onValueChange={(value) => setUploadData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description"
                value={uploadData.description}
                onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the document"
                rows={2}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="version">Version</Label>
                <Input 
                  id="version"
                  value={uploadData.version}
                  onChange={(e) => setUploadData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="1.0"
                  className="mt-2"
                />
              </div>
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="required"
                    checked={uploadData.is_required_for_license}
                    onCheckedChange={(checked) => 
                      setUploadData(prev => ({ ...prev, is_required_for_license: checked as boolean }))
                    }
                  />
                  <Label htmlFor="required" className="text-sm cursor-pointer">
                    Required for license
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadDocument} disabled={uploading || !uploadFile}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>
              Add a new category to organize documents
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="category_name">Category Name *</Label>
              <Input 
                id="category_name"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Corporate Documents"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="category_description">Description</Label>
              <Textarea 
                id="category_description"
                value={newCategory.description}
                onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this category"
                rows={2}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input 
                id="display_order"
                type="number"
                value={newCategory.displayOrder}
                onChange={(e) => setNewCategory(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                placeholder="0"
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory}>
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editCategoryDialog} onOpenChange={setEditCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_category_name">Category Name *</Label>
              <Input 
                id="edit_category_name"
                value={editCategoryData.name}
                onChange={(e) => setEditCategoryData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Corporate Documents"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="edit_category_description">Description</Label>
              <Textarea 
                id="edit_category_description"
                value={editCategoryData.description}
                onChange={(e) => setEditCategoryData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this category"
                rows={2}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="edit_display_order">Display Order</Label>
              <Input 
                id="edit_display_order"
                type="number"
                value={editCategoryData.displayOrder}
                onChange={(e) => setEditCategoryData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                placeholder="0"
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCategory}>
              Update Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BackOfficeDataRoom;
