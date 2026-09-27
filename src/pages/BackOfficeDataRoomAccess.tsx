import { useState, useEffect } from "react";
import { useUserGuardContext } from "app/auth";
import { apiClient } from "app";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, FileText, Users, CheckCircle2, XCircle, Clock, Download } from "lucide-react";
import { toast } from "sonner";
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BackOfficeNav } from '@/components/BackOfficeNav';

interface AccessLog {
  id: number;
  user_id: string;
  document_id: number;
  document_name: string;
  accessed_at: string;
  access_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

interface Agreement {
  id: number;
  user_id: string;
  agreement_type: string;
  signed_at: string;
  agreement_version: string | null;
  ip_address: string | null;
}

interface PendingUser {
  user_id: string;
  missing_agreements: string[];
  has_subscriptions: boolean;
  has_board_investments: boolean;
}

interface DocumentStat {
  document_id: number;
  document_name: string;
  category_name: string | null;
  total_accesses: number;
  unique_users: number;
  last_accessed: string | null;
}

const BackOfficeDataRoomAccess = () => {
  const { user } = useUserGuardContext();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("access-logs");
  
  // Access logs
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [logFilters, setLogFilters] = useState({
    user_id: "",
    document_id: "",
    start_date: "",
    end_date: ""
  });
  
  // Agreements
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [agreementFilter, setAgreementFilter] = useState("");
  
  // Pending users
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  
  // Document stats
  const [docStats, setDocStats] = useState<DocumentStat[]>([]);

  useEffect(() => {
    loadAccessLogs();
  }, [logFilters]);

  useEffect(() => {
    if (activeTab === "agreements") loadAgreements();
    if (activeTab === "pending") loadPendingUsers();
    if (activeTab === "stats") loadDocumentStats();
  }, [activeTab]);

  const loadAccessLogs = async () => {
    try {
      const params: any = { limit: 100 };
      if (logFilters.user_id) params.user_id = logFilters.user_id;
      if (logFilters.document_id) params.document_id = parseInt(logFilters.document_id);
      if (logFilters.start_date) params.start_date = logFilters.start_date;
      if (logFilters.end_date) params.end_date = logFilters.end_date;
      
      const response = await apiClient.get_access_logs(params);
      const data = await response.json();
      setAccessLogs(data.logs || []);
    } catch (error) {
      console.error("Error loading access logs:", error);
      toast.error("Failed to load access logs");
    } finally {
      setLoading(false);
    }
  };

  const loadAgreements = async () => {
    try {
      const params: any = { limit: 100 };
      if (agreementFilter) params.agreement_type = agreementFilter;
      
      const response = await apiClient.get_all_agreements(params);
      const data = await response.json();
      setAgreements(data.agreements || []);
    } catch (error) {
      console.error("Error loading agreements:", error);
      toast.error("Failed to load agreements");
    }
  };

  const loadPendingUsers = async () => {
    try {
      const response = await apiClient.get_pending_agreements();
      const data = await response.json();
      setPendingUsers(data.pending_users || []);
    } catch (error) {
      console.error("Error loading pending users:", error);
      toast.error("Failed to load pending users");
    }
  };

  const loadDocumentStats = async () => {
    try {
      const response = await apiClient.get_document_stats();
      const data = await response.json();
      setDocStats(data.stats || []);
    } catch (error) {
      console.error("Error loading document stats:", error);
      toast.error("Failed to load document statistics");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-ZA', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Johannesburg'
    });
  };

