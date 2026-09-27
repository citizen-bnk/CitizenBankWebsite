import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  DollarSign, 
  Mail,
  Link2,
  MessageSquare,
  Wallet,
  Award,
  Database,
  FolderLock,
  FileCheck,
  Newspaper,
  ShieldCheck,
  Menu,
  Building2,
  MapPin,
  UserPlus,
  TrendingUp,
  Vote,
  BarChart3,
  UserCog,
  Home,
  Settings,
  Building,
  Bitcoin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from 'utils/use-media-query';

interface BackOfficeNavProps {
  currentPage?: string;
}

export function BackOfficeNav({ currentPage }: BackOfficeNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    // Dashboard
    {
      title: 'Dashboard',
      path: '/back-office-dashboard',
      icon: Home,
      category: 'main'
    },
    // Core Operations
    {
      title: 'Subscriptions',
      path: '/back-office-subscriptions',
      icon: DollarSign,
      category: 'core'
    },
    {
      title: 'Admin Subscriptions',
      path: '/back-office-admin-subscriptions',
      icon: UserCog,
      category: 'core'
    },
    {
      title: 'Board Investments',
      path: '/back-office-board-investments',
      icon: DollarSign,
      category: 'core'
    },
    {
      title: 'Certificates',
      path: '/back-office-certificates',
      icon: Award,
      category: 'core'
    },
    // Member Management
    {
      title: 'Board Members',
      path: '/back-office-board-members',
      icon: Users,
      category: 'members'
    },
    {
      title: 'Board Mapping',
      path: '/back-office-board-mapping',
      icon: Link2,
      category: 'members'
    },
    {
      title: 'Invitations',
      path: '/back-office-invitations',
      icon: Mail,
      category: 'members'
    },
    {
      title: 'Investor Leads',
      path: '/back-office-investor-leads',
      icon: UserPlus,
      category: 'members'
    },
    // Documents
    {
      title: 'License Documents',
      path: '/back-office-license-documents',
      icon: FileText,
      category: 'documents'
    },
    {
      title: 'Board Documents',
      path: '/back-office-board-documents',
      icon: FileCheck,
      category: 'documents'
    },
    {
      title: 'Data Room',
      path: '/back-office-data-room',
      icon: FolderLock,
      category: 'documents'
    },
    {
      title: 'Data Room Access',
      path: '/back-office-data-room-access',
      icon: ShieldCheck,
      category: 'documents'
    },
    // Communications
    {
      title: 'Board Engagement',
      path: '/back-office-engagement',
      icon: TrendingUp,
      category: 'communications'
    },
    {
      title: 'Sent Items',
      path: '/back-office-sent-items',
      icon: Mail,
      category: 'communications'
    },
    {
      title: 'Media Releases',
      path: '/back-office-media-releases',
      icon: Newspaper,
      category: 'communications'
    },
    {
      title: 'Achievements',
      path: '/back-office-achievements',
      icon: Award,
      category: 'communications'
    },
    // Governance
    {
      title: 'Governance & Voting',
      path: '/governance-admin',
      icon: Vote,
      category: 'governance'
    },
    // Analytics
    {
      title: 'Notification Analytics',
      path: '/notification-analytics',
      icon: BarChart3,
      category: 'analytics'
    },
    // Configuration
    {
      title: 'Configuration',
      icon: Settings,
      children: [
        { title: 'Bank Accounts', path: '/back-office-bank-accounts', icon: Building },
        { title: 'Share Classes', path: '/back-office-share-classes', icon: TrendingUp },
        { title: 'Crypto Wallets', path: '/back-office-crypto-wallets', icon: Bitcoin },
        { title: 'Certificate Templates', path: '/back-office-certificate-templates', icon: FileText },
        { title: 'Communication', path: '/communication-portal', icon: MessageSquare },
      ],
    },
  ];

  const isActive = (path: string | undefined) => {
    if (!path) return false;
    return location.pathname.toLowerCase() === path.toLowerCase();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  // Mobile view with hamburger menu
  if (isMobile) {
    return (
      <div className="border-b bg-card sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Back Office</h2>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] overflow-y-auto">
              <SheetHeader className="mb-6">
                <SheetTitle>Back Office Navigation</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2">
                {navItems.map((item, idx) => {
                  // Handle items with children (dropdown menus)
                  if ('children' in item && item.children) {
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="text-xs font-semibold text-muted-foreground px-3 py-2">
                          {item.title}
                        </div>
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = isActive(child.path);
                          return (
                            <Button
                              key={child.path}
                              variant={childActive ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => handleNavigation(child.path)}
                              className={cn(
                                'justify-start w-full pl-6',
                                !childActive && 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              <ChildIcon className="h-4 w-4 mr-2" />
                              {child.title}
                            </Button>
                          );
                        })}
                      </div>
                    );
                  }
                  
                  // Handle regular items with path
                  if (!item.path) return null;
                  
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <Button
                      key={item.path}
                      variant={active ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleNavigation(item.path)}
                      className={cn(
                        'justify-start w-full',
                        !active && 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.title}
                    </Button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    );
  }

  // Desktop view with horizontal scrollable nav
  return (
    <div className="border-b bg-card sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-hide">
          {navItems.flatMap((item, idx) => {
            // Handle items with children (dropdown menus) - flatten them in desktop view
            if ('children' in item && item.children) {
              return item.children.map((child) => {
                const ChildIcon = child.icon;
                const childActive = isActive(child.path);
                return (
                  <Button
                    key={child.path}
                    variant={childActive ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => navigate(child.path)}
                    className={cn(
                      'flex items-center gap-2 whitespace-nowrap flex-shrink-0',
                      !childActive && 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <ChildIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{child.title}</span>
                  </Button>
                );
              });
            }
            
            // Handle regular items with path
            if (!item.path) return [];
            
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return [
              <Button
                key={item.path}
                variant={active ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap flex-shrink-0',
                  !active && 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.title}</span>
              </Button>
            ];
          })}
        </div>
      </div>
    </div>
  );
}
