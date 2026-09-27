import { useState, useEffect } from 'react';
import { useUserGuardContext } from 'app/auth';
import brain from 'brain';
import { ShareCertificate } from 'types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { BackOfficeNav } from 'components/BackOfficeNav';
import { 
  FileCheck, 
  FileX, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Ban,
  CheckCircle,
  TrendingUp,
  Users,
  FileText,
  AlertCircle
} from 'lucide-react';

interface CertificateStats {
  total_certificates: number;
  active_certificates: number;
  revoked_certificates: number;
  total_shares_certified: number;
  unique_shareholders: number;
  template_based_certs: number;
  legacy_certs: number;
}

export default function BackOfficeCertificates() {
  const { user } = useUserGuardContext();
  const [certificates, setCertificates] = useState<ShareCertificate[]>([]);
  const [stats, setStats] = useState<CertificateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shareClassFilter, setShareClassFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [certNumberSearch, setCertNumberSearch] = useState('');
  
  // Pagination
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  
  // Status update dialog
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedCert, setSelectedCert] = useState<ShareCertificate | null>(null);
  const [newStatus, setNewStatus] = useState<'active' | 'revoked'>('active');
  const [statusReason, setStatusReason] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadCertificates();
    loadStatistics();
  }, [statusFilter, shareClassFilter, offset]);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const response = await brain.list_certificates({
        status: statusFilter === 'all' ? undefined : statusFilter,
        shareClass: shareClassFilter === 'all' ? undefined : shareClassFilter,
        shareholderName: searchTerm || undefined,
        certificateNumber: certNumberSearch || undefined,
        limit,
        offset
      });
      
      const data = await response.json();
      setCertificates(data.certificates);
      setTotalCount(data.total_count);
    } catch (error) {
      console.error('Error loading certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await brain.get_certificate_statistics();
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleSearch = () => {
    setOffset(0);
    loadCertificates();
  };

  const handleStatusUpdate = async () => {
    if (!selectedCert) return;
    
    try {
      setUpdating(true);
      await brain.update_certificate_status(
        { certificateId: selectedCert.id },
        { status: newStatus, reason: statusReason }
      );
      
      toast.success(`Certificate ${newStatus === 'active' ? 'activated' : 'revoked'} successfully`);
      setShowStatusDialog(false);
      setSelectedCert(null);
      setStatusReason('');
      loadCertificates();
      loadStatistics();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update certificate status');
    } finally {
      setUpdating(false);
    }
  };

  const openStatusDialog = (cert: ShareCertificate, status: 'active' | 'revoked') => {
    setSelectedCert(cert);
    setNewStatus(status);
    setShowStatusDialog(true);
  };

  const handleViewCertificate = async (cert: ShareCertificate) => {
    if (cert.html_content) {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(cert.html_content);
        newWindow.document.close();
      } else {
        toast.error('Please allow popups to view certificate');
      }
    } else {
      toast.error('Certificate content not available');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    } else if (status === 'revoked') {
      return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Revoked</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <BackOfficeNav currentPage="Certificates" />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Total Certificates
                  </CardDescription>
                  <CardTitle className="text-3xl">{stats.total_certificates}</CardTitle>
                </CardHeader>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Active
                  </CardDescription>
                  <CardTitle className="text-3xl text-green-600">{stats.active_certificates}</CardTitle>
                </CardHeader>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Total Shares Certified
                  </CardDescription>
                  <CardTitle className="text-3xl">{stats.total_shares_certified?.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Unique Shareholders
                  </CardDescription>
                  <CardTitle className="text-3xl">{stats.unique_shareholders}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="revoked">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Share Class</Label>
                  <Select value={shareClassFilter} onValueChange={setShareClassFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      <SelectItem value="Ordinary">Ordinary</SelectItem>
                      <SelectItem value="Preference">Preference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Shareholder Name</Label>
                  <Input
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                
                <div>
                  <Label>Certificate Number</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search by number..."
                      value={certNumberSearch}
                      onChange={(e) => setCertNumberSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch}>
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certificates Table */}
          <Card>
            <CardHeader>
              <CardTitle>Certificates ({totalCount} total)</CardTitle>
              <CardDescription>View and manage all issued share certificates</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading certificates...</div>
              ) : certificates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileX className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  No certificates found
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Certificate #</TableHead>
                          <TableHead>Shareholder</TableHead>
                          <TableHead>ID Number</TableHead>
                          <TableHead>Shares</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Issue Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {certificates.map((cert) => (
                          <TableRow key={cert.id}>
                            <TableCell className="font-mono text-sm">{cert.certificate_number}</TableCell>
                            <TableCell className="font-medium">{cert.full_name}</TableCell>
                            <TableCell>{cert.id_number}</TableCell>
                            <TableCell className="text-right">{cert.shares_count.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{cert.share_class}</Badge>
                            </TableCell>
                            <TableCell>{new Date(cert.issue_date).toLocaleDateString()}</TableCell>
                            <TableCell>{getStatusBadge(cert.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewCertificate(cert)}
                                  title="View Certificate"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                
                                {cert.status === 'active' ? (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => openStatusDialog(cert, 'revoked')}
                                    title="Revoke Certificate"
                                  >
                                    <Ban className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => openStatusDialog(cert, 'active')}
                                    title="Reactivate Certificate"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {offset + 1} to {Math.min(offset + limit, totalCount)} of {totalCount}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setOffset(Math.max(0, offset - limit))}
                        disabled={offset === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setOffset(offset + limit)}
                        disabled={offset + limit >= totalCount}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Update Dialog */}
          <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {newStatus === 'revoked' ? 'Revoke Certificate' : 'Reactivate Certificate'}
                </DialogTitle>
                <DialogDescription>
                  {selectedCert && (
                    <div className="space-y-2 mt-2">
                      <p>Certificate: <strong>{selectedCert.certificate_number}</strong></p>
                      <p>Shareholder: <strong>{selectedCert.full_name}</strong></p>
                      <p>Shares: <strong>{selectedCert.shares_count.toLocaleString()}</strong></p>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {newStatus === 'revoked' && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-destructive">Warning</p>
                        <p className="text-muted-foreground mt-1">
                          Revoking this certificate will invalidate it. This action will be logged in the audit trail.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="reason">Reason {newStatus === 'revoked' ? '(Required)' : '(Optional)'}</Label>
                  <Textarea
                    id="reason"
                    placeholder={`Enter reason for ${newStatus === 'revoked' ? 'revoking' : 'reactivating'} this certificate...`}
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowStatusDialog(false);
                    setStatusReason('');
                  }}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  variant={newStatus === 'revoked' ? 'destructive' : 'default'}
                  onClick={handleStatusUpdate}
                  disabled={updating || (newStatus === 'revoked' && !statusReason.trim())}
                >
                  {updating ? 'Updating...' : newStatus === 'revoked' ? 'Revoke Certificate' : 'Reactivate Certificate'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
      <Footer />
    </div>
  );
}
