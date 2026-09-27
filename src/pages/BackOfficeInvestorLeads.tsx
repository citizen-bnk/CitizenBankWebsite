import { useState, useEffect } from "react";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { BackOfficeNav } from "components/BackOfficeNav";
import { ResponsiveTable } from "components/ResponsiveTable";
import { LeadChatCreator } from "components/LeadChatCreator";
import { LeadStoryViewer } from "components/LeadStoryViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { apiClient } from "app";
import type {
  LeadResponse,
  CreateLeadRequest,
  UpdateLeadRequest,
  AnalyticsResponse,
  BulkImportSummary,
  AppApisInvestorInvitationsInvitationResponse,
  SendInvitationRequest,
  BulkSendInvitationRequest,
} from "types";
import {
  Upload,
  Download,
  Mail,
  Plus,
  Filter,
  Search,
  TrendingUp,
  Users,
  Send,
  Eye,
  Activity,
  BarChart3,
  FileSpreadsheet,
  Calendar,
  MessageSquare,
} from "lucide-react";

const BackOfficeInvestorLeads = () => {
  const [leads, setLeads] = useState<LeadResponse[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [invitationStats, setInvitationStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadResponse | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showChatCreator, setShowChatCreator] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showBulkInviteDialog, setShowBulkInviteDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Form states
  const [newLead, setNewLead] = useState<Partial<CreateLeadRequest>>({
    full_name: "",
    email: "",
    phone: "",
    company: "",
    country: "Lesotho",
    lead_source: "website",
    notes: "",
  });
  
  const [inviteForm, setInviteForm] = useState<Partial<SendInvitationRequest>>({
    share_class: "Class A - Ordinary Shares",
    minimum_investment: 10000,
    special_terms: "",
    contact_person: "Investor Relations Team",
    contact_email: "invest@citizenhub.co.za",
    contact_phone: "+266 2231 2345",
  });

  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    loadLeads();
    loadAnalytics();
    loadInvitationStats();
  }, [statusFilter, sourceFilter, searchQuery]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (sourceFilter && sourceFilter !== "all") params.lead_source = sourceFilter;
      if (searchQuery) params.search = searchQuery;
      
      const response = await apiClient.list_leads(params);
      const data = await response.json();
      setLeads(data);
    } catch (error) {
      toast.error("Failed to load leads");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await apiClient.get_analytics();
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    }
  };

  const loadInvitationStats = async () => {
    try {
      const response = await apiClient.get_invitation_stats();
      const data = await response.json();
      setInvitationStats(data);
    } catch (error) {
      console.error("Failed to load invitation stats:", error);
    }
  };

  const handleCreateLead = async () => {
    try {
      const response = await apiClient.create_lead(newLead as CreateLeadRequest);
      if (response.ok) {
        toast.success("Lead created successfully");
        setShowAddDialog(false);
        setNewLead({
          full_name: "",
          email: "",
          phone: "",
          company: "",
          country: "Lesotho",
          lead_source: "website",
          notes: "",
        });
        loadLeads();
        loadAnalytics();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to create lead");
      }
    } catch (error) {
      toast.error("Error creating lead");
      console.error(error);
    }
  };

  const handleSendInvitation = async (leadId: number) => {
    try {
      const body: SendInvitationRequest = {
        lead_id: leadId,
        share_class: inviteForm.share_class!,
        minimum_investment: inviteForm.minimum_investment!,
        special_terms: inviteForm.special_terms,
        personalized_message: inviteForm.personalized_message,
        contact_person: inviteForm.contact_person,
        contact_email: inviteForm.contact_email,
        contact_phone: inviteForm.contact_phone,
      };
      
      const response = await apiClient.send_invitation(body);
      if (response.ok) {
        toast.success("Invitation sent successfully");
        setShowInviteDialog(false);
        loadLeads();
        loadInvitationStats();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to send invitation");
      }
    } catch (error) {
      toast.error("Error sending invitation");
      console.error(error);
    }
  };

  const handleBulkSendInvitations = async () => {
    if (selectedLeads.length === 0) {
      toast.error("Please select at least one lead");
      return;
    }
    
    try {
      const body: BulkSendInvitationRequest = {
        lead_ids: selectedLeads,
        share_class: inviteForm.share_class!,
        minimum_investment: inviteForm.minimum_investment!,
        special_terms: inviteForm.special_terms,
        contact_person: inviteForm.contact_person,
        contact_email: inviteForm.contact_email,
        contact_phone: inviteForm.contact_phone,
      };
      
      const response = await apiClient.bulk_send_invitations(body);
      if (response.ok) {
        const result: any = await response.json();
        toast.success(
          `Sent ${result.successful} invitations. ${result.failed} failed.`
        );
        setShowBulkInviteDialog(false);
        setSelectedLeads([]);
        loadLeads();
        loadInvitationStats();
      } else {
        toast.error("Failed to send bulk invitations");
      }
    } catch (error) {
      toast.error("Error sending bulk invitations");
      console.error(error);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile) {
      toast.error("Please select a CSV file");
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      
      const response = await apiClient.bulk_import_leads({ file: importFile });
      if (response.ok) {
        const result: BulkImportSummary = await response.json();
        toast.success(
          `Imported ${result.successful} leads. ${result.failed} failed.`
        );
        setShowImportDialog(false);
        setImportFile(null);
        loadLeads();
        loadAnalytics();
      } else {
        toast.error("Failed to import leads");
      }
    } catch (error) {
      toast.error("Error importing leads");
      console.error(error);
    }
  };

  const handleViewDetails = async (lead: LeadResponse) => {
    setSelectedLead(lead);
    setShowDetailDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      interested: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      invited: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      converted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
      declined: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    
    return (
      <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  const toggleLeadSelection = (leadId: number) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          checked={selectedLeads.length === leads.length && leads.length > 0}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedLeads(leads.map(l => l.id));
            } else {
              setSelectedLeads([]);
            }
          }}
          className="h-4 w-4 rounded border-gray-300"
        />
      ),
      render: (lead: LeadResponse) => (
        <input
          type="checkbox"
          checked={selectedLeads.includes(lead.id)}
          onChange={() => toggleLeadSelection(lead.id)}
          className="h-4 w-4 rounded border-gray-300"
        />
      ),
    },
    {
      key: "full_name",
      label: "Name",
      render: (lead: LeadResponse) => (
        <div>
          <div className="font-medium text-foreground">{lead.full_name}</div>
          <div className="text-sm text-muted-foreground">{lead.email}</div>
        </div>
      ),
    },
    {
      key: "company",
      label: "Company",
      render: (lead: LeadResponse) => lead.company || "-",
    },
    {
      key: "country",
      label: "Country",
    },
    {
      key: "lead_source",
      label: "Source",
      render: (lead: LeadResponse) => (
        <div className="flex flex-col gap-1">
          <Badge variant="outline">{lead.lead_source}</Badge>
          {lead.lead_source === "ai_chat" && (
            <Badge variant="secondary" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              AI Created
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (lead: LeadResponse) => getStatusBadge(lead.status),
    },
    {
      key: "invitation_count",
      label: "Invites",
      render: (lead: LeadResponse) => (
        <div className="text-center">
          <Badge variant="secondary">{lead.invitation_count || 0}</Badge>
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      render: (lead: LeadResponse) => 
        new Date(lead.created_at).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (lead: LeadResponse) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleViewDetails(lead)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedLead(lead);
              setShowInviteDialog(true);
            }}
            disabled={lead.status === "converted"}
          >
            <Mail className="h-4 w-4" />
          </Button>
          {lead.lead_source === "ai_chat" && (
            <LeadStoryViewer
              leadId={lead.id}
              leadSource={lead.lead_source}
              triggerButton={
                <Button size="sm" variant="ghost">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              }
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <BackOfficeNav />
          
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Investor Leads</h1>
                <p className="text-muted-foreground mt-1">
                  Manage potential investors and send investment invitations
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowImportDialog(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead
                </Button>
                <Button onClick={() => setShowChatCreator(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Create Lead with AI
                </Button>
              </div>
            </div>

            <Tabs defaultValue="leads" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="leads">
                  <Users className="h-4 w-4 mr-2" />
                  Leads ({leads.length})
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="leads" className="space-y-4">
                {/* Filters */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Filter className="h-5 w-5 mr-2" />
                      Filters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Search</Label>
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Name, email, company..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={statusFilter || "all"} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="interested">Interested</SelectItem>
                            <SelectItem value="invited">Invited</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="declined">Declined</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Source</Label>
                        <Select value={sourceFilter || "all"} onValueChange={setSourceFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All sources" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All sources</SelectItem>
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="referral">Referral</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                            <SelectItem value="social_media">Social Media</SelectItem>
                            <SelectItem value="direct">Direct</SelectItem>
                            <SelectItem value="bulk_import">Bulk Import</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        {selectedLeads.length > 0 && (
                          <Button
                            onClick={() => setShowBulkInviteDialog(true)}
                            className="w-full"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send to {selectedLeads.length}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Leads Table */}
                <Card>
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="p-8 text-center text-muted-foreground">
                        Loading leads...
                      </div>
                    ) : leads.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No leads found. Add your first lead to get started.
                      </div>
                    ) : (
                      <ResponsiveTable 
                        columns={columns} 
                        data={leads}
                        keyExtractor={(lead) => lead.id}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Leads
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics?.total_leads || 0}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Conversion Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {analytics?.conversion_rate || 0}%
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Invitations Sent
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {invitationStats?.total_sent || 0}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Response Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {invitationStats?.response_rate || 0}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Status Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Leads by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analytics?.leads_by_status && Object.entries(analytics.leads_by_status).map(([status, count]) => (
                          <div key={status} className="flex justify-between items-center">
                            <span className="capitalize">{status}</span>
                            <Badge>{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Leads by Source</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analytics?.leads_by_source && Object.entries(analytics.leads_by_source).map(([source, count]) => (
                          <div key={source} className="flex justify-between items-center">
                            <span className="capitalize">{source.replace('_', ' ')}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Invitation Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Invitation Engagement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-1">Open Rate</div>
                        <div className="text-2xl font-bold">{invitationStats?.open_rate || 0}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-1">Click Rate</div>
                        <div className="text-2xl font-bold">{invitationStats?.click_rate || 0}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-1">Response Rate</div>
                        <div className="text-2xl font-bold">{invitationStats?.response_rate || 0}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-1">Conversion</div>
                        <div className="text-2xl font-bold text-green-600">
                          {invitationStats?.conversion_rate || 0}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <Footer />

      {/* Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Enter the lead's information to add them to the system
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={newLead.full_name}
                onChange={(e) => setNewLead({ ...newLead, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                placeholder="+266..."
              />
            </div>
            <div>
              <Label>Company</Label>
              <Input
                value={newLead.company}
                onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                placeholder="Company name"
              />
            </div>
            <div>
              <Label>Country *</Label>
              <Input
                value={newLead.country}
                onChange={(e) => setNewLead({ ...newLead, country: e.target.value })}
              />
            </div>
            <div>
              <Label>Lead Source</Label>
              <Select
                value={newLead.lead_source}
                onValueChange={(val) => setNewLead({ ...newLead, lead_source: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="direct">Direct Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={newLead.notes}
                onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                placeholder="Additional information about this lead..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLead}>
              Create Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Invitation Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Investment Invitation</DialogTitle>
            <DialogDescription>
              Configure and send investment invitation to {selectedLead?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Share Class *</Label>
              <Select
                value={inviteForm.share_class}
                onValueChange={(val) => setInviteForm({ ...inviteForm, share_class: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Class A - Ordinary Shares">Class A - Ordinary Shares</SelectItem>
                  <SelectItem value="Class B - Preference Shares">Class B - Preference Shares</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Minimum Investment (LSL) *</Label>
              <Input
                type="number"
                value={inviteForm.minimum_investment}
                onChange={(e) => setInviteForm({ ...inviteForm, minimum_investment: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Special Terms (Optional)</Label>
              <Textarea
                value={inviteForm.special_terms}
                onChange={(e) => setInviteForm({ ...inviteForm, special_terms: e.target.value })}
                placeholder="e.g., Early bird discount, bonus shares, etc."
                rows={2}
              />
            </div>
            <div>
              <Label>Personalized Message (Optional)</Label>
              <Textarea
                value={inviteForm.personalized_message}
                onChange={(e) => setInviteForm({ ...inviteForm, personalized_message: e.target.value })}
                placeholder="Additional personalized message for this investor..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedLead && handleSendInvitation(selectedLead.id)}>
              <Send className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Send Dialog */}
      <Dialog open={showBulkInviteDialog} onOpenChange={setShowBulkInviteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Bulk Invitations</DialogTitle>
            <DialogDescription>
              Send investment invitations to {selectedLeads.length} selected leads
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Share Class *</Label>
              <Select
                value={inviteForm.share_class}
                onValueChange={(val) => setInviteForm({ ...inviteForm, share_class: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Class A - Ordinary Shares">Class A - Ordinary Shares</SelectItem>
                  <SelectItem value="Class B - Preference Shares">Class B - Preference Shares</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Minimum Investment (LSL) *</Label>
              <Input
                type="number"
                value={inviteForm.minimum_investment}
                onChange={(e) => setInviteForm({ ...inviteForm, minimum_investment: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Special Terms (Optional)</Label>
              <Textarea
                value={inviteForm.special_terms}
                onChange={(e) => setInviteForm({ ...inviteForm, special_terms: e.target.value })}
                placeholder="e.g., Early bird discount, bonus shares, etc."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkSendInvitations}>
              <Send className="h-4 w-4 mr-2" />
              Send to {selectedLeads.length} Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Leads from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with lead information. Required columns: full_name, email, country
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>CSV File</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Optional columns: phone, company, lead_source, investment_interest_amount, preferred_share_class, notes
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportCSV} disabled={!importFile}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Details Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedLead?.full_name}</DialogTitle>
            <DialogDescription>
              Lead details and activity history
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedLead.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedLead.phone || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Company</Label>
                  <p className="font-medium">{selectedLead.company || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Country</Label>
                  <p className="font-medium">{selectedLead.country}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Source</Label>
                  <Badge variant="outline">{selectedLead.lead_source}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  {getStatusBadge(selectedLead.status)}
                </div>
                <div>
                  <Label className="text-muted-foreground">Invitations Sent</Label>
                  <p className="font-medium">{selectedLead.invitation_count || 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">
                    {new Date(selectedLead.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {selectedLead.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selectedLead.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Lead Chat Creator */}
      <LeadChatCreator
        open={showChatCreator}
        onClose={() => setShowChatCreator(false)}
        onLeadCreated={(leadId) => {
          toast.success(`Lead created successfully with ID: ${leadId}`);
          loadLeads();
          setShowChatCreator(false);
        }}
      />
    </div>
  );
};

export default BackOfficeInvestorLeads;
