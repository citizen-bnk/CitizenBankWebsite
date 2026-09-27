import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from 'app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, TrendingUp, DollarSign, FileText, Users, Download, Eye, CheckCircle, XCircle, Clock, Award, Search, Mail, Copy, ExternalLink, Home, Shield, FileEdit, ChevronUp, ChevronDown, Save, AlertCircle, RefreshCw, Ban, X, Calendar, Receipt, ArrowUpRight, Percent } from 'lucide-react';
import type { SubscriptionAnalyticsResponse, SubscriptionListItem } from 'types';
import { useCurrency } from 'components/CurrencyProvider';
import { ProfileDropdown } from 'components/ProfileDropdown';
import { ResponsiveTable } from 'components/ResponsiveTable';
import { CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button as ButtonComponent } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { Footer } from 'components/Footer';
import { Header } from 'components/Header';
import { BackOfficeNav } from 'components/BackOfficeNav';
import { Textarea } from '@/components/ui/textarea';
import { CertificateRegistry } from 'components/CertificateRegistry';
import SignatureCaptureModal, { type SignatureData } from 'components/SignatureCaptureModal';
import { APP_BASE_PATH } from 'app';

export default function BackOfficeSubscriptions() {
  const navigate = useNavigate();
  const { formatCurrency, selectedCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<SubscriptionAnalyticsResponse | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [processingCertificate, setProcessingCertificate] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [activatingCertificate, setActivatingCertificate] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(false);
  const [subscriptionEdits, setSubscriptionEdits] = useState({ num_shares: 0, total_amount: 0 });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    payment_reference: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Add PDF generation state and handlers
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const [generatingWelcomeLetter, setGeneratingWelcomeLetter] = useState(false);

  // Certificate registry state
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [certificates, setCertificates] = useState<any[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [certSearchTerm, setCertSearchTerm] = useState('');
  const [certStatusFilter, setCertStatusFilter] = useState('all');
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revocationReason, setRevocationReason] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Signature modal state
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [pendingCertificateForSigning, setPendingCertificateForSigning] = useState<{
    certId: string;
    certificateNumber: string;
    shareholderName: string;
  } | null>(null);

  const handleGenerateCertificate = async (subscriptionId: string) => {
    setGeneratingCertificate(true);
    try {
      const response = await apiClient.generate_certificate_manually({ subscriptionId });
      const result = await response.json();
      
      toast.success(`Certificate version ${result.version} generated successfully`);
      console.log('✅ Certificate generated:', result);
      
      // Open signature page in new tab
      if (result.certificate_id && result.certificate_number) {
        const subscription = subscriptions.find((s: any) => s.subscription_id === subscriptionId);
        const shareholderName = subscription?.full_name || 'Unknown';
        
        const signUrl = `${APP_BASE_PATH}/sign-certificate?certId=${result.certificate_id}&certNumber=${encodeURIComponent(result.certificate_number)}&shareholder=${encodeURIComponent(shareholderName)}`;
        window.open(signUrl, '_blank');
      }
      
      await loadData();
    } catch (error: any) {
      console.error('Error generating certificate:', error);
      toast.error(error.message || 'Failed to generate certificate');
    } finally {
      setGeneratingCertificate(false);
    }
  };

  const handleGenerateReceipt = async (subscriptionId: string) => {
    setGeneratingReceipt(true);
    try {
      const response = await apiClient.generate_receipt_manually({ subscriptionId });
      const result = await response.json();
      
      toast.success('Payment receipt generated successfully');
      
      if (result.receipt_url) {
        window.open(result.receipt_url, '_blank');
      }
      
      await loadSubscriptions();
    } catch (error: any) {
      console.error('Error generating receipt:', error);
      toast.error(error.message || 'Failed to generate receipt');
    } finally {
      setGeneratingReceipt(false);
    }
  };

  const loadSubscriptions = async () => {
    // Reload subscriptions by re-fetching data
    // This is called after document generation to refresh the view
    window.location.reload();
  };

  const handleGenerateWelcomeLetter = async (subscriptionId: string) => {
    setGeneratingWelcomeLetter(true);
    try {
      const response = await apiClient.generate_welcome_letter({ subscriptionId });
      const result = await response.json();
      
      toast.success('Welcome letter generated successfully');
      
      if (result.letter_url) {
        window.open(result.letter_url, '_blank');
      }
      
      await loadSubscriptions();
    } catch (error: any) {
      console.error('Error generating welcome letter:', error);
      toast.error(error.message || 'Failed to generate welcome letter');
    } finally {
      setGeneratingWelcomeLetter(false);
    }
  };

  // Define table columns
  const columns = [
    {
      key: 'full_name',
      header: 'Investor',
      render: (sub: any) => (
        <div>
          <div className="font-medium">{sub.full_name}</div>
          <div className="text-xs text-muted-foreground">{sub.email}</div>
        </div>
      )
    },
    {
      key: 'num_shares',
      header: 'Shares',
      className: 'text-right'
    },
    {
      key: 'total_amount',
      header: 'Amount',
      render: (sub: any) => formatCurrency(parseFloat(sub.total_amount)),
      className: 'text-right'
    },
    {
      key: 'payment_status',
      header: 'Payment',
      render: (sub: any) => getStatusBadge(sub.payment_status)
    },
    {
      key: 'status',
      header: 'Subscription Status',
      render: (sub: any) => getStatusBadge(sub.status)
    },
    {
      key: 'payment_proof',
      header: 'Payment Proof',
      render: (sub: any) => getPaymentProofBadge(sub)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (sub: any) => (
        <div className="flex gap-2">
          {sub.payment_proof_path && !sub.payment_proof_verified && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedSubscription(sub);
                setVerificationDialogOpen(true);
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              Review
            </Button>
          )}
          {!sub.payment_proof_path && (sub.status === 'pending' || sub.status === 'partial') && (
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                setSelectedSubscription(sub);
                setVerificationDialogOpen(true);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Confirm Payment
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedSubscription(sub);
              setPaymentDialogOpen(true);
            }}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, subscriptionsRes] = await Promise.all([
        apiClient.analytics_get_subscription_analytics(),
        apiClient.core_list_all_subscriptions()
      ]);

      const analyticsData = await analyticsRes.json();
      const subscriptionsData = await subscriptionsRes.json();

      setAnalytics(analyticsData);
      setSubscriptions(subscriptionsData.subscriptions || []);
      console.log('📊 Loaded analytics:', analyticsData);
      console.log('📋 Loaded subscriptions:', subscriptionsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Unable to load subscription data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCertificates = async () => {
    setCertificatesLoading(true);
    try {
      const response = await apiClient.list_certificates();
      const data = await response.json();
      setCertificates(data.certificates || []);
      console.log('📜 Loaded certificates:', data);
    } catch (error) {
      console.error('Failed to load certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setCertificatesLoading(false);
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

  const handleResendCertificateEmail = async (certificateId: string) => {
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

  const handleRegenerateCertificate = async (certificateId: string) => {
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

  // Load certificates when switching to certificates tab
  useEffect(() => {
    if (activeTab === 'certificates') {
      loadCertificates();
    }
  }, [activeTab]);

  const handleVerifyPayment = async (verified: boolean) => {
    if (!selectedSubscription) return;

    setVerifying(true);
    try {
      const response = await apiClient.payments_verify_payment({
        subscription_id: selectedSubscription.subscription_id,
        approved: verified,
        notes: verificationNotes || undefined
      });

      const result = await response.json();
      console.log('✅ Payment verification result:', result);
      
      toast.success(verified ? 'Payment verified successfully' : 'Payment rejected');
      setVerificationDialogOpen(false);
      setVerificationNotes('');
      setSelectedSubscription(null);
      await loadData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to verify payment:', error);
      toast.error(error.message || 'Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedSubscription || !paymentData.amount || !paymentData.payment_reference) {
      toast.error('Please fill in all required fields');
      return;
    }

    setProcessingPayment(true);
    try {
      const response = await apiClient.record_payment(
        { subscriptionId: selectedSubscription.subscription_id },
        {
          amount: parseFloat(paymentData.amount),
          payment_reference: paymentData.payment_reference,
          notes: paymentData.notes || undefined
        }
      );

      const result = await response.json();
      console.log('✅ Payment recorded:', result);
      
      // Store result to show documents
      setPaymentResult(result);
      
      toast.success('Payment recorded successfully');
      loadData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to record payment:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleIssueCertificate = async () => {
    if (!selectedSubscription) return;

    setProcessingCertificate(true);
    try {
      const response = await apiClient.certificates_issue_certificate({
        subscription_id: selectedSubscription.subscription_id
      });

      const result = await response.json();
      console.log('✅ Certificate issued:', result);
      toast.success('Certificate issued successfully');
      setCertificateDialogOpen(false);
      loadData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to issue certificate:', error);
      toast.error(error.message || 'Failed to issue certificate');
    } finally {
      setProcessingCertificate(false);
    }
  };

  const handleActivateCertificate = async () => {
    if (!selectedSubscription) return;

    setActivatingCertificate(true);
    try {
      const response = await apiClient.certificates_issue_certificate({
        subscription_id: selectedSubscription.subscription_id
      });

      const result = await response.json();
      console.log('✅ Certificate activated:', result);
      toast.success('Share certificate activated and emailed to investor with QR code');
      await loadData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to activate certificate:', error);
      toast.error(error.message || 'Failed to activate certificate');
    } finally {
      setActivatingCertificate(false);
    }
  };

  const handleResendQR = async (certificateNumber: string) => {
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesStatus = statusFilter === 'all' || sub.status?.toLowerCase() === statusFilter;
    
    // Payment proof filter logic
    let matchesPaymentProof = true;
    if (paymentFilter !== 'all') {
      switch (paymentFilter) {
        case 'verified':
          matchesPaymentProof = sub.payment_proof_verified === true;
          break;
        case 'pending_review':
          matchesPaymentProof = sub.payment_proof_path && !sub.payment_proof_verified;
          break;
        case 'rejected':
          matchesPaymentProof = sub.payment_proof_verified === false;
          break;
        case 'not_uploaded':
          matchesPaymentProof = !sub.payment_proof_path;
          break;
      }
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      sub.full_name?.toLowerCase().includes(searchLower) ||
      sub.email?.toLowerCase().includes(searchLower) ||
      sub.subscription_id?.toLowerCase().includes(searchLower);

    return matchesStatus && matchesPaymentProof && matchesSearch;
  });

  // Filtered certificates
  const filteredCertificates = certificates.filter(cert => {
    const matchesStatus = certStatusFilter === 'all' || cert.status === certStatusFilter;
    
    const searchLower = certSearchTerm.toLowerCase();
    const matchesSearch = !certSearchTerm || 
      cert.certificate_number?.toLowerCase().includes(searchLower) ||
      cert.shareholder_name?.toLowerCase().includes(searchLower) ||
      cert.id_number?.toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  // Auto-fill outstanding amount when dialog opens
  useEffect(() => {
    if (paymentDialogOpen && selectedSubscription) {
      const totalAmount = parseFloat(selectedSubscription.total_amount);
      const paidAmount = parseFloat(selectedSubscription.amount_paid || '0');
      const outstanding = totalAmount - paidAmount;
      
      setPaymentData({
        amount: outstanding.toFixed(2),
        payment_method: 'bank_transfer',
        payment_reference: ''
      });
      setPaymentError('');
      setPaymentResult(null);
    }
  }, [paymentDialogOpen, selectedSubscription]);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
      case 'active':
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Partial</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentProofBadge = (sub: any) => {
    if (sub.payment_proof_verified === true) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
    }
    if (sub.payment_proof_verified === false) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    }
    if (sub.payment_proof_path) {
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"><AlertCircle className="h-3 w-3 mr-1" />Pending Review</Badge>;
    }
    return <Badge variant="outline">Not Uploaded</Badge>;
  };

  const getCertificateBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Not Issued</Badge>;
    switch (status) {
      case 'issued':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Issued</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading subscription data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center p-6">
          <Card className="max-w-lg w-full shadow-lg">
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-6">
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Unable to Load Subscriptions
                </h2>
                <p className="text-gray-600 mb-6">
                  {error}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="default" onClick={loadData}>
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/back-office-dashboard')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/')}>
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <BackOfficeNav />
      
      <div className="page-container container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Share Subscriptions</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage all share subscriptions and payments</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => navigate('/back-office-dashboard')} 
                variant="outline"
                className="text-xs sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Total Subscriptions</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{subscriptions.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Paid</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl text-green-600">
                {subscriptions.filter(s => s.payment_status === 'paid').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Pending Payment</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl text-orange-600">
                {subscriptions.filter(s => s.payment_status === 'unpaid').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs sm:text-sm">Total Amount</CardDescription>
              <CardTitle className="text-xl sm:text-2xl">
                {formatCurrency(subscriptions.reduce((sum, s) => sum + parseFloat(s.total_amount), 0))}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs for Subscriptions and Certificates */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
          </TabsList>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search" className="sr-only">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search by name, email, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="w-full sm:w-48">
                    <Label htmlFor="status-filter" className="sr-only">Status Filter</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger id="status-filter">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-48">
                    <Label htmlFor="payment-filter" className="sr-only">Payment Proof Filter</Label>
                    <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                      <SelectTrigger id="payment-filter">
                        <SelectValue placeholder="Payment proof" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Payments</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="pending_review">Pending Review</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="not_uploaded">Not Uploaded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscriptions Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Subscriptions</CardTitle>
                <CardDescription>
                  {filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveTable
                  data={filteredSubscriptions}
                  columns={columns}
                  keyExtractor={(sub) => sub.id}
                  emptyMessage="No subscriptions found"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certificates Tab */}
          <TabsContent value="certificates">
            <CertificateRegistry />
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Recording Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record payment received from {selectedSubscription?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Investor</p>
                  <p className="text-sm text-muted-foreground">{selectedSubscription.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Amount</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(selectedSubscription.total_amount))}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Shares</p>
                  <p className="text-sm text-muted-foreground">{selectedSubscription.num_shares} {selectedSubscription.share_class}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Current Status</p>
                  <p className="text-sm text-muted-foreground">{getStatusBadge(selectedSubscription.payment_status)}</p>
                </div>
              </div>

              {paymentResult && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900 dark:text-green-100">Payment Recorded Successfully</p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        New Status: {paymentResult.new_status}
                      </p>
                      {paymentResult.documents_generated && paymentResult.documents_generated.length > 0 && (
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          Documents: {paymentResult.documents_generated.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="payment-amount">Payment Amount *</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    placeholder="Enter amount received"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="payment-method">Payment Method *</Label>
                  <Select 
                    value={paymentData.payment_method} 
                    onValueChange={(value) => setPaymentData({ ...paymentData, payment_method: value })}
                  >
                    <SelectTrigger id="payment-method" className="mt-2">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="eft">EFT</SelectItem>
                      <SelectItem value="card">Card Payment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment-reference">Payment Reference *</Label>
                  <Input
                    id="payment-reference"
                    placeholder="Enter payment reference number"
                    value={paymentData.payment_reference}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_reference: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="payment-date">Payment Date (Optional)</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentData.payment_date || ''}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="payment-notes">Notes (Optional)</Label>
                  <Textarea
                    id="payment-notes"
                    placeholder="Add any additional notes..."
                    value={paymentData.notes || ''}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    rows={3}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Documents Section - Show when any payment is received */}
              {selectedSubscription.amount_paid > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium mb-3">Generate Documents</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Generate and send PDF documents to the investor. Certificate versioning: each generation creates a new version.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleGenerateCertificate(selectedSubscription.subscription_id)}
                      disabled={generatingCertificate}
                      className="w-full"
                    >
                      {generatingCertificate ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                      ) : (
                        <><Award className="h-4 w-4 mr-2" />Share Certificate</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleGenerateReceipt(selectedSubscription.subscription_id)}
                      disabled={generatingReceipt}
                      className="w-full"
                    >
                      {generatingReceipt ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                      ) : (
                        <><FileText className="h-4 w-4 mr-2" />Payment Receipt</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleGenerateWelcomeLetter(selectedSubscription.subscription_id)}
                      disabled={generatingWelcomeLetter}
                      className="w-full"
                    >
                      {generatingWelcomeLetter ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                      ) : (
                        <><Mail className="h-4 w-4 mr-2" />Welcome Letter</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPaymentDialogOpen(false);
                setPaymentData({
                  amount: '',
                  payment_method: 'bank_transfer',
                  payment_reference: ''
                });
                setPaymentResult(null);
              }}
              disabled={processingPayment}
            >
              {paymentResult ? 'Close' : 'Cancel'}
            </Button>
            {!paymentResult && (
              <Button
                onClick={handleRecordPayment}
                disabled={processingPayment || !paymentData.amount || !paymentData.payment_reference}
              >
                {processingPayment ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />Record Payment</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Verification Dialog */}
      <Dialog open={verificationDialogOpen} onOpenChange={setVerificationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSubscription?.payment_proof_path ? 'Review Payment Proof' : 'Confirm Payment Received'}
            </DialogTitle>
            <DialogDescription>
              {selectedSubscription?.payment_proof_path 
                ? `Verify the payment proof submitted by ${selectedSubscription?.full_name}`
                : `Manually confirm that payment has been received from ${selectedSubscription?.full_name} (verified via bank transfer, cash, or other external means)`
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Investor</p>
                  <p className="text-sm text-muted-foreground">{selectedSubscription.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Amount</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(selectedSubscription.total_amount))}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Shares</p>
                  <p className="text-sm text-muted-foreground">{selectedSubscription.num_shares}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm text-muted-foreground">{selectedSubscription.status}</p>
                </div>
              </div>

              {!selectedSubscription.payment_proof_path && (
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-900 dark:text-orange-100">No Proof Uploaded</p>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                        By confirming, you certify that payment has been verified through external means (bank statement, cash receipt, etc.). 
                        The system will generate and issue the share certificate immediately.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedSubscription.payment_proof_path && (
                <div>
                  <Label className="mb-2 block">Uploaded Payment Proof</Label>
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <p className="text-sm font-medium mb-2">Document uploaded</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/api/storage/${selectedSubscription.payment_proof_path}`, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Proof
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="verification-notes">
                  {selectedSubscription.payment_proof_path ? 'Notes (Optional)' : 'Verification Details (Required)'}
                </Label>
                <Textarea
                  id="verification-notes"
                  placeholder={selectedSubscription.payment_proof_path 
                    ? "Add any notes about this verification..."
                    : "Describe how payment was verified (e.g., 'Verified via bank statement on 2024-01-15', 'Cash payment received and recorded')..."
                  }
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setVerificationDialogOpen(false);
                setVerificationNotes('');
              }}
              disabled={verifying}
            >
              Cancel
            </Button>
            {selectedSubscription?.payment_proof_path && (
              <Button
                variant="destructive"
                onClick={() => handleVerifyPayment(false)}
                disabled={verifying}
              >
                {verifying ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                ) : (
                  <><XCircle className="h-4 w-4 mr-1" />Reject</>
                )}
              </Button>
            )}
            <Button
              onClick={() => handleVerifyPayment(true)}
              disabled={verifying || (!selectedSubscription?.payment_proof_path && !verificationNotes.trim())}
            >
              {verifying ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
              ) : (
                <><CheckCircle className="h-4 w-4 mr-1" />{selectedSubscription?.payment_proof_path ? 'Approve' : 'Confirm Payment'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
