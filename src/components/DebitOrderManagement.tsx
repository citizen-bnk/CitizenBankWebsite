import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Pause, Play, X, Calendar, DollarSign, Building2, Info, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from 'app';
import { useCurrency } from 'components/CurrencyProvider';

interface DebitOrder {
  id: number;
  debit_order_id: string;
  subscription_id: string;
  account_holder: string;
  bank_name: string;
  account_number_masked: string;
  account_type: string;
  monthly_amount: number;
  start_date: string;
  next_debit_date: string | null;
  status: string;
  created_at: string;
}

export function DebitOrderManagement() {
  const [loading, setLoading] = useState(true);
  const [debitOrders, setDebitOrders] = useState<DebitOrder[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    loadDebitOrders();
  }, []);

  const loadDebitOrders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get_my_debit_orders();
      const data = await response.json();
      setDebitOrders(data.debit_orders || []);
    } catch (error) {
      console.error('Error loading debit orders:', error);
      toast.error('Failed to load debit orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (debitOrderId: string) => {
    try {
      setProcessingId(debitOrderId);
      const response = await apiClient.pause_debit_order(parseInt(debitOrderId));
      const data = await response.json();
      
      if (data.success) {
        toast.success('Debit order paused successfully');
        await loadDebitOrders();
      }
    } catch (error: any) {
      console.error('Error pausing debit order:', error);
      toast.error(error.message || 'Failed to pause debit order');
    } finally {
      setProcessingId(null);
    }
  };

  const handleResume = async (debitOrderId: string) => {
    try {
      setProcessingId(debitOrderId);
      const response = await apiClient.resume_debit_order(parseInt(debitOrderId));
      const data = await response.json();
      
      if (data.success) {
        toast.success('Debit order resumed successfully');
        await loadDebitOrders();
      }
    } catch (error: any) {
      console.error('Error resuming debit order:', error);
      toast.error(error.message || 'Failed to resume debit order');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (debitOrderId: string) => {
    if (!confirm('Are you sure you want to cancel this debit order? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessingId(debitOrderId);
      const response = await apiClient.cancel_debit_order(parseInt(debitOrderId));
      const data = await response.json();
      
      if (data.success) {
        toast.success('Debit order cancelled successfully');
        await loadDebitOrders();
      }
    } catch (error: any) {
      console.error('Error cancelling debit order:', error);
      toast.error(error.message || 'Failed to cancel debit order');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; label: string }> = {
      pending_approval: { variant: 'secondary', icon: Clock, label: 'Pending Approval' },
      active: { variant: 'default', icon: CheckCircle2, label: 'Active' },
      paused: { variant: 'outline', icon: Pause, label: 'Paused' },
      cancelled: { variant: 'destructive', icon: X, label: 'Cancelled' },
      failed: { variant: 'destructive', icon: AlertCircle, label: 'Failed' },
    };
    
    const config = statusConfig[status] || { variant: 'outline', icon: Info, label: status };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            My Debit Orders
          </CardTitle>
          <CardDescription>Manage your recurring payment instructions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            Loading debit orders...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (debitOrders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            My Debit Orders
          </CardTitle>
          <CardDescription>Manage your recurring payment instructions</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You don't have any active debit orders. Set up a debit order from any unpaid subscription to automate your payments.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          My Debit Orders
        </CardTitle>
        <CardDescription>
          {debitOrders.length} active {debitOrders.length === 1 ? 'instruction' : 'instructions'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {debitOrders.map((order) => (
            <Card key={order.id} className="border-2">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold">{order.debit_order_id}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        For subscription: {order.subscription_id}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{formatCurrency(order.monthly_amount)}</div>
                      <p className="text-xs text-muted-foreground">per month</p>
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{order.bank_name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Account Holder:</span>
                        <p className="font-medium">{order.account_holder}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Account:</span>
                        <p className="font-mono font-medium">{order.account_number_masked}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <p className="font-medium capitalize">{order.account_type}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Start Date</p>
                        <p className="font-medium">
                          {new Date(order.start_date).toLocaleDateString('en-LS', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                    {order.next_debit_date && order.status === 'active' && (
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Next Debit</p>
                          <p className="font-medium text-blue-600">
                            {new Date(order.next_debit_date).toLocaleDateString('en-LS', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {order.status !== 'cancelled' && (
                    <div className="flex gap-2 pt-2 border-t">
                      {order.status === 'active' ? (
                        <Button
                          onClick={() => handlePause(order.id.toString())}
                          disabled={processingId === order.id.toString()}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          {processingId === order.id.toString() ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Pause className="h-4 w-4 mr-2" />
                          )}
                          Pause
                        </Button>
                      ) : order.status === 'paused' ? (
                        <Button
                          onClick={() => handleResume(order.id.toString())}
                          disabled={processingId === order.id.toString()}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          {processingId === order.id.toString() ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4 mr-2" />
                          )}
                          Resume
                        </Button>
                      ) : null}
                      
                      <Button
                        onClick={() => handleCancel(order.id.toString())}
                        disabled={processingId === order.id.toString()}
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                      >
                        {processingId === order.id.toString() ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 mr-2" />
                        )}
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
