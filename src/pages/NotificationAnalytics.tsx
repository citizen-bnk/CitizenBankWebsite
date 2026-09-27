import { useState, useEffect } from "react";
import { apiClient } from "app";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { RefreshCw, TrendingUp, Send, CheckCircle, XCircle, Users, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface OverviewStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  overall_success_rate: number;
  by_channel: Array<{ channel: string; attempts: number; successes: number; failures: number; success_rate: number }>;
  by_type: Array<{ type: string; attempts: number; successes: number; success_rate: number }>;
  recent_activity: Array<{ type: string; channels_attempted: string[]; channels_succeeded: string[]; timestamp: string }>;
}

interface DeliveryLog {
  id: number;
  user_identifier: string;
  user_id: string | null;
  notification_type: string;
  subject: string;
  message_preview: string;
  channels_attempted: string[];
  channels_succeeded: string[];
  channels_failed: string[];
  error_details: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

interface ChannelStats {
  channel: string;
  notification_type: string;
  date: string;
  total_attempts: number;
  total_successes: number;
  total_failures: number;
  success_rate: number;
  unique_recipients: number;
}

const CHANNEL_COLORS: Record<string, string> = {
  sms: "#3b82f6",
  email: "#10b981",
  push: "#f59e0b",
  whatsapp: "#22c55e"
};

export default function NotificationAnalytics() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [channelStats, setChannelStats] = useState<ChannelStats[]>([]);
  const [notificationTypes, setNotificationTypes] = useState<string[]>([]);
  
