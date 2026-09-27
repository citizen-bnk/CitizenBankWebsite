import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { apiClient } from 'app';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Mail,
  Phone,
  Shield,
  Activity,
  Lock,
  UserCog,
  Building2,
  DollarSign,
  FileText,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  CreditCard,
  AlertCircle,
  Eye,
  Ban,
  CheckCircle,
  MoreVertical,
  History,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useUserRoles } from 'utils/useUserRoles';
import type {
  UserDetailsResponse,
  RoleMetadata,
  BoardMemberData,
  InvestorData,
  CustomerData,
  ActivitySummary,
  SecurityInfo,
  LoginHistoryResponse,
  SuspensionHistoryResponse,
  RoleHistoryResponse,
} from 'types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdminUserDetail() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const navigate = useNavigate();
  const { isSuperAdmin, loading: rolesLoading } = useUserRoles();

  const [userDetails, setUserDetails] = useState<UserDetailsResponse | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryResponse | null>(null);
  const [suspensionHistory, setSuspensionHistory] = useState<SuspensionHistoryResponse | null>(null);
  const [roleHistory, setRoleHistory] = useState<RoleHistoryResponse | null>(null);
  const [positionHistory, setPositionHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Redirect if not super admin
  useEffect(() => {
    if (!rolesLoading && !isSuperAdmin) {
      toast.error('Access denied');
      navigate('/admin-dashboard');
    }
  }, [isSuperAdmin, rolesLoading, navigate]);

  // Fetch user details
  useEffect(() => {
    if (!userId || rolesLoading || !isSuperAdmin) return;

    const fetchUserDetails = async () => {
      try {
        setLoading(true);

        // Fetch main user details
        const detailsResponse = await apiClient.get_user_profile_by_id({ userId });
        if (!detailsResponse.ok) {
          throw new Error('Failed to fetch user details');
        }
        const details = await detailsResponse.json();
        setUserDetails(details);
      } catch (error) {
        console.error('Error fetching user details:', error);
        toast.error('Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId, isSuperAdmin, rolesLoading]);

  // Fetch activity data when Activity tab is selected
  useEffect(() => {
    if (activeTab === 'activity' && userId && !loginHistory) {
      fetchLoginHistory();
    }
  }, [activeTab, userId]);

  // Fetch security data when Security tab is selected
  useEffect(() => {
    if (activeTab === 'security' && userId && !suspensionHistory) {
      fetchSuspensionHistory();
      fetchRoleHistory();
    }
    if (activeTab === 'roles' && userId && positionHistory.length === 0) {
      fetchPositionHistory();
    }
  }, [activeTab, userId]);

  const fetchLoginHistory = async () => {
    try {
      const response = await apiClient.get_user_login_history({ userId: userId! });
      if (response.ok) {
        const data = await response.json();
        setLoginHistory(data);
      }
    } catch (error) {
      console.error('Error fetching login history:', error);
    }
  };

  const fetchSuspensionHistory = async () => {
    try {
      const response = await apiClient.get_user_suspension_history({ userId: userId! });
      if (response.ok) {
        const data = await response.json();
        setSuspensionHistory(data);
      }
    } catch (error) {
      console.error('Error fetching suspension history:', error);
    }
  };

  const fetchRoleHistory = async () => {
    try {
      const response = await apiClient.get_user_role_history({ userId: userId! });
      if (response.ok) {
        const data = await response.json();
        setRoleHistory(data);
      }
    } catch (error) {
      console.error('Error fetching role history:', error);
    }
  };

  const fetchPositionHistory = async () => {
    try {
      // Fetch position history from board_member_positions
      const response = await apiClient.get_position_history({ user_id: userId });
      if (response.ok) {
        const data = await response.json();
        setPositionHistory(data.history || []);
        console.log('Position history loaded:', data.history?.length || 0, 'entries');
      }
    } catch (error) {
      console.error('Error fetching position history:', error);
    }
  };

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
            <Button onClick={() => navigate('/admin-users')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Suspended</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'LSL') => {
    return new Intl.NumberFormat('en-LS', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getRoleBadgeColor = (roleName: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-purple-100 text-purple-800 border-purple-300',
      admin: 'bg-blue-100 text-blue-800 border-blue-300',
      board_member: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      investor: 'bg-green-100 text-green-800 border-green-300',
      customer: 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return colors[roleName] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/admin-users')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>

        {/* User Header Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24">
                <AvatarImage src={undefined} />
                <AvatarFallback className="text-2xl">
                  {getInitials(userDetails.full_name)}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">
                    {userDetails.full_name || 'Unnamed User'}
                  </h1>
                  {getStatusBadge(userDetails.status)}
                  {userDetails.security.email_verified && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{userDetails.email}</span>
                  </div>
                  {userDetails.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{userDetails.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDate(userDetails.activity.registration_date)}</span>
                  </div>
                </div>

                {/* Roles */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {userDetails.roles.map((role) => (
                    <Badge key={role.role_name} className={getRoleBadgeColor(role.role_name)}>
                      {role.role_name.replace('_', ' ').toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <UserCog className="h-4 w-4 mr-2" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Shield className="h-4 w-4 mr-2" />
                      Manage Roles
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {userDetails.status === 'active' ? (
                      <DropdownMenuItem className="text-red-600">
                        <Ban className="h-4 w-4 mr-2" />
                        Suspend User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem className="text-green-600">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Activate User
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Profile Completion */}
            {userDetails.profile_completion_percentage < 100 && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Profile Completion</span>
                  <span className="text-sm text-gray-600">
                    {userDetails.profile_completion_percentage}%
                  </span>
                </div>
                <Progress value={userDetails.profile_completion_percentage} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="roles">Roles & Positions</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Logins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <span className="text-2xl font-bold">
                      {userDetails.activity.login_count}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Last: {formatDateTime(userDetails.activity.last_login_at)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Days Active
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <span className="text-2xl font-bold">
                      {userDetails.activity.days_since_registration}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Since {formatDate(userDetails.activity.registration_date)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Roles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    <span className="text-2xl font-bold">{userDetails.roles.length}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {userDetails.roles.map((r) => r.role_name).join(', ')}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Role-Specific Cards */}
            {userDetails.board_member_data && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    <CardTitle>Board Member</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Position</p>
                      <p className="font-semibold">
                        {userDetails.board_member_data.position || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge>{userDetails.board_member_data.status}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Shares</p>
                      <p className="font-semibold">
                        {userDetails.board_member_data.total_shares.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Documents</p>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {userDetails.board_member_data.documents_count}
                        </span>
                        <div className="text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-blue-500" />
                            {userDetails.board_member_data.documents_uploaded} Uploaded
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            {userDetails.board_member_data.documents_approved} Approved
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {userDetails.board_member_data.term_end_date && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-600">Term</p>
                      <p className="text-sm">
                        {formatDate(userDetails.board_member_data.appointed_date)} -{' '}
                        {formatDate(userDetails.board_member_data.term_end_date)}
                        {' '}({userDetails.board_member_data.term_years} years)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {userDetails.investor_data && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <CardTitle>Investor</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Invested (LSL)</p>
                      <p className="font-semibold text-lg">
                        {formatCurrency(userDetails.investor_data.total_invested_lsl, 'LSL')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Invested (ZAR)</p>
                      <p className="font-semibold text-lg">
                        {formatCurrency(userDetails.investor_data.total_invested_zar, 'ZAR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Subscriptions</p>
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {userDetails.investor_data.total_subscriptions_count} Total
                        </p>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            {userDetails.investor_data.subscriptions_paid} Paid
                          </div>
                          <div className="flex items-center gap-1 text-yellow-600">
                            <Clock className="h-3 w-3" />
                            {userDetails.investor_data.subscriptions_pending} Pending
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Shares</p>
                      <p className="font-semibold">
                        {userDetails.investor_data.total_shares.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {userDetails.customer_data && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-orange-600" />
                    <CardTitle>Banking Customer</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Accounts</p>
                      <p className="font-semibold">
                        {userDetails.customer_data.accounts_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Balance</p>
                      <p className="font-semibold">
                        {formatCurrency(userDetails.customer_data.total_balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Savings Balance</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(userDetails.customer_data.savings_balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Cheque Balance</p>
                      <p className="font-semibold text-blue-600">
                        {formatCurrency(userDetails.customer_data.cheque_balance)}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t mt-4">
                    <p className="text-sm text-gray-600">Recent Activity</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm">
                        {userDetails.customer_data.recent_transactions_count} Transactions
                      </p>
                      {userDetails.customer_data.last_transaction_date && (
                        <p className="text-sm text-gray-500">
                          Last: {formatDate(userDetails.customer_data.last_transaction_date)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <CardTitle>Login History</CardTitle>
                </div>
                <CardDescription>
                  Detailed login activity including IP addresses and locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!loginHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-3">Loading login history...</p>
                  </div>
                ) : loginHistory.logins.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No login history available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loginHistory.logins.map((login, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                        <div className={`w-2 h-2 mt-2 rounded-full ${
                          login.success ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium">
                              {formatDateTime(login.login_timestamp)}
                            </p>
                            <Badge variant={login.success ? "outline" : "destructive"}>
                              {login.success ? 'Success' : 'Failed'}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            {login.ip_address && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{login.ip_address}</span>
                              </div>
                            )}
                            {(login.location_city || login.location_country) && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {login.location_city}
                                  {login.location_city && login.location_country && ', '}
                                  {login.location_country}
                                </span>
                              </div>
                            )}
                            {login.user_agent && (
                              <div className="text-xs text-gray-500 mt-1">
                                {login.user_agent}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            {/* Suspension History */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Ban className="h-5 w-5 text-red-600" />
                  <CardTitle>Suspension History</CardTitle>
                </div>
                <CardDescription>
                  Account suspension and reactivation events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!suspensionHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-3">Loading suspension history...</p>
                  </div>
                ) : suspensionHistory.events.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-300 mb-3" />
                    <p className="text-gray-500">No suspension events</p>
                    <p className="text-sm text-gray-400 mt-1">This account has never been suspended</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suspensionHistory.events.map((event, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {event.event_type === 'suspended' ? (
                              <Ban className="h-5 w-5 text-red-600" />
                            ) : (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                            <span className="font-semibold">
                              {event.event_type === 'suspended' ? 'Account Suspended' : 'Account Reactivated'}
                            </span>
                          </div>
                          <Badge variant={event.event_type === 'suspended' ? 'destructive' : 'outline'}>
                            {formatDateTime(event.event_timestamp)}
                          </Badge>
                        </div>
                        {event.reason && (
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Reason:</strong> {event.reason}
                          </p>
                        )}
                        {event.performed_by_name && (
                          <p className="text-sm text-gray-600">
                            By: {event.performed_by_name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Role Change History */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-purple-600" />
                  <CardTitle>Role Change History</CardTitle>
                </div>
                <CardDescription>
                  Complete audit trail of role assignments and removals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!roleHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-3">Loading role history...</p>
                  </div>
                ) : roleHistory.changes.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCog className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No role changes</p>
                    <p className="text-sm text-gray-400 mt-1">No role assignments or removals recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {roleHistory.changes.map((change, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className={`w-2 h-2 mt-2 rounded-full ${
                          change.action === 'assigned' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge className={getRoleBadgeColor(change.role_name)}>
                                {change.role_name.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <span className="font-medium">
                                {change.action === 'assigned' ? 'Assigned' : 'Removed'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {formatDateTime(change.changed_at)}
                            </span>
                          </div>
                          {change.performed_by_name && (
                            <p className="text-sm text-gray-600">
                              By: {change.performed_by_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Roles</CardTitle>
                <CardDescription>
                  Roles determine user permissions and access levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userDetails.roles.map((role) => (
                    <div
                      key={role.role_name}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Shield className="h-8 w-8 text-gray-400" />
                        <div>
                          <h4 className="font-semibold">
                            {role.role_name.replace('_', ' ').toUpperCase()}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Assigned {formatDateTime(role.assigned_at)}
                            {role.assigned_by_name && ` by ${role.assigned_by_name}`}
                          </p>
                        </div>
                      </div>
                      <Badge className={getRoleBadgeColor(role.role_name)}>Active</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Position Assignment History */}
            {userDetails.board_member_data && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-blue-600" />
                    <CardTitle>Position Assignment History</CardTitle>
                  </div>
                  <CardDescription>
                    Complete history of board position changes and appointments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Tenure Explanation */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-1">Understanding Board Terms & Tenure</h4>
                        <p className="text-sm text-blue-800 mb-2">
                          Board members are appointed for a <strong>3-year term</strong> by default. The term end date determines:
                        </p>
                        <ul className="text-sm text-blue-800 space-y-1 ml-4">
                          <li>• <strong>Active Status:</strong> Board member is valid and authorized to serve</li>
                          <li>• <strong>Reappointment:</strong> When term expires, member must be reappointed to continue</li>
                          <li>• <strong>Transition Planning:</strong> Advance notice for succession and continuity</li>
                          <li>• <strong>Compliance:</strong> Ensures proper governance and regulatory requirements</li>
                        </ul>
                        <p className="text-sm text-blue-800 mt-2">
                          Members can be appointed to different positions during their tenure. Each position change is tracked below.
                        </p>
                      </div>
                    </div>
                  </div>

                  {positionHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No position history available</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Position changes will appear here when they occur
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Current Position */}
                      {userDetails.board_member_data.position && (
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-6 w-6 text-blue-600 mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-blue-900">Current Position</h4>
                                <Badge className="bg-blue-600">Active</Badge>
                              </div>
                              <p className="text-lg font-bold text-blue-900 mb-2">
                                {userDetails.board_member_data.position}
                              </p>
                              {userDetails.board_member_data.appointed_date && (
                                <p className="text-sm text-blue-700">
                                  Appointed: {formatDate(userDetails.board_member_data.appointed_date)}
                                  {userDetails.board_member_data.term_end_date && (
                                    <> • Term ends: {formatDate(userDetails.board_member_data.term_end_date)}</>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Timeline of Changes */}
                      <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
                        
                        <div className="space-y-6">
                          {positionHistory.map((item, index) => {
                            const isCurrent = item.is_current;
                            const isAppointment = !item.removed_at;
                            const daysInPosition = item.removed_at 
                              ? Math.floor((new Date(item.removed_at).getTime() - new Date(item.appointed_at).getTime()) / (1000 * 60 * 60 * 24))
                              : Math.floor((new Date().getTime() - new Date(item.appointed_at).getTime()) / (1000 * 60 * 60 * 24));
                            const previousPosition = index < positionHistory.length - 1 ? positionHistory[index + 1].position_name : null;
                            
                            return (
                              <div key={index} className="relative flex gap-4">
                                {/* Timeline dot */}
                                <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                                  isCurrent 
                                    ? 'bg-blue-100 border-blue-600' 
                                    : 'bg-white border-gray-300'
                                }`}>
                                  {isCurrent ? (
                                    <CheckCircle className="h-5 w-5 text-blue-600" />
                                  ) : (
                                    <Clock className="h-5 w-5 text-gray-400" />
                                  )}
                                </div>

                                {/* Event card */}
                                <div className={`flex-1 border rounded-lg p-4 ${
                                  isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
                                }`}>
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold">
                                          {item.position_name}
                                        </h4>
                                        {isCurrent && <Badge className="bg-blue-600">Current</Badge>}
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1">
                                        {isAppointment ? 'Appointed' : previousPosition ? `Transitioned from ${previousPosition}` : 'Position changed'} on {formatDate(item.appointed_at)}
                                        {item.appointed_by_name && (
                                          <> by {item.appointed_by_name}</>
                                        )}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      {item.position_level && (
                                        <Badge variant="outline" className="mb-1">
                                          Level {item.position_level}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Enhanced audit info */}
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div className="flex items-center gap-1 text-gray-600">
                                        <Clock className="h-4 w-4" />
                                        <span>
                                          {daysInPosition} day{daysInPosition !== 1 ? 's' : ''} in position
                                        </span>
                                      </div>
                                      {item.term_end_date && !item.removed_at && (
                                        <div className="flex items-center gap-1 text-gray-600">
                                          <Calendar className="h-4 w-4" />
                                          <span>Term ends: {formatDate(item.term_end_date)}</span>
                                        </div>
                                      )}
                                      {item.removed_at && (
                                        <div className="flex items-center gap-1 text-gray-600">
                                          <ArrowRight className="h-4 w-4" />
                                          <span>Ended: {formatDate(item.removed_at)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Notes */}
                                  {item.notes && (
                                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                                      <p className="text-gray-700">{item.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Summary stats */}
                      <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{positionHistory.length}</p>
                          <p className="text-sm text-gray-600">Total Positions</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {positionHistory.filter(p => p.is_current).length}
                          </p>
                          <p className="text-sm text-gray-600">Currently Active</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {positionHistory[positionHistory.length - 1]?.appointed_at 
                              ? Math.floor((new Date().getTime() - new Date(positionHistory[positionHistory.length - 1].appointed_at).getTime()) / (1000 * 60 * 60 * 24))
                              : 0}
                          </p>
                          <p className="text-sm text-gray-600">Days in Service</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
