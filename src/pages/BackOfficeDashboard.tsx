import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from 'app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProfileDropdown } from 'components/ProfileDropdown';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { BackOfficeNav } from 'components/BackOfficeNav';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  FileText, 
  DollarSign, 
  Mail, 
  Shield, 
  BarChart3, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  ArrowRight,
  Settings,
  Home,
  Loader2,
  Wallet,
  FolderOpen,
  Vote,
  Newspaper,
  MessageSquare,
  TrendingUp,
  Award,
  ShieldCheck,
  Link2,
  UserPlus,
  FileCheck,
  Search,
  Star,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from "components/CurrencyProvider";
import type { GetDashboardStatsData } from 'types';

export default function BackOfficeDashboard() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [stats, setStats] = useState<GetDashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Services');
  const [serviceUsage, setServiceUsage] = useState<Record<string, number>>({});

  // Load service usage from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('backoffice_service_usage');
    if (stored) {
      try {
        setServiceUsage(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse service usage:', e);
      }
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const response = await apiClient.get_dashboard_stats();
      const data = await response.json();
      setStats(data);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      const errorMsg = error?.message || error?.detail || "Unknown error occurred";
      toast.error(`Failed to load dashboard data: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Track service click
  const handleServiceClick = (path: string) => {
    const newUsage = { ...serviceUsage };
    newUsage[path] = (newUsage[path] || 0) + 1;
    setServiceUsage(newUsage);
    localStorage.setItem('backoffice_service_usage', JSON.stringify(newUsage));
    navigate(path);
  };

  const adminServices = [
    // Core Operations
    {
      title: 'Share Subscriptions',
      description: 'Manage share subscriptions, payments, and certificates',
      icon: DollarSign,
      path: '/back-office-subscriptions',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      category: 'Core Operations',
      stats: [
        { label: 'Total Invested', value: formatCurrency(stats?.subscriptions.total_invested || 0, 'LSL') },
        { label: 'Active Subscriptions', value: stats?.subscriptions.active || 0 }
      ]
    },
    {
      title: 'Board Investments',
      description: 'Track and manage board member share investments',
      icon: TrendingUp,
      path: '/back-office-board-investments',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      category: 'Core Operations',
      stats: [
        { label: 'Total Board Invested', value: formatCurrency(stats?.subscriptions.total_invested || 0, 'LSL') },
        { label: 'Board Investors', value: stats?.board_members.active || 0 }
      ]
    },
    {
      title: 'Share Certificates',
      description: 'Issue, manage, and track digital share certificates',
      icon: Award,
      path: '/back-office-certificates',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      category: 'Core Operations',
      stats: [
        { label: 'Issued', value: 0 },
        { label: 'Pending', value: 0 }
      ]
    },
    // Member Management
    {
      title: 'Board Members',
      description: 'Manage board member appointments, positions, and profiles',
      icon: Users,
      path: '/back-office-board-members',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      category: 'Member Management',
      stats: [
        { label: 'Total Members', value: stats?.board_members.total || 0 },
        { label: 'Active Members', value: stats?.board_members.active || 0 }
      ]
    },
    {
      title: 'Board Mapping',
      description: 'Map system users to board member profiles',
      icon: Link2,
      path: '/back-office-board-mapping',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      category: 'Member Management',
      stats: [
        { label: 'Unmapped', value: 0 },
        { label: 'Mapped', value: stats?.board_members.total || 0 }
      ]
    },
    {
      title: 'Board Invitations',
      description: 'Send and manage board member invitations',
      icon: Mail,
      path: '/back-office-invitations',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      category: 'Member Management',
      stats: [
        { label: 'Pending', value: stats?.invitations.pending || 0 },
        { label: 'Total Sent', value: stats?.invitations.total || 0 }
      ]
    },
    {
      title: 'Investor Leads',
      description: 'Manage prospective investors and follow-up campaigns',
      icon: UserPlus,
      path: '/back-office-investor-leads',
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      category: 'Member Management',
      stats: [
        { label: 'Active Leads', value: 0 },
        { label: 'Converted', value: 0 }
      ]
    },
    // Documents & Compliance
    {
      title: 'License Documents',
      description: 'Review and approve banking license documentation',
      icon: FileText,
      path: '/back-office-license-documents',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      category: 'Documents & Compliance',
      stats: [
        { label: 'Pending Review', value: stats?.documents.pending || 0 },
        { label: 'Total Documents', value: stats?.documents.total || 0 }
      ]
    },
    {
      title: 'Board Documents',
      description: 'Manage required board member documents and templates',
      icon: FileCheck,
      path: '/back-office-board-documents',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      category: 'Documents & Compliance',
      stats: [
        { label: 'Requirements', value: 0 },
        { label: 'Pending Review', value: stats?.documents.pending || 0 }
      ]
    },
    {
      title: 'Certificate Templates',
      description: 'Design and manage certificate PDF templates',
      icon: FileCheck,
      path: '/back-office-certificate-templates',
      color: 'text-fuchsia-600',
      bgColor: 'bg-fuchsia-50',
      category: 'Documents & Compliance',
      stats: [
        { label: 'Active Templates', value: 0 },
        { label: 'Total Templates', value: 0 }
      ]
    },
    {
      title: 'Data Room',
      description: 'AI-powered document processing and investor data room',
      icon: FolderOpen,
      path: '/back-office-data-room',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      category: 'Documents & Compliance',
      stats: [
        { label: 'Categories', value: stats?.documents.total > 0 ? 5 : 0 },
        { label: 'Documents', value: stats?.documents.total || 0 }
      ]
    },
    {
      title: 'Data Room Access',
      description: 'Monitor investor data room access and agreements',
      icon: ShieldCheck,
      path: '/back-office-data-room-access',
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      category: 'Documents & Compliance',
      stats: [
        { label: 'Active Users', value: 0 },
        { label: 'Access Logs', value: 0 }
      ]
    },
    // Communications
    {
      title: 'Board Engagement Emails',
      description: 'AI-generated personalized email campaigns for board members',
      icon: TrendingUp,
      path: '/back-office-engagement',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      category: 'Communications',
      stats: [
        { label: 'Active Campaigns', value: stats?.engagement?.active_campaigns || 0 },
        { label: 'Emails Sent', value: stats?.engagement?.total_sent || 0 }
      ]
    },
    {
      title: 'Email Templates',
      description: 'Manage transactional email templates and campaigns',
      icon: MessageSquare,
      path: '/communication-portal',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      category: 'Communications',
      stats: [
        { label: 'Active Templates', value: 0 },
        { label: 'Total Sent', value: stats?.engagement?.total_sent || 0 }
      ]
    },
    {
      title: 'Sent Items',
      description: 'View sent email history and delivery status',
      icon: Mail,
      path: '/back-office-sent-items',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      category: 'Communications',
      stats: [
        { label: 'Sent Today', value: 0 },
        { label: 'Failed', value: 0 }
      ]
    },
    {
      title: 'Media Releases',
      description: 'Create and publish news articles with email newsletters',
      icon: Newspaper,
      path: '/back-office-media-releases',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      category: 'Communications',
      stats: [
        { label: 'Published', value: 5 },
        { label: 'Total Articles', value: 5 }
      ]
    },
    {
      title: 'Achievements Timeline',
      description: 'Track and showcase company milestones and achievements',
      icon: Award,
      path: '/back-office-achievements',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      category: 'Communications',
      stats: [
        { label: 'Milestones', value: 0 },
        { label: 'Published', value: 0 }
      ]
    },
    // Governance & Analytics
    {
      title: 'Governance & Voting',
      description: 'Manage AGM votes, board resolutions, and meeting voting',
      icon: Vote,
      path: '/governance-admin',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      category: 'Governance & Analytics',
      stats: [
        { label: 'Active Sessions', value: 0 },
        { label: 'Total Votes', value: 0 }
      ]
    },
    {
      title: 'Notification Analytics',
      description: 'Track multi-channel notification delivery and engagement',
      icon: BarChart3,
      path: '/notification-analytics',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      category: 'Governance & Analytics',
      stats: [
        { label: 'Delivered Today', value: 0 },
        { label: 'Open Rate', value: '0%' }
      ]
    },
    // Configuration
    {
      title: 'Crypto Wallets',
      description: 'Configure cryptocurrency payment wallets (BTC, ETH, USDT)',
      icon: Wallet,
      path: '/back-office-crypto-wallets',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      category: 'Configuration',
      stats: [
        { label: 'Active Wallets', value: stats?.crypto_wallets?.active || 0 },
        { label: 'Total Configured', value: stats?.crypto_wallets?.total || 0 }
      ]
    },
    {
      title: 'Bank Accounts',
      description: 'Manage LSL and ZAR bank accounts for subscriptions',
      icon: DollarSign,
      path: '/back-office-bank-accounts',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      category: 'Configuration',
      stats: [
        { label: 'Active Accounts', value: 2 },
        { label: 'Currencies', value: 2 }
      ]
    },
    {
      title: 'Share Classes',
      description: 'Configure and manage share class types and properties',
      icon: TrendingUp,
      path: '/back-office-share-classes',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      category: 'Configuration',
      stats: [
        { label: 'Share Classes', value: 0 },
        { label: 'Active Types', value: 0 }
      ]
    }
  ];

  // Filter services based on search and category
  const filteredServices = adminServices.filter(service => {
    const matchesSearch = searchQuery === '' || 
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All Services' || 
      service.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get frequently used services (top 6)
  const frequentServices = adminServices
    .map(service => ({
      ...service,
      usageCount: serviceUsage[service.path] || 0
    }))
    .filter(service => service.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 6);

  // Get unique categories
  const categories = ['All Services', ...Array.from(new Set(adminServices.map(s => s.category)))];

  const quickActions = [
    {
      title: 'Review Pending Documents',
      description: 'Review board member license documents',
      icon: CheckCircle2,
      action: () => navigate('/BackOfficeLicenseDocuments'),
      count: stats?.documents.pending || 0,
      variant: 'default' as const
    },
    {
      title: 'Process Invitations',
      description: 'Manage pending board invitations',
      icon: Clock,
      action: () => navigate('/BackOfficeInvitations'),
      count: stats?.invitations.pending || 0,
      variant: 'secondary' as const
    },
    {
      title: 'View Investments',
      description: 'Check board investment status',
      icon: BarChart3,
      action: () => navigate('/BackOfficeBoardInvestments'),
      count: stats?.board_members.total || 0,
      variant: 'outline' as const
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8 lg:pt-24">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Back Office Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Administrative control center</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8 lg:pt-24">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Back Office Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Administrative control center</p>
          </div>
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Failed to load dashboard data</p>
              <Button onClick={loadDashboardData} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <BackOfficeNav />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8 lg:pt-24">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Back Office Dashboard</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Administrative control center</p>
              </div>
              <Button onClick={() => navigate('/')} variant="outline">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </div>
          </div>

          {/* Key Stats Cards - Clickable */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Active Board Members */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-blue-200 bg-blue-50"
              onClick={() => navigate('/back-office-board-members')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Board Members</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">{stats.board_members.active}</div>
                <p className="text-xs text-blue-700 mt-1">
                  of {stats.board_members.total} total • Click to manage
                </p>
              </CardContent>
            </Card>

            {/* Pending Invitations */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-orange-200 bg-orange-50"
              onClick={() => navigate('/back-office-invitations')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
                <Mail className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900">{stats.invitations.pending}</div>
                <p className="text-xs text-orange-700 mt-1">
                  of {stats.invitations.total} total • Click to view
                </p>
              </CardContent>
            </Card>

            {/* Total Investments */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-green-200 bg-green-50"
              onClick={() => navigate('/back-office-board-investments')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Investments</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">{formatCurrency(stats.subscriptions.total_invested, 'LSL')}</div>
                <p className="text-xs text-green-700 mt-1">
                  {stats.subscriptions.active} active subscriptions • Click to view
                </p>
              </CardContent>
            </Card>

            {/* Pending Documents */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-purple-200 bg-purple-50"
              onClick={() => navigate('/back-office-board-documents')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Documents</CardTitle>
                <FileText className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">{stats.documents.pending}</div>
                <p className="text-xs text-purple-700 mt-1">
                  of {stats.documents.total} total • Click to review
                </p>
              </CardContent>
            </Card>

            {/* Active Subscriptions */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-teal-200 bg-teal-50"
              onClick={() => navigate('/back-office-subscriptions')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <BarChart3 className="h-4 w-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-900">{stats.subscriptions.active}</div>
                <p className="text-xs text-teal-700 mt-1">
                  of {stats.subscriptions.total} total • Click to manage
                </p>
              </CardContent>
            </Card>

            {/* Crypto Wallets */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-indigo-200 bg-indigo-50"
              onClick={() => navigate('/back-office-crypto-wallets')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Crypto Wallets</CardTitle>
                <Wallet className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-900">{stats.crypto_wallets.active}</div>
                <p className="text-xs text-indigo-700 mt-1">
                  of {stats.crypto_wallets.total} total • Click to manage
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Section */}
          <div className="mb-8">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search services by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Frequently Used Services */}
          {frequentServices.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="h-6 w-6 text-yellow-500" />
                Frequently Used Services
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {frequentServices.map((service, index) => (
                  <Card 
                    key={index} 
                    className="hover:shadow-lg transition-all cursor-pointer group border-yellow-200 bg-gradient-to-br from-yellow-50 to-white"
                    onClick={() => handleServiceClick(service.path)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-lg ${service.bgColor}`}>
                          <service.icon className={`h-6 w-6 ${service.color}`} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-[#6d52a2] transition-colors" />
                        </div>
                      </div>
                      <CardTitle className="text-base sm:text-lg mt-4">{service.title}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {service.stats.map((stat, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs sm:text-sm">
                            <span className="text-gray-600">{stat.label}</span>
                            <span className="font-semibold">{stat.value}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-1 text-xs text-yellow-600 pt-2 border-t">
                          <Zap className="h-3 w-3" />
                          Used {service.usageCount} time{service.usageCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Services Grid with Category Tabs */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">All Services</h2>
            
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-2 bg-transparent">
                {categories.map((category) => {
                  const categoryCount = adminServices.filter(s => category === 'All Services' || s.category === category).length;
                  return (
                    <TabsTrigger 
                      key={category} 
                      value={category}
                      className="data-[state=active]:bg-[#6d52a2] data-[state=active]:text-white"
                    >
                      {category}
                      <Badge variant="secondary" className="ml-2">
                        {categoryCount}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-6">
                {filteredServices.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No services found matching your search.</p>
                    </CardContent>
                  </Card>
                ) : selectedCategory === 'All Services' ? (
                  // Group by category when "All Services" is selected
                  ['Core Operations', 'Member Management', 'Documents & Compliance', 'Communications', 'Governance & Analytics', 'Configuration'].map((category) => {
                    const categoryServices = filteredServices.filter(s => s.category === category);
                    if (categoryServices.length === 0) return null;
                    
                    return (
                      <div key={category} className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <span className="h-1 w-8 bg-[#6d52a2] mr-3 rounded"></span>
                          {category}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                          {categoryServices.map((service, index) => (
                            <Card 
                              key={index} 
                              className="hover:shadow-lg transition-all cursor-pointer group"
                              onClick={() => handleServiceClick(service.path)}
                            >
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div className={`p-3 rounded-lg ${service.bgColor}`}>
                                    <service.icon className={`h-6 w-6 ${service.color}`} />
                                  </div>
                                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-[#6d52a2] transition-colors" />
                                </div>
                                <CardTitle className="text-base sm:text-lg mt-4">{service.title}</CardTitle>
                                <CardDescription className="text-xs sm:text-sm">{service.description}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  {service.stats.map((stat, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs sm:text-sm">
                                      <span className="text-gray-600">{stat.label}</span>
                                      <span className="font-semibold">{stat.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Show only selected category
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredServices.map((service, index) => (
                      <Card 
                        key={index} 
                        className="hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => handleServiceClick(service.path)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className={`p-3 rounded-lg ${service.bgColor}`}>
                              <service.icon className={`h-6 w-6 ${service.color}`} />
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-[#6d52a2] transition-colors" />
                          </div>
                          <CardTitle className="text-base sm:text-lg mt-4">{service.title}</CardTitle>
                          <CardDescription className="text-xs sm:text-sm">{service.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {service.stats.map((stat, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs sm:text-sm">
                                <span className="text-gray-600">{stat.label}</span>
                                <span className="font-semibold">{stat.value}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
