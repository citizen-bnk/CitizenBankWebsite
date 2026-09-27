import { useEffect, useState } from 'react';
import { useUser } from '@stackframe/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import brain from 'brain';
import { toast } from 'sonner';
import { 
  Users, UserX, Shield, TrendingUp, ArrowRight, Home, DollarSign, 
  Activity, RefreshCw, AlertCircle, CheckCircle, Clock, FileText,
  Mail, UserPlus, BarChart3, Eye, TrendingDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { InvitationPermissionsManager } from 'components/InvitationPermissionsManager';

interface DashboardStats {
  // User Statistics
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  onlineUsers: number;
  newUsersThisMonth: number;
  
  // Board Statistics
  totalBoardMembers: number;
  pendingInvitations: number;
  
  // Subscription Statistics
  totalSubscriptions: number;
  activeSubscriptions: number;
  pendingPayments: number;
  totalRevenue: number;
  totalInvestmentAmount: number;
  totalSubscribedAmount: number;
  
  // Document Statistics
  documentsUnderReview: number;
  documentComplianceRate: number;
  
  // System Health
  emailQueueSize: number;
  failedEmails: number;
}

interface RecentActivity {
  id: string;
  type: 'user_registered' | 'user_suspended' | 'board_member_added' | 'subscription_created' | 'document_submitted' | 'role_assigned';
  title: string;
  description: string;
  timestamp: string;
  icon: any;
  iconColor: string;
}

const AdminDashboard = () => {
  const user = useUser();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    onlineUsers: 0,
    newUsersThisMonth: 0,
    totalBoardMembers: 0,
    pendingInvitations: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    totalInvestmentAmount: 0,
    totalSubscribedAmount: 0,
    documentsUnderReview: 0,
    documentComplianceRate: 0,
    emailQueueSize: 0,
    failedEmails: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 10 minutes (600000ms)
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 600000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      // Load all data in parallel for better performance
      const [
        allUsersResponse,
        suspendedResponse,
        sampleUsersResponse,
        boardResponse,
        invitationsResponse,
        subscriptionsResponse,
        reviewQueueResponse,
        emailQueueResponse,
        membersStatusResponse
      ] = await Promise.all([
        brain.list_all_users({ page: 1, page_size: 1 }),
        brain.list_all_users({ page: 1, page_size: 1, status: 'suspended' }),
        brain.list_all_users({ page: 1, page_size: 100 }).catch(() => null), // Get sample for online check
        brain.get_current_board_composition().catch(() => null),
        brain.list_invitations({}).catch(() => null),
        brain.core_list_all_subscriptions().catch(() => null),
        brain.get_review_queue().catch(() => null),
        brain.get_email_queue_status().catch(() => null),
        brain.get_all_members_status().catch(() => null)
      ]);

      // Process user data
      const allUsersData = await allUsersResponse.json();
      const suspendedData = await suspendedResponse.json();
      
      const totalUsers = Number(allUsersData.total || 0);
      const suspendedUsers = Number(suspendedData.total || 0);
      
      // Count online users (from sample)
      let onlineUsers = 0;
      if (sampleUsersResponse && sampleUsersResponse.ok) {
        const onlineData = await sampleUsersResponse.json();
        onlineUsers = onlineData.users?.filter((u: any) => u.is_online)?.length || 0;
      }

      // Process board data - PARSE ONCE AND STORE
      let totalBoardMembers = 0;
      let boardData: any = null;
      if (boardResponse && boardResponse.ok) {
        boardData = await boardResponse.json();
        totalBoardMembers = Number(boardData.total || 0);
      }

      // Process invitations
      let pendingInvitations = 0;
      if (invitationsResponse && invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        pendingInvitations = invitationsData.invitations?.filter((inv: any) => inv.status === 'pending')?.length || 0;
      }

      // Process subscriptions - PARSE ONCE AND STORE
      let totalSubscriptions = 0;
      let activeSubscriptions = 0;
      let pendingPayments = 0;
      let totalRevenue = 0;
      let totalInvestmentAmount = 0;
      let totalSubscribedAmount = 0;
      let subscriptionsData: any = null;
      if (subscriptionsResponse && subscriptionsResponse.ok) {
        subscriptionsData = await subscriptionsResponse.json();
        totalSubscriptions = subscriptionsData.subscriptions?.length || 0;
        
        // Count active subscriptions
        activeSubscriptions = subscriptionsData.subscriptions?.filter((s: any) => 
          s.payment_status === 'paid' || s.payment_status === 'pending_verification'
        )?.length || 0;
        
        // Count pending payments
        pendingPayments = subscriptionsData.subscriptions?.filter((s: any) => 
          s.payment_status === 'pending' || s.payment_status === 'pending_verification'
        )?.length || 0;
        
        // Calculate total revenue (only paid)
        totalRevenue = subscriptionsData.subscriptions?.reduce((sum: number, s: any) => {
          if (s.payment_status === 'paid') {
            return sum + (parseFloat(s.total_amount) || 0);
          }
          return sum;
        }, 0) || 0;
        
        // Calculate total investment amount (all subscriptions)
        totalInvestmentAmount = subscriptionsData.subscriptions?.reduce((sum: number, s: any) => {
          return sum + (parseFloat(s.total_amount) || 0);
        }, 0) || 0;
        
        // Calculate total subscribed amount (shares subscribed value)
        totalSubscribedAmount = subscriptionsData.subscriptions?.reduce((sum: number, s: any) => {
          const shareCount = parseInt(s.share_count) || 0;
          const pricePerShare = parseFloat(s.price_per_share) || 0;
          return sum + (shareCount * pricePerShare);
        }, 0) || 0;
      }

      // Process document review queue
      let documentsUnderReview = 0;
      if (reviewQueueResponse && reviewQueueResponse.ok) {
        const reviewData = await reviewQueueResponse.json();
        documentsUnderReview = reviewData.documents?.length || 0;
      }

      // Process document compliance
      let documentComplianceRate = 0;
      if (membersStatusResponse && membersStatusResponse.ok) {
        const membersData = await membersStatusResponse.json();
        const members = membersData.members || [];
        if (members.length > 0) {
          const fullyCompliant = members.filter((m: any) => 
            m.total_required > 0 && m.total_approved === m.total_required
          ).length;
          documentComplianceRate = (fullyCompliant / members.length) * 100;
        }
      }

      // Process email queue
      let emailQueueSize = 0;
      let failedEmails = 0;
      if (emailQueueResponse && emailQueueResponse.ok) {
        const queueData = await emailQueueResponse.json();
        emailQueueSize = queueData.pending_count || 0;
        failedEmails = queueData.failed_count || 0;
      }

      setStats({
        totalUsers,
        activeUsers: totalUsers - suspendedUsers,
        suspendedUsers,
        onlineUsers,
        newUsersThisMonth: 0, // Would need a date filter to implement
        totalBoardMembers,
        pendingInvitations,
        totalSubscriptions,
        activeSubscriptions,
        pendingPayments,
        totalRevenue,
        totalInvestmentAmount,
        totalSubscribedAmount,
        documentsUnderReview,
        documentComplianceRate,
        emailQueueSize,
        failedEmails
      });

      // Generate recent activity from ALREADY PARSED data
      generateRecentActivity(allUsersData, boardData, subscriptionsData);

    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      if (!silent) {
        const errorMsg = error?.message || error?.detail || "Unknown error occurred";
        toast.error(`Failed to load dashboard data: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateRecentActivity = (usersData: any, boardData: any, subscriptionsData: any) => {
    const activities: RecentActivity[] = [];

    // Add recent user registrations
    if (usersData?.users) {
      usersData.users.slice(0, 3).forEach((user: any) => {
        if (user.created_at) {
          activities.push({
            id: `user_${user.user_id}`,
            type: 'user_registered',
            title: 'New User Registration',
            description: `${user.display_name || user.email} joined the platform`,
            timestamp: user.created_at,
            icon: UserPlus,
            iconColor: 'text-green-600'
          });
        }
      });
    }

    // Add board member activity - USE ALREADY PARSED DATA
    if (boardData?.board_members) {
      boardData.board_members.slice(0, 2).forEach((member: any) => {
        if (member.appointed_at) {
          activities.push({
            id: `board_${member.board_member_id}`,
            type: 'board_member_added',
            title: 'Board Member Appointed',
            description: `${member.full_name} appointed as ${member.position_name}`,
            timestamp: member.appointed_at,
            icon: Shield,
            iconColor: 'text-blue-600'
          });
        }
      });
    }

    // Add subscription activity - USE ALREADY PARSED DATA  
    if (subscriptionsData?.subscriptions) {
      subscriptionsData.subscriptions.slice(0, 2).forEach((subscription: any) => {
        if (subscription.created_at) {
          activities.push({
            id: `subscription_${subscription.subscription_id}`,
            type: 'subscription_created',
            title: 'New Share Subscription',
            description: `${subscription.full_name || 'User'} subscribed for ${subscription.share_count} shares`,
            timestamp: subscription.created_at,
            icon: DollarSign,
            iconColor: 'text-green-600'
          });
        }
      });
    }

    // Sort by timestamp descending and limit to 10
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setRecentActivity(activities.slice(0, 10));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const handleRefresh = () => {
    loadDashboardData();
    toast.success('Dashboard refreshed');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="page-container container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                System overview and administration
                {refreshing && <span className="ml-2 text-blue-600">• Updating...</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={handleRefresh} 
                variant="outline"
                disabled={refreshing}
                className="text-xs sm:text-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                variant="outline"
                className="text-xs sm:text-sm"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-500">Loading dashboard...</p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* System Health Alert */}
            {(stats.failedEmails > 0 || stats.documentsUnderReview > 5) && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-lg">System Alerts</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {stats.failedEmails > 0 && (
                      <div className="flex items-center justify-between">
                        <span>{stats.failedEmails} failed email(s) in queue</span>
                        <Button size="sm" variant="outline" onClick={() => navigate('/admin-users')}>
                          Review
                        </Button>
                      </div>
                    )}
                    {stats.documentsUnderReview > 5 && (
                      <div className="flex items-center justify-between">
                        <span>{stats.documentsUnderReview} documents awaiting review</span>
                        <Button size="sm" variant="outline" onClick={() => navigate('/back-office-board-documents')}>
                          Review
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Total Users */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin-users')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs sm:text-sm">Total Users</CardDescription>
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <CardTitle className="text-3xl sm:text-4xl">{stats.totalUsers}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Active</span>
                      <span className="font-semibold text-green-600">{stats.activeUsers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Online</span>
                      <span className="font-semibold text-blue-600">{stats.onlineUsers}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Suspended Users */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin-users')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs sm:text-sm">Suspended</CardDescription>
                    <UserX className="h-5 w-5 text-orange-400" />
                  </div>
                  <CardTitle className="text-3xl sm:text-4xl text-orange-600">{stats.suspendedUsers}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-gray-600">
                    {stats.totalUsers > 0 
                      ? `${((stats.suspendedUsers / stats.totalUsers) * 100).toFixed(1)}% of total users`
                      : 'No users'
                    }
                  </div>
                </CardContent>
              </Card>

              {/* Board Members */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin-board-positions')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs sm:text-sm">Board Members</CardDescription>
                    <Shield className="h-5 w-5 text-blue-400" />
                  </div>
                  <CardTitle className="text-3xl sm:text-4xl text-blue-600">{stats.totalBoardMembers}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    {stats.pendingInvitations > 0 ? (
                      <>
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-orange-600">{stats.pendingInvitations} pending invitation(s)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">All positions filled</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/back-office-subscriptions')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs sm:text-sm">Total Investment</CardDescription>
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl text-green-600">
                    {formatCurrency(stats.totalInvestmentAmount)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Subscribed</span>
                      <span className="font-semibold text-green-600">{formatCurrency(stats.totalSubscribedAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Paid Revenue</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(stats.totalRevenue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Active Subscriptions */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/back-office-subscriptions')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs">Active Subscriptions</CardDescription>
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
                    <p className="text-xs text-gray-600">
                      {stats.totalSubscriptions > 0 
                        ? `${((stats.activeSubscriptions / stats.totalSubscriptions) * 100).toFixed(0)}% of total`
                        : 'No subscriptions yet'
                      }
                    </p>
                    {stats.pendingPayments > 0 && (
                      <p className="text-xs text-orange-600">{stats.pendingPayments} pending verification</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Document Compliance */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs">Document Compliance</CardDescription>
                    <FileText className="h-4 w-4 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{stats.documentComplianceRate.toFixed(0)}%</span>
                      {stats.documentComplianceRate >= 80 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-orange-600" />
                      )}
                    </div>
                    <Progress value={stats.documentComplianceRate} className="h-2" />
                    <p className="text-xs text-gray-600">Board member compliance rate</p>
                  </div>
                </CardContent>
              </Card>

              {/* Documents Under Review */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs">Pending Review</CardDescription>
                    <Eye className="h-4 w-4 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{stats.documentsUnderReview}</div>
                    <p className="text-xs text-gray-600">Documents awaiting review</p>
                    {stats.documentsUnderReview > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate('/back-office-board-documents')}
                      >
                        Review Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Email Queue */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs">Email Queue</CardDescription>
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{stats.emailQueueSize}</div>
                    <p className="text-xs text-gray-600">Pending emails</p>
                    {stats.failedEmails > 0 && (
                      <p className="text-xs text-red-600">{stats.failedEmails} failed</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* System Activity */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs">System Status</CardDescription>
                    <Activity className="h-4 w-4 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm font-semibold text-green-600">Operational</span>
                    </div>
                    <p className="text-xs text-gray-600">All systems running</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="justify-between h-auto py-4 hover:bg-blue-50"
                    onClick={() => navigate('/admin-users')}
                  >
                    <div className="text-left">
                      <div className="font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Manage Users
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Search and manage user accounts</div>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-between h-auto py-4 hover:bg-blue-50"
                    onClick={() => navigate('/admin-board-positions')}
                  >
                    <div className="text-left">
                      <div className="font-semibold flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Board Positions
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Manage board hierarchy</div>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-between h-auto py-4 hover:bg-blue-50"
                    onClick={() => navigate('/admin-audit')}
                  >
                    <div className="text-left">
                      <div className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Audit Trail
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">View all admin actions</div>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-between h-auto py-4 hover:bg-blue-50"
                    onClick={() => navigate('/back-office-board-documents')}
                  >
                    <div className="text-left">
                      <div className="font-semibold flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Review Documents
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {stats.documentsUnderReview > 0 
                          ? `${stats.documentsUnderReview} pending`
                          : 'No documents pending'
                        }
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-between h-auto py-4 hover:bg-blue-50"
                    onClick={() => navigate('/back-office-subscriptions')}
                  >
                    <div className="text-left">
                      <div className="font-semibold flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Subscriptions
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {stats.pendingPayments > 0
                          ? `${stats.pendingPayments} pending payments`
                          : 'View all subscriptions'
                        }
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-between h-auto py-4 hover:bg-blue-50"
                    onClick={() => navigate('/back-office-invitations')}
                  >
                    <div className="text-left">
                      <div className="font-semibold flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Invitations
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {stats.pendingInvitations > 0
                          ? `${stats.pendingInvitations} pending`
                          : 'Manage invitations'
                        }
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system events and administrative actions</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No recent activity to display</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((entry) => {
                      const Icon = entry.icon;
                      return (
                        <div key={entry.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                          <div className={`p-2 rounded-lg bg-gray-50 ${entry.iconColor}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{entry.title}</div>
                            <div className="text-sm text-gray-600 truncate">{entry.description}</div>
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(entry.timestamp)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {recentActivity.length > 0 && (
                  <div className="mt-4 text-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/admin-audit')}
                    >
                      View All Activity
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default AdminDashboard;
