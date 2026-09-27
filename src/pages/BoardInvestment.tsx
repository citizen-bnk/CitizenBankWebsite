import { useState, useEffect } from 'react';
import brain from 'brain';
import { useUserGuardContext } from 'app/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, TrendingUp, CheckCircle2, AlertCircle, Loader2, Copy, Bitcoin, Wallet, ArrowLeft, PieChart, DollarSign, Lightbulb } from 'lucide-react';
import { useCurrency } from 'components/CurrencyProvider';
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { PortfolioDashboard } from 'components/PortfolioDashboard';
import { DividendHistory } from 'components/DividendHistory';
import { InvestmentRecommendations } from 'components/InvestmentRecommendations';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';

interface ShareClass {
  name: string;
  description: string;
  min_shares: number;
  max_shares: number;
  price_per_share: number;
  restricted: boolean;
  highlighted?: boolean;
  benefits: string[];
}

interface InvestmentData {
  share_classes: ShareClass[];
  offering_details: {
    target_amount: number;
    current_amount: number;
    min_shares: number;
    max_shares: number;
    share_price: number;
    offering_status: string;
  };
  board_member_status: string;
  class_c_access: boolean;
}

interface MyInvestment {
  total_shares_owned: number;
  total_invested: number;
  class_breakdown: Array<{
    share_class: string;
    total_shares: number;
    total_amount: number;
  }>;
}

interface CryptoWallet {
  crypto_type: string;
  wallet_address: string;
  network_info: string | null;
}

