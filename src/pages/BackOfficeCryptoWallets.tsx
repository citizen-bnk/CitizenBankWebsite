import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import brain from "brain";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Bitcoin, Wallet, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { BackOfficeNav } from "components/BackOfficeNav";

interface CryptoWallet {
  id: string;
  crypto_type: string;
  wallet_address: string;
  network_info: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CRYPTO_TYPES = [
  { value: "BTC", label: "Bitcoin (BTC)", icon: Bitcoin },
  { value: "ETH", label: "Ethereum (ETH)", icon: Wallet },
  { value: "USDT", label: "Tether (USDT)", icon: Wallet },
];

const NETWORK_OPTIONS: Record<string, string[]> = {
  BTC: ["Bitcoin Mainnet", "Bitcoin Testnet"],
  ETH: ["Ethereum Mainnet", "Ethereum Testnet"],
  USDT: ["Tether Mainnet", "Tether Testnet"],
};

export default function BackOfficeCryptoWallets() {
  const [wallets, setWallets] = useState<CryptoWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingWallet, setEditingWallet] = useState<{
    crypto_type: string;
    wallet_address: string;
    network_info: string;
    is_active: boolean;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      setLoading(true);
      const response = await brain.list_crypto_wallets();
      const data = await response.json();
      setWallets(data.wallets || []);
    } catch (error) {
      console.error("Failed to load wallets:", error);
      toast.error("Failed to load crypto wallets");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cryptoType: string) => {
    const wallet = wallets.find(w => w.crypto_type === cryptoType);
    if (wallet) {
      setEditingWallet({
        crypto_type: wallet.crypto_type,
        wallet_address: wallet.wallet_address,
        network_info: wallet.network_info || "",
        is_active: wallet.is_active,
      });
    } else {
      // New wallet
      setEditingWallet({
        crypto_type: cryptoType,
        wallet_address: "",
        network_info: "",
        is_active: true,
      });
    }
  };

  const handleSave = async () => {
    if (!editingWallet) return;

    try {
      setSaving(editingWallet.crypto_type);
      const response = await brain.create_or_update_wallet({
        crypto_type: editingWallet.crypto_type,
        wallet_address: editingWallet.wallet_address,
        network_info: editingWallet.network_info || null,
        is_active: editingWallet.is_active,
      });
      
      const data = await response.json();
      toast.success(data.message || "Wallet saved successfully");
      setEditingWallet(null);
      await loadWallets();
    } catch (error) {
      console.error("Failed to save wallet:", error);
      toast.error("Failed to save wallet");
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (cryptoType: string) => {
    if (!confirm(`Are you sure you want to delete the ${cryptoType} wallet?`)) return;

    try {
      setSaving(cryptoType);
      await brain.delete_crypto_wallet({ cryptoType });
      toast.success(`${cryptoType} wallet deleted successfully`);
      await loadWallets();
    } catch (error) {
      console.error("Failed to delete wallet:", error);
      toast.error("Failed to delete wallet");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <BackOfficeNav currentPage="Crypto Wallets" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <BackOfficeNav currentPage="Crypto Wallets" />
      
      <div className="page-container container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Crypto Wallet Management</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Configure cryptocurrency wallet addresses for receiving investments
              </p>
            </div>
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

        <div className="grid gap-6">
          {CRYPTO_TYPES.map((cryptoType) => {
            const wallet = wallets.find(w => w.crypto_type === cryptoType.value);
            const isEditing = editingWallet?.crypto_type === cryptoType.value;
            const Icon = cryptoType.icon;

            return (
              <Card key={cryptoType.value}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-6 w-6" />
                      <div>
                        <CardTitle>{cryptoType.label}</CardTitle>
                        <CardDescription>
                          {wallet ? (
                            <span className="flex items-center gap-2 mt-1">
                              {wallet.is_active ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-green-600">Active</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 text-orange-600" />
                                  <span className="text-orange-600">Inactive</span>
                                </>
                              )}
                            </span>
                          ) : (
                            "Not configured"
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {wallet && !isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(cryptoType.value)}
                          disabled={saving === cryptoType.value}
                        >
                          {saving === cryptoType.value ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Delete"
                          )}
                        </Button>
                      )}
                      <Button
                        variant={isEditing ? "secondary" : "default"}
                        size="sm"
                        onClick={() => isEditing ? setEditingWallet(null) : handleEdit(cryptoType.value)}
                      >
                        {isEditing ? "Cancel" : wallet ? "Edit" : "Configure"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`address-${cryptoType.value}`}>Wallet Address *</Label>
                        <Input
                          id={`address-${cryptoType.value}`}
                          value={editingWallet.wallet_address}
                          onChange={(e) => setEditingWallet({
                            ...editingWallet,
                            wallet_address: e.target.value,
                          })}
                          placeholder="Enter wallet address"
                          className="font-mono"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`network-${cryptoType.value}`}>Network Info</Label>
                        <Select
                          value={editingWallet.network_info}
                          onValueChange={(value) => setEditingWallet({
                            ...editingWallet,
                            network_info: value,
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select network" />
                          </SelectTrigger>
                          <SelectContent>
                            {NETWORK_OPTIONS[cryptoType.value]?.map((network) => (
                              <SelectItem key={network} value={network}>
                                {network}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`active-${cryptoType.value}`}
                          checked={editingWallet.is_active}
                          onCheckedChange={(checked) => setEditingWallet({
                            ...editingWallet,
                            is_active: checked,
                          })}
                        />
                        <Label htmlFor={`active-${cryptoType.value}`}>Active (available for payments)</Label>
                      </div>
                      <Button
                        onClick={handleSave}
                        disabled={!editingWallet.wallet_address || saving === cryptoType.value}
                        className="w-full"
                      >
                        {saving === cryptoType.value ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Wallet"
                        )}
                      </Button>
                    </div>
                  ) : wallet ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Wallet Address</Label>
                        <p className="font-mono text-sm bg-muted p-3 rounded-md break-all">
                          {wallet.wallet_address}
                        </p>
                      </div>
                      {wallet.network_info && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Network</Label>
                          <p className="text-sm mt-1">{wallet.network_info}</p>
                        </div>
                      )}
                      {wallet.wallet_address && (
                        <div>
                          <Label className="text-sm text-muted-foreground">QR Code</Label>
                          <div className="mt-2 inline-block p-4 bg-white rounded-lg">
                            <QRCodeSVG
                              value={wallet.wallet_address}
                              size={192}
                              level="L"
                              includeMargin={true}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No wallet configured. Click "Configure" to set up a wallet address.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
}
