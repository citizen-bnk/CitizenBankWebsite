import { useState, useEffect } from 'react';
import { apiClient } from "app";
import { useUserGuardContext } from 'app/auth';
import { ProfileDropdown } from 'components/ProfileDropdown';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { TrendingUp, Users, DollarSign, Shield, BadgeCheck, Home, Loader2, Plus, MoreVertical, Edit, ArrowRightLeft, Users2, Trash2, AlertTriangle, Receipt, Upload, Download, CheckCircle, Clock } from 'lucide-react';
import { BackOfficeNav } from 'components/BackOfficeNav';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from 'components/CurrencyProvider';
import { API_URL } from 'app';
import { auth } from 'app';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Switch } from "@/components/ui/switch";

interface Subscription {
  id: number;
  user_id: string;
  num_shares: number;
  share_class: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  full_name: string;
  position: string;
  email: string;
}

interface Summary {
  total_board_investors: number;
  total_class_a_shares: number;
  total_class_b_shares: number;
  total_class_c_shares: number;
  total_amount_invested: number;
  total_amount_completed: number;
  class_a_paid: number;
  class_a_pending: number;
  class_b_paid: number;
  class_b_pending: number;
  class_c_paid: number;
  class_c_pending: number;
}

interface BoardMember {
  user_id: string;
  full_name: string;
  position: string;
  email: string;
}

