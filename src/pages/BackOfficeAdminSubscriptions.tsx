import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from 'app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Search, DollarSign, FileText, CheckCircle, XCircle, Clock, AlertCircle, Calendar, Filter, Download, Eye, Receipt, Award, Mail, Edit, Trash2, Plus } from 'lucide-react';
import { useCurrency } from 'components/CurrencyProvider';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { BackOfficeNav } from 'components/BackOfficeNav';
import { ResponsiveTable } from 'components/ResponsiveTable';
import { APP_BASE_PATH } from 'app';

export default function BackOfficeAdminSubscriptions() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<any[]>([]);
  
  // Filter states
  const [searchEmail, setSearchEmail] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [profileCompletedFilter, setProfileCompletedFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  
  // Dialog states
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentStatusDialogOpen, setPaymentStatusDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Payment management states
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    completed: 0,
    profileCompleted: 0,
    totalAmount: 0,
    paidAmount: 0
  });

  useEffect(() => {
    loadSubscriptions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [subscriptions, searchEmail, paymentStatusFilter, profileCompletedFilter, dateFrom, dateTo, amountMin, amountMax]);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get_my_created_subscriptions();
      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
      calculateStats(data.subscriptions || []);
    } catch (error: any) {
      console.error('Failed to load subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (subs: any[]) => {
    const total = subs.length;
    const pending = subs.filter(s => s.payment_status === 'pending').length;
    const verified = subs.filter(s => s.payment_status === 'verified').length;
    const completed = subs.filter(s => s.payment_status === 'completed').length;
    const profileCompleted = subs.filter(s => s.profile_completed).length;
    const totalAmount = subs.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    const paidAmount = subs.reduce((sum, s) => sum + parseFloat(s.amount_paid || 0), 0);

    setStats({
      total,
      pending,
      verified,
      completed,
      profileCompleted,
      totalAmount,
      paidAmount
    });
  };

  const applyFilters = () => {
    let filtered = [...subscriptions];

    // Email search
    if (searchEmail) {
      filtered = filtered.filter(s => 
        s.email?.toLowerCase().includes(searchEmail.toLowerCase()) ||
        s.full_name?.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }

    // Payment status filter
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(s => s.payment_status === paymentStatusFilter);
    }

    // Profile completed filter
    if (profileCompletedFilter === 'completed') {
      filtered = filtered.filter(s => s.profile_completed);
    } else if (profileCompletedFilter === 'pending') {
      filtered = filtered.filter(s => !s.profile_completed);
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(s => new Date(s.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(s => new Date(s.created_at) <= new Date(dateTo));
    }

    // Amount range filter
    if (amountMin) {
      filtered = filtered.filter(s => parseFloat(s.total_amount) >= parseFloat(amountMin));
    }
    if (amountMax) {
      filtered = filtered.filter(s => parseFloat(s.total_amount) <= parseFloat(amountMax));
    }

    setFilteredSubscriptions(filtered);
  };

  const clearFilters = () => {
    setSearchEmail('');
    setPaymentStatusFilter('all');
    setProfileCompletedFilter('all');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
  };

  const handleRecordPayment = async () => {
    if (!selectedSubscription || !paymentAmount) {
      toast.error('Please enter payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    const totalDue = parseFloat(selectedSubscription.total_amount || 0);
    const alreadyPaid = parseFloat(selectedSubscription.amount_paid || 0);
    const outstanding = totalDue - alreadyPaid;

    // Strict validation: prevent overpayment
    if (amount > outstanding) {
      toast.error(
        `Payment amount (${formatCurrency(amount)}) exceeds outstanding amount (${formatCurrency(outstanding)}). Please enter a valid amount.`,
        { duration: 5000 }
      );
      return;
    }

    if (amount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    setProcessing(true);
    try {
      await apiClient.record_payment(
        { subscriptionId: selectedSubscription.subscription_id },
        {
          amount: amount,
          payment_reference: paymentReference || undefined,
          notes: paymentNotes || undefined
        }
      );
      toast.success('Payment recorded successfully');
      setPaymentDialogOpen(false);
      resetPaymentForm();
      await loadSubscriptions();
    } catch (error: any) {
      console.error('Failed to record payment:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePaymentStatus = async () => {
    if (!selectedSubscription || !newPaymentStatus) {
      toast.error('Please select a payment status');
      return;
    }

    setProcessing(true);
    try {
      await apiClient.update_payment_status(
        { subscriptionId: selectedSubscription.subscription_id },
        { status: newPaymentStatus }
      );
      toast.success('Payment status updated successfully');
      setPaymentStatusDialogOpen(false);
      setNewPaymentStatus('');
      await loadSubscriptions();
    } catch (error: any) {
      console.error('Failed to update payment status:', error);
      toast.error(error.message || 'Failed to update payment status');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddNotes = async () => {
    if (!selectedSubscription) return;

    setProcessing(true);
    try {
      await apiClient.add_payment_notes(
        { subscriptionId: selectedSubscription.subscription_id },
        { notes: paymentNotes }
      );
      toast.success('Notes added successfully');
      setNotesDialogOpen(false);
      setPaymentNotes('');
      await loadSubscriptions();
    } catch (error: any) {
      console.error('Failed to add notes:', error);
      toast.error(error.message || 'Failed to add notes');
    } finally {
      setProcessing(false);
    }
  };

  const resetPaymentForm = () => {
    setPaymentAmount('');
    setPaymentReference('');
    setPaymentNotes('');
  };

  const openPaymentDialog = (subscription: any) => {
    setSelectedSubscription(subscription);
    // Auto-fill with outstanding amount for convenience
    const outstanding = parseFloat(subscription.total_amount || 0) - parseFloat(subscription.amount_paid || 0);
    setPaymentAmount(outstanding > 0 ? outstanding.toFixed(2) : '');
    setPaymentDialogOpen(true);
  };

  const openPaymentStatusDialog = (subscription: any) => {
    setSelectedSubscription(subscription);
    setNewPaymentStatus(subscription.payment_status || 'pending');
    setPaymentStatusDialogOpen(true);
  };

  const openNotesDialog = (subscription: any) => {
    setSelectedSubscription(subscription);
    setPaymentNotes(subscription.payment_notes || '');
    setNotesDialogOpen(true);
  };

  const openDetailsDialog = (subscription: any) => {
    setSelectedSubscription(subscription);
    setDetailsDialogOpen(true);
    loadPaymentHistory(subscription.subscription_id);
  };

  const loadPaymentHistory = async (subscriptionId: string) => {
    setLoadingHistory(true);
    try {
      const response = await apiClient.payments_get_payment_history({ subscriptionId });
      const data = await response.json();
      setPaymentHistory(data.payments || []);
    } catch (error: any) {
      console.error('Failed to load payment history:', error);
      setPaymentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGenerateCertificate = async (subscriptionId: string) => {
    try {
      const response = await apiClient.generate_certificate_manually({ subscriptionId });
      const result = await response.json();
      
      toast.success(`Certificate version ${result.version} generated successfully`);
      
      if (result.certificate_id && result.certificate_number) {
        const subscription = subscriptions.find((s: any) => s.subscription_id === subscriptionId);
        const shareholderName = subscription?.full_name || 'Unknown';
        
        const signUrl = `${APP_BASE_PATH}/sign-certificate?certId=${result.certificate_id}&certNumber=${encodeURIComponent(result.certificate_number)}&shareholder=${encodeURIComponent(shareholderName)}`;
        window.open(signUrl, '_blank');
      }
      
      await loadSubscriptions();
    } catch (error: any) {
      console.error('Error generating certificate:', error);
      toast.error(error.message || 'Failed to generate certificate');
    }
  };

  const handleSendReminder = async (subscription: any) => {
    // TODO: Implement send profile completion reminder
    toast.info('Reminder email feature coming soon');
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      verified: { variant: 'default', icon: CheckCircle, label: 'Verified' },
      completed: { variant: 'default', icon: CheckCircle, label: 'Completed' },
      failed: { variant: 'destructive', icon: XCircle, label: 'Failed' }
    };

    const config = statusMap[status] || statusMap.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Table columns configuration
  const columns = [
    {
      key: 'email',
      header: 'Investor',
      render: (sub: any) => (
        <div>
          <div className="font-medium">{sub.full_name || 'N/A'}</div>
          <div className="text-xs text-muted-foreground">{sub.email}</div>
        </div>
      )
    },
    {
      key: 'shares',
      header: 'Shares',
      render: (sub: any) => (
        <div>
          <div className="font-medium">{sub.num_shares || 0} shares</div>
          <div className="text-xs text-muted-foreground">{sub.share_class || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (sub: any) => (
        <div>
          <div className="font-medium">{formatCurrency(parseFloat(sub.total_amount || 0))}</div>
          <div className="text-xs text-muted-foreground">
            Paid: {formatCurrency(parseFloat(sub.amount_paid || 0))}
          </div>
        </div>
      )
    },
    {
      key: 'payment_status',
      header: 'Payment',
      render: (sub: any) => getPaymentStatusBadge(sub.payment_status || 'pending')
    },
    {
      key: 'profile',
      header: 'Profile',
      render: (sub: any) => (
        sub.profile_completed ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Pending
          </Badge>
        )
      )
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (sub: any) => new Date(sub.created_at).toLocaleDateString()
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (sub: any) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => openDetailsDialog(sub)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => openPaymentDialog(sub)}>
            <DollarSign className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleGenerateCertificate(sub.subscription_id)}>
            <Award className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <BackOfficeNav currentPage="admin-subscriptions" />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <BackOfficeNav currentPage="admin-subscriptions" />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Created Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage share subscriptions you've created on behalf of investors
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground">Pending: {stats.pending}</span>
                <span className="text-muted-foreground">Verified: {stats.verified}</span>
                <span className="text-green-600 font-medium">Completed: {stats.completed}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Paid: {formatCurrency(stats.paidAmount)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profile Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.profileCompleted / stats.total) * 100) : 0}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.profileCompleted} of {stats.total} completed
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Email Search */}
              <div>
                <Label htmlFor="search-email">Search Email/Name</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-email"
                    placeholder="Search..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Payment Status */}
              <div>
                <Label htmlFor="payment-status">Payment Status</Label>
                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger id="payment-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Profile Completion */}
              <div>
                <Label htmlFor="profile-filter">Profile Status</Label>
                <Select value={profileCompletedFilter} onValueChange={setProfileCompletedFilter}>
                  <SelectTrigger id="profile-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Profiles</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div>
                <Label htmlFor="date-from">Created From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="date-to">Created To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              {/* Amount Range */}
              <div>
                <Label htmlFor="amount-min">Min Amount</Label>
                <Input
                  id="amount-min"
                  type="number"
                  placeholder="0"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="amount-max">Max Amount</Label>
                <Input
                  id="amount-max"
                  type="number"
                  placeholder="999999"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Subscriptions ({filteredSubscriptions.length})</CardTitle>
                <CardDescription>Showing {filteredSubscriptions.length} of {subscriptions.length} subscriptions</CardDescription>
              </div>
              <Button onClick={() => navigate('/back-office-subscribe-on-behalf')}>
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveTable
              columns={columns}
              data={filteredSubscriptions}
              keyExtractor={(sub) => sub.subscription_id}
              emptyMessage="No subscriptions found"
            />
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {selectedSubscription?.full_name || selectedSubscription?.email}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (() => {
            const totalDue = parseFloat(selectedSubscription.total_amount || 0);
            const alreadyPaid = parseFloat(selectedSubscription.amount_paid || 0);
            const outstanding = totalDue - alreadyPaid;
            const paymentProgress = totalDue > 0 ? (alreadyPaid / totalDue) * 100 : 0;
            const currentPayment = parseFloat(paymentAmount || 0);
            const willExceed = currentPayment > outstanding;

            return (
              <>
                {/* Payment Summary Card */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Due</span>
                    <span className="text-lg font-bold">{formatCurrency(totalDue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Already Paid</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-500">{formatCurrency(alreadyPaid)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Outstanding Balance</span>
                      <span className="text-xl font-bold text-orange-600 dark:text-orange-500">{formatCurrency(outstanding)}</span>
                    </div>
                  </div>
                  
                  {/* Payment Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Payment Progress</span>
                      <span>{paymentProgress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label htmlFor="payment-amount">Payment Amount *</Label>
                      {outstanding > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setPaymentAmount(outstanding.toFixed(2))}
                        >
                          Fill Outstanding ({formatCurrency(outstanding)})
                        </Button>
                      )}
                    </div>
                    <Input
                      id="payment-amount"
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={outstanding}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className={willExceed ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {willExceed && (
                      <p className="text-sm text-red-600 dark:text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Amount exceeds outstanding balance by {formatCurrency(currentPayment - outstanding)}
                      </p>
                    )}
                    {currentPayment > 0 && !willExceed && (
                      <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                        Remaining after payment: {formatCurrency(outstanding - currentPayment)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="payment-ref">Payment Reference</Label>
                    <Input
                      id="payment-ref"
                      placeholder="Transaction ID, check number, etc."
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="payment-notes-dialog">Notes</Label>
                    <Textarea
                      id="payment-notes-dialog"
                      placeholder="Additional notes about this payment"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Status Dialog */}
      <Dialog open={paymentStatusDialogOpen} onOpenChange={setPaymentStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
            <DialogDescription>
              Change payment status for {selectedSubscription?.full_name || selectedSubscription?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-status">Payment Status</Label>
              <Select value={newPaymentStatus} onValueChange={setNewPaymentStatus}>
                <SelectTrigger id="new-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePaymentStatus} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Notes</DialogTitle>
            <DialogDescription>
              Add or update notes for {selectedSubscription?.full_name || selectedSubscription?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes-textarea">Notes</Label>
              <Textarea
                id="notes-textarea"
                placeholder="Enter payment notes, tracking details, etc."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNotes} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedSubscription?.full_name || selectedSubscription?.email}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-6">
              {/* Subscriber Information */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Subscriber Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Full Name</Label>
                    <div className="font-medium">{selectedSubscription.full_name || 'N/A'}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <div className="font-medium text-sm">{selectedSubscription.email}</div>
                  </div>
                </div>
              </div>

              {/* Subscription Details */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Subscription Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Share Class</Label>
                    <div className="font-medium">{selectedSubscription.share_class}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Number of Shares</Label>
                    <div className="font-medium">{selectedSubscription.num_shares}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Created On</Label>
                    <div className="font-medium text-sm">
                      {new Date(selectedSubscription.created_at).toLocaleString('en-ZA', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Financial Summary</h3>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Total Amount</Label>
                      <div className="text-lg font-bold">{formatCurrency(parseFloat(selectedSubscription.total_amount || 0))}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Amount Paid</Label>
                      <div className="text-lg font-bold text-green-600 dark:text-green-500">
                        {formatCurrency(parseFloat(selectedSubscription.amount_paid || 0))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Outstanding</Label>
                      <div className="text-lg font-bold text-orange-600 dark:text-orange-500">
                        {formatCurrency(
                          parseFloat(selectedSubscription.total_amount || 0) - 
                          parseFloat(selectedSubscription.amount_paid || 0)
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Information */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Payment Status</Label>
                    <div className="mt-1">{getPaymentStatusBadge(selectedSubscription.payment_status || 'pending')}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Profile Status</Label>
                    <div className="mt-1">
                      {selectedSubscription.profile_completed ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Payment History</h3>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : paymentHistory.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr className="text-left text-xs">
                          <th className="p-3 font-medium">Date</th>
                          <th className="p-3 font-medium">Amount</th>
                          <th className="p-3 font-medium">Reference</th>
                          <th className="p-3 font-medium">Status</th>
                          <th className="p-3 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {paymentHistory.map((payment: any, idx: number) => (
                          <tr key={idx} className="text-sm">
                            <td className="p-3">
                              {new Date(payment.payment_date).toLocaleString('en-ZA', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </td>
                            <td className="p-3 font-medium">
                              {formatCurrency(parseFloat(payment.amount))}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {payment.payment_reference || 'N/A'}
                            </td>
                            <td className="p-3">
                              <Badge variant={payment.status === 'verified' ? 'default' : 'secondary'}>
                                {payment.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {payment.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No payment history available
                  </div>
                )}
              </div>

              {selectedSubscription.payment_notes && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Additional Notes</h3>
                  <div className="p-3 bg-muted/30 rounded-md text-sm">
                    {selectedSubscription.payment_notes}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => { setDetailsDialogOpen(false); openPaymentDialog(selectedSubscription); }} variant="default" size="sm">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
                <Button onClick={() => { setDetailsDialogOpen(false); openPaymentStatusDialog(selectedSubscription); }} variant="outline" size="sm">
                  Update Status
                </Button>
                <Button onClick={() => { setDetailsDialogOpen(false); openNotesDialog(selectedSubscription); }} variant="outline" size="sm">
                  Edit Notes
                </Button>
                <Button onClick={() => handleGenerateCertificate(selectedSubscription.subscription_id)} variant="outline" size="sm">
                  <Award className="h-4 w-4 mr-2" />
                  Certificate
                </Button>
                {!selectedSubscription.profile_completed && (
                  <Button onClick={() => handleSendReminder(selectedSubscription)} variant="outline" size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reminder
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
