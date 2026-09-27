import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Upload, ArrowLeft, ArrowRight, AlertCircle, CreditCard } from "lucide-react";
import { apiClient } from "app";
import { toast } from "sonner";

type PaymentMethod = "bank_transfer" | "crypto" | "installment";

export interface Props {
  paymentMethod: PaymentMethod;
  payLater: boolean;
  installmentPlan: string | null;
  cryptoWalletId: string | null;
  paymentProofFile: File | null;
  adminNotes: string;
  totalAmount: number;
  errors: { paymentProofFile?: string; cryptoWalletId?: string; installmentPlan?: string };
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onPayLaterChange: (payLater: boolean) => void;
  onInstallmentPlanChange: (plan: string | null) => void;
  onCryptoWalletChange: (walletId: string | null) => void;
  onPaymentProofChange: (file: File | null) => void;
  onAdminNotesChange: (notes: string) => void;
  onBack: () => void;
  onNext: () => void;
}

interface CryptoWallet {
  id: string;
  currency: string;
  address: string;
}

export function PaymentOptionsStep({
  paymentMethod,
  payLater,
  installmentPlan,
  cryptoWalletId,
  paymentProofFile,
  adminNotes,
  totalAmount,
  errors,
  onPaymentMethodChange,
  onPayLaterChange,
  onInstallmentPlanChange,
  onCryptoWalletChange,
  onPaymentProofChange,
  onAdminNotesChange,
  onBack,
  onNext,
}: Props) {
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);

  useEffect(() => {
    if (paymentMethod === "crypto") {
      loadCryptoWallets();
    }
  }, [paymentMethod]);

  const loadCryptoWallets = async () => {
    try {
      setLoadingWallets(true);
      const response = await apiClient.list_crypto_wallets();
      const data = await response.json();
      setCryptoWallets(data.wallets || []);
    } catch (error) {
      console.error("Failed to load crypto wallets:", error);
      toast.error("Failed to load crypto wallets");
    } finally {
      setLoadingWallets(false);
    }
  };

  const calculateInstallmentAmount = (months: number) => {
    return (totalAmount / months).toFixed(2);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-orange-600" />
          <CardTitle>Payment Details</CardTitle>
        </div>
        <CardDescription>
          Configure payment method and upload proof (optional)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Method Selection */}
        <div className="space-y-2">
          <Label>Payment Method *</Label>
          <Select
            value={paymentMethod}
            onValueChange={(value) => onPaymentMethodChange(value as PaymentMethod)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="crypto">Cryptocurrency</SelectItem>
              <SelectItem value="installment">Installment Plan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Installment Plan Options */}
        {paymentMethod === "installment" && (
          <div className="space-y-2">
            <Label>Installment Plan *</Label>
            <RadioGroup
              value={installmentPlan || ""}
              onValueChange={(value) => onInstallmentPlanChange(value)}
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50">
                  <RadioGroupItem value="6-months" id="6m" />
                  <Label htmlFor="6m" className="cursor-pointer flex-1">
                    <div className="font-medium">6 Months</div>
                    <div className="text-sm text-muted-foreground">
                      R{calculateInstallmentAmount(6)}/month
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50">
                  <RadioGroupItem value="12-months" id="12m" />
                  <Label htmlFor="12m" className="cursor-pointer flex-1">
                    <div className="font-medium">12 Months</div>
                    <div className="text-sm text-muted-foreground">
                      R{calculateInstallmentAmount(12)}/month
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50">
                  <RadioGroupItem value="24-months" id="24m" />
                  <Label htmlFor="24m" className="cursor-pointer flex-1">
                    <div className="font-medium">24 Months</div>
                    <div className="text-sm text-muted-foreground">
                      R{calculateInstallmentAmount(24)}/month
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
            {errors.installmentPlan && (
              <p className="text-sm text-red-500">{errors.installmentPlan}</p>
            )}
          </div>
        )}

        {/* Crypto Wallet Selection */}
        {paymentMethod === "crypto" && (
          <div className="space-y-2">
            <Label>Crypto Wallet *</Label>
            {loadingWallets ? (
              <div className="text-sm text-muted-foreground">Loading wallets...</div>
            ) : (
              <Select
                value={cryptoWalletId || ""}
                onValueChange={(value) => onCryptoWalletChange(value)}
              >
                <SelectTrigger className={errors.cryptoWalletId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {cryptoWallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.currency} - {wallet.address.slice(0, 10)}...{wallet.address.slice(-6)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.cryptoWalletId && (
              <p className="text-sm text-red-500">{errors.cryptoWalletId}</p>
            )}
          </div>
        )}

        {/* Pay Later Option */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="payLater"
              checked={payLater}
              onChange={(e) => onPayLaterChange(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="payLater" className="cursor-pointer font-medium">
                Pay Later
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Create subscription without payment proof. Payment can be added later.
              </p>
            </div>
          </div>
        </div>

        {/* Payment Proof Upload (only if not paying later) */}
        {!payLater && (
          <div className="space-y-2">
            <Label htmlFor="paymentProof">
              Payment Proof {payLater ? "(Optional)" : ""}
            </Label>
            <Input
              id="paymentProof"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                onPaymentProofChange(file);
              }}
              className={errors.paymentProofFile ? "border-red-500" : ""}
            />
            {errors.paymentProofFile && (
              <p className="text-sm text-red-500">{errors.paymentProofFile}</p>
            )}
            {paymentProofFile && (
              <p className="text-sm text-green-600">✓ {paymentProofFile.name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Accepted formats: Images (JPG, PNG) or PDF
            </p>
          </div>
        )}

        {/* Admin Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Admin Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={adminNotes}
            onChange={(e) => onAdminNotesChange(e.target.value)}
            placeholder="Internal notes about this subscription..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            For internal tracking only - not visible to subscriber
          </p>
        </div>

        {payLater && (
          <Alert className="border-amber-600 bg-amber-50 dark:bg-amber-950">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Subscription will be created in <strong>pending payment</strong> status. 
              You can upload payment proof later from the subscriptions dashboard.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={onNext}>
            Review Subscription
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