  const getAgreementTypeName = (type: string) => {
    switch (type) {
      case 'ncnda': return 'NCNDA';
      case 'terms': return 'Terms & Conditions';
      case 'letter_of_intent': return 'Letter of Intent';
      default: return type;
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Export completed");
  };

  if (loading && activeTab === "access-logs") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading audit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <BackOfficeNav currentPage="Data Room Access" />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 flex items-center">
              <Shield className="h-8 w-8 mr-3 text-primary" />
              Data Room Access Audit
            </h1>
            <p className="text-muted-foreground">
              Monitor document access, agreements, and compliance
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="access-logs">Access Logs</TabsTrigger>
              <TabsTrigger value="agreements">Agreements</TabsTrigger>
              <TabsTrigger value="pending">Pending Users</TabsTrigger>
              <TabsTrigger value="stats">Document Stats</TabsTrigger>
            </TabsList>

            {/* Access Logs Tab */}
            <TabsContent value="access-logs">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Access Logs</CardTitle>
                      <CardDescription>
                        All document access attempts with timestamps and reasons
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => exportToCSV(accessLogs, 'access-logs.csv')}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <Label htmlFor="user-filter">User ID</Label>
                      <Input 
                        id="user-filter"
                        placeholder="Filter by user"
                        value={logFilters.user_id}
                        onChange={(e) => setLogFilters(prev => ({ ...prev, user_id: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="doc-filter">Document ID</Label>
                      <Input 
                        id="doc-filter"
                        placeholder="Filter by document"
                        value={logFilters.document_id}
                        onChange={(e) => setLogFilters(prev => ({ ...prev, document_id: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input 
                        id="start-date"
                        type="datetime-local"
                        value={logFilters.start_date}
                        onChange={(e) => setLogFilters(prev => ({ ...prev, start_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">End Date</Label>
                      <Input 
                        id="end-date"
                        type="datetime-local"
                        value={logFilters.end_date}
                        onChange={(e) => setLogFilters(prev => ({ ...prev, end_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User ID</TableHead>
                          <TableHead>Document</TableHead>
                          <TableHead>Accessed At</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accessLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No access logs found
                            </TableCell>
                          </TableRow>
                        ) : (
                          accessLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-xs">{log.user_id.substring(0, 16)}...</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{log.document_name}</p>
                                  <p className="text-xs text-muted-foreground">ID: {log.document_id}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{formatDate(log.accessed_at)}</TableCell>
                              <TableCell className="font-mono text-xs">{log.ip_address || 'N/A'}</TableCell>
                              <TableCell className="text-sm max-w-xs truncate">{log.access_reason || 'No reason provided'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Agreements Tab */}
            <TabsContent value="agreements">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Signed Agreements</CardTitle>
                      <CardDescription>
                        All user agreements with timestamps and IP addresses
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Select value={agreementFilter} onValueChange={setAgreementFilter}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="All agreement types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Types</SelectItem>
                          <SelectItem value="ncnda">NCNDA</SelectItem>
                          <SelectItem value="terms">Terms & Conditions</SelectItem>
                          <SelectItem value="letter_of_intent">Letter of Intent</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={() => exportToCSV(agreements, 'agreements.csv')}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User ID</TableHead>
                          <TableHead>Agreement Type</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead>Signed At</TableHead>
                          <TableHead>IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agreements.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No agreements found
                            </TableCell>
                          </TableRow>
                        ) : (
                          agreements.map((agreement) => (
                            <TableRow key={agreement.id}>
                              <TableCell className="font-mono text-xs">{agreement.user_id.substring(0, 16)}...</TableCell>
                              <TableCell>
                                <Badge variant="default">
                                  {getAgreementTypeName(agreement.agreement_type)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{agreement.agreement_version || 'N/A'}</TableCell>
                              <TableCell className="text-sm">{formatDate(agreement.signed_at)}</TableCell>
                              <TableCell className="font-mono text-xs">{agreement.ip_address || 'N/A'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pending Users Tab */}
            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Agreements</CardTitle>
                  <CardDescription>
                    Investors who haven't completed all required agreements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingUsers.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                        <p>All investors have completed their agreements</p>
                      </div>
                    ) : (
                      pendingUsers.map((pendingUser, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-mono text-sm mb-2">{pendingUser.user_id}</p>
                            <div className="flex gap-2 mb-2">
                              {pendingUser.has_subscriptions && (
                                <Badge variant="secondary">Has Subscriptions</Badge>
                              )}
                              {pendingUser.has_board_investments && (
                                <Badge variant="secondary">Board Investor</Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {pendingUser.missing_agreements.map((missing) => (
                                <Badge key={missing} variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Missing: {getAgreementTypeName(missing)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Document Stats Tab */}
            <TabsContent value="stats">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Document Access Statistics</CardTitle>
                      <CardDescription>
                        Usage metrics for all data room documents
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => exportToCSV(docStats, 'document-stats.csv')}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Total Accesses</TableHead>
                          <TableHead>Unique Users</TableHead>
                          <TableHead>Last Accessed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {docStats.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No document statistics available
                            </TableCell>
                          </TableRow>
                        ) : (
                          docStats.map((stat) => (
                            <TableRow key={stat.document_id}>
                              <TableCell className="font-medium">{stat.document_name}</TableCell>
                              <TableCell>{stat.category_name || 'Uncategorized'}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{stat.total_accesses}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{stat.unique_users}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {stat.last_accessed ? formatDate(stat.last_accessed) : 'Never'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BackOfficeDataRoomAccess;
