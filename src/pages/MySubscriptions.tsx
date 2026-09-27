





























import { useEffect, useState } from 'react';
import { useUserGuardContext } from 'app/auth';
import brain from 'brain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Download, Eye, CreditCard, TrendingUp, FileText, CheckCircle2, Mail, QrCode, ArrowLeft, Plus, Send, Banknote, Shield, HelpCircle, BookOpen, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from 'components/CurrencyProvider';
import { Label } from '@/components/ui/label';
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { useUserRoles } from 'utils/useUserRoles';
import { useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { CountdownTimer } from 'components/CountdownTimer';
import { DebitOrderDialog } from 'components/DebitOrderDialog';
import { DebitOrderManagement } from 'components/DebitOrderManagement';

interface SubscriptionSummary {
  total_shares_owned: number;
  total_investment_amount: number;
  active_subscriptions: number;
  pending_payments: number;
  certificates_issued: number;
}

interface Subscription {
  id: number;
  subscription_id: string;
  share_class?: string;
  num_shares: number;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  payment_status: string;
  status: string;
  certificate_number: string | null;
  certificate_url: string | null;
  payment_deadline: string | null;
  created_at: string;
}

interface SubscriptionDetails {
  subscription: any;
  payment_history: any[];
  certificate: any;
  amount_remaining: number;
}

interface TransferFormData {
  num_shares: number;
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  recipient_id_number: string;
}

interface CertificateRequest {
  id: number;
  subscription_id: string;
  user_id: string;
  requested_at: string;
  status: string;
  completed_at: string | null;
  completed_by: string | null;
  certificate_id: number | null;
  notes: string | null;
}

export default function MySubscriptions() {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();
  const { roles, loading: rolesLoading, isSuperAdmin, hasAnyRole } = useUserRoles();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferSubscription, setTransferSubscription] = useState<Subscription | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [transferForm, setTransferForm] = useState<TransferFormData>({
    num_shares: 0,
    recipient_name: '',
    recipient_email: '',
    recipient_phone: '',
    recipient_id_number: ''
  });
  const [conversionOpen, setConversionOpen] = useState(false);
  const [conversionSubscription, setConversionSubscription] = useState<Subscription | null>(null);
  const [converting, setConverting] = useState(false);
  const [conversionNotes, setConversionNotes] = useState('');
  const [showMarketplaceComingSoon, setShowMarketplaceComingSoon] = useState(false);
  const [generatingCertificate, setGeneratingCertificate] = useState<string | null>(null);
  const [generatingReceipt, setGeneratingReceipt] = useState<string | null>(null);
  const [generatingWelcomeLetter, setGeneratingWelcomeLetter] = useState<string | null>(null);
  const { formatCurrency } = useCurrency();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'eft' | 'card' | 'crypto' | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentSubscriptionId, setPaymentSubscriptionId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [availableCryptos, setAvailableCryptos] = useState<any[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([]);
  const [requestingCertificate, setRequestingCertificate] = useState<string | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState<number | null>(null);
  
  // Debit order state
  const [debitOrderDialogOpen, setDebitOrderDialogOpen] = useState(false);
  const [debitOrderSubscriptionId, setDebitOrderSubscriptionId] = useState<string | null>(null);
  const [debitOrderAmount, setDebitOrderAmount] = useState(0);

  useEffect(() => {
    // Load subscriptions for all authenticated users
    if (!rolesLoading) {
      loadSubscriptions();
      loadCertificateRequests();
    }
  }, [rolesLoading]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await brain.core_get_my_public_subscriptions();
      const data = await response.json();
      setSummary(data.summary);
      setSubscriptions(data.subscriptions);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setError('Unable to load subscriptions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCertificateRequests = async () => {
    try {
      const response = await brain.get_my_requests();
      const data = await response.json();
      setCertificateRequests(data.requests || []);
    } catch (error) {
      console.error('Error loading certificate requests:', error);
      // Silently fail - not critical
    }
  };

  const viewDetails = async (subscriptionId: string) => {
    try {
      const response = await brain.get_subscription_details({ subscriptionId });
      const data = await response.json();
      setSelectedSubscription(data);
      setDetailsOpen(true);
    } catch (error) {
      console.error('Error loading subscription details:', error);
      toast.error('Failed to load subscription details');
    }
  };

  const downloadCertificate = async (certificateUrl: string, certificateNumber: string) => {
    // Legacy method signature kept for compatibility but redirected to new handler
    await handleDownloadCertificate(certificateNumber);
  };

  const handleDownloadCertificate = async (certificateNumber: string) => {
    try {
      toast.info('Starting download...');
      const response = await brain.download_certificate({ certificateNumber });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate-${certificateNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Certificate downloaded successfully');
    } catch (error) {
      console.error('Failed to download certificate:', error);
      toast.error('Failed to download certificate. Please try again.');
    }
  }

  const handleGenerateCertificate = async (subscriptionId: number) => {
    try {
      setGeneratingCertificate(subscriptionId.toString());
      const response = await brain.generate_certificate_manually({ subscriptionId });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Certificate generated: ${data.certificate_number}`);
        
        // Refresh data first
        await loadSubscriptions(); 
        
        // Attempt to download the generated certificate using the authenticated client
        if (data.certificate_number) {
          await handleDownloadCertificate(data.certificate_number);
        }
      } else {
        toast.error('Failed to generate certificate');
      }
    } catch (error: any) {
      console.error('Error generating certificate:', error);
      toast.error(error.message || 'Failed to generate certificate');
    } finally {
      setGeneratingCertificate(null);
    }
  }

  const handleGenerateReceipt = async (subscriptionId: string) => {
    try {
      setGeneratingReceipt(subscriptionId);
      
      const response = await brain.download_user_receipt({ subscriptionId });
      
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Receipt-${subscriptionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast.success('Receipt downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading receipt:', error);
      toast.error(error.message || 'Failed to download receipt');
    } finally {
      setGeneratingReceipt(null);
    }
  }

  const handleGenerateWelcomeLetter = async (subscriptionId: string) => {
    try {
      setGeneratingWelcomeLetter(subscriptionId);
      
      const response = await brain.download_user_welcome_letter({ subscriptionId });
      
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `WelcomeLetter-${subscriptionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast.success('Welcome letter downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading welcome letter:', error);
      toast.error(error.message || 'Failed to download welcome letter');
    } finally {
      setGeneratingWelcomeLetter(null);
    }
  }

  const handleRequestCertificate = async (subscriptionId: string) => {
    try {
      setRequestingCertificate(subscriptionId);
      const response = await brain.request_certificate({ subscription_id: subscriptionId });
      const data = await response.json();
      
      toast.success('Certificate request submitted successfully');
      
      // Reload requests and subscriptions
      await loadCertificateRequests();
      await loadSubscriptions();
    } catch (error: any) {
      console.error('Error requesting certificate:', error);
      toast.error(error.message || 'Failed to request certificate');
    } finally {
      setRequestingCertificate(null);
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    try {
      setCancellingRequest(requestId);
      const response = await brain.cancel_request(requestId);
      const data = await response.json();
      
      toast.success('Certificate request cancelled');
      
      // Reload requests
      await loadCertificateRequests();
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast.error(error.message || 'Failed to cancel request');
    } finally {
      setCancellingRequest(null);
    }
  };

  const getCertificateRequestStatus = (subscriptionId: string): CertificateRequest | null => {
    return certificateRequests.find(req => req.subscription_id === subscriptionId && req.status === 'pending') || null;
  };

  const handlePreviewCertificate = async (subscriptionId: string) => {
    try {
      const response = await brain.certificates_preview_certificate({ subscriptionId });
      
      // Get PDF blob from response
      const blob = await response.blob();
      
      // Create object URL for the PDF blob
      const pdfUrl = URL.createObjectURL(blob);
      
      // Open PDF in new window
      const newWindow = window.open(pdfUrl, '_blank');
      if (!newWindow) {
        toast.error('Please allow popups to preview certificate');
        URL.revokeObjectURL(pdfUrl); // Clean up if popup was blocked
      }
      
      // Clean up object URL after a delay (window needs time to load)
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);
    } catch (error) {
      console.error('Failed to preview certificate:', error);
      toast.error('Failed to preview certificate');
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      completed: { variant: 'default', label: 'Completed' },
      partial: { variant: 'secondary', label: 'Partial Payment' },
      pending: { variant: 'outline', label: 'Pending' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      completed: { variant: 'default', label: 'Paid' },
      partial: { variant: 'secondary', label: 'Partial' },
      pending: { variant: 'outline', label: 'Pending' },
    };
    const config = variants[paymentStatus] || { variant: 'outline', label: paymentStatus };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCertificateBadge = (status: string | null) => {
    if (status === 'issued') {
      return <Badge variant="default">Issued</Badge>;
    }
    return <Badge variant="outline">Not Issued</Badge>;
  };

  const openTransferDialog = (subscription: Subscription) => {
    setTransferSubscription(subscription);
    setTransferForm({
      num_shares: subscription.num_shares,
      recipient_name: '',
      recipient_email: '',
      recipient_phone: '',
      recipient_id_number: ''
    });
    setTransferOpen(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transferSubscription) return;
    
    // Validation
    if (transferForm.num_shares <= 0 || transferForm.num_shares > transferSubscription.num_shares) {
      toast.error(`Invalid number of shares. You have ${transferSubscription.num_shares} shares available.`);
      return;
    }
    
    if (!transferForm.recipient_name || !transferForm.recipient_email) {
      toast.error('Please fill in recipient name and email');
      return;
    }
    
    try {
      setTransferring(true);
      const response = await brain.transfer_shares({
        subscription_id: transferSubscription.subscription_id,
        num_shares: transferForm.num_shares,
        recipient_name: transferForm.recipient_name,
        recipient_email: transferForm.recipient_email,
        recipient_phone: transferForm.recipient_phone,
        recipient_id_number: transferForm.recipient_id_number
      });
      
      const data = await response.json();
      
      toast.success(`Successfully transferred ${transferForm.num_shares} shares to ${transferForm.recipient_name}`);
      setTransferOpen(false);
      
      // Reload subscriptions
      await loadSubscriptions();
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error(error.message || 'Failed to transfer shares');
    } finally {
      setTransferring(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferSubscription) {
      toast.error('No subscription selected');
      return;
    }
    
    if (!transferForm.recipient_name || !transferForm.recipient_email) {
      toast.error('Please fill in recipient name and email');
      return;
    }
    
    try {
      setTransferring(true);
      const response = await brain.transfer_shares({
        subscription_id: transferSubscription.subscription_id,
        num_shares: transferForm.num_shares,
        recipient_name: transferForm.recipient_name,
        recipient_email: transferForm.recipient_email,
        recipient_phone: transferForm.recipient_phone,
        recipient_id_number: transferForm.recipient_id_number
      });
      
      const data = await response.json();
      
      toast.success(`Successfully transferred ${transferForm.num_shares} shares to ${transferForm.recipient_name}`);
      setTransferOpen(false);
      
      // Reload subscriptions
      await loadSubscriptions();
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error(error.message || 'Failed to transfer shares');
    } finally {
      setTransferring(false);
    }
  };

  const handleConvertShares = async (targetClass: 'Class A' | 'Class C') => {
    if (!conversionSubscription) {
      toast.error('No subscription selected');
      return;
    }

    try {
      setConverting(true);
      const response = await brain.convert_share_class({
        subscription_id: conversionSubscription.subscription_id,
        target_class: targetClass,
        notes: conversionNotes
      });
      
      const data = await response.json();
      
      if (data.success) {
        const details = data.conversion_details;
        const priceDiff = details.price_difference;
        const diffText = priceDiff > 0 
          ? `(+${formatCurrency(priceDiff)} adjustment)` 
          : priceDiff < 0 
          ? `(${formatCurrency(priceDiff)} credit)` 
          : '';
        
        toast.success(
          `Successfully converted ${details.shares_converted} shares from ${details.from_class} to ${details.to_class} ${diffText}`,
          { duration: 5000 }
        );
        
        setConversionOpen(false);
        setConversionNotes('');
        
        // Reload subscriptions
        await loadSubscriptions();
      }
    } catch (error: any) {
      console.error('Conversion error:', error);
      toast.error(error.message || 'Failed to convert share class');
    } finally {
      setConverting(false);
    }
  };

  const openPaymentDialog = (amount: number, subscriptionId: string) => {
    setPaymentAmount(amount);
    setPaymentSubscriptionId(subscriptionId);
    setSelectedPaymentMethod(null);
    setPaymentDialogOpen(true);
    setDetailsOpen(false); // Close details dialog
    loadPaymentMethods(); // Load banking and crypto details
  };

  const loadPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      
      // Load default bank account for LSL currency
      const bankResponse = await brain.get_default_bank_account({ currency: 'LSL' });
      if (bankResponse.ok) {
        const bankData = await bankResponse.json();
        setBankAccount(bankData);
      }
      
      // Load available crypto wallets
      const cryptoResponse = await brain.get_available_wallets();
      if (cryptoResponse.ok) {
        const cryptoData = await cryptoResponse.json();
        setAvailableCryptos(cryptoData.available_cryptos || []);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    // For now, just show a message that gateway integration is pending
    // In the future, this will integrate with actual payment gateways
    toast.info('Payment gateway integration coming soon. Please use EFT for now.');
    setProcessingPayment(false);
  };

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-64"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-32 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <Card>
              <CardContent className="pt-6 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button variant="outline" onClick={loadSubscriptions}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Empty state when no subscriptions
  if (!loading && subscriptions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <Card className="border-2">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">No Share Subscriptions Yet</CardTitle>
                <CardDescription className="text-base mt-2">
                  Start your investment journey with Citizen Bank shares
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-orange-50 dark:from-pink-950/20 dark:via-purple-950/20 dark:to-orange-950/20 p-6 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Become a Shareholder</h3>
                      <p className="text-muted-foreground mb-4">
                        Subscribe to Citizen Bank shares and become part of our growing community. 
                        Own a piece of Lesotho's financial future and receive official share certificates.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-purple-600" />
                    Benefits of Share Subscription
                  </h3>
                  <ul className="space-y-3 ml-7">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">1</span>
                      <span>Official share certificates with QR code verification</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">2</span>
                      <span>Flexible payment options to suit your budget</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">3</span>
                      <span>Track your investments and manage your portfolio</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">4</span>
                      <span>Transfer shares to family and friends</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => navigate('/share-subscription')} 
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Subscribe to Shares
                  </Button>
                  <Button onClick={() => navigate('/customer-portal')} variant="outline" size="lg">
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back to Portal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="page-container container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">My Investments</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Track your share subscriptions and certificates</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => navigate('/customer-portal')} 
                variant="outline"
                className="text-xs sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Portal
              </Button>
              <Button 
                onClick={() => navigate('/share-subscription')}
                className="bg-[#6d52a2] hover:bg-[#5a4289] text-xs sm:text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Investment
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading your investments...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="space-y-6">
            {/* Empty State Card */}
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 px-4">
                <div className="rounded-full bg-primary/10 p-6 mb-6">
                  <TrendingUp className="h-12 w-12 text-primary" />
                </div>
                
                <h2 className="text-2xl font-bold mb-3 text-center">Start Your Investment Journey</h2>
                <p className="text-muted-foreground text-center max-w-md mb-8">
                  You don't have any share subscriptions yet. Invest in Citizen Bank shares and become a shareholder today.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
                  <Button 
                    onClick={() => navigate('/share-subscription')}
                    className="flex-1 bg-[#6d52a2] hover:bg-[#5a4289]"
                    size="lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Subscribe to Shares
                  </Button>
                  <Button 
                    onClick={() => navigate('/invest')}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Learn More
                  </Button>
                </div>

                {/* Additional Info */}
                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <h3 className="font-semibold mb-1">Easy Process</h3>
                    <p className="text-sm text-muted-foreground">Simple subscription and payment process</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <h3 className="font-semibold mb-1">Secure & Verified</h3>
                    <p className="text-sm text-muted-foreground">Digital certificates with QR verification</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Banknote className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <h3 className="font-semibold mb-1">Flexible Payment</h3>
                    <p className="text-sm text-muted-foreground">Multiple payment options available</p>
                  </div>
                </div>

                {/* Contact Support */}
                <div className="mt-8 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Need help getting started?</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button 
                      onClick={() => navigate('/support')}
                      variant="ghost"
                      size="sm"
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                    <Button 
                      onClick={() => navigate('/faqs')}
                      variant="ghost"
                      size="sm"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      View FAQs
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card key="total-shares">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Shares</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.total_shares_owned.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card key="total-investment">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Investment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.total_investment_amount)}</div>
                  </CardContent>
                </Card>
                <Card key="active-subscriptions">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.active_subscriptions}</div>
                  </CardContent>
                </Card>
                <Card key="pending-payments">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.pending_payments}</div>
                  </CardContent>
                </Card>
                <Card key="certificates-issued">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Certificates Issued</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.certificates_issued}</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Subscriptions Table */}
            <DebitOrderManagement />

            <Card>
              <CardHeader>
                <CardTitle>My Subscriptions</CardTitle>
                <CardDescription>View and manage your share subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {subscriptions.map((sub) => {
                    // Check if paid in full: either status is 'paid'/'completed' or amount_paid >= total_amount
                    const isPaidInFull = 
                      (sub.payment_status === 'paid' || sub.payment_status === 'completed') && 
                      sub.amount_paid >= sub.total_amount;
                    
                    return (
                      <Card key={sub.id} className="border-2 hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-sm font-mono text-muted-foreground mb-2">
                                {sub.subscription_id}
                              </CardTitle>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={sub.share_class === 'Class A' ? 'default' : 'secondary'}>
                                  {sub.share_class || 'N/A'}
                                </Badge>
                                {getPaymentStatusBadge(sub.payment_status)}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Share Details */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-sm text-muted-foreground">Shares</span>
                              <span className="font-bold text-lg">{sub.num_shares.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-sm text-muted-foreground">Total Amount</span>
                              <span className="font-semibold">{formatCurrency(Number(sub.total_amount))}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-sm text-muted-foreground">Amount Paid</span>
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(Number(sub.amount_paid))}
                              </span>
                            </div>
                            {sub.amount_remaining > 0 && (
                              <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-muted-foreground">Remaining</span>
                                <span className="font-semibold text-orange-600 dark:text-orange-400">
                                  {formatCurrency(Number(sub.amount_remaining))}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Certificate Status */}
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Certificate</span>
                              {sub.certificate_number ? (
                                <Badge variant="default" className="font-mono text-xs">✓ Issued</Badge>
                              ) : (
                                <Badge variant="outline">Not Issued</Badge>
                              )}
                            </div>
                          </div>

                          {/* Payment Deadline Countdown */}
                          {sub.payment_deadline && !isPaidInFull && (
                            <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                              <div className="flex items-start gap-2">
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-orange-900 dark:text-orange-100 mb-1">Payment Deadline</p>
                                  <CountdownTimer
                                    deadline={sub.payment_deadline}
                                    variant="compact"
                                    onExpire={() => {
                                      toast.error('Payment deadline expired for subscription ' + sub.subscription_id);
                                      loadSubscriptions();
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="space-y-2 pt-2">
                            {isPaidInFull ? (
                              // Fully Paid Actions
                              <>
                                {/* Certificate Request/View Logic */}
                                {(() => {
                                  const pendingRequest = getCertificateRequestStatus(sub.subscription_id);
                                  
                                  if (sub.certificate_number) {
                                    // Certificate already issued
                                    return (
                                      <Button
                                        onClick={() => handlePreviewCertificate(sub.subscription_id)}
                                        className="w-full"
                                        variant="default"
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Certificate
                                      </Button>
                                    );
                                  } else if (pendingRequest) {
                                    // Request is pending
                                    return (
                                      <div className="space-y-2">
                                        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Certificate Request Pending</span>
                                            <Badge variant="secondary">Pending</Badge>
                                          </div>
                                          <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                                            Your certificate is being prepared by our team.
                                          </p>
                                          <Button
                                            onClick={() => handleCancelRequest(pendingRequest.id)}
                                            disabled={cancellingRequest === pendingRequest.id}
                                            size="sm"
                                            variant="outline"
                                            className="w-full"
                                          >
                                            {cancellingRequest === pendingRequest.id ? (
                                              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                                            ) : null}
                                            Cancel Request
                                          </Button>
                                        </div>
                                        <Button
                                          onClick={() => handlePreviewCertificate(sub.subscription_id)}
                                          className="w-full"
                                          variant="outline"
                                        >
                                          <Eye className="h-4 w-4 mr-2" />
                                          Preview Certificate
                                        </Button>
                                      </div>
                                    );
                                  } else {
                                    // No certificate, no pending request - show request button
                                    return (
                                      <div className="space-y-2">
                                        <Button
                                          onClick={() => handleRequestCertificate(sub.subscription_id)}
                                          disabled={requestingCertificate === sub.subscription_id}
                                          className="w-full"
                                          variant="default"
                                        >
                                          {requestingCertificate === sub.subscription_id ? (
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                          ) : (
                                            <FileText className="h-4 w-4 mr-2" />
                                          )}
                                          Request Certificate
                                        </Button>
                                        <Button
                                          onClick={() => handlePreviewCertificate(sub.subscription_id)}
                                          className="w-full"
                                          variant="outline"
                                        >
                                          <Eye className="h-4 w-4 mr-2" />
                                          Preview Certificate
                                        </Button>
                                      </div>
                                    );
                                  }
                                })()}
                                
                                {/* PDF Generation Buttons - Only show when payment received */}
                                {sub.amount_paid > 0 && (
                                  <>
                                    <div className="border-t pt-3 mt-3">
                                      <p className="text-xs text-muted-foreground mb-2 text-center">Generate Documents</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <Button
                                          onClick={() => handleGenerateReceipt(sub.subscription_id)}
                                          disabled={generatingReceipt === sub.subscription_id}
                                          size="sm"
                                          variant="outline"
                                          className="flex-col h-auto py-2"
                                        >
                                          {generatingReceipt === sub.subscription_id ? (
                                            <RefreshCw className="h-4 w-4 mb-1 animate-spin" />
                                          ) : (
                                            <FileText className="h-4 w-4 mb-1" />
                                          )}
                                          <span className="text-xs">Receipt</span>
                                        </Button>
                                        <Button
                                          onClick={() => handleGenerateWelcomeLetter(sub.subscription_id)}
                                          disabled={generatingWelcomeLetter === sub.subscription_id}
                                          size="sm"
                                          variant="outline"
                                          className="flex-col h-auto py-2"
                                        >
                                          {generatingWelcomeLetter === sub.subscription_id ? (
                                            <RefreshCw className="h-4 w-4 mb-1 animate-spin" />
                                          ) : (
                                            <Mail className="h-4 w-4 mb-1" />
                                          )}
                                          <span className="text-xs">Welcome</span>
                                        </Button>
                                      </div>
                                    </div>
                                  </>
                                )}
                                
                                <Button
                                  onClick={() => setShowMarketplaceComingSoon(true)}
                                  className="w-full"
                                  variant="outline"
                                >
                                  <TrendingUp className="h-4 w-4 mr-2" />
                                  Sell Shares
                                </Button>
                              </>
                            ) : (
                              // Pending Payment Actions
                              <>
                                <Button
                                  onClick={() => handlePreviewCertificate(sub.subscription_id)}
                                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                                  variant="default"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview Certificate (Unpaid)
                                </Button>
                                <p className="text-xs text-center text-muted-foreground">
                                  Complete payment to activate your certificate
                                </p>
                                
                                {/* Debit Order Setup Button */}
                                <Button
                                  onClick={() => {
                                    setDebitOrderSubscriptionId(sub.subscription_id);
                                    setDebitOrderAmount(sub.amount_remaining);
                                    setDebitOrderDialogOpen(true);
                                  }}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                  variant="default"
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Set Up Debit Order
                                </Button>
                                <p className="text-xs text-center text-blue-600 dark:text-blue-400">
                                  Automate monthly payments - Never miss a deadline!
                                </p>
                                
                                <Button
                                  onClick={() => viewDetails(sub.subscription_id)}
                                  className="w-full"
                                  variant="outline"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Details & Pay
                                </Button>
                                {sub.num_shares > 0 && (sub.status === 'completed' || sub.status === 'pending') && sub.share_class && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      onClick={() => {
                                        setConversionSubscription(sub);
                                        setConversionOpen(true);
                                      }}
                                      variant="outline"
                                      size="sm"
                                    >
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      Convert
                                    </Button>
                                    <Button
                                      onClick={() => openTransferDialog(sub)}
                                      variant="outline"
                                      size="sm"
                                    >
                                      <Send className="h-4 w-4 mr-1" />
                                      Transfer
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Shares</DialogTitle>
            <DialogDescription>
              Transfer shares from your subscription to another person. They will receive a Class C share certificate.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleTransferSubmit} className="space-y-4">
            {transferSubscription && (
              <div className="bg-muted p-3 rounded-lg mb-4">
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Subscription:</span> {transferSubscription.subscription_id}</p>
                  <p><span className="font-medium">Available Shares:</span> {transferSubscription.num_shares}</p>
                  <p><span className="font-medium">Share Class:</span> {transferSubscription.share_class || 'N/A'}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="num_shares">Number of Shares to Transfer *</Label>
              <Input
                id="num_shares"
                type="number"
                min="1"
                max={transferSubscription?.num_shares || 0}
                value={transferForm.num_shares || ''}
                onChange={(e) => setTransferForm({...transferForm, num_shares: parseInt(e.target.value) || 0})}
                placeholder="Enter number of shares"
                required
              />
              <p className="text-xs text-muted-foreground">
                Maximum: {transferSubscription?.num_shares || 0} shares
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="recipient_name">Recipient Full Name *</Label>
              <Input
                id="recipient_name"
                type="text"
                value={transferForm.recipient_name}
                onChange={(e) => setTransferForm({...transferForm, recipient_name: e.target.value})}
                placeholder="Enter recipient's full name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="recipient_email">Recipient Email *</Label>
              <Input
                id="recipient_email"
                type="email"
                value={transferForm.recipient_email}
                onChange={(e) => setTransferForm({...transferForm, recipient_email: e.target.value})}
                placeholder="recipient@example.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="recipient_phone">Recipient Phone (Optional)</Label>
              <Input
                id="recipient_phone"
                type="tel"
                value={transferForm.recipient_phone}
                onChange={(e) => setTransferForm({...transferForm, recipient_phone: e.target.value})}
                placeholder="+266 xxxx xxxx"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="recipient_id_number">Recipient ID Number (Optional)</Label>
              <Input
                id="recipient_id_number"
                type="text"
                value={transferForm.recipient_id_number}
                onChange={(e) => setTransferForm({...transferForm, recipient_id_number: e.target.value})}
                placeholder="Enter ID number"
              />
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> This transfer will create a new Class C share subscription for the recipient. 
                The shares will be deducted from your subscription.
              </p>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransferOpen(false)}
                disabled={transferring}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={transferring}
                className="flex-1"
              >
                {transferring ? 'Transferring...' : 'Transfer Shares'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Details Dialog - View Details & Pay */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>
              View payment history and manage your subscription
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-6 mt-4">
              {/* Subscription Info */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Subscription ID</p>
                    <p className="font-medium">{selectedSubscription.subscription?.subscription_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Share Class</p>
                    <p className="font-medium">{selectedSubscription.subscription?.share_class || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Shares</p>
                    <p className="font-medium">{selectedSubscription.subscription?.num_shares}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Amount</p>
                    <p className="font-medium">{new Intl.NumberFormat('en-LS', { style: 'currency', currency: 'LSL' }).format(selectedSubscription.subscription?.total_amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount Paid</p>
                    <p className="font-medium text-green-600">{new Intl.NumberFormat('en-LS', { style: 'currency', currency: 'LSL' }).format(selectedSubscription.subscription?.amount_paid || 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount Remaining</p>
                    <p className="font-medium text-orange-600">{new Intl.NumberFormat('en-LS', { style: 'currency', currency: 'LSL' }).format(selectedSubscription.amount_remaining || 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Status</p>
                    <Badge variant={selectedSubscription.subscription?.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {selectedSubscription.subscription?.payment_status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant={selectedSubscription.subscription?.status === 'completed' ? 'default' : 'secondary'}>
                      {selectedSubscription.subscription?.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Certificate Info */}
              {selectedSubscription.certificate && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Certificate Issued
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Certificate Number</p>
                      <p className="font-medium">{selectedSubscription.certificate.certificate_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Issue Date</p>
                      <p className="font-medium">
                        {new Date(selectedSubscription.certificate.certificate_issued_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {selectedSubscription.certificate.certificate_url && (
                    <Button
                      onClick={() => window.open(selectedSubscription.certificate.certificate_url, '_blank')}
                      className="mt-3 w-full"
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Certificate
                    </Button>
                  )}
                </div>
              )}

              {/* Payment History */}
              {selectedSubscription.payment_history && selectedSubscription.payment_history.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Payment History</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSubscription.payment_history.map((payment: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {new Date(payment.payment_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {new Intl.NumberFormat('en-LS', { style: 'currency', currency: 'LSL' }).format(payment.amount)}
                            </TableCell>
                            <TableCell className="capitalize">{payment.payment_method}</TableCell>
                            <TableCell>{payment.payment_reference || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={payment.verified ? 'default' : 'secondary'}>
                                {payment.verified ? 'Verified' : 'Pending'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Payment Actions */}
              {selectedSubscription.amount_remaining > 0 && (
                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Payment Required</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You have an outstanding balance of {new Intl.NumberFormat('en-LS', { style: 'currency', currency: 'LSL' }).format(selectedSubscription.amount_remaining)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => openPaymentDialog(selectedSubscription.amount_remaining, selectedSubscription.subscription?.subscription_id)}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Make Payment
                    </Button>
                    <Button
                      onClick={() => navigate('/support')}
                      variant="outline"
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setDetailsOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
                {selectedSubscription.certificate?.certificate_url && (
                  <Button
                    onClick={() => handlePreviewCertificate(selectedSubscription.subscription?.subscription_id)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Certificate
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Share Class Conversion Dialog */}
      <Dialog open={conversionOpen} onOpenChange={setConversionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convert Share Class</DialogTitle>
            <DialogDescription>
              Convert your shares between Class A (Board Member) and Class C (Public Shareholder)
            </DialogDescription>
          </DialogHeader>
          
          {conversionSubscription && (
            <div className="space-y-4">
              {/* Current Subscription Info */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Subscription ID:</span>
                  <span className="ml-2 font-mono">{conversionSubscription.subscription_id}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Current Share Class:</span>
                  <Badge className="ml-2" variant={conversionSubscription.share_class === 'Class A' ? 'default' : 'secondary'}>
                    {conversionSubscription.share_class}
                  </Badge>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Number of Shares:</span>
                  <span className="ml-2 font-semibold">{conversionSubscription.num_shares.toLocaleString()}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Current Total Value:</span>
                  <span className="ml-2 font-semibold">{formatCurrency(Number(conversionSubscription.total_amount))}</span>
                </div>
              </div>

              {/* Conversion Options */}
              <div className="space-y-3">
                <Label>Convert To:</Label>
                <div className="grid gap-2">
                  {conversionSubscription.share_class === 'Class A' ? (
                    <Button
                      onClick={() => handleConvertShares('Class C')}
                      disabled={converting}
                      className="w-full justify-start h-auto py-3"
                      variant="outline"
                    >
                      <div className="text-left w-full">
                        <div className="font-semibold flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Convert to Class C (Public Shareholder)
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Standard public shareholding without board privileges
                        </div>
                      </div>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleConvertShares('Class A')}
                      disabled={converting}
                      className="w-full justify-start h-auto py-3"
                      variant="outline"
                    >
                      <div className="text-left w-full">
                        <div className="font-semibold flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Convert to Class A (Board Member)
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Board member shareholding with voting rights
                        </div>
                      </div>
                    </Button>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="conversion_notes">Notes (Optional)</Label>
                <Textarea
                  id="conversion_notes"
                  value={conversionNotes}
                  onChange={(e) => setConversionNotes(e.target.value)}
                  placeholder="Add any notes about this conversion..."
                  rows={3}
                />
              </div>

              {/* Important Information */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Important:</strong> Price differences between share classes will be calculated automatically. 
                  The conversion will be tracked for audit purposes.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setConversionOpen(false);
                    setConversionNotes('');
                  }}
                  disabled={converting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Marketplace Coming Soon Dialog */}
      <Dialog open={showMarketplaceComingSoon} onOpenChange={setShowMarketplaceComingSoon}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Shares Marketplace Coming Soon!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold text-lg mb-3 text-purple-900 dark:text-purple-100">
                Secondary Market for Shares
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                We're building a marketplace where shareholders can trade their shares with other investors.
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Set your own selling price for your shares</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Other investors can bid on available shares</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Increase or decrease your stake easily</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span>Transparent pricing and secure transactions</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Stay tuned for updates on this exciting new feature!
              </p>
              <Button
                onClick={() => setShowMarketplaceComingSoon(false)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Got It
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Method Selection Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
            <DialogDescription>
              Choose how you would like to pay {formatCurrency(paymentAmount)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Payment Amount Summary */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount to Pay:</span>
                <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatCurrency(paymentAmount)}
                </span>
              </div>
            </div>

            {/* Payment Method Options */}
            <div className="space-y-3">
              {/* EFT Option */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPaymentMethod === 'eft'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setSelectedPaymentMethod('eft')}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPaymentMethod === 'eft'
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'eft' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Banknote className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-lg">Electronic Funds Transfer (EFT)</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Transfer directly from your bank account. Payment verification may take 1-2 business days.
                    </p>
                    
                    {/* Banking Details */}
                    {selectedPaymentMethod === 'eft' && (
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-3">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          Citizen Bank Account Details
                        </h4>
                        {loadingPaymentMethods ? (
                          <div className="text-center py-4 text-muted-foreground">Loading banking details...</div>
                        ) : bankAccount ? (
                          <>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Bank Name:</span>
                                <span className="font-medium">{bankAccount.bank_name}</span>
                              </div>
                              <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Account Name:</span>
                                <span className="font-medium">{bankAccount.account_name}</span>
                              </div>
                              <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Account Number:</span>
                                <span className="font-mono font-bold">{bankAccount.account_number}</span>
                              </div>
                              <div className="flex justify-between py-2 border-b">
                                <span className="text-muted-foreground">Branch Code:</span>
                                <span className="font-mono font-medium">{bankAccount.branch_code}</span>
                              </div>
                              {bankAccount.branch_name && (
                                <div className="flex justify-between py-2 border-b">
                                  <span className="text-muted-foreground">Branch Name:</span>
                                  <span className="font-medium">{bankAccount.branch_name}</span>
                                </div>
                              )}
                              {bankAccount.swift_code && (
                                <div className="flex justify-between py-2">
                                  <span className="text-muted-foreground">SWIFT Code:</span>
                                  <span className="font-mono font-medium">{bankAccount.swift_code}</span>
                                </div>
                              )}
                              <div className="flex justify-between py-2">
                                <span className="text-muted-foreground">Reference:</span>
                                <span className="font-mono font-bold text-orange-600">{paymentSubscriptionId}</span>
                              </div>
                            </div>
                            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded">
                              <p className="text-xs text-yellow-900 dark:text-yellow-100">
                                <strong>Important:</strong> Please use your Subscription ID ({paymentSubscriptionId}) as the payment reference to ensure proper allocation.
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4 text-red-600">No bank account configured. Please contact support.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Payment Option */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPaymentMethod === 'card'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
                onClick={() => setSelectedPaymentMethod('card')}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPaymentMethod === 'card'
                        ? 'border-purple-600 bg-purple-600'
                        : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'card' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-lg">Credit/Debit Card</h3>
                      <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pay instantly with your Visa or Mastercard. Secure payment gateway integration coming soon.
                    </p>
                  </div>
                </div>
              </div>

              {/* Crypto Payment Option */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPaymentMethod === 'crypto'
                    ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/20'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
                onClick={() => setSelectedPaymentMethod('crypto')}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPaymentMethod === 'crypto'
                        ? 'border-orange-600 bg-orange-600'
                        : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'crypto' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <QrCode className="h-5 w-5 text-orange-600" />
                      <h3 className="font-semibold text-lg">Cryptocurrency</h3>
                      {availableCryptos.length === 0 && !loadingPaymentMethods && (
                        <Badge variant="secondary" className="text-xs">Not Available</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {availableCryptos.length > 0 
                        ? `Pay with ${availableCryptos.map(c => c.crypto_type).join(', ')}. Instant confirmation.`
                        : 'Cryptocurrency payment options will be displayed here when configured.'}
                    </p>
                    
                    {/* Crypto Wallet Details */}
                    {selectedPaymentMethod === 'crypto' && (
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-3">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <QrCode className="h-4 w-4 text-orange-600" />
                          Available Cryptocurrency Options
                        </h4>
                        {loadingPaymentMethods ? (
                          <div className="text-center py-4 text-muted-foreground">Loading crypto wallets...</div>
                        ) : availableCryptos.length > 0 ? (
                          <div className="space-y-3">
                            {availableCryptos.map((crypto) => (
                              <div key={crypto.crypto_type} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-semibold text-sm">{crypto.crypto_type}</span>
                                  {crypto.network_info && (
                                    <Badge variant="outline" className="text-xs">{crypto.network_info}</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mb-1">Wallet Address:</div>
                                <div className="font-mono text-xs bg-white dark:bg-gray-900 p-2 rounded border break-all">
                                  {crypto.wallet_address || 'Not configured'}
                                </div>
                              </div>
                            ))}
                            <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded">
                              <p className="text-xs text-orange-900 dark:text-orange-100">
                                <strong>Important:</strong> After making the crypto transfer, please send proof of payment to support with your Subscription ID: <span className="font-mono font-bold">{paymentSubscriptionId}</span>
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            No cryptocurrency wallets configured yet. Please use EFT or contact support.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setPaymentDialogOpen(false);
                  setSelectedPaymentMethod(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              {selectedPaymentMethod === 'eft' ? (
                <Button
                  onClick={() => {
                    toast.success('Banking details displayed. Please complete your transfer and contact support to confirm payment.');
                    setPaymentDialogOpen(false);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  I've Noted the Details
                </Button>
              ) : (
                <Button
                  onClick={handlePaymentSubmit}
                  disabled={!selectedPaymentMethod || processingPayment}
                  className="flex-1"
                >
                  {processingPayment ? 'Processing...' : 'Proceed to Payment'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debit Order Dialog */}
      {debitOrderSubscriptionId && (
        <DebitOrderDialog
          open={debitOrderDialogOpen}
          onOpenChange={setDebitOrderDialogOpen}
          subscriptionId={debitOrderSubscriptionId}
          totalAmount={debitOrderAmount}
          onSuccess={() => {
            loadSubscriptions();
            toast.success('Debit order set up successfully! Check your email for the mandate form.');
          }}
        />
      )}

      <Footer />
    </div>
  );
}
