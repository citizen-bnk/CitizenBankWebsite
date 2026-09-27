import { useEffect, useState } from 'react';
import { useUserGuardContext } from 'app/auth';
import { apiClient } from "app";
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Building2, Edit, CheckCircle, XCircle } from 'lucide-react';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { BackOfficeNav } from 'components/BackOfficeNav';
import type { BankAccount } from 'types';

export default function BackOfficeBankAccounts() {
  const { user } = useUserGuardContext();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    branchCode: '',
    branchName: '',
    swiftCode: '',
    currency: 'ZAR',
    isActive: true,
    isDefault: false,
    description: '',
  });

  useEffect(() => {
    initializeAccount();
  }, []);

  const initializeAccount = async () => {
    try {
      setLoading(true);
      
      // Seed the account if none exists
      await apiClient.seed_bank_account();
      
      // Load accounts
      await loadAccounts();
    } catch (error) {
      console.error('Error initializing bank account:', error);
      toast.error('Failed to initialize bank account');
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await apiClient.list_bank_accounts();
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      toast.error('Failed to load bank accounts');
    }
  };

  const handleEdit = (account: BankAccount) => {
    setSelectedAccount(account);
    setFormData({
      accountName: account.account_name,
      bankName: account.bank_name,
      accountNumber: account.account_number,
      branchCode: account.branch_code,
      branchName: account.branch_name || '',
      swiftCode: account.swift_code || '',
      currency: account.currency,
      isActive: account.is_active,
      isDefault: account.is_default,
      description: account.description || '',
    });
    setShowEditDialog(true);
  };

  const handleSubmitEdit = async () => {
    if (!selectedAccount) return;

    try {
      const response = await apiClient.update_bank_account(
        { accountId: selectedAccount.id },
        {
          account_name: formData.accountName,
          bank_name: formData.bankName,
          account_number: formData.accountNumber,
          branch_code: formData.branchCode,
          branch_name: formData.branchName || null,
          swift_code: formData.swiftCode || null,
          currency: formData.currency,
          is_active: formData.isActive,
          is_default: formData.isDefault,
          description: formData.description || null,
        }
      );

      if (response.ok) {
        toast.success('Bank account updated successfully');
        setShowEditDialog(false);
        setSelectedAccount(null);
        loadAccounts();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to update bank account');
      }
    } catch (error) {
      console.error('Error updating bank account:', error);
      toast.error('Failed to update bank account');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <BackOfficeNav currentPage="Bank Accounts" />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Bank Account Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage bank account details for receiving payments
            </p>
          </div>

          {/* Bank Account Card */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Bank Account</CardTitle>
              <CardDescription>
                This account will be used for all payment instructions sent to investors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No bank account configured
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Currency</TableHead>
                      <TableHead>Bank Name</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Branch Code</TableHead>
                      <TableHead>Swift Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <Badge variant="outline">{account.currency}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{account.bank_name}</TableCell>
                        <TableCell>{account.account_name}</TableCell>
                        <TableCell className="font-mono">{account.account_number}</TableCell>
                        <TableCell className="font-mono">{account.branch_code}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {account.swift_code || '-'}
                        </TableCell>
                        <TableCell>
                          {account.is_active ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(account)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Bank Account</DialogTitle>
            <DialogDescription>
              Update bank account details for payment instructions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-currency">Currency *</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                    <SelectItem value="LSL">LSL - Lesotho Loti</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-accountName">Account Name *</Label>
                <Input
                  id="edit-accountName"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bankName">Bank Name *</Label>
              <Input
                id="edit-bankName"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-accountNumber">Account Number *</Label>
                <Input
                  id="edit-accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-branchCode">Branch Code *</Label>
                <Input
                  id="edit-branchCode"
                  value={formData.branchCode}
                  onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-swiftCode">Swift Code</Label>
                <Input
                  id="edit-swiftCode"
                  value={formData.swiftCode}
                  onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-branchName">Branch Name</Label>
              <Input
                id="edit-branchName"
                value={formData.branchName}
                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEdit} className="bg-purple-600 hover:bg-purple-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}
