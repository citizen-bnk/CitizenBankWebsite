import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from 'app';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { BackOfficeNav } from 'components/BackOfficeNav';
import { RoleGuard } from 'components/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Mail, 
  Search, 
  Edit, 
  Plus, 
  Eye, 
  Clock,
  TrendingUp,
  Code,
  Save,
  X,
  Info,
  Copy,
  Send,
  Power,
  PowerOff,
  FileCode,
  BarChart3,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
  MessageSquare,
  LayoutDashboard,
  Activity,
  Users,
  Zap
} from 'lucide-react';

interface TemplateRegistryItem {
  id: number;
  template_name: string;
  category: string;
  subject: string;
  template_type: string;
  function_name: string | null;
  module_path: string | null;
  trigger_points: Array<{endpoint?: string; api?: string; screen?: string}>;
  process_flow: string | null;
  parameters: Record<string, any>;
  can_edit: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface UsageStats {
  template_name: string;
  total_usage_count: number;
  recent_stats: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    success_rate: number;
  };
  recent_sends: Array<{
    email_id: string;
    recipient: string;
    subject: string;
    status: string;
    sent_at: string | null;
    created_at: string;
  }>;
}

function CommunicationPortalContent() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  
  // Active tab state
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Detail view
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRegistryItem | null>(null);
  
  // Test email
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testData, setTestData] = useState<Record<string, any>>({});
  const [sending, setSending] = useState(false);
  
  // Preview
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewing, setPreviewing] = useState(false);
  
  // Usage stats
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.list_template_registry();
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (template: TemplateRegistryItem) => {
    setSelectedTemplate(template);
    setDetailOpen(true);
    
    // Load usage stats
    await loadUsageStats(template.id);
  };

  const loadUsageStats = async (templateId: number) => {
    try {
      setLoadingStats(true);
      const response = await apiClient.get_template_usage_stats({ templateId });
      const data = await response.json();
      setUsageStats(data);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const toggleActive = async (template: TemplateRegistryItem) => {
    try {
      const response = await apiClient.toggle_template_active_status({ templateId: template.id });
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        await loadTemplates();
        
        // Update selected template if detail is open
        if (selectedTemplate?.id === template.id) {
          setSelectedTemplate({ ...template, is_active: result.is_active });
        }
      }
    } catch (error) {
      console.error('Failed to toggle template:', error);
      toast.error('Failed to update template status');
    }
  };

  const openTestDialog = (template: TemplateRegistryItem) => {
    setSelectedTemplate(template);
    setTestEmail('');
    setTestData({});
    setTestDialogOpen(true);
  };

  const sendTestEmail = async () => {
    if (!selectedTemplate || !testEmail) return;
    
    try {
      setSending(true);
      const response = await apiClient.test_template_from_registry({
        template_id: selectedTemplate.id,
        recipient_email: testEmail,
        override_data: testData
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Test email sent to ${testEmail}`);
        setTestDialogOpen(false);
      } else {
        throw new Error('Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  const openPreview = async (template: TemplateRegistryItem) => {
    setSelectedTemplate(template);
    setPreviewing(true);
    setPreviewDialogOpen(true);
    
    try {
      const response = await apiClient.preview_template_from_registry({
        template_id: template.id,
        sample_data: {}
      });
      
      const result = await response.json();
      
      if (result.success) {
        setPreviewHtml(result.html);
        setPreviewSubject(result.subject);
      }
    } catch (error) {
      console.error('Error previewing template:', error);
      toast.error('Failed to preview template');
    } finally {
      setPreviewing(false);
    }
  };

  // Get unique categories and types
  const categories = ['all', ...new Set(templates.map(t => t.category))];
  const types = ['all', 'hardcoded', 'dynamic'];

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesType = selectedType === 'all' || template.template_type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const hardcodedCount = templates.filter(t => t.template_type === 'hardcoded').length;
  const dynamicCount = templates.filter(t => t.template_type === 'dynamic').length;
  const activeCount = templates.filter(t => t.is_active).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <BackOfficeNav currentPage="communication-portal" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Communication Portal</h1>
          <p className="text-muted-foreground">
            Manage all communication channels - Email, SMS, and WhatsApp
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Email Stats Card */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('email')}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Email Templates</CardTitle>
                    <Mail className="h-8 w-8 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold">{templates.length}</div>
                      <p className="text-sm text-muted-foreground">Total templates</p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <div className="font-semibold">{templates.filter(t => t.is_active).length}</div>
                        <p className="text-muted-foreground">Active</p>
                      </div>
                      <div>
                        <div className="font-semibold">{templates.reduce((sum, t) => sum + t.usage_count, 0).toLocaleString()}</div>
                        <p className="text-muted-foreground">Sent</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); setActiveTab('email'); }}>
                      Manage Email Templates
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* SMS Stats Card */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">SMS Messages</CardTitle>
                    <MessageSquare className="h-8 w-8 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold">0</div>
                      <p className="text-sm text-muted-foreground">Total templates</p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <div className="font-semibold">0</div>
                        <p className="text-muted-foreground">Active</p>
                      </div>
                      <div>
                        <div className="font-semibold">0</div>
                        <p className="text-muted-foreground">Sent</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setActiveTab('sms')}>
                      Manage SMS Templates
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* WhatsApp Stats Card */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">WhatsApp Messages</CardTitle>
                    <MessageSquare className="h-8 w-8 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold">0</div>
                      <p className="text-sm text-muted-foreground">Total templates</p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <div className="font-semibold">0</div>
                        <p className="text-muted-foreground">Active</p>
                      </div>
                      <div>
                        <div className="font-semibold">0</div>
                        <p className="text-muted-foreground">Sent</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setActiveTab('whatsapp')}>
                      Manage WhatsApp Templates
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Communication Activity
                </CardTitle>
                <CardDescription>Overview of recent communications across all channels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">Email</span>
                      </div>
                      <div className="text-2xl font-bold">{templates.reduce((sum, t) => sum + t.usage_count, 0).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Total emails sent</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm">SMS</span>
                      </div>
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground">Total SMS sent</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-emerald-600" />
                        <span className="font-medium text-sm">WhatsApp</span>
                      </div>
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground">Total messages sent</p>
                    </div>
                  </div>

                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      Configure SMS and WhatsApp integrations to start sending messages through those channels.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{templates.length}</div>
                  <p className="text-xs text-muted-foreground">{templates.filter(t => t.is_active).length} active</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hardcoded</CardTitle>
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{templates.filter(t => t.template_type === 'hardcoded').length}</div>
                  <p className="text-xs text-muted-foreground">System templates</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dynamic</CardTitle>
                  <Edit className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{templates.filter(t => t.template_type === 'dynamic').length}</div>
                  <p className="text-xs text-muted-foreground">User-editable</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {templates.reduce((sum, t) => sum + t.usage_count, 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Emails sent</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search templates by name or subject..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Type Filter */}
                  <div className="sm:w-40">
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {types.map(type => (
                        <option key={type} value={type}>
                          {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div className="sm:w-48">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Templates List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading templates...</p>
                </div>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || selectedCategory !== 'all' || selectedType !== 'all'
                        ? 'Try adjusting your filters'
                        : 'No email templates available'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredTemplates.map(template => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <CardTitle className="text-lg">{template.template_name}</CardTitle>
                            
                            {/* Template Type Badge */}
                            {template.template_type === 'hardcoded' ? (
                              <Badge variant="default" className="bg-blue-600">
                                <FileCode className="h-3 w-3 mr-1" />
                                Hardcoded
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Edit className="h-3 w-3 mr-1" />
                                Dynamic
                              </Badge>
                            )}
                            
                            {/* Category Badge */}
                            <Badge variant="outline">{template.category}</Badge>
                            
                            {/* Active Status Badge */}
                            {template.is_active ? (
                              <Badge variant="default" className="bg-green-600">
                                <Power className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <PowerOff className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                            
                            {/* Usage Badge */}
                            <Badge variant="outline" className="text-xs">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {template.usage_count} sent
                            </Badge>
                          </div>
                          
                          <CardDescription className="text-sm mb-2">
                            <strong>Subject:</strong> {template.subject}
                          </CardDescription>
                          
                          {/* Trigger Points Preview */}
                          {template.trigger_points && template.trigger_points.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-2">
                              <span className="font-medium">Used in:</span> {template.trigger_points.length} location(s)
                            </div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPreview(template)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openTestDialog(template)}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openDetail(template)}
                          >
                            <Info className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* SMS Tab */}
          <TabsContent value="sms" className="space-y-6">
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-2xl font-bold mb-4">SMS Integration Coming Soon</div>
              <p className="text-sm">Configure SMS integrations to send messages via SMS.</p>
            </div>
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp" className="space-y-6">
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-2xl font-bold mb-4">WhatsApp Integration Coming Soon</div>
              <p className="text-sm">Configure WhatsApp integrations to send messages via WhatsApp.</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          {selectedTemplate && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <SheetTitle>{selectedTemplate.template_name}</SheetTitle>
                  {selectedTemplate.template_type === 'hardcoded' ? (
                    <Badge variant="default" className="bg-blue-600">
                      <FileCode className="h-3 w-3 mr-1" />
                      Hardcoded
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Edit className="h-3 w-3 mr-1" />
                      Dynamic
                    </Badge>
                  )}
                </div>
                <SheetDescription>
                  {selectedTemplate.category} • {selectedTemplate.is_active ? 'Active' : 'Inactive'}
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="usage">Usage Stats</TabsTrigger>
                  <TabsTrigger value="technical">Technical</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  {/* Subject */}
                  <div>
                    <Label className="text-sm font-medium">Email Subject</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTemplate.subject}</p>
                  </div>

                  <Separator />

                  {/* Process Flow */}
                  {selectedTemplate.process_flow && (
                    <div>
                      <Label className="text-sm font-medium">Process Flow</Label>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        {selectedTemplate.process_flow}
                      </p>
                    </div>
                  )}

                  {/* Trigger Points */}
                  {selectedTemplate.trigger_points && selectedTemplate.trigger_points.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Trigger Points</Label>
                      <div className="space-y-2">
                        {selectedTemplate.trigger_points.map((trigger, idx) => (
                          <div key={idx} className="bg-muted/50 rounded-lg p-3 text-sm">
                            {trigger.endpoint && (
                              <div className="font-mono text-xs mb-1">{trigger.endpoint}</div>
                            )}
                            <div className="flex gap-2 items-center text-muted-foreground">
                              {trigger.api && <Badge variant="outline" className="text-xs">{trigger.api}</Badge>}
                              {trigger.screen && <span>→ {trigger.screen}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Parameters */}
                  {selectedTemplate.parameters && Object.keys(selectedTemplate.parameters).length > 0 && (
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Required Parameters</Label>
                      <div className="space-y-2">
                        {Object.entries(selectedTemplate.parameters).map(([key, value]: [string, any]) => (
                          <div key={key} className="bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-sm font-mono">{key}</code>
                              {value.required && (
                                <Badge variant="destructive" className="text-xs">required</Badge>
                              )}
                              {value.type && (
                                <Badge variant="outline" className="text-xs">{value.type}</Badge>
                              )}
                            </div>
                            {value.description && (
                              <p className="text-xs text-muted-foreground">{value.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => openPreview(selectedTemplate)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openTestDialog(selectedTemplate)}
                      className="flex-1"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Test
                    </Button>
                    <Button
                      variant={selectedTemplate.is_active ? "destructive" : "default"}
                      onClick={() => toggleActive(selectedTemplate)}
                      className="flex-1"
                    >
                      {selectedTemplate.is_active ? (
                        <>
                          <PowerOff className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>

                {/* Usage Stats Tab */}
                <TabsContent value="usage" className="space-y-6">
                  {loadingStats ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : usageStats ? (
                    <>
                      {/* Stats Overview */}
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold">{usageStats.total_usage_count}</div>
                            <p className="text-xs text-muted-foreground">Total Sends</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold">{usageStats.recent_stats.success_rate}%</div>
                            <p className="text-xs text-muted-foreground">Success Rate</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Recent Stats */}
                      <div>
                        <Label className="text-sm font-medium mb-3 block">Recent Activity (Last 20)</Label>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-lg font-bold">{usageStats.recent_stats.total}</div>
                            <p className="text-xs text-muted-foreground">Total</p>
                          </div>
                          <div className="bg-green-500/10 rounded-lg p-3">
                            <div className="text-lg font-bold text-green-600">{usageStats.recent_stats.successful}</div>
                            <p className="text-xs text-muted-foreground">Sent</p>
                          </div>
                          <div className="bg-red-500/10 rounded-lg p-3">
                            <div className="text-lg font-bold text-red-600">{usageStats.recent_stats.failed}</div>
                            <p className="text-xs text-muted-foreground">Failed</p>
                          </div>
                          <div className="bg-yellow-500/10 rounded-lg p-3">
                            <div className="text-lg font-bold text-yellow-600">{usageStats.recent_stats.pending}</div>
                            <p className="text-xs text-muted-foreground">Pending</p>
                          </div>
                        </div>
                      </div>

                      {/* Recent Sends */}
                      {usageStats.recent_sends.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium mb-3 block">Recent Sends</Label>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {usageStats.recent_sends.map((send, idx) => (
                              <div key={idx} className="bg-muted/50 rounded-lg p-3 text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium">{send.recipient}</span>
                                  {send.status === 'sent' ? (
                                    <Badge variant="default" className="bg-green-600 text-xs">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Sent
                                    </Badge>
                                  ) : send.status === 'failed' ? (
                                    <Badge variant="destructive" className="text-xs">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Failed
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">
                                      <Loader2 className="h-3 w-3 mr-1" />
                                      Pending
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {send.sent_at
                                    ? new Date(send.sent_at).toLocaleString()
                                    : new Date(send.created_at).toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No usage data available
                    </div>
                  )}
                </TabsContent>

                {/* Technical Tab */}
                <TabsContent value="technical" className="space-y-6">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Template ID</Label>
                      <p className="text-sm font-mono">{selectedTemplate.id}</p>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Template Type</Label>
                      <p className="text-sm font-mono">{selectedTemplate.template_type}</p>
                    </div>
                    {selectedTemplate.function_name && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Function Name</Label>
                          <p className="text-sm font-mono">{selectedTemplate.function_name}</p>
                        </div>
                      </>
                    )}
                    {selectedTemplate.module_path && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Module Path</Label>
                          <p className="text-sm font-mono">{selectedTemplate.module_path}</p>
                        </div>
                      </>
                    )}
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Can Edit</Label>
                      <p className="text-sm">{selectedTemplate.can_edit ? 'Yes' : 'No (Read-only)'}</p>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Created</Label>
                      <p className="text-sm">{new Date(selectedTemplate.created_at).toLocaleString()}</p>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Last Updated</Label>
                      <p className="text-sm">{new Date(selectedTemplate.updated_at).toLocaleString()}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Test Email Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email for: {selectedTemplate?.template_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="test-email">Recipient Email</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="your.email@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                The test email will use sample data from the template registry.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={sendTestEmail}
                disabled={!testEmail || sending}
                className="flex-1"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setTestDialogOpen(false)}
                disabled={sending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.template_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Subject */}
            <div>
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <p className="text-sm font-medium mt-1">{previewSubject}</p>
            </div>
            
            <Separator />
            
            {/* Email Body Preview */}
            <div className="border rounded-lg overflow-hidden">
              {previewing ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[500px]"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

export default function CommunicationPortal() {
  return (
    <RoleGuard
      allowedRoles={['super_admin', 'back_office_staff']}
      deniedMessage="You need back office or super admin access to view this page."
    >
      <CommunicationPortalContent />
    </RoleGuard>
  );
}
