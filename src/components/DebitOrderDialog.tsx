import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CreditCard, AlertCircle, CheckCircle2, Calendar, DollarSign, Shield, Info } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from "app";
import type { DebitOrderSetupRequest, BankAccountDetails } from 'types';

export interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string;
  totalAmount: number;
  onSuccess?: () => void;
}

export function DebitOrderDialog({ open, onOpenChange, subscriptionId, totalAmount, onSuccess }: Props) {
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    account_holder: '',
    bank_name: '',
    account_number: '',
    account_type: 'current',
    branch_code: '',
    monthly_amount: totalAmount,
    start_date: new Date().toISOString().split('T')[0],
  });
  const [debitOrderId, setDebitOrderId] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.account_holder.trim()) {
      toast.error('Please enter account holder name');
      return false;
    }
    if (!formData.bank_name.trim()) {
      toast.error('Please enter bank name');
      return false;
    }
    if (!formData.account_number.trim() || formData.account_number.length < 8) {
      toast.error('Please enter a valid account number');
      return false;
    }
    if (!formData.monthly_amount || formData.monthly_amount <= 0) {
      toast.error('Please enter a valid monthly amount');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Construct request matching API schema
      const requestData: DebitOrderSetupRequest = {
        subscription_id: subscriptionId,
        bank_details: {
          account_holder: formData.account_holder,
          bank_name: formData.bank_name,
          account_number: formData.account_number,
          account_type: formData.account_type,
          branch_code: formData.branch_code || undefined,
        },
        monthly_amount: formData.monthly_amount,
        start_date: formData.start_date,
      };
      
      const response = await apiClient.setup_debit_order(requestData);
      const data = await response.json();

      if (data.debit_order_id) {
        setDebitOrderId(data.debit_order_id);
        setStep('success');
        toast.success('Debit order set up successfully!');
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error('Failed to set up debit order');
      }
    } catch (error: any) {
      console.error('Error setting up debit order:', error);
      toast.error(error.message || 'Failed to set up debit order');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (validateForm()) {
      setStep('confirm');
    }
  };

  const handleClose = () => {
    setStep('form');
    setDebitOrderId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Set Up Debit Order
              </DialogTitle>
              <DialogDescription>
                Automate your share payments with monthly debit orders. Never miss a payment!
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Benefits Alert */}
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  <strong>Why set up a debit order?</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Convenient automatic monthly payments</li>
                    <li>Never miss a payment deadline</li>
                    <li>Email confirmations after each debit</li>
                    <li>Pause or cancel anytime</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Personal Details */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Personal Details</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="account_holder">Account Holder Name *</Label>
                    <Input
                      id="account_holder"
                      value={formData.account_holder}
                      onChange={(e) => handleInputChange('account_holder', e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Banking Details */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Banking Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bank_name">Bank Name *</Label>
                      <Select
                        value={formData.bank_name}
                        onValueChange={(value) => handleInputChange('bank_name', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Standard Lesotho Bank">Standard Lesotho Bank</SelectItem>
                          <SelectItem value="Nedbank Lesotho">Nedbank Lesotho</SelectItem>
                          <SelectItem value="First National Bank Lesotho">First National Bank Lesotho</SelectItem>
                          <SelectItem value="Lesotho PostBank">Lesotho PostBank</SelectItem>
                          <SelectItem value="Central Bank of Lesotho">Central Bank of Lesotho</SelectItem>
                          <SelectItem value="Other">Other Bank</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="account_type">Account Type *</Label>
                      <Select
                        value={formData.account_type}
                        onValueChange={(value) => handleInputChange('account_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current">Current Account</SelectItem>
                          <SelectItem value="savings">Savings Account</SelectItem>
                          <SelectItem value="cheque">Cheque Account</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="account_number">Account Number *</Label>
                      <Input
                        id="account_number"
                        value={formData.account_number}
                        onChange={(e) => handleInputChange('account_number', e.target.value.replace(/\D/g, ''))}
                        placeholder="1234567890"
                        maxLength={20}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="branch_code">Branch Code (Optional)</Label>
                      <Input
                        id="branch_code"
                        value={formData.branch_code || ''}
                        onChange={(e) => handleInputChange('branch_code', e.target.value)}
                        placeholder="250655"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Payment Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="monthly_amount">Monthly Amount (M) *</Label>
                      <Input
                        id="monthly_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.monthly_amount}
                        onChange={(e) => handleInputChange('monthly_amount', parseFloat(e.target.value) || 0)}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Total subscription: M {totalAmount.toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="start_date">First Debit Date *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange('start_date', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Recurring on this day each month
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Your information is secure.</strong> We use bank-grade encryption to protect your banking details.
                  You'll receive a mandate form via email to authorize this debit order.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={loading}>
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Debit Order Details</DialogTitle>
              <DialogDescription>
                Please review your debit order details before confirming.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Account Holder</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{formData.account_holder}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Banking Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bank:</span>
                    <span className="font-medium">{formData.bank_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account Type:</span>
                    <span className="font-medium capitalize">{formData.account_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account Number:</span>
                    <span className="font-medium">****{formData.account_number.slice(-4)}</span>
                  </div>
                  {formData.branch_code && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Branch Code:</span>
                      <span className="font-medium">{formData.branch_code}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Payment Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Amount:</span>
                    <span className="font-bold text-lg">M {formData.monthly_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">First Debit Date:</span>
                    <span className="font-medium">
                      {new Date(formData.start_date).toLocaleDateString('en-LS', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frequency:</span>
                    <span className="font-medium">Monthly</span>
                  </div>
                </CardContent>
              </Card>

              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-900">
                  By confirming, you authorize Citizen Bank to debit M {formData.monthly_amount.toFixed(2)} from your
                  account monthly. A mandate form will be sent to your email for your records.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('form')} disabled={loading}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Setting up...' : 'Confirm & Set Up'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
                Debit Order Set Up Successfully!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-gray-600">
                  Your debit order has been successfully set up!
                </p>
              </div>

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-sm">Debit Order ID</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono font-bold text-blue-600">{debitOrderId}</p>
                </CardContent>
              </Card>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>What happens next:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Check your email for the mandate form</li>
                    <li>Your first debit will be on {new Date(formData.start_date).toLocaleDateString('en-LS', { month: 'long', day: 'numeric', year: 'numeric' })}</li>
                    <li>You'll receive confirmation emails after each successful debit</li>
                    <li>Manage or cancel anytime from "My Subscriptions"</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
