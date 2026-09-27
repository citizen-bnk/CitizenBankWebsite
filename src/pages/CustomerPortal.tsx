import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useUserGuardContext } from 'app/auth';
import { useNavigate } from 'react-router-dom';
import brain from 'brain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertCircle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Building2, 
  Calculator,
  Calendar,
  ChevronRight,
  CreditCard, 
  DollarSign, 
  Download,
  Eye,
  EyeOff,
  FileText, 
  Filter,
  HandCoins,
  LayoutDashboard,
  Lock,
  Plus,
  Receipt,
  Search,
  Send, 
  Shield,
  Trash2,
  TrendingUp, 
  Unlock,
  UserPlus,
  Users, 
  Wallet
} from 'lucide-react';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { showErrorToast } from 'utils/errorHandling';
import { useUserRoles } from 'utils/useUserRoles';
import { useUserProfile } from 'utils/userProfile';
import { useCurrency } from 'components/CurrencyProvider';
import { toast } from 'sonner';

const CustomerPortal = () => {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();
  const { isInvestor, isBoardMember, roles } = useUserRoles();
  const { profile, loading: profileLoading, fetchProfile } = useUserProfile();
  const { formatCurrency } = useCurrency();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [billPayments, setBillPayments] = useState<BillPayment[]>([]);

  // Provide a safe fallback for dashboard data to avoid null access
  const safeDashboard: DashboardResponse = useMemo(() => ({
    accounts: dashboardData?.accounts ?? [],
    account_summary: {
      total_balance: dashboardData?.account_summary?.total_balance ?? '0',
      checking_balance: dashboardData?.account_summary?.checking_balance ?? '0',
      savings_balance: dashboardData?.account_summary?.savings_balance ?? '0',
      fixed_deposit_balance: dashboardData?.account_summary?.fixed_deposit_balance ?? '0',
      active_accounts: dashboardData?.account_summary?.active_accounts ?? 0,
    },
    recent_transactions: dashboardData?.recent_transactions ?? [],
    active_loans: dashboardData?.active_loans ?? [],
    active_cards: dashboardData?.active_cards ?? [],
    pending_bills: dashboardData?.pending_bills ?? 0,
  }), [dashboardData]);

  // Transfer form state
  const [transferForm, setTransferForm] = useState<Partial<TransferRequest>>({
    transfer_type: 'internal',
    save_beneficiary: false,
  });
  const [showAddBeneficiary, setShowAddBeneficiary] = useState(false);
  const [newBeneficiary, setNewBeneficiary] = useState<Partial<BeneficiaryRequest>>({});

  // Bill payment form state
  const [billForm, setBillForm] = useState<Partial<BillPaymentRequest>>({
    is_recurring: false,
  });

  // Loan calculator state
  const [loanCalc, setLoanCalc] = useState<Partial<LoanCalculatorRequest>>({});
  const [loanCalcResult, setLoanCalcResult] = useState<LoanCalculatorResponse | null>(null);

  // Card limits form state
  const [selectedCardForLimits, setSelectedCardForLimits] = useState<number | null>(null);
  const [cardLimitsForm, setCardLimitsForm] = useState<Partial<UpdateCardLimitsRequest>>({});

  // Invitation form state
  const [invitationForm, setInvitationForm] = useState<Partial<AppApisBoardPortalCreateInvitationRequest>>({
    role: 'investor',
  });
  const [myInvitations, setMyInvitations] = useState<any[]>([]);

  // Load dashboard data
  useEffect(() => {
    loadAllData();
  }, []);

  // Load all data in parallel for better performance
  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Make all API calls in parallel instead of sequentially
      const [dashboardRes, accountsRes, loansRes, cardsRes, beneficiariesRes, billPaymentsRes] = await Promise.all([
        brain.get_dashboard().catch(() => null),
        brain.list_accounts().catch(() => null),
        brain.list_loans().catch(() => null),
        brain.list_cards().catch(() => null),
        brain.list_beneficiaries().catch(() => null),
        brain.list_bill_payments({ limit: 50 }).catch(() => null)
      ]);

      // Process dashboard data
      if (dashboardRes) {
        const dashboardData = await dashboardRes.json();
        setDashboardData(dashboardData);
        setAccounts(dashboardData.accounts || []);
        setTransactions(dashboardData.recent_transactions || []);
        setLoans(dashboardData.active_loans || []);
        setCards(dashboardData.active_cards || []);
      }

      // Process additional data
      if (accountsRes) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData || []);
      }

      if (loansRes) {
        const loansData = await loansRes.json();
        setLoans(loansData || []);
      }

      if (cardsRes) {
        const cardsData = await cardsRes.json();
        setCards(cardsData || []);
      }

      if (beneficiariesRes) {
        const beneficiariesData = await beneficiariesRes.json();
        setBeneficiaries(beneficiariesData || []);
      }

      if (billPaymentsRes) {
        const billPaymentsData = await billPaymentsRes.json();
        setBillPayments(billPaymentsData || []);
      }
    } catch (error: any) {
      console.error('Error loading customer portal data:', error);
      toast.error('Failed to load some data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get_dashboard();
      const data = await response.json();
      setAccounts(data.accounts);
      setTransactions(data.recent_transactions);
      setLoans(data.active_loans);
      setCards(data.active_cards);
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      showErrorToast(error, 'Unable to load dashboard. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Load accounts
  const loadAccounts = async () => {
    try {
      const response = await apiClient.list_accounts();
      const data = await response.json();
      setAccounts(data);
    } catch (error: any) {
      console.error('Error loading accounts:', error);
      showErrorToast(error, 'Unable to load accounts. Please refresh the page.');
    }
  };

  // Load transactions
  const loadTransactions = async () => {
    try {
      const response = await apiClient.search_transactions({
        limit: 100,
      });
      const data = await response.json();
      setTransactions(data);
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      showErrorToast(error, 'Unable to load transactions. Please refresh the page.');
    }
  };

  // Load beneficiaries
  const loadBeneficiaries = async () => {
    try {
      const response = await apiClient.list_beneficiaries();
      const data = await response.json();
      setBeneficiaries(data);
    } catch (error: any) {
      console.error('Error loading beneficiaries:', error);
      showErrorToast(error, 'Unable to load beneficiaries. Please refresh the page.');
    }
  };

  // Load loans
  const loadLoans = async () => {
    try {
      const response = await apiClient.list_loans();
      const data = await response.json();
      setLoans(data);
    } catch (error: any) {
      console.error('Error loading loans:', error);
      showErrorToast(error, 'Unable to load loans. Please refresh the page.');
    }
  };

  // Load cards
  const loadCards = async () => {
    try {
      const response = await apiClient.list_cards();
      const data = await response.json();
      setCards(data);
    } catch (error: any) {
      console.error('Error loading cards:', error);
      showErrorToast(error, 'Unable to load cards. Please refresh the page.');
    }
  };

  // Load bill payments
  const loadBillPayments = async () => {
    try {
      const response = await apiClient.list_bill_payments({ limit: 50 });
      const data = await response.json();
      setBillPayments(data);
    } catch (error: any) {
      console.error('Error loading bill payments:', error);
      showErrorToast(error, 'Unable to load bill payments. Please refresh the page.');
    }
  };

  // Create transfer
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.create_transfer(transferForm as TransferRequest);
      const data = await response.json();
      toast.success('Transfer completed successfully');
      setTransferForm({ transfer_type: 'internal', save_beneficiary: false });
      loadDashboard();
      loadBeneficiaries();
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error(error.message || 'Transfer failed');
    }
  };

  // Add beneficiary
  const handleAddBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.add_beneficiary(newBeneficiary as BeneficiaryRequest);
      toast.success('Beneficiary added successfully');
      setNewBeneficiary({});
      setShowAddBeneficiary(false);
      loadBeneficiaries();
    } catch (error: any) {
      console.error('Add beneficiary error:', error);
      toast.error(error.message || 'Failed to add beneficiary');
    }
  };

  // Delete beneficiary
  const handleDeleteBeneficiary = async (id: number) => {
    if (!confirm('Are you sure you want to delete this beneficiary?')) return;
    try {
      await apiClient.delete_beneficiary({ beneficiaryId: id });
      toast.success('Beneficiary deleted');
      loadBeneficiaries();
    } catch (error: any) {
      console.error('Delete beneficiary error:', error);
      toast.error(error.message || 'Failed to delete beneficiary');
    }
  };

  // Create bill payment
  const handleBillPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.create_bill_payment(billForm as BillPaymentRequest);
      toast.success(billForm.scheduled_date ? 'Bill payment scheduled' : 'Bill payment completed');
      setBillForm({ is_recurring: false });
      loadBillPayments();
      loadDashboard();
    } catch (error: any) {
      console.error('Bill payment error:', error);
      toast.error(error.message || 'Bill payment failed');
    }
  };

  // Calculate loan
  const handleLoanCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.calculate_loan(loanCalc as LoanCalculatorRequest);
      const data = await response.json();
      setLoanCalcResult(data);
    } catch (error: any) {
      console.error('Loan calculation error:', error);
      toast.error(error.message || 'Calculation failed');
    }
  };

  // Card actions
  const handleCardAction = async (cardId: number, action: 'block' | 'unblock') => {
    try {
      await apiClient.card_action({ card_id: cardId, action });
      toast.success(`Card ${action === 'block' ? 'blocked' : 'activated'} successfully`);
      loadCards();
    } catch (error: any) {
      console.error('Card action error:', error);
      toast.error(error.message || 'Card action failed');
    }
  };

  // Update card limits
  const handleUpdateCardLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardForLimits) return;
    try {
      await apiClient.update_card_limits({
        card_id: selectedCardForLimits,
        ...cardLimitsForm,
      });
      toast.success('Card limits updated successfully');
      setSelectedCardForLimits(null);
      setCardLimitsForm({});
      loadCards();
    } catch (error: any) {
      console.error('Update limits error:', error);
      toast.error(error.message || 'Failed to update limits');
    }
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get account type badge color
  const getAccountTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      checking: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      savings: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      fixed_deposit: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      business: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  // Get transaction icon
  const getTransactionIcon = (type: string) => {
    const isCredit = ['deposit', 'transfer_in', 'interest'].includes(type);
    return isCredit ? (
      <ArrowDownLeft className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowUpRight className="h-4 w-4 text-red-600" />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="page-container container mx-auto px-4 py-6 sm:py-8">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="page-container container mx-auto px-4 py-6 sm:py-8">
        {/* Welcome Banner */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 md:pt-20 lg:pt-24">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                Welcome back, {user.displayName || user.primaryEmail}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Here's what's happening with your accounts</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isInvestor && (
                <Button 
                  onClick={() => navigate('/my-subscriptions')} 
                  variant="outline"
                  className="text-xs sm:text-sm"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  My Investments
                </Button>
              )}
              {isBoardMember && (
                <Button 
                  onClick={() => navigate('/board-portal')} 
                  className="bg-[#6d52a2] hover:bg-[#5a4289] text-xs sm:text-sm"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Board Portal
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Completion Alert */}
        {!profile && !profileLoading && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-sm">
              <span className="font-medium">Complete your profile</span> to unlock all banking features.
              <Button 
                onClick={() => navigate('/complete-profile?edit=true')} 
                variant="link" 
                className="ml-2 p-0 h-auto text-orange-600 hover:text-orange-700 text-sm"
              >
                Complete now →
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile-friendly tabs with horizontal scroll */}
          <div className="overflow-x-auto">
            <TabsList className="inline-flex min-w-full sm:min-w-0 w-full sm:w-auto">
              <TabsTrigger value="dashboard" className="flex items-center gap-2 text-xs sm:text-sm">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Home</span>
              </TabsTrigger>
              <TabsTrigger value="accounts" className="flex items-center gap-2 text-xs sm:text-sm">
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Accounts</span>
                <span className="sm:hidden">Accounts</span>
              </TabsTrigger>
              <TabsTrigger value="transfer" className="flex items-center gap-2 text-xs sm:text-sm">
                <ArrowLeftRight className="h-4 w-4" />
                <span className="hidden sm:inline">Transfer</span>
                <span className="sm:hidden">Send</span>
              </TabsTrigger>
              <TabsTrigger value="bills" className="flex items-center gap-2 text-xs sm:text-sm">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Bill Payments</span>
                <span className="sm:hidden">Bills</span>
              </TabsTrigger>
              <TabsTrigger value="cards" className="flex items-center gap-2 text-xs sm:text-sm">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
                <span className="sm:hidden">Cards</span>
              </TabsTrigger>
              <TabsTrigger value="loans" className="flex items-center gap-2 text-xs sm:text-sm">
                <Banknote className="h-4 w-4" />
                <span className="hidden sm:inline">Loans</span>
                <span className="sm:hidden">Loans</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Share Subscription Tab */}
          <TabsContent value="shares" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscribe to Citizen Bank Shares</CardTitle>
                <CardDescription>
                  Become a shareholder in Lesotho's premier banking institution. M1 billion share offering now open.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You must be a registered user to subscribe to shares. Complete your profile to get started.
                  </AlertDescription>
                </Alert>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Share Price</p>
                      <p className="text-2xl font-bold">{formatCurrency(100)}</p>
                      <p className="text-xs text-muted-foreground">per share</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Minimum Investment</p>
                      <p className="text-2xl font-bold">{formatCurrency(1000)}</p>
                      <p className="text-xs text-muted-foreground">10 shares</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Total Offering</p>
                      <p className="text-2xl font-bold">{formatCurrency(1_000_000_000, { notation: 'compact' })}</p>
                      <p className="text-xs text-muted-foreground">10 million shares</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="font-semibold">Benefits of Shareholding</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
                        <span>Participate in the growth of Lesotho's banking sector</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
                        <span>Receive annual dividends based on bank performance</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
                        <span>Voting rights in annual general meetings</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
                        <span>Priority access to new banking products and services</span>
                      </li>
                    </ul>
                  </div>
                  <Separator />
                  <div className="flex gap-3">
                    <Button 
                      className="flex-1" 
                      onClick={() => {
                        window.location.href = '/share-subscription';
                      }}
                    >
                      <HandCoins className="h-4 w-4 mr-2" />
                      Subscribe Now
                    </Button>
                    {isInvestor && (
                      <Button 
                        variant="outline"
                        onClick={() => navigate('/my-subscriptions')}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        My Investments
                      </Button>
                    )}
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Download Prospectus
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading your dashboard...</p>
              </div>
            ) : (
              <>
                {/* Account Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs sm:text-sm">Total Balance</CardDescription>
                      <CardTitle className="text-xl sm:text-2xl md:text-3xl">
                        {formatCurrency(parseFloat(safeDashboard.account_summary.total_balance || '0'))}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-green-600 text-xs sm:text-sm">
                        <TrendingUp className="h-4 w-4" />
                        <span>All accounts</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Checking</CardTitle>
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(parseFloat(safeDashboard.account_summary.checking_balance || '0'))}
                      </div>
                      <p className="text-xs text-muted-foreground">Available balance</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Savings</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(parseFloat(safeDashboard.account_summary.savings_balance || '0'))}
                      </div>
                      <p className="text-xs text-muted-foreground">Growing your wealth</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{safeDashboard.active_loans.length}</div>
                      <p className="text-xs text-muted-foreground">Loan accounts</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Role-Based Quick Access Cards */}
                {(isBoardMember || isInvestor) && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Board Member Portal Card */}
                    {isBoardMember && (
                      <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950 dark:to-background">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                              <Shield className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                              <CardTitle>Board Portal</CardTitle>
                              <CardDescription>Access board member features</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            Manage board documents, invitations, and governance activities.
                          </p>
                          <Button 
                            onClick={() => navigate('/board-portal')} 
                            className="w-full"
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Open Board Portal
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Investor Portal Card */}
                    {isInvestor && (
                      <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-950 dark:to-background">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                              <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <CardTitle>My Investments</CardTitle>
                              <CardDescription>View your investment portfolio</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            Track your shares, dividends, and investment performance.
                          </p>
                          <Button 
                            onClick={() => navigate('/board-investment')} 
                            className="w-full"
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            View My Investments
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common banking operations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Button variant="outline" className="justify-start" onClick={() => setActiveTab('transfers')}>
                        <ArrowLeftRight className="h-4 w-4 mr-2" />
                        Make Transfer
                      </Button>
                      <Button variant="outline" className="justify-start" onClick={() => setActiveTab('bills')}>
                        <FileText className="h-4 w-4 mr-2" />
                        Pay Bills
                      </Button>
                      <Button variant="outline" className="justify-start" onClick={() => navigate('/share-subscription')}>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Subscribe to Shares
                      </Button>
                      <Button variant="outline" className="justify-start" onClick={() => setActiveTab('statements')}>
                        <FileText className="h-4 w-4 mr-2" />
                        View Statements
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Transactions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>Your latest banking activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {safeDashboard.recent_transactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No recent transactions
                        </p>
                      ) : (
                        safeDashboard.recent_transactions.slice(0, 5).map((txn) => (
                          <div key={txn.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getTransactionIcon(txn.transaction_type)}
                              <div>
                                <p className="text-sm font-medium">{txn.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(txn.transaction_date)} • {txn.reference}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={
                                  `text-sm font-medium ${
                                    ['deposit', 'transfer_in', 'interest'].includes(txn.transaction_type)
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }`
                                }
                              >
                                {['deposit', 'transfer_in', 'interest'].includes(txn.transaction_type) ? '+' : '-'}
                                {formatCurrency(Math.abs(Number(txn.amount)))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Balance: {formatCurrency(Number(txn.balance_after))}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      {safeDashboard.recent_transactions.length > 5 && (
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={() => {
                            setActiveTab('accounts');
                            loadTransactions();
                          }}
                        >
                          View All Transactions
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Accounts</CardTitle>
                <CardDescription>View and manage your bank accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Wallet className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{account.account_name}</p>
                            <Badge className={getAccountTypeBadge(account.account_type)}>
                              {account.account_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Account: {account.account_number}</p>
                          {account.interest_rate && Number(account.interest_rate) > 0 && (
                            <p className="text-xs text-muted-foreground">Interest: {account.interest_rate}% p.a.</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{formatCurrency(Number(account.balance))}</p>
                        <p className="text-sm text-muted-foreground">
                          Available: {formatCurrency(Number(account.available_balance))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transfers Tab */}
          <TabsContent value="transfers" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Transfer Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Make a Transfer</CardTitle>
                  <CardDescription>Send money to another account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTransfer} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Transfer Type</Label>
                      <Select
                        value={transferForm.transfer_type}
                        onValueChange={(value) =>
                          setTransferForm({ ...transferForm, transfer_type: value as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal (Citizen Bank)</SelectItem>
                          <SelectItem value="external">External (Other Bank)</SelectItem>
                          <SelectItem value="international">International</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>From Account</Label>
                      <Select
                        value={transferForm.from_account_id?.toString()}
                        onValueChange={(value) =>
                          setTransferForm({ ...transferForm, from_account_id: parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>
                              {acc.account_name} - {formatCurrency(acc.available_balance)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Beneficiary</Label>
                      <Select
                        value={transferForm.beneficiary_name}
                        onValueChange={(value) => {
                          const beneficiary = beneficiaries.find((b) => b.beneficiary_name === value);
                          if (beneficiary) {
                            setTransferForm({
                              ...transferForm,
                              beneficiary_name: beneficiary.beneficiary_name,
                              to_account_number: beneficiary.account_number,
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select or enter new" />
                        </SelectTrigger>
                        <SelectContent>
                          {beneficiaries.map((ben) => (
                            <SelectItem key={ben.id} value={ben.beneficiary_name}>
                              {ben.beneficiary_name} - {ben.account_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Beneficiary Name</Label>
                      <Input
                        value={transferForm.beneficiary_name || ''}
                        onChange={(e) =>
                          setTransferForm({ ...transferForm, beneficiary_name: e.target.value })
                        }
                        placeholder="Enter name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input
                        value={transferForm.to_account_number || ''}
                        onChange={(e) =>
                          setTransferForm({ ...transferForm, to_account_number: e.target.value })
                        }
                        placeholder="Enter account number"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={transferForm.amount || ''}
                        onChange={(e) => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reference">Reference</Label>
                      <Input
                        id="reference"
                        value={transferForm.description || ''}
                        onChange={(e) =>
                          setTransferForm({ ...transferForm, description: e.target.value })
                        }
                        placeholder="Payment for..."
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={transferForm.save_beneficiary}
                        onCheckedChange={(checked) =>
                          setTransferForm({ ...transferForm, save_beneficiary: checked })
                        }
                      />
                      <Label>Save as beneficiary</Label>
                    </div>

                    <Button type="submit" className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Send Transfer
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Beneficiaries List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Saved Beneficiaries</CardTitle>
                      <CardDescription>Manage your saved beneficiaries</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setShowAddBeneficiary(true);
                        loadBeneficiaries();
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {showAddBeneficiary && (
                    <form onSubmit={handleAddBeneficiary} className="space-y-3 mb-4 p-4 border rounded-lg">
                      <h3 className="font-semibold">Add New Beneficiary</h3>
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={newBeneficiary.beneficiary_name || ''}
                          onChange={(e) =>
                            setNewBeneficiary({ ...newBeneficiary, beneficiary_name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input
                          value={newBeneficiary.account_number || ''}
                          onChange={(e) =>
                            setNewBeneficiary({ ...newBeneficiary, account_number: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input
                          value={newBeneficiary.bank_name || ''}
                          onChange={(e) =>
                            setNewBeneficiary({ ...newBeneficiary, bank_name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={newBeneficiary.beneficiary_type}
                          onValueChange={(value) =>
                            setNewBeneficiary({ ...newBeneficiary, beneficiary_type: value as any })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="internal">Internal</SelectItem>
                            <SelectItem value="external">External</SelectItem>
                            <SelectItem value="international">International</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Account/Reference Number</Label>
                        <Input
                          value={newBeneficiary.account_number || ''}
                          onChange={(e) =>
                            setNewBeneficiary({ ...newBeneficiary, account_number: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" className="flex-1">
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowAddBeneficiary(false);
                            setNewBeneficiary({});
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2">
                    {beneficiaries.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No saved beneficiaries
                      </p>
                    ) : (
                      beneficiaries.map((ben) => (
                        <div
                          key={ben.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{ben.beneficiary_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {ben.account_number} • {ben.bank_name}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBeneficiary(ben.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Bills Tab */}
          <TabsContent value="bills" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Bill Payment Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Pay a Bill</CardTitle>
                  <CardDescription>Pay your utilities and service providers</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBillPayment} className="space-y-4">
                    <div className="space-y-2">
                      <Label>From Account</Label>
                      <Select
                        value={billForm.account_id?.toString()}
                        onValueChange={(value) =>
                          setBillForm({ ...billForm, account_id: parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>
                              {acc.account_name} - {formatCurrency(acc.available_balance)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Biller Category</Label>
                      <Select
                        value={billForm.biller_category}
                        onValueChange={(value) =>
                          setBillForm({ ...billForm, biller_category: value as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="telecom">Telecom</SelectItem>
                          <SelectItem value="insurance">Insurance</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Biller Name</Label>
                      <Input
                        value={billForm.biller_name || ''}
                        onChange={(e) => setBillForm({ ...billForm, biller_name: e.target.value })}
                        placeholder="e.g., LEWA, Econet"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Account/Reference Number</Label>
                      <Input
                        value={billForm.account_reference || ''}
                        onChange={(e) =>
                          setBillForm({ ...billForm, account_reference: e.target.value })
                        }
                        placeholder="Your account number with the biller"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="biller-amount">Amount</Label>
                      <Input
                        id="biller-amount"
                        type="number"
                        placeholder="0.00"
                        value={billForm.amount || ''}
                        onChange={(e) => setBillForm({ ...billForm, amount: parseFloat(e.target.value) })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Schedule Payment (Optional)</Label>
                      <Input
                        type="date"
                        value={billForm.scheduled_date || ''}
                        onChange={(e) =>
                          setBillForm({ ...billForm, scheduled_date: e.target.value })
                        }
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={billForm.is_recurring}
                        onCheckedChange={(checked) =>
                          setBillForm({ ...billForm, is_recurring: checked })
                        }
                      />
                      <Label>Recurring Payment</Label>
                    </div>

                    {billForm.is_recurring && (
                      <div className="space-y-2">
                        <Label>Recurrence</Label>
                        <Select
                          value={billForm.recurrence_pattern}
                          onValueChange={(value) =>
                            setBillForm({ ...billForm, recurrence_pattern: value as any })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <Button type="submit" className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      {billForm.scheduled_date ? 'Schedule Payment' : 'Pay Now'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>Your recent bill payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {billPayments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No bill payments yet
                      </p>
                    ) : (
                      billPayments.slice(0, 10).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                              <FileText className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                            </div>
                            <div>
                              <p className="font-medium">{payment.biller_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {payment.account_reference} •{' '}
                                {formatDate(payment.payment_date.toString())}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                            <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Loans Tab */}
          <TabsContent value="loans" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Loan Calculator */}
              <Card>
                <CardHeader>
                  <CardTitle>Loan Calculator</CardTitle>
                  <CardDescription>Calculate your monthly payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLoanCalculation} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Loan Type</Label>
                      <Select
                        value={loanCalc.loan_type}
                        onValueChange={(value) => setLoanCalc({ ...loanCalc, loan_type: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select loan type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">Personal (10.5%)</SelectItem>
                          <SelectItem value="business">Business (12.0%)</SelectItem>
                          <SelectItem value="mortgage">Mortgage (8.5%)</SelectItem>
                          <SelectItem value="vehicle">Vehicle (9.0%)</SelectItem>
                          <SelectItem value="education">Education (7.5%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loan-amount">Loan Amount</Label>
                      <Input
                        id="loan-amount"
                        type="number"
                        placeholder="e.g., 50000"
                        value={loanCalc.amount || ''}
                        onChange={(e) => setLoanCalc({ ...loanCalc, amount: parseFloat(e.target.value) })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loan-term">Loan Term (in months)</Label>
                      <Input
                        id="loan-term"
                        type="number"
                        value={loanCalc.term_months || ''}
                        onChange={(e) =>
                          setLoanCalc({ ...loanCalc, term_months: parseInt(e.target.value) })
                        }
                        placeholder="24"
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      <Calculator className="h-4 w-4 mr-2" />
                      Calculate
                    </Button>

                    {loanCalcResult && (
                      <div className="space-y-3 p-4 bg-muted rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Monthly Payment</p>
                            <p className="text-lg font-semibold">{formatCurrency(loanCalcResult.monthly_payment)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Interest</p>
                            <p className="text-lg font-semibold">{formatCurrency(loanCalcResult.total_interest)}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">Total Repayment</p>
                            <p className="text-lg font-semibold">{formatCurrency(loanCalcResult.total_repayment)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>

              {/* My Loans */}
              <Card>
                <CardHeader>
                  <CardTitle>My Loans</CardTitle>
                  <CardDescription>View and manage your loan accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loans.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No active loans</p>
                    ) : (
                      loans.map((loan) => (
                        <div
                          key={loan.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                              <Banknote className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold">{loan.loan_type.toUpperCase()} Loan</p>
                                <Badge variant="outline">{loan.status}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">Loan: {loan.loan_number}</p>
                              <p className="text-xs text-muted-foreground">
                                Next payment: {formatDate(loan.next_payment_date.toString())} •{' '}
                                {formatCurrency(loan.monthly_payment)}/month
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <p className="text-sm text-muted-foreground">Current Balance</p>
                                <p className="text-lg font-semibold">{formatCurrency(loan.balance)}</p>
                              </div>
                              <div className="flex justify-between">
                                <p className="text-sm text-muted-foreground">Principal Amount</p>
                                <p className="text-lg font-semibold">{formatCurrency(loan.principal_amount)}</p>
                              </div>
                              <div className="flex justify-between">
                                <p className="text-sm text-muted-foreground">Interest Rate</p>
                                <p className="text-lg font-semibold">{loan.interest_rate}%</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cards Tab */}
          <TabsContent value="cards" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Cards</CardTitle>
                <CardDescription>View and manage your debit and credit cards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cards.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No active cards</p>
                  ) : (
                    cards.map((card) => (
                      <div key={card.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                              <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold">{card.card_name}</p>
                                <Badge variant={card.status === 'active' ? 'default' : 'secondary'}>
                                  {card.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground font-mono">
                                {card.card_number_masked}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Expires: {formatDate(card.expiry_date.toString())} •{' '}
                                {card.card_brand.toUpperCase()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Daily Limit</p>
                            <p className="text-lg font-semibold">{formatCurrency(card.daily_limit)}</p>
                          </div>
                        </div>

                        <Separator />

                        <div className="flex gap-2">
                          {card.status === 'active' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCardAction(card.id, 'block')}
                            >
                              <Lock className="h-4 w-4 mr-2" />
                              Block Card
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCardAction(card.id, 'unblock')}
                            >
                              <Unlock className="h-4 w-4 mr-2" />
                              Activate Card
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCardForLimits(card.id);
                              setCardLimitsForm({
                                daily_limit: parseFloat(card.daily_limit),
                                monthly_limit: parseFloat(card.monthly_limit || '0'),
                              });
                            }}
                          >
                            Update Limits
                          </Button>
                        </div>

                        {selectedCardForLimits === card.id && (
                          <form onSubmit={handleUpdateCardLimits} className="space-y-3 p-3 bg-muted rounded-lg">
                            <h4 className="font-semibold text-sm">Update Card Limits</h4>
                            <div className="space-y-2">
                              <Label htmlFor="daily-limit">New Daily Limit</Label>
                              <Input
                                id="daily-limit"
                                type="number"
                                placeholder={formatCurrency(selectedCardForLimits ? cards.find(c => c.id === selectedCardForLimits)?.daily_limit : 0, { currencyDisplay: 'code' })}
                                value={cardLimitsForm.daily_limit || ''}
                                onChange={(e) =>
                                  setCardLimitsForm({ ...cardLimitsForm, daily_limit: parseFloat(e.target.value) })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="monthly-limit">New Monthly Limit</Label>
                              <Input
                                id="monthly-limit"
                                type="number"
                                placeholder={formatCurrency(selectedCardForLimits ? cards.find(c => c.id === selectedCardForLimits)?.monthly_limit : 0, { currencyDisplay: 'code' })}
                                value={cardLimitsForm.monthly_limit || ''}
                                onChange={(e) =>
                                  setCardLimitsForm({
                                    ...cardLimitsForm,
                                    monthly_limit: parseFloat(e.target.value),
                                  })
                                }
                              />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                              <Button type="submit" size="sm" className="flex-1">
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedCardForLimits(null);
                                  setCardLimitsForm({});
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invite Tab */}
          <TabsContent value="invite" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Invite Others</CardTitle>
                <CardDescription>Invite investors to join your investment journey</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-name">Full Name</Label>
                      <Input
                        id="invite-name"
                        value={invitationForm.name || ''}
                        onChange={(e) =>
                          setInvitationForm({ ...invitationForm, name: e.target.value })
                        }
                        placeholder="Enter full name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input
                        id="invite-email"
                        value={invitationForm.email || ''}
                        onChange={(e) =>
                          setInvitationForm({ ...invitationForm, email: e.target.value })
                        }
                        placeholder="Enter email address"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Role</Label>
                      <Select
                        value={invitationForm.role}
                        onValueChange={(value) =>
                          setInvitationForm({ ...invitationForm, role: value as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="investor">Investor</SelectItem>
                          <SelectItem value="board_member">Board Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invite-message">Personal Message</Label>
                      <Textarea
                        id="invite-message"
                        value={invitationForm.message || ''}
                        onChange={(e) =>
                          setInvitationForm({ ...invitationForm, message: e.target.value })
                        }
                        placeholder="Optional: Add a personal message..."
                        rows={3}
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Send Invitation
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statements Tab */}
          <TabsContent value="statements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Statements</CardTitle>
                <CardDescription>Download your account statements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Select an account and date range to generate your statement.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Account</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>
                              {acc.account_name} - {acc.account_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input type="date" />
                      </div>
                    </div>

                    <Button className="w-full" disabled>
                      <Download className="h-4 w-4 mr-2" />
                      Download Statement (PDF)
                    </Button>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">Quick Access</h3>
                    <div className="grid gap-2">
                      {accounts.map((acc) => (
                        <div key={acc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{acc.account_name}</p>
                            <p className="text-sm text-muted-foreground">{acc.account_number}</p>
                          </div>
                          <Button size="sm" variant="outline" disabled>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default CustomerPortal;