export default function BoardInvestment() {
  const { user } = useUserGuardContext();
  const { formatCurrency } = useCurrency();
  const [investmentData, setInvestmentData] = useState<InvestmentData | null>(null);
  const [myInvestment, setMyInvestment] = useState<MyInvestment | null>(null);
  const [loading, setLoading] = useState(true);
  const [investing, setInvesting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('investment');
  
  // Form state
  const [selectedClass, setSelectedClass] = useState<string>('Class C');
  const [numShares, setNumShares] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'one_time' | 'installment'>('one_time');
  const [installmentMonths, setInstallmentMonths] = useState<string>('12');

  // Payment step state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState(0);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'bank' | 'crypto' | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<string>('');
  const [availableCryptos, setAvailableCryptos] = useState<{crypto_type: string, network_info: string | null}[]>([]);
  const [cryptoWallet, setCryptoWallet] = useState<CryptoWallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [optionsResponse, myInvestmentResponse] = await Promise.all([
        brain.get_investment_options(),
        brain.get_my_investment()
      ]);
      
      const optionsData = await optionsResponse.json();
      const investmentData = await myInvestmentResponse.json();
      
      setInvestmentData(optionsData);
      setMyInvestment(investmentData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      const errorMsg = error?.message || error?.detail || "Unknown error occurred";
      toast.error(`Failed to load investment options: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!numShares || parseInt(numShares) <= 0) {
      toast.error('Please enter a valid number of shares');
      return;
    }
    
    const shares = parseInt(numShares);
    const shareClass = investmentData?.share_classes.find(sc => sc.name === selectedClass);
    
    if (!shareClass) {
      toast.error('Invalid share class');
      return;
    }
    
    if (shares < shareClass.min_shares || shares > shareClass.max_shares) {
      toast.error(`Shares must be between ${shareClass.min_shares} and ${shareClass.max_shares}`);
      return;
    }
    
    try {
      setInvesting(true);
      const response = await brain.create_board_investment({
        num_shares: shares,
        share_class: selectedClass,
        payment_method: paymentMethod,
        installment_months: paymentMethod === 'installment' ? parseInt(installmentMonths) : undefined
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Investment created successfully!');
        const totalAmount = calculateTotal();
        setInvestmentAmount(totalAmount);
        setNumShares('');
        
        // Load available crypto options
        try {
          const cryptoResponse = await brain.get_available_crypto_wallets();
          const cryptoData = await cryptoResponse.json();
          setAvailableCryptos(cryptoData.available_cryptos || []);
        } catch (err) {
          console.error('Failed to load crypto options:', err);
        }
        
        // Show payment dialog
        setShowPaymentDialog(true);
        loadData();
      } else {
        toast.error('Failed to create investment');
      }
    } catch (error: any) {
      console.error('Error creating investment:', error);
      const errorMsg = error?.message || error?.detail || "Unknown error occurred";
      toast.error(`Failed to create investment: ${errorMsg}`);
    } finally {
      setInvesting(false);
    }
  };

  const handleCryptoSelect = async (cryptoType: string) => {
    setSelectedCrypto(cryptoType);
    setLoadingWallet(true);
    
    try {
      const response = await brain.get_crypto_wallet_details({ cryptoType });
      const wallet = await response.json();
      setCryptoWallet(wallet);
    } catch (error) {
      console.error('Failed to load wallet:', error);
      toast.error('Failed to load wallet details');
      setCryptoWallet(null);
    } finally {
      setLoadingWallet(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleClosePaymentDialog = () => {
    setShowPaymentDialog(false);
    setSelectedPaymentType(null);
    setSelectedCrypto('');
    setCryptoWallet(null);
  };

  const calculateTotal = () => {
    if (!numShares || !investmentData) return 0;
    const shareClass = investmentData.share_classes.find(sc => sc.name === selectedClass);
    return parseInt(numShares) * (shareClass?.price_per_share || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!investmentData?.class_c_access) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Investment Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only active board members can invest. Please contact an administrator.
            </p>
          </CardContent>
        </Card>
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
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Board Member Investment</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your board share investment</p>
            </div>
            <Button 
              onClick={() => navigate('/board-portal')} 
              variant="outline"
              className="text-xs sm:text-sm w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="investment" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Investment</span>
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Portfolio</span>
            </TabsTrigger>
            <TabsTrigger value="dividends" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Dividends</span>
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
          </TabsList>

          {/* Investment Tab - Existing Content */}
          <TabsContent value="investment" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {!currentInvestment ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl">Create Investment</CardTitle>
                      <CardDescription className="text-sm">Subscribe to shares as a board member</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6">
                      <div className="space-y-4">
                        {/* Share Classes */}
                        <div className="space-y-4">
                          <h2 className="text-xl font-semibold">Available Share Classes</h2>
                          
                          {investmentData.share_classes.map((shareClass) => (
                            <Card 
                              key={shareClass.name}
                              className={`cursor-pointer transition-all ${
                                selectedClass === shareClass.name 
                                  ? 'ring-2 ring-primary' 
                                  : 'hover:border-primary'
                              } ${
                                shareClass.highlighted 
                                  ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950' 
                                  : ''
                              }`}
                              onClick={() => setSelectedClass(shareClass.name)}
                            >
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <CardTitle className="flex items-center gap-2">
                                      {shareClass.name}
                                      {shareClass.restricted && (
                                        <Badge variant="default" className="bg-blue-600">
                                          <Shield className="h-3 w-3 mr-1" />
                                          Exclusive
                                        </Badge>
                                      )}
                                    </CardTitle>
                                    <CardDescription className="mt-1">{shareClass.description}</CardDescription>
                                  </div>
                                  {selectedClass === shareClass.name && (
                                    <CheckCircle2 className="h-6 w-6 text-primary" />
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Price per share</span>
                                    <span className="font-semibold">{formatCurrency(shareClass.price_per_share)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Min / Max shares</span>
                                    <span className="font-semibold">{shareClass.min_shares} - {shareClass.max_shares}</span>
                                  </div>
                                  <div className="pt-2 border-t">
                                    <p className="text-xs font-semibold mb-2">Benefits:</p>
                                    <ul className="space-y-1">
                                      {shareClass.benefits.map((benefit, idx) => (
                                        <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                                          <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                                          <span>{benefit}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* Investment Form */}
                        <div className="space-y-4">
                          <Card>
                            <CardHeader>
                              <CardTitle>Make Your Investment</CardTitle>
                              <CardDescription>Complete the form to invest in {selectedClass}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <form onSubmit={handleInvest} className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="numShares">Number of Shares *</Label>
                                  <Input
                                    id="numShares"
                                    type="number"
                                    placeholder="Enter number of shares"
                                    value={numShares}
                                    onChange={(e) => setNumShares(e.target.value)}
                                    required
                                  />
                                  {investmentData && (
                                    <p className="text-xs text-muted-foreground">
                                      Min: {investmentData.offering_details.min_shares} | Max: {investmentData.offering_details.max_shares}
                                    </p>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <Label>Payment Method *</Label>
                                  <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'one_time' | 'installment')}>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="one_time" id="one_time" />
                                      <Label htmlFor="one_time" className="font-normal cursor-pointer">One-time Payment</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="installment" id="installment" />
                                      <Label htmlFor="installment" className="font-normal cursor-pointer">Installment Plan</Label>
                                    </div>
                                  </RadioGroup>
                                </div>

                                {paymentMethod === 'installment' && (
                                  <div className="space-y-2">
                                    <Label htmlFor="installmentMonths">Installment Period *</Label>
                                    <Select value={installmentMonths} onValueChange={setInstallmentMonths}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="6">6 months</SelectItem>
                                        <SelectItem value="12">12 months</SelectItem>
                                        <SelectItem value="18">18 months</SelectItem>
                                        <SelectItem value="24">24 months</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {/* Calculation */}
                                {numShares && parseInt(numShares) > 0 && (
                                  <div className="bg-muted p-4 rounded-lg space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-sm text-muted-foreground">Shares</span>
                                      <span className="font-semibold">{parseInt(numShares).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-muted-foreground">Price per share</span>
                                      <span className="font-semibold">{formatCurrency(investmentData.offering_details.share_price)}</span>
                                    </div>
                                    <div className="border-t pt-2 flex justify-between">
                                      <span className="font-bold">Total Amount</span>
                                      <span className="text-xl font-bold text-primary">{formatCurrency(calculateTotal())}</span>
                                    </div>
                                  </div>
                                )}

                                <Button type="submit" disabled={investing} className="w-full" size="lg">
                                  {investing ? 'Processing...' : (
                                    <>
                                      <TrendingUp className="mr-2 h-5 w-5" />
                                      Invest in {selectedClass}
                                    </>
                                  )}
                                </Button>
                              </form>
                            </CardContent>
                          </Card>

                          {/* My Investment Summary */}
                          {myInvestment && myInvestment.total_shares_owned > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle>My Investment Portfolio</CardTitle>
                                <CardDescription>Your current holdings</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                  <span className="text-sm text-muted-foreground">Total Shares Owned</span>
                                  <span className="text-2xl font-bold">{myInvestment.total_shares_owned.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                  <span className="text-sm text-muted-foreground">Total Invested</span>
                                  <span className="text-2xl font-bold">{formatCurrency(myInvestment.total_invested)}</span>
                                </div>
                                
                                {myInvestment.class_breakdown.length > 0 && (
                                  <div className="border-t pt-3">
                                    <p className="text-sm font-semibold mb-2">Breakdown by Class:</p>
                                    {myInvestment.class_breakdown.map((breakdown) => (
                                      <div key={breakdown.share_class} className="flex justify-between text-sm py-1">
                                        <span className="text-muted-foreground">
                                          {breakdown.share_class}
                                          {breakdown.share_class === 'Class C' && (
                                            <Shield className="inline h-3 w-3 ml-1 text-blue-600" />
                                          )}
                                        </span>
                                        <span className="font-semibold">{breakdown.total_shares.toLocaleString()} shares</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>My Investment Portfolio</CardTitle>
                      <CardDescription>Your current holdings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span className="text-sm text-muted-foreground">Total Shares Owned</span>
                        <span className="text-2xl font-bold">{currentInvestment.total_shares_owned.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span className="text-sm text-muted-foreground">Total Invested</span>
                        <span className="text-2xl font-bold">{formatCurrency(currentInvestment.total_invested)}</span>
                      </div>
                      
                      {currentInvestment.class_breakdown.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-sm font-semibold mb-2">Breakdown by Class:</p>
                          {currentInvestment.class_breakdown.map((breakdown) => (
                            <div key={breakdown.share_class} className="flex justify-between text-sm py-1">
                              <span className="text-muted-foreground">
                                {breakdown.share_class}
                                {breakdown.share_class === 'Class C' && (
                                  <Shield className="inline h-3 w-3 ml-1 text-blue-600" />
                                )}
                              </span>
                              <span className="font-semibold">{breakdown.total_shares.toLocaleString()} shares</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Investment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Shares Owned</span>
                        <span className="font-semibold">{currentInvestment.total_shares_owned.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Invested</span>
                        <span className="font-semibold">{formatCurrency(currentInvestment.total_invested)}</span>
                      </div>
                    </div>
                    
                    {currentInvestment.class_breakdown.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-sm font-semibold mb-2">Breakdown by Class:</p>
                        {currentInvestment.class_breakdown.map((breakdown) => (
                          <div key={breakdown.share_class} className="flex justify-between text-sm py-1">
                            <span className="text-muted-foreground">
                              {breakdown.share_class}
                              {breakdown.share_class === 'Class C' && (
                                <Shield className="inline h-3 w-3 ml-1 text-blue-600" />
                              )}
                            </span>
                            <span className="font-semibold">{breakdown.total_shares.toLocaleString()} shares</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="mt-6">
            <PortfolioDashboard />
          </TabsContent>

          {/* Dividends Tab */}
          <TabsContent value="dividends" className="mt-6">
            <DividendHistory />
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="mt-6">
            <InvestmentRecommendations />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />

      {/* Payment Method Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Payment</DialogTitle>
            <DialogDescription>
              Investment Amount: {formatCurrency(investmentAmount)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Payment Type Selection */}
            {!selectedPaymentType && (
              <div className="space-y-4">
                <h3 className="font-semibold">Select Payment Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className="cursor-pointer hover:border-primary transition-all"
                    onClick={() => setSelectedPaymentType('bank')}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">Bank Transfer</CardTitle>
                      <CardDescription>Transfer via bank account</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Traditional bank transfer payment</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer hover:border-primary transition-all"
                    onClick={() => setSelectedPaymentType('crypto')}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Bitcoin className="h-5 w-5" />
                        Cryptocurrency
                      </CardTitle>
                      <CardDescription>Pay with BTC, ETH, or USDT</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Fast and secure crypto payment</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Bank Transfer Details */}
            {selectedPaymentType === 'bank' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Bank Transfer Details</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPaymentType(null)}>
                    Change Method
                  </Button>
                </div>
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">Bank Name</Label>
                      <p className="font-semibold">Citizen Bank Lesotho</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Account Name</Label>
                      <p className="font-semibold">Citizen Bank Investments</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Account Number</Label>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-semibold">1234567890</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard('1234567890')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Amount to Transfer</Label>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(investmentAmount)}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Reference</Label>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-semibold">INV-{user.id.slice(0, 8)}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`INV-${user.id.slice(0, 8)}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Important:</strong> Please include the reference number in your transfer. 
                    Your investment will be processed once payment is confirmed.
                  </p>
                </div>
                <Button onClick={handleClosePaymentDialog} className="w-full">
                  Done
                </Button>
              </div>
            )}

            {/* Crypto Payment */}
            {selectedPaymentType === 'crypto' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Cryptocurrency Payment</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPaymentType(null)}>
                    Change Method
                  </Button>
                </div>

                {!selectedCrypto && (
                  <div className="space-y-3">
                    <Label>Select Cryptocurrency</Label>
                    {availableCryptos.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground text-center">
                            Cryptocurrency payment options are currently unavailable. 
                            Please use bank transfer or contact support.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {availableCryptos.map((crypto) => (
                          <Card
                            key={crypto.crypto_type}
                            className="cursor-pointer hover:border-primary transition-all"
                            onClick={() => handleCryptoSelect(crypto.crypto_type)}
                          >
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                {crypto.crypto_type === 'BTC' && <Bitcoin className="h-5 w-5" />}
                                {crypto.crypto_type !== 'BTC' && <Wallet className="h-5 w-5" />}
                                {crypto.crypto_type}
                              </CardTitle>
                              {crypto.network_info && (
                                <CardDescription className="text-xs">{crypto.network_info}</CardDescription>
                              )}
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedCrypto && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{selectedCrypto} Payment Details</h4>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setSelectedCrypto('');
                        setCryptoWallet(null);
                      }}>
                        Change Crypto
                      </Button>
                    </div>

                    {loadingWallet && (
                      <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    )}

                    {!loadingWallet && cryptoWallet && (
                      <Card>
                        <CardContent className="pt-6 space-y-4">
                          <div>
                            <Label className="text-sm text-muted-foreground">Wallet Address</Label>
                            <div className="flex items-start gap-2 mt-1">
                              <p className="font-mono text-sm bg-muted p-3 rounded-md break-all flex-1">
                                {cryptoWallet.wallet_address}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(cryptoWallet.wallet_address)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {cryptoWallet && (
                            <div className="flex flex-col items-center">
                              <Label className="text-sm text-muted-foreground mb-2">QR Code</Label>
                              <div className="bg-white p-4 rounded-lg">
                                <QRCodeSVG 
                                  value={cryptoWallet.wallet_address} 
                                  size={256}
                                  level="L"
                                  includeMargin={true}
                                />
                              </div>
                            </div>
                          )}

                          {cryptoWallet.network_info && (
                            <div>
                              <Label className="text-sm text-muted-foreground">Network</Label>
                              <p className="text-sm mt-1">{cryptoWallet.network_info}</p>
                            </div>
                          )}

                          <div>
                            <Label className="text-sm text-muted-foreground">Amount (LSL)</Label>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(investmentAmount)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Send the equivalent amount in {selectedCrypto} to the wallet address above
                            </p>
                          </div>

                          <div>
                            <Label className="text-sm text-muted-foreground">Payment Reference</Label>
                            <div className="flex items-center gap-2">
                              <p className="font-mono font-semibold">INV-{user.id.slice(0, 8)}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(`INV-${user.id.slice(0, 8)}`)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Important:</strong> Send the exact amount to the wallet address above. 
                        Your investment will be processed once the transaction is confirmed on the blockchain.
                      </p>
                    </div>

                    <Button onClick={handleClosePaymentDialog} className="w-full">
                      Done
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
