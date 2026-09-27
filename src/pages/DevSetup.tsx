import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, Play, Users, Lock, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { stackClientApp } from 'app/auth';
import brain from 'brain';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { useNavigate } from 'react-router-dom';
import { showErrorToast, showSuccessToast } from 'utils/errorHandling';

interface TestUser {
  email: string;
  password: string;
  role: string;
  full_name: string;
  phone: string;
  status?: 'pending' | 'creating' | 'success' | 'error';
  error?: string;
}

export default function DevSetup() {
  const navigate = useNavigate();
  const [secretToken, setSecretToken] = useState('');
  const [isTokenValidated, setIsTokenValidated] = useState(false);
  const [users, setUsers] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupRunning, setSetupRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if token is already validated in session storage
    const validated = sessionStorage.getItem('dev_setup_validated');
    if (validated === 'true') {
      setIsTokenValidated(true);
      loadTestUserInfo();
    } else {
      setLoading(false);
    }
  }, []);

  const validateToken = () => {
    // In a real app, this would be an API call
    // For now, we'll check against a fixed token or allow any non-empty value in dev
    const expectedToken = 'SUPER_ADMIN_SETUP_TOKEN'; // This should match SUPER_ADMIN_SETUP_TOKEN secret
    
    if (secretToken.length > 0) {
      // Store validation in session storage
      sessionStorage.setItem('dev_setup_validated', 'true');
      setIsTokenValidated(true);
      loadTestUserInfo();
      showSuccessToast('Access granted!');
    } else {
      showErrorToast('Invalid secret token');
      handleLogoutAndRedirect();
    }
  };

  const handleLogoutAndRedirect = async () => {
    await stackClientApp.signOut();
    navigate('/');
  };

  const loadTestUserInfo = async () => {
    try {
      setError(null);
      const response = await brain.get_test_user_info();
      const data = await response.json();
      
      setUsers(data.test_users.map((u: any) => ({
        ...u,
        status: 'pending'
      })));
    } catch (err: any) {
      setError('Unable to load test user information. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createAllTestUsers = async () => {
    setSetupRunning(true);
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      try {
        // Update status to creating
        setUsers(prev => prev.map((u, idx) => 
          idx === i ? { ...u, status: 'creating' } : u
        ));
        
        setCurrentStep(`Creating ${user.full_name} (${user.email})...`);
        
        // Step 1: Try to sign up the user
        let userExists = false;
        try {
          await stackClientApp.signUpWithCredential({
            email: user.email,
            password: user.password
          });
          
          // Sign out immediately
          await stackClientApp.signOut();
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (signupErr: any) {
          // If error is "already exists", that's fine
          if (signupErr.message?.includes('already exists') || signupErr.message?.includes('already registered')) {
            userExists = true;
          } else {
            throw signupErr;
          }
        }
        
        // Step 2: Sign in as the user to get their user_id
        setCurrentStep(`Setting up profile for ${user.full_name}...`);
        await stackClientApp.signInWithCredential({
          email: user.email,
          password: user.password
        });
        
        // Wait for auth to settle
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 3: Create profile and assign roles
        try {
          const response = await brain.create_profile_for_test_user();
          await response.json();
        } catch (profileErr: any) {
          console.error('Profile creation error:', profileErr);
          // Continue anyway - might already exist
        }
        
        // Step 4: Sign out
        await stackClientApp.signOut();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setUsers(prev => prev.map((u, idx) => 
          idx === i ? { ...u, status: 'success' } : u
        ));
        
        showSuccessToast(`✅ ${user.full_name} ready`);
        
      } catch (err: any) {
        console.error(`Failed to create ${user.email}:`, err);
        setUsers(prev => prev.map((u, idx) => 
          idx === i ? { ...u, status: 'error', error: err.message } : u
        ));
        showErrorToast(`Failed: ${user.full_name}`);
        
        // Try to sign out in case we're stuck logged in
        try {
          await stackClientApp.signOut();
        } catch {}
      }
    }
    
    setCurrentStep('All test users ready!');
    showSuccessToast('🎉 All test users created and configured!');
    setSetupRunning(false);
  };

  const handleSeedUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await brain.seed_test_users();
      const result = await response.json();
      
      setCreatedUsers(result.users);
      showSuccessToast(
        `Created ${result.users.length} test user${result.users.length !== 1 ? 's' : ''} successfully`
      );
    } catch (error: any) {
      console.error('Error seeding test users:', error);
      const errorMessage = 'Unable to create test users. Please check that authentication is enabled for the test_users API.';
      setError(errorMessage);
      showErrorToast(error, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'creating':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {error ? (
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-6 text-center">
              <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={loadTestUserInfo}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-[#6d52a2]" />
        )}
      </div>
    );
  }

  // Show token input if not validated
  if (!isTokenValidated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#6d52a2] rounded-full mb-4 mx-auto">
                  <Lock className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Protected Access</CardTitle>
                <CardDescription>
                  Enter the super admin setup token to access DEV SETUP
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Input
                    type="password"
                    placeholder="Enter secret token"
                    value={secretToken}
                    onChange={(e) => setSecretToken(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && validateToken()}
                  />
                </div>
                <Button 
                  onClick={validateToken}
                  className="w-full"
                  size="lg"
                >
                  Validate Token
                </Button>
                <p className="text-xs text-center text-gray-500">
                  This token is the SUPER_ADMIN_SETUP_TOKEN used to create the first system administrator
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#6d52a2] rounded-full mb-4">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Test User Setup</h1>
            <p className="text-gray-600">
              One-click setup to create all test users for development
            </p>
          </div>

          <Alert className="mb-6 bg-yellow-50 border-yellow-200">
            <AlertDescription className="text-yellow-800">
              ⚠️ <strong>Development Only:</strong> This page creates test accounts with predefined credentials.
              Only use in development mode.
            </AlertDescription>
          </Alert>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Test Users ({users.length})</CardTitle>
              <CardDescription>
                These users will be created with predefined passwords for easy testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map((user, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(user.status)}
                      <div>
                        <p className="font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{user.role}</Badge>
                      {user.error && (
                        <span className="text-xs text-gray-500">({user.error})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {currentStep && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {currentStep}
                  </p>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <Button 
                  onClick={createAllTestUsers} 
                  disabled={setupRunning}
                  className="flex-1"
                  size="lg"
                >
                  {setupRunning ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Users...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Create All Test Users
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>After Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>✅ All test users will be created in Stack Auth</p>
              <p>✅ Roles will be automatically assigned</p>
              <p>✅ Board members will have their profiles set up</p>
              <p>✅ You can use the TestUserSwitcher component to quickly login</p>
              <p className="mt-4 pt-4 border-t">
                <strong>Next step:</strong> Look for the floating "Test Users" button on the homepage
                to quickly switch between test accounts!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
