import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Copy, Check } from 'lucide-react';
import { stackClientApp } from 'app/auth';
import { useLocation } from 'react-router-dom';
import { showErrorToast, showSuccessToast } from 'utils/errorHandling';

interface TestUser {
  email: string;
  password: string;
  role: string;
  portal: string;
  description: string;
  portalPath: string;
}

const TEST_USERS: TestUser[] = [
  {
    email: 'superadmin@test.citizenbank.co.za',
    password: 'Admin@2024',
    role: 'Super Admin',
    portal: 'Back Office Portal',
    description: 'Full system access - manage everything',
    portalPath: '/back-office-dashboard'
  },
  {
    email: 'staff@test.citizenbank.co.za',
    password: 'Staff@2024',
    role: 'Staff',
    portal: 'Back Office Portal',
    description: 'Back office operations staff',
    portalPath: '/back-office-dashboard'
  },
  {
    email: 'boardchair@test.citizenbank.co.za',
    password: 'Board@2024',
    role: 'Board Member (Chairman)',
    portal: 'Board Portal',
    description: 'Board member with chairman position',
    portalPath: '/board-portal'
  },
  {
    email: 'boardmember@test.citizenbank.co.za',
    password: 'Board@2024',
    role: 'Board Member',
    portal: 'Board Portal',
    description: 'Regular board member',
    portalPath: '/board-portal'
  },
  {
    email: 'customer@test.citizenbank.co.za',
    password: 'Customer@2024',
    role: 'Customer',
    portal: 'Customer Portal',
    description: 'Regular banking customer',
    portalPath: '/customer-portal'
  },
  {
    email: 'investor@test.citizenbank.co.za',
    password: 'Investor@2024',
    role: 'Investor',
    portal: 'Investor Portal',
    description: 'Share investor',
    portalPath: '/invest'
  }
];

interface TestUserSwitcherProps {
  variant?: 'button' | 'floating' | 'inline';
  filterByPortal?: boolean; // If true, only show users relevant to current page
}

export default function TestUserSwitcher({ variant = 'button', filterByPortal = false }: TestUserSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState<string | null>(null);
  const location = useLocation();

  // Filter users based on current page context
  const getFilteredUsers = () => {
    if (!filterByPortal) return TEST_USERS;
    
    const path = location.pathname;
    
    // Determine which portal users to show based on current path
    if (path.includes('/back-office')) {
      return TEST_USERS.filter(u => u.portal === 'Back Office Portal');
    } else if (path.includes('/board')) {
      return TEST_USERS.filter(u => u.portal === 'Board Portal');
    } else if (path.includes('/customer')) {
      return TEST_USERS.filter(u => u.portal === 'Customer Portal');
    } else if (path.includes('/invest')) {
      return TEST_USERS.filter(u => u.portal === 'Investor Portal');
    } else if (path.includes('/auth')) {
      // On auth pages, show all users
      return TEST_USERS;
    }
    
    return TEST_USERS;
  };

  const filteredUsers = getFilteredUsers();

  const handleQuickLogin = async (user: TestUser) => {
    try {
      setLoggingIn(user.email);
      
      // Sign in using Stack Auth
      const result = await stackClientApp.signInWithCredential({
        email: user.email,
        password: user.password
      });

      if (result) {
        showSuccessToast(`Logged in as ${user.role}!`);
        setOpen(false);
        
        // Redirect to portal
        setTimeout(() => {
          window.location.href = user.portalPath;
        }, 500);
      }
    } catch (err: any) {
      showErrorToast(
        err,
        `Login failed: ${err.message || 'Please check credentials'}`
      );
      console.error('Login error:', err);
    } finally {
      setLoggingIn(null);
    }
  };

  const copyToClipboard = (text: string, type: 'email' | 'password', userEmail: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(userEmail);
      setTimeout(() => setCopiedEmail(null), 2000);
    } else {
      setCopiedPassword(userEmail);
      setTimeout(() => setCopiedPassword(null), 2000);
    }
    showSuccessToast(`${type === 'email' ? 'Email' : 'Password'} copied!`);
  };

  const TriggerButton = variant === 'floating' ? (
    <Button
      className="fixed bottom-4 right-4 z-50 shadow-lg"
      size="lg"
      variant="default"
    >
      <Users className="mr-2 h-4 w-4" />
      Test Users
    </Button>
  ) : variant === 'inline' ? (
    <Button variant="secondary" size="sm" className="w-full">
      <Users className="mr-2 h-4 w-4" />
      Quick Login (Test Users)
    </Button>
  ) : (
    <Button variant="outline" size="sm">
      <Users className="mr-2 h-4 w-4" />
      Quick Login (Test Users)
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {TriggerButton}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Test User Accounts {filterByPortal && `- ${filteredUsers[0]?.portal || 'Current Portal'}`}
          </DialogTitle>
          <DialogDescription>
            Click "Quick Login" to instantly sign in as a test user, or copy credentials to use manually.
            <br />
            <span className="text-yellow-600 dark:text-yellow-500 font-semibold">⚠️ Development Only - Not for Production</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {filteredUsers.map((user) => (
            <Card key={user.email} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{user.role}</CardTitle>
                    <CardDescription className="text-xs mt-1">{user.description}</CardDescription>
                  </div>
                  {!filterByPortal && (
                    <Badge variant="outline" className="text-xs">
                      {user.portal}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <div className="flex items-center gap-1">
                    <code className="flex-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                      {user.email}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(user.email, 'email', user.email)}
                      className="h-8 w-8 p-0"
                    >
                      {copiedEmail === user.email ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Password</label>
                  <div className="flex items-center gap-1">
                    <code className="flex-1 text-xs bg-muted p-2 rounded">
                      {user.password}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(user.password, 'password', user.email)}
                      className="h-8 w-8 p-0"
                    >
                      {copiedPassword === user.email ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Quick Login Button */}
                <Button
                  onClick={() => handleQuickLogin(user)}
                  disabled={loggingIn !== null}
                  className="w-full"
                  size="sm"
                >
                  {loggingIn === user.email ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Logging in...
                    </>
                  ) : (
                    `Quick Login as ${user.role}`
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Note:</strong> These test accounts are for development purposes only.
            They provide quick access to different portal views without manual registration.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
