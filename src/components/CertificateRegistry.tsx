import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveTable } from 'components/ResponsiveTable';
import { Search, Download, Eye, Ban, RefreshCw, Mail, Loader2, ExternalLink, Award } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from "app";
import { useCurrency } from 'components/CurrencyProvider';

interface Certificate {
  id: string;
  certificate_number: string;
  shareholder_name: string;
  id_number: string;
  shares_count: number;
  par_value: string;
  total_amount: string;
  status: string;
  issued_at: string;
  certificate_url?: string;
  revoked_at?: string;
  revocation_reason?: string;
  download_count: number;
}

interface Props {
  onLoad?: () => void;
}

export function CertificateRegistry({ onLoad }: Props) {
  const { formatCurrency } = useCurrency();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revocationReason, setRevocationReason] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const loadCertificates = async () => {
    setLoading(true);
    try {
      const response = await apiClient.list_certificates();
      const data = await response.json();
      setCertificates(data.certificates || []);
      onLoad?.();
    } catch (error) {
      console.error('Failed to load certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeCertificate = async () => {
    if (!selectedCertificate || !revocationReason.trim()) {
      toast.error('Please provide a revocation reason');
      return;
    }

    setRevoking(true);
    try {
      const response = await apiClient.revoke_certificate(
        { certificateNumber: selectedCertificate.certificate_number },
        { revocation_reason: revocationReason }
      );
      await response.json();
      
      toast.success('Certificate revoked successfully');
      setRevokeDialogOpen(false);
      setRevocationReason('');
      setSelectedCertificate(null);
      await loadCertificates();
    } catch (error: any) {
      console.error('Failed to revoke certificate:', error);
      toast.error(error.message || 'Failed to revoke certificate');
    } finally {
      setRevoking(false);
    }
  };

  const handleResendEmail = async (certificateId: string) => {
    setResendingEmail(true);
    try {
      const response = await apiClient.resend_certificate_email({ certId: certificateId });
      await response.json();
      toast.success('Certificate email resent successfully');
    } catch (error: any) {
      console.error('Failed to resend email:', error);
      toast.error(error.message || 'Failed to resend email');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleRegenerate = async (certificateId: string) => {
    try {
      const response = await apiClient.regenerate_certificate({ certId: certificateId });
      const result = await response.json();
      
      toast.success('Certificate regenerated successfully');
      
      if (result.certificate_url) {
        window.open(result.certificate_url, '_blank');
      }
      
      await loadCertificates();
    } catch (error: any) {
      console.error('Failed to regenerate certificate:', error);
      toast.error(error.message || 'Failed to regenerate certificate');
    }
  };

  // Filtered certificates
  const filteredCertificates = certificates.filter(cert => {
    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      cert.certificate_number?.toLowerCase().includes(searchLower) ||
      cert.shareholder_name?.toLowerCase().includes(searchLower) ||
      cert.id_number?.toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'issued':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Issued</Badge>;
      case 'revoked':
        return <Badge variant="destructive">Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns = [
    {
      key: 'certificate_number',
      header: 'Certificate Number',
      render: (cert: Certificate) => (
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-blue-600" />
          <span className="font-mono font-medium">{cert.certificate_number}</span>
        </div>
      )
    },
    {
      key: 'shareholder_name',
      header: 'Shareholder',
      render: (cert: Certificate) => (
        <div>
          <div className="font-medium">{cert.shareholder_name}</div>
          <div className="text-xs text-muted-foreground">{cert.id_number}</div>
        </div>
      )
    },
    {
      key: 'shares_count',
      header: 'Shares',
      className: 'text-right'
    },
    {
      key: 'total_amount',
      header: 'Amount',
      render: (cert: Certificate) => formatCurrency(parseFloat(cert.total_amount)),
      className: 'text-right'
    },
    {
      key: 'status',
      header: 'Status',
      render: (cert: Certificate) => getStatusBadge(cert.status)
    },
    {
      key: 'issued_at',
      header: 'Issued Date',
      render: (cert: Certificate) => new Date(cert.issued_at).toLocaleDateString()
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (cert: Certificate) => (
        <div className="flex items-center gap-2">
          {cert.certificate_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(cert.certificate_url, '_blank')}
              title="View Certificate"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleResendEmail(cert.id)}
            disabled={resendingEmail}
            title="Resend Email"
          >
            <Mail className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRegenerate(cert.id)}
            title="Regenerate Certificate"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {cert.status === 'issued' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCertificate(cert);
                setRevokeDialogOpen(true);
              }}
              title="Revoke Certificate"
            >
              <Ban className="h-4 w-4 text-red-600" />
            </Button>
          )}
        </div>
      )
    }
  ];

  // Load on mount
  useState(() => {
    loadCertificates();
  });

  return (
    <>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Total Certificates</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{certificates.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Issued</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl text-blue-600">
                {certificates.filter(c => c.status === 'issued').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Revoked</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl text-red-600">
                {certificates.filter(c => c.status === 'revoked').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Total Downloads</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">
                {certificates.reduce((sum, c) => sum + (c.download_count || 0), 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="cert-search" className="sr-only">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cert-search"
                    placeholder="Search by certificate number, name, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Label htmlFor="cert-status-filter" className="sr-only">Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="cert-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="issued">Issued</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={loadCertificates} disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" />Refresh</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Certificates Table */}
        <Card>
          <CardHeader>
            <CardTitle>Certificate Registry</CardTitle>
            <CardDescription>
              {filteredCertificates.length} certificate{filteredCertificates.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ResponsiveTable
                data={filteredCertificates}
                columns={columns}
                keyExtractor={(cert) => cert.id}
                emptyMessage="No certificates found"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revoke Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Certificate</DialogTitle>
            <DialogDescription>
              Revoke certificate {selectedCertificate?.certificate_number}
            </DialogDescription>
          </DialogHeader>

          {selectedCertificate && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Shareholder: {selectedCertificate.shareholder_name}</p>
                <p className="text-sm text-muted-foreground mt-1">Shares: {selectedCertificate.shares_count}</p>
              </div>

              <div>
                <Label htmlFor="revocation-reason">Reason for Revocation *</Label>
                <Textarea
                  id="revocation-reason"
                  placeholder="Enter the reason for revoking this certificate..."
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevokeDialogOpen(false);
                setRevocationReason('');
                setSelectedCertificate(null);
              }}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeCertificate}
              disabled={revoking || !revocationReason.trim()}
            >
              {revoking ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Revoking...</>
              ) : (
                <><Ban className="h-4 w-4 mr-2" />Revoke Certificate</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
