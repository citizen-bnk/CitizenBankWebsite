import { useState, useEffect } from "react";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { BackOfficeNav } from "components/BackOfficeNav";
import { apiClient } from "app";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Mail, Search, Eye, Send } from "lucide-react";

interface SentEmail {
  id: number;
  email_id: string;
  queue_id: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  body_html: string;
  template_name?: string;
  status: "pending" | "sent" | "failed" | "retrying";
  sent_at?: string;
  sent_by: string;
  created_at: string;
  last_error?: string;
  retry_count?: number;
}

interface QueueStats {
  pending: number;
  retrying: number;
  sent: number;
  failed: number;
  total: number;
}

export default function BackOfficeSentItems() {
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const loadSentItems = async () => {
    try {
      console.log("[BackOfficeSentItems] Loading emails...");
      console.log("[BackOfficeSentItems] statusFilter:", statusFilter);
      console.log("[BackOfficeSentItems] searchTerm:", searchTerm);
      
      const response = await apiClient.list_sent_emails({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchTerm || undefined,
      });
      
      console.log("[BackOfficeSentItems] Response status:", response.status);
      const data = await response.json();
      console.log("[BackOfficeSentItems] Response data:", data);
      console.log("[BackOfficeSentItems] Emails count:", data.emails?.length);
      
      setEmails(data.emails || []);
    } catch (error) {
      console.error("Failed to load sent items:", error);
      toast.error("Failed to load sent emails");
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get_email_queue_status();
      const data = await response.json();
      console.log("[BackOfficeSentItems] Stats data:", data);
      setStats(data.queue_stats || null);
    } catch (error) {
      console.error("Failed to load email stats:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadSentItems(), loadStats()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearch = () => {
    loadSentItems();
  };

  const handleResend = async (queueId: string) => {
    try {
      await apiClient.retry_failed_email({ queueId });
      toast.success("Email requeued for sending");
      loadData();
    } catch (error) {
      toast.error("Failed to resend email");
    }
  };

  const handleViewPreview = (email: SentEmail) => {
    setSelectedEmail(email);
    setShowPreview(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      sent: "default",
      pending: "secondary",
      retrying: "outline",
      failed: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <BackOfficeNav />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Sent Items</h1>
                <p className="text-muted-foreground mt-1">
                  View and manage all sent emails from the system
                </p>
              </div>
              <Button onClick={loadData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Emails</CardDescription>
                    <CardTitle className="text-3xl">{stats.total}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Sent</CardDescription>
                    <CardTitle className="text-3xl text-green-600">
                      {stats.sent}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Pending</CardDescription>
                    <CardTitle className="text-3xl text-blue-600">
                      {stats.pending}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Retrying</CardDescription>
                    <CardTitle className="text-3xl text-orange-600">
                      {stats.retrying}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Failed</CardDescription>
                    <CardTitle className="text-3xl text-red-600">
                      {stats.failed}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>
            )}

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by email, subject, or queue ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="retrying">Retrying</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleSearch}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Email List */}
            <Card>
              <CardHeader>
                <CardTitle>Email History</CardTitle>
                <CardDescription>
                  {emails.length} email(s) found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">Loading emails...</p>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">No emails found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Queue ID</TableHead>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Template</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Sent At</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emails.map((email) => (
                          <TableRow key={email.id}>
                            <TableCell className="font-mono text-xs">
                              {email.queue_id}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {email.recipient_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {email.recipient_email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {email.subject}
                            </TableCell>
                            <TableCell>
                              {email.template_name || (
                                <span className="text-muted-foreground">Custom</span>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(email.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(email.sent_at)}
                              {email.retry_count && email.retry_count > 0 && (
                                <div className="text-xs text-orange-600">
                                  Retry {email.retry_count}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewPreview(email)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {email.status === "failed" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleResend(email.queue_id)}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <Footer />

      {/* Email Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              {selectedEmail?.subject}
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">To:</span>{" "}
                  {selectedEmail.recipient_email}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  {getStatusBadge(selectedEmail.status)}
                </div>
                <div>
                  <span className="font-medium">Queue ID:</span>{" "}
                  <span className="font-mono text-xs">{selectedEmail.queue_id}</span>
                </div>
                <div>
                  <span className="font-medium">Sent:</span>{" "}
                  {formatDate(selectedEmail.sent_at)}
                </div>
              </div>
              {selectedEmail.last_error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="font-medium text-destructive">Error:</p>
                  <p className="text-sm text-destructive/80">
                    {selectedEmail.last_error}
                  </p>
                </div>
              )}
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="font-medium mb-2">Email Content:</p>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