  const [overviewDays, setOverviewDays] = useState(7);
  const [logsDays, setLogsDays] = useState(30);
  const [statsFilter, setStatsFilter] = useState<{ channel?: string; type?: string }>({});
  const [logsFilter, setLogsFilter] = useState<{ type?: string; status?: string }>({});
  const [logsPage, setLogsPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOverview(),
        loadLogs(),
        loadChannelStats(),
        loadNotificationTypes()
      ]);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const loadOverview = async () => {
    const response = await apiClient.get_analytics_overview({ days: overviewDays });
    const data = await response.json();
    setOverview(data);
  };

  const loadLogs = async () => {
    const response = await apiClient.get_delivery_logs({
      page: logsPage,
      page_size: 50,
      days: logsDays,
      ...logsFilter
    });
    const data = await response.json();
    setLogs(data.logs);
    setTotalLogs(data.total_count);
  };

  const loadChannelStats = async () => {
    const response = await apiClient.get_channel_stats({ days: 30, ...statsFilter });
    const data = await response.json();
    setChannelStats(data.stats);
  };

  const loadNotificationTypes = async () => {
    const response = await apiClient.get_notification_types();
    const data = await response.json();
    setNotificationTypes(data);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Prepare chart data
  const channelPerformanceData = overview?.by_channel.map(ch => ({
    name: ch.channel.toUpperCase(),
    "Success Rate": ch.success_rate,
    Attempts: ch.attempts
  })) || [];

  const typePerformanceData = overview?.by_type.map(t => ({
    name: t.type.replace(/_/g, ' ').toUpperCase(),
    "Success Rate": t.success_rate,
    Sent: t.attempts
  })) || [];

  // Group channel stats by date for trend chart
  const trendData = channelStats.reduce((acc, stat) => {
    const existing = acc.find(d => d.date === stat.date);
    if (existing) {
      existing[stat.channel] = stat.success_rate;
    } else {
      acc.push({
        date: stat.date,
        [stat.channel]: stat.success_rate
      });
    }
    return acc;
  }, [] as any[]);

  const channels = [...new Set(channelStats.map(s => s.channel))];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Header with Back Button */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/back-office-dashboard')}
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Notification Analytics</h1>
              <p className="text-muted-foreground mt-1">
                Track delivery rates, engagement metrics, and communication performance
              </p>
            </div>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.total_sent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last {overviewDays} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{overview?.total_delivered.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {overview?.overall_success_rate.toFixed(1)}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overview?.total_failed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {overview && overview.total_sent > 0 ? ((overview.total_failed / overview.total_sent) * 100).toFixed(1) : 0}% failure rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{overview?.overall_success_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Overall delivery rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="channels">Channel Performance</TabsTrigger>
            <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Channel Performance</CardTitle>
                  <CardDescription>Success rate by channel</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={channelPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Success Rate" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Types</CardTitle>
                  <CardDescription>Success rate by notification type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={typePerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Success Rate" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Last 10 notifications sent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overview?.recent_activity.map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{activity.type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(activity.timestamp)}</p>
                      </div>
                      <div className="flex gap-2">
                        {activity.channels_attempted.map(channel => (
                          <Badge
                            key={channel}
                            variant={activity.channels_succeeded.includes(channel) ? "default" : "destructive"}
                          >
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Channel Performance Tab */}
          <TabsContent value="channels" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Success Rate Trends</CardTitle>
                <CardDescription>Daily success rate by channel (last 30 days)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {channels.map(channel => (
                      <Line
                        key={channel}
                        type="monotone"
                        dataKey={channel}
                        stroke={CHANNEL_COLORS[channel] || "#8884d8"}
                        name={channel.toUpperCase()}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview?.by_channel.map(channel => (
                <Card key={channel.channel}>
                  <CardHeader>
                    <CardTitle className="text-lg">{channel.channel.toUpperCase()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Attempts</span>
                        <span className="font-medium">{channel.attempts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Successes</span>
                        <span className="font-medium text-green-600">{channel.successes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Failures</span>
                        <span className="font-medium text-red-600">{channel.failures}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-sm font-medium">Success Rate</span>
                        <span className="font-bold text-blue-600">{channel.success_rate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Delivery Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Logs</CardTitle>
                <CardDescription>Detailed delivery history with filters</CardDescription>
                <div className="flex gap-4 mt-4">
                  <Select
                    value={logsFilter.type || "all"}
                    onValueChange={(val) => setLogsFilter({ ...logsFilter, type: val === "all" ? undefined : val })}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {notificationTypes.map(type => (
                        <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={logsFilter.status || "all"}
                    onValueChange={(val) => setLogsFilter({ ...logsFilter, status: val === "all" ? undefined : val })}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button onClick={loadLogs} size="sm">
                    Apply Filters
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {logs.map(log => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{log.subject}</h4>
                          <p className="text-sm text-muted-foreground">{log.notification_type.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground mt-1">To: {log.user_identifier}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                          {log.channels_succeeded.length > 0 ? (
                            <Badge variant="default" className="mt-1">Delivered</Badge>
                          ) : (
                            <Badge variant="destructive" className="mt-1">Failed</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm mb-3">{log.message_preview}</p>
                      <div className="flex flex-wrap gap-2">
                        {log.channels_attempted.map(channel => (
                          <Badge
                            key={channel}
                            variant={log.channels_succeeded.includes(channel) ? "default" : "outline"}
                            className={log.channels_failed.includes(channel) ? "border-red-500 text-red-600" : ""}
                          >
                            {channel} {log.channels_succeeded.includes(channel) ? "✓" : "✗"}
                          </Badge>
                        ))}
                      </div>
                      {log.error_details && (
                        <div className="mt-3 p-2 bg-red-50 dark:bg-red-950 rounded text-sm">
                          <p className="font-medium text-red-600">Errors:</p>
                          <pre className="text-xs overflow-auto">{JSON.stringify(log.error_details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Showing {((logsPage - 1) * 50) + 1} - {Math.min(logsPage * 50, totalLogs)} of {totalLogs} logs
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => { setLogsPage(p => p - 1); loadLogs(); }}
                      disabled={logsPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => { setLogsPage(p => p + 1); loadLogs(); }}
                      disabled={logsPage * 50 >= totalLogs}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
