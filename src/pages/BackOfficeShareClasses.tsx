import { useState, useEffect } from 'react';
import { useUserGuardContext } from 'app/auth';
import { apiClient } from 'app';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { BackOfficeNav } from 'components/BackOfficeNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, TrendingUp, DollarSign, Package, Edit, Save, X } from 'lucide-react';
import { useCurrency } from 'components/CurrencyProvider';

interface ShareClass {
  id: number;
  class_name: string;
  display_name: string;
  description: string;
  price_per_share: number;
  currency: string;
  min_shares: number;
  max_shares: number;
  shares_on_offer: number;
  shares_issued: number;
  available_shares: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EditFormData {
  price_per_share: string;
  min_shares: string;
  max_shares: string;
  shares_on_offer: string;
  description: string;
}

export default function BackOfficeShareClasses() {
  const { user } = useUserGuardContext();
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [shareClasses, setShareClasses] = useState<ShareClass[]>([]);
  const [editingClass, setEditingClass] = useState<ShareClass | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<EditFormData>({
    price_per_share: '',
    min_shares: '',
    max_shares: '',
    shares_on_offer: '',
    description: ''
  });

  useEffect(() => {
    loadShareClasses();
  }, []);

  const loadShareClasses = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get_share_classes_admin();
      const data = await response.json();
      setShareClasses(data);
    } catch (error) {
      console.error('Failed to load share classes:', error);
      toast.error('Failed to load share classes');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (shareClass: ShareClass) => {
    setEditingClass(shareClass);
    setFormData({
      price_per_share: shareClass.price_per_share.toString(),
      min_shares: shareClass.min_shares.toString(),
      max_shares: shareClass.max_shares.toString(),
      shares_on_offer: shareClass.shares_on_offer.toString(),
      description: shareClass.description
    });
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    if (!editingClass) return;

    try {
      setSaving(true);

      // Build update payload with only changed fields
      const updatePayload: any = {};
      
      if (formData.price_per_share !== editingClass.price_per_share.toString()) {
        updatePayload.price_per_share = parseFloat(formData.price_per_share);
      }
      if (formData.min_shares !== editingClass.min_shares.toString()) {
        updatePayload.min_shares = parseInt(formData.min_shares);
      }
      if (formData.max_shares !== editingClass.max_shares.toString()) {
        updatePayload.max_shares = parseInt(formData.max_shares);
      }
      if (formData.shares_on_offer !== editingClass.shares_on_offer.toString()) {
        updatePayload.shares_on_offer = parseInt(formData.shares_on_offer);
      }
      if (formData.description !== editingClass.description) {
        updatePayload.description = formData.description;
      }

      if (Object.keys(updatePayload).length === 0) {
        toast.info('No changes to save');
        setShowEditDialog(false);
        return;
      }

      const response = await apiClient.update_share_class(
        { className: editingClass.class_name },
        updatePayload
      );

      if (response.ok) {
        toast.success(`${editingClass.class_name} updated successfully`);
        setShowEditDialog(false);
        loadShareClasses();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to update share class');
      }
    } catch (error) {
      console.error('Failed to update share class:', error);
      toast.error('Failed to update share class');
    } finally {
      setSaving(false);
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-ZA').format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <BackOfficeNav currentPage="Share Classes" />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <BackOfficeNav currentPage="Share Classes" />
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Share Class Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Configure pricing and availability for each share class</p>
        </div>

        {/* Share Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shareClasses.map((shareClass) => (
            <Card key={shareClass.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{shareClass.display_name}</CardTitle>
                    <CardDescription className="mt-1">{shareClass.class_name}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {shareClass.is_default && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                    <Badge variant={shareClass.is_active ? "default" : "destructive"}>
                      {shareClass.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Description */}
                  <p className="text-sm text-gray-600">{shareClass.description}</p>

                  {/* Price */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Price per Share</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(shareClass.price_per_share, shareClass.currency)}
                    </span>
                  </div>

                  {/* Share Availability */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-700">Share Availability</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600">On Offer</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {formatNumber(shareClass.shares_on_offer)}
                        </div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600">Issued</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {formatNumber(shareClass.shares_issued)}
                        </div>
                      </div>
                      <div className="p-2 bg-green-50 rounded">
                        <div className="text-xs text-green-600">Available</div>
                        <div className="text-sm font-semibold text-green-700">
                          {formatNumber(shareClass.available_shares)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Min/Max Limits */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Min/Max Shares</span>
                    <span className="font-medium text-gray-900">
                      {formatNumber(shareClass.min_shares)} - {formatNumber(shareClass.max_shares)}
                    </span>
                  </div>

                  {/* Edit Button */}
                  <Button
                    onClick={() => handleEdit(shareClass)}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {editingClass?.class_name}</DialogTitle>
            <DialogDescription>
              Update pricing and availability settings for this share class
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Price */}
            <div>
              <Label htmlFor="price">Price per Share ({editingClass?.currency})</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.price_per_share}
                onChange={(e) => setFormData({ ...formData, price_per_share: e.target.value })}
                placeholder="10.00"
              />
            </div>

            {/* Shares on Offer */}
            <div>
              <Label htmlFor="shares_on_offer">Total Shares on Offer</Label>
              <Input
                id="shares_on_offer"
                type="number"
                min="0"
                value={formData.shares_on_offer}
                onChange={(e) => setFormData({ ...formData, shares_on_offer: e.target.value })}
                placeholder="100000000"
              />
              <p className="text-sm text-gray-500 mt-1">
                Currently issued: {formatNumber(editingClass?.shares_issued || 0)}
              </p>
            </div>

            {/* Min/Max Shares */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_shares">Minimum Shares</Label>
                <Input
                  id="min_shares"
                  type="number"
                  min="1"
                  value={formData.min_shares}
                  onChange={(e) => setFormData({ ...formData, min_shares: e.target.value })}
                  placeholder="1000"
                />
              </div>
              <div>
                <Label htmlFor="max_shares">Maximum Shares</Label>
                <Input
                  id="max_shares"
                  type="number"
                  min="1"
                  value={formData.max_shares}
                  onChange={(e) => setFormData({ ...formData, max_shares: e.target.value })}
                  placeholder="1000000"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this share class..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
