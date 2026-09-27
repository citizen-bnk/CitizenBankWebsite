import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Activity, Award } from 'lucide-react';
import { apiClient } from "app";
import { useCurrency } from 'components/CurrencyProvider';
import { toast } from 'sonner';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PortfolioMetrics {
  total_value: number;
  total_invested: number;
  total_return: number;
  return_percentage: number;
  total_shares: number;
  active_investments: number;
}

interface AssetAllocation {
  share_class: string;
  total_value: number;
  num_shares: number;
  percentage: number;
  color: string;
}

interface DividendMetrics {
  total_dividends_received: number;
  current_year_dividends: number;
  dividend_yield: number;
  reinvested_amount: number;
}

interface InvestmentSummary {
  subscription_id: string;
  share_class: string;
  num_shares: number;
  price_per_share: number;
  total_invested: number;
  current_value: number;
  percentage_of_portfolio: number;
  status: string;
}

interface PortfolioDashboardData {
  user_id: string;
  metrics: PortfolioMetrics;
  investments: InvestmentSummary[];
  asset_allocation: AssetAllocation[];
  dividend_metrics: DividendMetrics;
  performance_history: any[];
  last_updated: string;
}

export function PortfolioDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<PortfolioDashboardData | null>(null);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get_portfolio_dashboard();
      const data = await response.json();
      setDashboard(data);
    } catch (error: any) {
      console.error('Failed to load portfolio dashboard:', error);
      toast.error('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No portfolio data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { metrics, asset_allocation, dividend_metrics, investments } = dashboard;

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.total_value)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.active_investments} active investment{metrics.active_investments !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Return</CardTitle>
            {metrics.return_percentage >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.total_return)}</div>
            <p className={`text-xs font-medium ${
              metrics.return_percentage >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.return_percentage >= 0 ? '+' : ''}{metrics.return_percentage.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_shares.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Invested: {formatCurrency(metrics.total_invested)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dividend Yield</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dividend_metrics.dividend_yield.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Total: {formatCurrency(dividend_metrics.total_dividends_received)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Allocation Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Allocation</CardTitle>
          <CardDescription>Distribution of your investments by share class</CardDescription>
        </CardHeader>
        <CardContent>
          {asset_allocation.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={asset_allocation}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ share_class, percentage }) => `${share_class} (${percentage.toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total_value"
                    >
                      {asset_allocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>

              <div className="w-full md:w-1/2 space-y-3">
                {asset_allocation.map((allocation) => (
                  <div key={allocation.share_class} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: allocation.color }}
                      />
                      <div>
                        <p className="font-medium">{allocation.share_class}</p>
                        <p className="text-sm text-muted-foreground">
                          {allocation.num_shares.toLocaleString()} shares
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(allocation.total_value)}</p>
                      <p className="text-sm text-muted-foreground">
                        {allocation.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No investments yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dividend Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Dividend Summary</CardTitle>
          <CardDescription>Your dividend earnings and reinvestment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Dividends Received</p>
              <p className="text-2xl font-bold">{formatCurrency(dividend_metrics.total_dividends_received)}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Current Year Dividends</p>
              <p className="text-2xl font-bold">{formatCurrency(dividend_metrics.current_year_dividends)}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Reinvested Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(dividend_metrics.reinvested_amount)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Details</CardTitle>
          <CardDescription>Breakdown of all your investments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Share Class</th>
                  <th className="text-right p-2 font-medium">Shares</th>
                  <th className="text-right p-2 font-medium">Price/Share</th>
                  <th className="text-right p-2 font-medium">Invested</th>
                  <th className="text-right p-2 font-medium">Current Value</th>
                  <th className="text-right p-2 font-medium">% Portfolio</th>
                  <th className="text-center p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {investments.map((inv) => (
                  <tr key={inv.subscription_id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{inv.share_class}</td>
                    <td className="text-right p-2">{inv.num_shares.toLocaleString()}</td>
                    <td className="text-right p-2">{formatCurrency(inv.price_per_share)}</td>
                    <td className="text-right p-2">{formatCurrency(inv.total_invested)}</td>
                    <td className="text-right p-2">{formatCurrency(inv.current_value)}</td>
                    <td className="text-right p-2">{inv.percentage_of_portfolio.toFixed(1)}%</td>
                    <td className="text-center p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        inv.status === 'completed' || inv.status === 'paid' || inv.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
