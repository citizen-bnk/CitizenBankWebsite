import React, { useState, useEffect } from 'react';
import { useUserGuardContext } from 'app/auth';
import { useNavigate } from 'react-router-dom';
import { apiClient } from "app";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, CheckCircle2, AlertCircle, ArrowRight, Copy, Home, Terminal, Check } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';

export default function AdminSetupGuide() {
  const navigate = useNavigate();
  const [setupStatus, setSetupStatus] = useState<{ setup_complete: boolean; admin_email: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupToken, setSetupToken] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const response = await apiClient.check_setup_status();
      const data = await response.json();
      setSetupStatus(data);
    } catch (error) {
      console.error('Error checking setup status:', error);
      toast.error('Failed to check system status');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await apiClient.initialize_super_admin({
        email,
        full_name: fullName,
        phone,
        id_number: idNumber,
        setup_token: setupToken,
        user_id: null
      });

      // Check if response is successful
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create super admin');
      }

      const data = await response.json();
      toast.success('Super Admin created successfully!');
      
      // Refresh status
      await checkSetupStatus();
      
      // Clear form
      setEmail('');
      setFullName('');
      setPhone('');
      setIdNumber('');
      setSetupToken('');
    } catch (error: any) {
      console.error('Error initializing admin:', error);
      const errorMessage = error.message || 'Failed to create super admin';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
    toast.success('Copied to clipboard!');
  };

  // Generate production cURL command
  const generateCurlCommand = () => {
    const curlEmail = email || 'admin@citizenhub.co.za';
    const curlName = fullName || 'Admin Name';
    const curlPhone = phone || '+266 5800 0000';
    const curlId = idNumber || '1234567890';
    const curlToken = setupToken || 'YOUR_SETUP_TOKEN';

    return `curl -X POST "https://citizenhub.co.za/api/admin/initialize-super-admin" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "${curlEmail}",
    "full_name": "${curlName}",
    "phone": "${curlPhone}",
    "id_number": "${curlId}",
    "setup_token": "${curlToken}",
    "user_id": null
  }'`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="page-container container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Admin Setup Guide</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Initialize and manage system administrators</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/')} className="text-xs sm:text-sm">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </div>
        </div>

        <div className="max-w-4xl">
          {/* System Status */}
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                {setupStatus?.setup_complete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                )}
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Super Admin Initialized:</span>
                  <Badge variant={setupStatus?.setup_complete ? "default" : "outline"}>
                    {setupStatus?.setup_complete ? 'Yes' : 'No'}
                  </Badge>
                </div>
                {setupStatus?.setup_complete && setupStatus.admin_email && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Admin Email:</span>
                    <span className="text-sm text-muted-foreground font-mono">{setupStatus.admin_email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Setup Process */}
          {!setupStatus?.setup_complete ? (
            <div className="space-y-6">
              {/* Web Form */}
              <Card>
                <CardHeader>
                  <CardTitle>1. Initialize First Super Administrator</CardTitle>
                  <CardDescription>This is a one-time setup to create the first system administrator</CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-6">
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Important:</strong> The setup token is required for security. This should be the value of <code className="text-xs bg-muted px-1 py-0.5 rounded">SUPER_ADMIN_SETUP_TOKEN</code> from your secrets.
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={handleInitializeAdmin} className="space-y-4">
                    <div>
                      <Label htmlFor="setupToken">Setup Token *</Label>
                      <Input
                        id="setupToken"
                        type="password"
                        value={setupToken}
                        onChange={(e) => setSetupToken(e.target.value)}
                        placeholder="Enter SUPER_ADMIN_SETUP_TOKEN"
                        required
                      />
                    </div>

                    <Separator />

                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@citizenhub.co.za"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+266 5800 0000"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="idNumber">ID Number *</Label>
                      <Input
                        id="idNumber"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        placeholder="ID or Passport Number"
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? 'Creating...' : 'Initialize Super Admin'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Production (cURL) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    Production Setup via API
                  </CardTitle>
                  <CardDescription>
                    Use this method to initialize the super admin directly in production
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Step 1: Get Setup Token */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">1</span>
                      Get Your Setup Token
                    </h3>
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertDescription className="text-sm">
                        <strong>Where to find it:</strong>
                        <ol className="list-decimal ml-5 mt-2 space-y-1">
                          <li>Go to Databutton workspace settings (gear icon)</li>
                          <li>Navigate to "Secrets" tab</li>
                          <li>Look for <code className="bg-white px-1 py-0.5 rounded text-xs">SUPER_ADMIN_SETUP_TOKEN</code></li>
                          <li>Copy the token value</li>
                        </ol>
                      </AlertDescription>
                    </Alert>
                  </div>

                  <Separator />

                  {/* Step 2: Fill in Details */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">2</span>
                      Fill in Admin Details (Optional - updates cURL command)
                    </h3>
                    <div className="grid gap-3">
                      <div>
                        <Label htmlFor="curl-email">Email Address</Label>
                        <Input
                          id="curl-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@citizenhub.co.za"
                        />
                      </div>
                      <div>
                        <Label htmlFor="curl-name">Full Name</Label>
                        <Input
                          id="curl-name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Admin Name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="curl-phone">Phone</Label>
                          <Input
                            id="curl-phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+266 5800 0000"
                          />
                        </div>
                        <div>
                          <Label htmlFor="curl-id">ID Number</Label>
                          <Input
                            id="curl-id"
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            placeholder="1234567890"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="curl-token">Setup Token</Label>
                        <Input
                          id="curl-token"
                          type="password"
                          value={setupToken}
                          onChange={(e) => setSetupToken(e.target.value)}
                          placeholder="Paste your setup token"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Step 3: Execute Command */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">3</span>
                      Execute the cURL Command
                    </h3>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono relative">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 text-gray-400 hover:text-white hover:bg-gray-800"
                        onClick={() => copyToClipboard(generateCurlCommand())}
                      >
                        {copiedCurl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <pre className="overflow-x-auto whitespace-pre-wrap break-all pr-12">
                        {generateCurlCommand()}
                      </pre>
                    </div>
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-sm text-yellow-800">
                        <strong>⚠️ Security Note:</strong> This endpoint can only be used once. After super admin creation, additional admins must be created through the Admin Dashboard or create-admin endpoint.
                      </AlertDescription>
                    </Alert>
                  </div>

                  <Separator />

                  {/* Step 4: Register User */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">4</span>
                      Complete User Registration
                    </h3>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="text-sm font-medium">After successful API call:</p>
                      <ol className="list-decimal ml-5 space-y-1 text-sm text-muted-foreground">
                        <li>Go to <a href="https://citizenhub.co.za/auth/sign-up" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">citizenhub.co.za/auth/sign-up</a></li>
                        <li>Register with the <strong>exact same email</strong> used in the API call</li>
                        <li>Complete Stack Auth registration</li>
                        <li>Your account will be automatically linked to super_admin role</li>
                        <li>Access Admin Dashboard at <a href="https://citizenhub.co.za/admin-dashboard" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">/admin-dashboard</a></li>
                      </ol>
                    </div>
                  </div>

                  {/* Troubleshooting */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Troubleshooting</h3>
                    <div className="space-y-3 text-sm">
                      <div className="border-l-4 border-red-500 pl-3 py-1">
                        <p className="font-medium text-red-900">"Invalid setup token"</p>
                        <p className="text-red-700 text-xs">Verify token from Databutton secrets, check for extra spaces</p>
                      </div>
                      <div className="border-l-4 border-orange-500 pl-3 py-1">
                        <p className="font-medium text-orange-900">"Super admin already exists"</p>
                        <p className="text-orange-700 text-xs">Use /admin/create-admin endpoint or Admin Dashboard instead</p>
                      </div>
                      <div className="border-l-4 border-yellow-500 pl-3 py-1">
                        <p className="font-medium text-yellow-900">Database connection errors</p>
                        <p className="text-yellow-700 text-xs">Check DATABASE_URL_ADMIN_PROD is configured in secrets</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Additional Admin Users */}
              <Card>
                <CardHeader>
                  <CardTitle>2. Create Additional Administrators</CardTitle>
                  <CardDescription>Add more super admin users through the Admin Dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Once you've logged in as a super admin, you can create additional administrator accounts:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Navigate to the Admin Dashboard</li>
                      <li>Use the "Manage Users" section</li>
                      <li>Search for existing users and assign the "super_admin" role</li>
                    </ol>
                    <Button onClick={() => navigate('/admin-dashboard')} className="w-full">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Go to Admin Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Back Office Setup */}
              <Card>
                <CardHeader>
                  <CardTitle>3. Create Back Office Members</CardTitle>
                  <CardDescription>Set up staff for document review and operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Back office members handle operational tasks like document verification and subscription management:
                    </p>
                    <div className="bg-muted p-4 rounded-lg space-y-3">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">Step 1</Badge>
                        <div>
                          <p className="text-sm font-medium">Create User Account</p>
                          <p className="text-xs text-muted-foreground">User must first register via the sign-up page</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">Step 2</Badge>
                        <div>
                          <p className="text-sm font-medium">Assign Back Office Role</p>
                          <p className="text-xs text-muted-foreground">Admin assigns "back_office_staff" role via Admin Dashboard → Manage Users</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">Step 3</Badge>
                        <div>
                          <p className="text-sm font-medium">Access Back Office Portal</p>
                          <p className="text-xs text-muted-foreground">User can now access Back Office Dashboard for operational tasks</p>
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => navigate('/back-office-dashboard')} variant="outline" className="w-full">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Go to Back Office Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Role Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Role Definitions</CardTitle>
                  <CardDescription>Understanding different system roles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <h4 className="font-semibold text-sm">Super Admin</h4>
                      <p className="text-xs text-muted-foreground">Full system access. Can manage users, roles, and all features.</p>
                    </div>
                    <div className="border-l-4 border-purple-500 pl-4 py-2">
                      <h4 className="font-semibold text-sm">Back Office Staff</h4>
                      <p className="text-xs text-muted-foreground">Operational access for document review, subscription management, and member verification.</p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-4 py-2">
                      <h4 className="font-semibold text-sm">Board Member</h4>
                      <p className="text-xs text-muted-foreground">Access to board portal, document uploads, and investment opportunities.</p>
                    </div>
                    <div className="border-l-4 border-orange-500 pl-4 py-2">
                      <h4 className="font-semibold text-sm">Investor</h4>
                      <p className="text-xs text-muted-foreground">Access to investment opportunities and portfolio tracking.</p>
                    </div>
                    <div className="border-l-4 border-gray-500 pl-4 py-2">
                      <h4 className="font-semibold text-sm">Customer</h4>
                      <p className="text-xs text-muted-foreground">Basic banking portal access with account and transaction features.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
