import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Download, DollarSign, TrendingUp, FileText } from 'lucide-react';
import { apiClient } from "app";
import { useCurrency } from 'components/CurrencyProvider';
import { toast } from 'sonner';

interface DividendPayment {
  dividend_id: string;
  subscription_id: string;
  amount: number;
  payment_date: string;
  tax_withheld: number;
  reinvested: boolean;
  status: string;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

interface YearlyDividendSummary {
  year: number;
  total_amount: number;
  tax_withheld: number;
  payment_count: number;
}

interface DividendTaxReport {
  user_id: string;
  current_year_total: number;
  current_year_tax: number;
  yearly_summaries: YearlyDividendSummary[];
  total_all_time: number;
  total_tax_all_time: number;
}

export function DividendHistory() {
  const [loading, setLoading] = useState(true);
  const [dividends, setDividends] = useState<DividendPayment[]>([]);
  const [taxReport, setTaxReport] = useState<DividendTaxReport | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load dividends
      const dividendsResponse = await apiClient.get_my_dividends({
        year: selectedYear || undefined
      });
      const dividendsData = await dividendsResponse.json();
      setDividends(dividendsData);

      // Load tax report
      const taxResponse = await apiClient.get_dividend_summary();
      const taxData = await taxResponse.json();
      setTaxReport(taxData);
    } catch (error: any) {
      console.error('Failed to load dividend data:', error);
      toast.error('Failed to load dividend data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const downloadTaxReport = () => {
    if (!taxReport) return;
    
    // Create CSV content
    const csvContent = [
      ['Dividend Tax Report'],
      ['Generated:', new Date().toLocaleDateString()],
      [''],
      ['Current Year Summary'],
      ['Total Dividends:', formatCurrency(taxReport.current_year_total)],
      ['Tax Withheld:', formatCurrency(taxReport.current_year_tax)],
      [''],
      ['Yearly Breakdown'],
      ['Year', 'Total Amount', 'Tax Withheld', 'Payment Count'],
      ...taxReport.yearly_summaries.map(summary => [
        summary.year.toString(),
        formatCurrency(summary.total_amount),
        formatCurrency(summary.tax_withheld),
        summary.payment_count.toString()
      ]),
      [''],
      ['All-Time Total'],
      ['Total Dividends:', formatCurrency(taxReport.total_all_time)],
      ['Total Tax Withheld:', formatCurrency(taxReport.total_tax_all_time)]
    ].map(row => row.join(',')).join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dividend-tax-report-${new Date().getFullYear()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Tax report downloaded');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="tax-report">Tax Report</TabsTrigger>
        </TabsList>

        {/* Payment History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dividend Payment History</CardTitle>
                  <CardDescription>
                    {selectedYear ? `Showing dividends for ${selectedYear}` : 'Showing all dividend payments'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {taxReport?.yearly_summaries.map(summary => (
                    <Button
                      key={summary.year}
                      variant={selectedYear === summary.year ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedYear(selectedYear === summary.year ? null : summary.year)}
                    >
                      {summary.year}
                    </Button>
                  ))}
                  {selectedYear && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedYear(null)}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {dividends.length > 0 ? (
                <div className="space-y-4">
                  {dividends.map((dividend) => (
                    <div
                      key={dividend.dividend_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <DollarSign className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{formatCurrency(dividend.amount)}</p>
                            {dividend.reinvested && (
                              <Badge variant="secondary" className="text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Reinvested
                              </Badge>
                            )}
                            <Badge className={getStatusColor(dividend.status)}>
                              {dividend.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(dividend.payment_date)}</span>
                            </div>
                            {dividend.payment_method && (
                              <p>Payment method: {dividend.payment_method}</p>
                            )}
                            {dividend.reference_number && (
                              <p className="font-mono text-xs">Ref: {dividend.reference_number}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">Tax Withheld</p>
                        <p className="font-medium text-red-600 dark:text-red-400">
                          {formatCurrency(dividend.tax_withheld)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Net: {formatCurrency(dividend.amount - dividend.tax_withheld)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No dividend payments found</p>
                  {selectedYear && (
                    <Button
                      variant="link"
                      onClick={() => setSelectedYear(null)}
                      className="mt-2"
                    >
                      View all years
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Report Tab */}
        <TabsContent value="tax-report" className="space-y-4">
          {taxReport ? (
            <>
              {/* Current Year Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Current Year Tax Summary</CardTitle>
                      <CardDescription>Tax year {new Date().getFullYear()}</CardDescription>
                    </div>
                    <Button onClick={downloadTaxReport} size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download Report
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-muted-foreground mb-1">Total Dividends Received</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {formatCurrency(taxReport.current_year_total)}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-muted-foreground mb-1">Tax Withheld</p>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                        {formatCurrency(taxReport.current_year_tax)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Yearly Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Yearly Breakdown</CardTitle>
                  <CardDescription>Historical dividend and tax summary</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Year</th>
                          <th className="text-right p-3 font-medium">Total Dividends</th>
                          <th className="text-right p-3 font-medium">Tax Withheld</th>
                          <th className="text-right p-3 font-medium">Net Amount</th>
                          <th className="text-center p-3 font-medium">Payments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxReport.yearly_summaries.map((summary) => (
                          <tr key={summary.year} className="border-b hover:bg-muted/50">
                            <td className="p-3 font-medium">{summary.year}</td>
                            <td className="text-right p-3">{formatCurrency(summary.total_amount)}</td>
                            <td className="text-right p-3 text-red-600 dark:text-red-400">
                              {formatCurrency(summary.tax_withheld)}
                            </td>
                            <td className="text-right p-3 font-medium">
                              {formatCurrency(summary.total_amount - summary.tax_withheld)}
                            </td>
                            <td className="text-center p-3">
                              <Badge variant="secondary">{summary.payment_count}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-bold">
                          <td className="p-3">All-Time Total</td>
                          <td className="text-right p-3">{formatCurrency(taxReport.total_all_time)}</td>
                          <td className="text-right p-3 text-red-600 dark:text-red-400">
                            {formatCurrency(taxReport.total_tax_all_time)}
                          </td>
                          <td className="text-right p-3">
                            {formatCurrency(taxReport.total_all_time - taxReport.total_tax_all_time)}
                          </td>
                          <td className="text-center p-3">
                            {taxReport.yearly_summaries.reduce((sum, s) => sum + s.payment_count, 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Tax Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Tax Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-muted-foreground">
                    This report shows your dividend income and withholding tax for tax filing purposes. 
                    Dividend withholding tax is automatically deducted at the time of payment.
                  </p>
                  <ul className="text-muted-foreground">
                    <li>All amounts are shown in the currency at the time of payment</li>
                    <li>Tax withheld is calculated according to applicable tax laws</li>
                    <li>Keep this report for your tax records</li>
                    <li>Consult with a tax professional for specific tax advice</li>
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tax data available</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
