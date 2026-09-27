import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, Share2, Building2, Bitcoin, Wallet, ChevronDown, ChevronUp, MessageCircle, Send } from 'lucide-react';

interface BankAccount {
  id: number;
  account_name: string;
  bank_name: string;
  account_number: string;
  branch_code: string;
  branch_name?: string;
  swift_code: string;
  currency: string;
  is_active: boolean;
  is_default: boolean;
  description?: string;
}

interface CryptoWallet {
  crypto_type: string;
  wallet_address: string;
  network_info?: string;
}

interface Props {
  bankAccount: BankAccount | null;
  cryptoWallets: CryptoWallet[];
  subscriptionId: string;
  amountRemaining: number;
  currency: string;
}

export function PaymentDetailsSection({ 
  bankAccount, 
  cryptoWallets, 
  subscriptionId, 
  amountRemaining,
  currency 
}: Props) {
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showCryptoDetails, setShowCryptoDetails] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const shareViaWhatsApp = (message: string) => {
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const shareViaSMS = (message: string) => {
    const encodedMessage = encodeURIComponent(message);
    window.location.href = `sms:?body=${encodedMessage}`;
  };

  const formatBankDetailsForSharing = () => {
    if (!bankAccount) return '';
    
    return `Payment Details for Subscription ${subscriptionId}\n\nBank Transfer:\nBank: ${bankAccount.bank_name}\nAccount Name: ${bankAccount.account_name}\nAccount Number: ${bankAccount.account_number}\nBranch Code: ${bankAccount.branch_code}\n${bankAccount.swift_code ? `SWIFT: ${bankAccount.swift_code}\n` : ''}\nReference: ${subscriptionId}\n\nAmount: ${new Intl.NumberFormat('en-LS', { style: 'currency', currency: bankAccount.currency }).format(amountRemaining)}`;
  };

  const formatCryptoDetailsForSharing = (wallet: CryptoWallet) => {
    return `Payment Details for Subscription ${subscriptionId}\n\nCryptocurrency: ${wallet.crypto_type}\nWallet Address: ${wallet.wallet_address}\n${wallet.network_info ? `Network: ${wallet.network_info}\n` : ''}\nReference: ${subscriptionId}`;
  };

  if (!bankAccount && cryptoWallets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Payment Methods</h3>
      
      {/* Bank Transfer Details */}
      {bankAccount && (
        <Collapsible open={showBankDetails} onOpenChange={setShowBankDetails}>
          <div className="border rounded-lg">
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">Bank Transfer</p>
                  <p className="text-sm text-muted-foreground">{bankAccount.currency}</p>
                </div>
              </div>
              {showBankDetails ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-3">
                <div className="bg-muted/50 p-3 rounded space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Bank Name</p>
                      <p className="text-sm font-medium">{bankAccount.bank_name}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(bankAccount.bank_name, 'Bank name')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Account Name</p>
                      <p className="text-sm font-medium">{bankAccount.account_name}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(bankAccount.account_name, 'Account name')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Account Number</p>
                      <p className="text-sm font-mono font-medium">{bankAccount.account_number}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(bankAccount.account_number, 'Account number')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Branch Code</p>
                      <p className="text-sm font-mono font-medium">{bankAccount.branch_code}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(bankAccount.branch_code, 'Branch code')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  {bankAccount.swift_code && (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">SWIFT Code</p>
                        <p className="text-sm font-mono font-medium">{bankAccount.swift_code}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(bankAccount.swift_code, 'SWIFT code')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Payment Reference</p>
                      <p className="text-sm font-mono font-medium text-orange-600">{subscriptionId}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(subscriptionId, 'Reference')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => copyToClipboard(formatBankDetailsForSharing(), 'Bank details')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => shareViaWhatsApp(formatBankDetailsForSharing())}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => shareViaSMS(formatBankDetailsForSharing())}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    SMS
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* Cryptocurrency Details */}
      {cryptoWallets.length > 0 && (
        <Collapsible open={showCryptoDetails} onOpenChange={setShowCryptoDetails}>
          <div className="border rounded-lg">
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Bitcoin className="h-5 w-5 text-orange-500" />
                <div className="text-left">
                  <p className="font-medium">Cryptocurrency</p>
                  <p className="text-sm text-muted-foreground">
                    {cryptoWallets.map(w => w.crypto_type).join(', ')}
                  </p>
                </div>
              </div>
              {showCryptoDetails ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-4">
                {cryptoWallets.map((wallet) => (
                  <div key={wallet.crypto_type} className="bg-muted/50 p-3 rounded space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {wallet.crypto_type === 'BTC' && <Bitcoin className="h-5 w-5 text-orange-500" />}
                        {wallet.crypto_type === 'ETH' && <Wallet className="h-5 w-5 text-purple-500" />}
                        {wallet.crypto_type === 'USDT' && <Wallet className="h-5 w-5 text-green-500" />}
                        <span className="font-semibold">{wallet.crypto_type}</span>
                      </div>
                    </div>
                    {wallet.network_info && (
                      <div>
                        <p className="text-xs text-muted-foreground">Network</p>
                        <p className="text-sm">{wallet.network_info}</p>
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <div className="flex-1 mr-2">
                        <p className="text-xs text-muted-foreground">Wallet Address</p>
                        <p className="text-xs font-mono break-all">{wallet.wallet_address}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(wallet.wallet_address, `${wallet.crypto_type} wallet address`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex justify-center py-2">
                      <QRCodeSVG value={wallet.wallet_address} size={150} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payment Reference</p>
                      <p className="text-xs font-mono text-orange-600">{subscriptionId}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => copyToClipboard(formatCryptoDetailsForSharing(wallet), `${wallet.crypto_type} details`)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => shareViaWhatsApp(formatCryptoDetailsForSharing(wallet))}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => shareViaSMS(formatCryptoDetailsForSharing(wallet))}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        SMS
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}
    </div>
  );
}