export default function BackOfficeBoardInvestments() {
  const navigate = useNavigate();
  const { formatCurrency, selectedCurrency } = useCurrency();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTransferClassDialog, setShowTransferClassDialog] = useState(false);
  const [showTransferMemberDialog, setShowTransferMemberDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRecordPaymentDialog, setShowRecordPaymentDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Board members for dropdowns
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  
  // Form states
  const [createForm, setCreateForm] = useState({
    board_member_user_id: '',
    num_shares: '',
    share_class: 'Class A',
    payment_method: 'one_time',
    payment_status: 'pending',
    installment_months: ''
  });
  
  const [editForm, setEditForm] = useState({
    num_shares: '',
    payment_status: '',
    payment_method: ''
  });
  
  const [transferClassForm, setTransferClassForm] = useState({
    target_share_class: '',
    num_shares: ''
  });
  
  const [transferMemberForm, setTransferMemberForm] = useState({
    target_user_id: '',
    num_shares: ''
  });

  const [recordPaymentForm, setRecordPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
    proof_of_payment: null as File | null,
    send_email: true
  });

  useEffect(() => {
    loadInvestments();
    loadBoardMembers();
  }, []);

  const loadBoardMembers = async () => {
    try {
      const response = await apiClient.get_current_board_composition();
      const data = await response.json();
      setBoardMembers(data.members || []);
    } catch (error) {
      console.error('Error loading board members:', error);
    }
  };

  const loadInvestments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get_all_board_investments();
      const data = await response.json();
      
      setSubscriptions(data.subscriptions || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Error loading investments:', error);
      setError('Failed to load investments. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateSubscription = async () => {
    if (!createForm.board_member_user_id || !createForm.num_shares) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      setActionLoading(true);
      const response = await apiClient.create_investment_on_behalf({
        board_member_user_id: createForm.board_member_user_id,
        num_shares: parseInt(createForm.num_shares),
        share_class: createForm.share_class,
        payment_method: createForm.payment_method,
        payment_status: createForm.payment_status,
        installment_months: createForm.payment_method === 'installment' ? parseInt(createForm.installment_months) : null
      });
      
      const data = await response.json();
      toast.success(data.message || 'Subscription created successfully');
      setShowCreateDialog(false);
      setCreateForm({
        board_member_user_id: '',
        num_shares: '',
        share_class: 'Class A',
        payment_method: 'one_time',
        payment_status: 'pending',
        installment_months: ''
      });
      await loadInvestments();
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      toast.error(error.message || 'Failed to create subscription');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleEditSubscription = async () => {
    if (!selectedSubscription) return;
    
    const updates: any = {};
    if (editForm.num_shares) updates.num_shares = parseInt(editForm.num_shares);
    if (editForm.payment_status) updates.payment_status = editForm.payment_status;
    if (editForm.payment_method) updates.payment_method = editForm.payment_method;
    
    if (Object.keys(updates).length === 0) {
      toast.error('Please make at least one change');
      return;
    }
    
    try {
      setActionLoading(true);
      const response = await apiClient.update_board_investment(
        { subscriptionId: selectedSubscription.id },
        updates
      );
      
      const data = await response.json();
      toast.success(data.message || 'Subscription updated successfully');
      setShowEditDialog(false);
      setSelectedSubscription(null);
      setEditForm({ num_shares: '', payment_status: '', payment_method: '' });
      await loadInvestments();
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast.error(error.message || 'Failed to update subscription');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleTransferClass = async () => {
    if (!selectedSubscription || !transferClassForm.target_share_class || !transferClassForm.num_shares) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      setActionLoading(true);
      const response = await apiClient.transfer_shares_between_classes(
        { subscriptionId: selectedSubscription.id },
        {
          target_share_class: transferClassForm.target_share_class,
          num_shares: parseInt(transferClassForm.num_shares)
        }
      );
      
      const data = await response.json();
      toast.success(data.message || 'Shares transferred successfully');
      setShowTransferClassDialog(false);
      setSelectedSubscription(null);
      setTransferClassForm({ target_share_class: '', num_shares: '' });
      await loadInvestments();
    } catch (error: any) {
      console.error('Error transferring shares:', error);
      toast.error(error.message || 'Failed to transfer shares');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleTransferMember = async () => {
    if (!selectedSubscription || !transferMemberForm.target_user_id || !transferMemberForm.num_shares) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      setActionLoading(true);
      const response = await apiClient.transfer_shares_between_members(
        { subscriptionId: selectedSubscription.id },
        {
          target_user_id: transferMemberForm.target_user_id,
          num_shares: parseInt(transferMemberForm.num_shares)
        }
      );
      
      const data = await response.json();
      toast.success(data.message || 'Shares transferred successfully');
      setShowTransferMemberDialog(false);
      setSelectedSubscription(null);
      setTransferMemberForm({ target_user_id: '', num_shares: '' });
      await loadInvestments();
    } catch (error: any) {
      console.error('Error transferring shares:', error);
      toast.error(error.message || 'Failed to transfer shares');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleCancelSubscription = async () => {
    if (!selectedSubscription) return;
    
    try {
      setActionLoading(true);
      const response = await apiClient.cancel_board_investment({
        subscriptionId: selectedSubscription.id
      });
      
      const data = await response.json();
      toast.success(data.message || 'Subscription cancelled successfully');
      setShowCancelDialog(false);
      setSelectedSubscription(null);
      await loadInvestments();
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const openCancelDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowCancelDialog(true);
  };

  const openRecordPaymentDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setRecordPaymentForm({
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
      proof_of_payment: null,
      send_email: true
    });
    setShowRecordPaymentDialog(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedSubscription) return;

    try {
      setActionLoading(true);
      
      // Get auth token
      const token = await auth.getAuthToken();
      
      // Create FormData for file upload
      const formData = new FormData();
      if (recordPaymentForm.payment_date) {
        formData.append('payment_date', new Date(recordPaymentForm.payment_date).toISOString());
      }
      if (recordPaymentForm.notes) {
        formData.append('notes', recordPaymentForm.notes);
      }
      if (recordPaymentForm.proof_of_payment) {
        formData.append('proof_of_payment', recordPaymentForm.proof_of_payment);
      }
      formData.append('send_email', recordPaymentForm.send_email.toString());

      const response = await fetch(
        `${API_URL}/back-office/board/investments/${selectedSubscription.id}/record-payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to record payment');
      }

      const data = await response.json();

      // Download receipt if available
      if (data.receipt_pdf_base64) {
        const blob = base64ToBlob(data.receipt_pdf_base64, 'application/pdf');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Receipt_${selectedSubscription.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      toast.success(
        data.email_sent 
          ? 'Payment recorded and receipt sent via email' 
          : 'Payment recorded successfully'
      );
      
      setShowRecordPaymentDialog(false);
      await loadInvestments();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to convert base64 to blob
  const base64ToBlob = (base64: string, type: string) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  };
  
  const openEditDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setEditForm({
      num_shares: subscription.num_shares.toString(),
      payment_status: subscription.payment_status,
      payment_method: subscription.payment_method
    });
    setShowEditDialog(true);
  };
  
  const openTransferClassDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setTransferClassForm({
      target_share_class: subscription.share_class === 'Class A' ? 'Class B' : 'Class A',
      num_shares: subscription.num_shares.toString()
    });
    setShowTransferClassDialog(true);
  };
  
  const openTransferMemberDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setTransferMemberForm({
      target_user_id: '',
      num_shares: subscription.num_shares.toString()
    });
    setShowTransferMemberDialog(true);
  };
  
  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      completed: { variant: 'default', label: 'Completed' },
      pending: { variant: 'outline', label: 'Pending' },
      failed: { variant: 'destructive', label: 'Failed' }
    };
    
    const { variant, label } = config[status] || { variant: 'secondary', label: status };
    
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getShareClassBadge = (shareClass: string) => {
    if (shareClass === 'Class C') {
      return (
        <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
          <Shield className="h-3 w-3 mr-1" />
          {shareClass} (Internal)
        </Badge>
      );
    }
    return <Badge variant="outline">{shareClass}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading investments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <BackOfficeNav />
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button variant="outline" onClick={loadInvestments}>
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <BackOfficeNav currentPage="Board Investments" />
      
      <div className="page-container container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Board Member Investments</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Track board member share subscriptions including Class C internal shares</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="text-xs sm:text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Subscription
              </Button>
              <Button 
                onClick={() => navigate('/back-office-dashboard')}
                variant="outline"
                className="text-xs sm:text-sm"
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Board Investors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_board_investors}</div>
                <p className="text-muted-foreground">Unique members</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Class C Shares</CardTitle>
                <Shield className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {summary.total_class_c_shares.toLocaleString()}
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-xs text-green-600 dark:text-green-500 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />{summary.class_c_paid.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{summary.class_c_pending.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Class A Shares</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_class_a_shares.toLocaleString()}</div>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-xs text-green-600 dark:text-green-500 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />{summary.class_a_paid.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{summary.class_a_pending.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Class B Shares</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_class_b_shares.toLocaleString()}</div>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-xs text-green-600 dark:text-green-500 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />{summary.class_b_paid.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{summary.class_b_pending.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{formatCurrency(summary.total_amount_invested)}</div>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-xs text-green-600 dark:text-green-500 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />{formatCurrency(summary.total_amount_completed)}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{formatCurrency(summary.total_amount_invested - summary.total_amount_completed)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Info Card about Class C */}
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">Class C Internal Shares</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Class C shares are exclusively available to board members and employees. These internal shares are tracked separately and can only be purchased upon appointment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Investments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Board Member Subscriptions</CardTitle>
            <CardDescription>All share subscriptions made by board members</CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No board member investments yet
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Board Member</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Share Class</TableHead>
                      <TableHead>Shares</TableHead>
                      <TableHead>Amount ({selectedCurrency.code})</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id} className={sub.share_class === 'Class C' ? 'bg-blue-50 dark:bg-blue-950/30' : ''}>
                        <TableCell className="font-medium">{sub.full_name}</TableCell>
                        <TableCell className="capitalize">{sub.position?.replace('_', ' ') || '-'}</TableCell>
                        <TableCell>{getShareClassBadge(sub.share_class)}</TableCell>
                        <TableCell className="font-semibold">{sub.num_shares.toLocaleString()}</TableCell>
                        <TableCell>{formatCurrency(sub.total_amount)}</TableCell>
                        <TableCell className="capitalize">{sub.payment_method.replace('_', ' ')}</TableCell>
                        <TableCell>{getStatusBadge(sub.payment_status)}</TableCell>
                        <TableCell>{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(sub)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {sub.payment_status === 'pending' && (
                                <>
                                  <DropdownMenuItem onClick={() => openRecordPaymentDialog(sub)}>
                                    <Receipt className="h-4 w-4 mr-2" />
                                    Record Payment
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {sub.payment_status === 'completed' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleDownloadReceipt(sub)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Receipt
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem onClick={() => openTransferClassDialog(sub)}>
                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                Transfer Class
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openTransferMemberDialog(sub)}>
                                <Users2 className="h-4 w-4 mr-2" />
                                Transfer Member
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openCancelDialog(sub)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
      <Footer />
      
      {/* Create Subscription Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Share Subscription</DialogTitle>
            <DialogDescription>
              Create a share subscription on behalf of a board member
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="board-member">Board Member *</Label>
              <Select 
                value={createForm.board_member_user_id}
                onValueChange={(value) => setCreateForm({ ...createForm, board_member_user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select board member" />
                </SelectTrigger>
                <SelectContent>
                  {boardMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name} - {member.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="share-class">Share Class *</Label>
              <Select 
                value={createForm.share_class}
                onValueChange={(value) => setCreateForm({ ...createForm, share_class: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Class A">Class A - Preference Shares</SelectItem>
                  <SelectItem value="Class B">Class B - Ordinary Shares</SelectItem>
                  <SelectItem value="Class C">Class C - Internal Shares</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="num-shares">Number of Shares *</Label>
              <Input
                id="num-shares"
                type="number"
                value={createForm.num_shares}
                onChange={(e) => setCreateForm({ ...createForm, num_shares: e.target.value })}
                placeholder="Enter number of shares"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="payment-method">Payment Method *</Label>
              <Select 
                value={createForm.payment_method}
                onValueChange={(value) => setCreateForm({ ...createForm, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One Time</SelectItem>
                  <SelectItem value="installment">Installment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {createForm.payment_method === 'installment' && (
              <div className="grid gap-2">
                <Label htmlFor="installment-months">Installment Months</Label>
                <Input
                  id="installment-months"
                  type="number"
                  value={createForm.installment_months}
                  onChange={(e) => setCreateForm({ ...createForm, installment_months: e.target.value })}
                  placeholder="Enter number of months"
                />
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="payment-status">Payment Status *</Label>
              <Select 
                value={createForm.payment_status}
                onValueChange={(value) => setCreateForm({ ...createForm, payment_status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubscription} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Subscription Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription details for {selectedSubscription?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-shares">Number of Shares</Label>
              <Input
                id="edit-shares"
                type="number"
                value={editForm.num_shares}
                onChange={(e) => setEditForm({ ...editForm, num_shares: e.target.value })}
                placeholder="Leave empty to keep current value"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-payment-status">Payment Status</Label>
              <Select 
                value={editForm.payment_status}
                onValueChange={(value) => setEditForm({ ...editForm, payment_status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select to change" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-payment-method">Payment Method</Label>
              <Select 
                value={editForm.payment_method}
                onValueChange={(value) => setEditForm({ ...editForm, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select to change" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One Time</SelectItem>
                  <SelectItem value="installment">Installment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleEditSubscription} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Transfer Class Dialog */}
      <Dialog open={showTransferClassDialog} onOpenChange={setShowTransferClassDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transfer Shares Between Classes</DialogTitle>
            <DialogDescription>
              Transfer shares from {selectedSubscription?.share_class} to another class
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="target-class">Target Share Class *</Label>
              <Select 
                value={transferClassForm.target_share_class}
                onValueChange={(value) => setTransferClassForm({ ...transferClassForm, target_share_class: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target class" />
                </SelectTrigger>
                <SelectContent>
                  {selectedSubscription?.share_class !== 'Class A' && <SelectItem value="Class A">Class A - Preference Shares</SelectItem>}
                  {selectedSubscription?.share_class !== 'Class B' && <SelectItem value="Class B">Class B - Ordinary Shares</SelectItem>}
                  {selectedSubscription?.share_class !== 'Class C' && <SelectItem value="Class C">Class C - Internal Shares</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="transfer-shares">Number of Shares *</Label>
              <Input
                id="transfer-shares"
                type="number"
                max={selectedSubscription?.num_shares}
                value={transferClassForm.num_shares}
                onChange={(e) => setTransferClassForm({ ...transferClassForm, num_shares: e.target.value })}
                placeholder="Enter number of shares to transfer"
              />
              <p className="text-sm text-muted-foreground">
                Available: {selectedSubscription?.num_shares} shares
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferClassDialog(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleTransferClass} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Transfer Shares
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Transfer Member Dialog */}
      <Dialog open={showTransferMemberDialog} onOpenChange={setShowTransferMemberDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transfer Shares Between Members</DialogTitle>
            <DialogDescription>
              Transfer {selectedSubscription?.share_class} shares from {selectedSubscription?.full_name} to another board member
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="target-member">Target Board Member *</Label>
              <Select 
                value={transferMemberForm.target_user_id}
                onValueChange={(value) => setTransferMemberForm({ ...transferMemberForm, target_user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select board member" />
                </SelectTrigger>
                <SelectContent>
                  {boardMembers
                    .filter(m => m.user_id !== selectedSubscription?.user_id)
                    .map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name} - {member.position}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="transfer-member-shares">Number of Shares *</Label>
              <Input
                id="transfer-member-shares"
                type="number"
                max={selectedSubscription?.num_shares}
                value={transferMemberForm.num_shares}
                onChange={(e) => setTransferMemberForm({ ...transferMemberForm, num_shares: e.target.value })}
                placeholder="Enter number of shares to transfer"
              />
              <p className="text-sm text-muted-foreground">
                Available: {selectedSubscription?.num_shares} shares
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferMemberDialog(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleTransferMember} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Transfer Shares
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this subscription?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900 dark:text-amber-100">Warning</p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  This will cancel the subscription for <strong>{selectedSubscription?.full_name}</strong> ({selectedSubscription?.num_shares} {selectedSubscription?.share_class} shares).
                  {selectedSubscription?.payment_status === 'completed' && (
                    <> Shares will be returned to the pool and the board member's total shares will be reduced.</>
                  )}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={actionLoading}>
              Keep Subscription
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Record Payment Dialog */}
      <Dialog open={showRecordPaymentDialog} onOpenChange={setShowRecordPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Mark subscription as paid and generate receipt for {selectedSubscription?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Payment Details Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Share Class:</span>
                <span className="font-medium">{selectedSubscription?.share_class}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Number of Shares:</span>
                <span className="font-medium">{selectedSubscription?.num_shares.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-semibold">{formatCurrency(selectedSubscription?.total_amount || 0)}</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payment-date">Payment Date *</Label>
              <Input
                id="payment-date"
                type="date"
                value={recordPaymentForm.payment_date}
                onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, payment_date: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="payment-notes">Notes (Optional)</Label>
              <Input
                id="payment-notes"
                type="text"
                value={recordPaymentForm.notes}
                onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, notes: e.target.value })}
                placeholder="Add any notes about this payment"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="proof-upload">Proof of Payment (Optional)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('proof-upload')?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {recordPaymentForm.proof_of_payment ? recordPaymentForm.proof_of_payment.name : 'Upload Proof'}
                </Button>
                <input
                  id="proof-upload"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setRecordPaymentForm({ ...recordPaymentForm, proof_of_payment: file });
                  }}
                />
              </div>
              {recordPaymentForm.proof_of_payment && (
                <p className="text-xs text-muted-foreground">
                  Selected: {recordPaymentForm.proof_of_payment.name}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <input
                type="checkbox"
                id="send-email-receipt"
                checked={recordPaymentForm.send_email}
                onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, send_email: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="send-email-receipt" className="text-sm cursor-pointer">
                Send receipt via email to {selectedSubscription?.email}
              </Label>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <Download className="h-4 w-4 text-blue-600 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                A branded PDF receipt will be automatically generated and downloaded after recording the payment.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordPaymentDialog(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Receipt className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
