import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import brain from 'brain';
import { Header } from 'components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Mail, Shield, UserPlus, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@stackframe/react';
import { VerificationModal } from 'components/VerificationModal';

interface InvitationDetails {
  valid: boolean;
  email: string;
  role: string;
  position?: string;
  invited_by_name: string;
  expires_at: string;
  already_accepted: boolean;
}

export default function InviteAcceptance() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const user = useUser();
  
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Load invitation details
  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setLoading(false);
      return;
    }
    
    const validateInvitation = async () => {
      try {
        setLoading(true);
        const response = await brain.validate_invitation({ token });
        const data = await response.json();
        
        // Check if response was successful
        if (!response.ok) {
          setError(data.detail || 'Failed to validate invitation');
          setInvitation(null);
          return;
        }
        
        // If validation response indicates invalid, use the message from backend
        if (!data.valid) {
          setError(data.message || 'This invitation is invalid or has expired.');
          setInvitation(data); // Set invitation so we can access the message property
          return;
        }
        
        // Valid invitation
        setInvitation(data);
        setError(null);
        
        // If user is logged in and invitation is valid, show verification modal
        if (user && data.valid && !data.already_accepted) {
          setShowVerificationModal(true);
        }
      } catch (err: any) {
        console.error('Validation error:', err);
        setError('Unable to validate invitation. Please check your connection and try again.');
        setInvitation(null);
      } finally {
        setLoading(false);
      }
    };
    
    validateInvitation();
  }, [token]); // Only depend on token, not user

  const handleLogin = () => {
    // Navigate to sign-in page with invitation token in state
    navigate(`/auth/sign-in?redirect=/invite?token=${token}`);
  };

  const handleRegister = () => {
    // Navigate to sign-up page with invitation token in state
    navigate(`/auth/sign-up?redirect=/invite?token=${token}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-muted-foreground">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation || !invitation.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 dark:border-red-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-600" />
              <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {error || 'This invitation is invalid or has expired.'}
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (invitation.already_accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <CardTitle className="text-green-600">Already Accepted</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This invitation has already been accepted.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/board-portal')} className="w-full">
              Go to Board Portal
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const roleText = invitation.role === 'board_member' && invitation.position
    ? `${invitation.position.replace('_', ' ')} Board Member`
    : invitation.role.replace('_', ' ');

  const expiresAt = new Date(invitation.expires_at);
  const formattedDate = expiresAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8 pt-[calc(88px+2rem)] sm:pt-[calc(96px+2rem)] lg:pt-[calc(104px+2rem)]">
        <div className="max-w-2xl mx-auto">
          {/* Simple header without protected API calls */}
          <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
            <div className="container mx-auto px-4">
              <div className="flex justify-between items-center py-3 sm:py-4">
                <Link to="/" className="flex items-center gap-2 sm:gap-3">
                  <img 
                    src="https://static.databutton.com/public/4e911b3d-b027-4c6a-8f76-c90e63535892/logo.png" 
                    alt="Citizen Bank" 
                    className="h-8 sm:h-10 md:h-12 w-auto" 
                  />
                  <div className="hidden sm:block">
                    <h1 className="text-sm sm:text-base md:text-xl font-bold bg-gradient-to-r from-orange-600 via-pink-600 to-purple-700 bg-clip-text text-transparent">Citizen Bank</h1>
                    <p className="text-[10px] sm:text-xs text-gray-500">Kingdom of Lesotho</p>
                  </div>
                </Link>
              </div>
            </div>
          </header>
          
          {/* Verification Modal for authenticated users */}
          {user && invitation && token && (
            <VerificationModal
              open={showVerificationModal}
              onClose={() => setShowVerificationModal(false)}
              token={token}
              invitationDetails={{
                email: invitation.email,
                role: invitation.role,
                position: invitation.position,
                invited_by_name: invitation.invited_by_name,
              }}
              onSuccess={() => {
                // Redirect based on role
                const redirectPath = invitation.role === 'board_member' ? '/board-portal' : '/customer-portal';
                navigate(redirectPath);
              }}
            />
          )}
          
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-xl">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">You've Been Invited!</CardTitle>
                <CardDescription className="text-base">
                  <strong>{invitation.invited_by_name}</strong> has invited you to join Citizen Bank
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Role Badge */}
                <div className="flex justify-center">
                  <Badge className="text-base px-4 py-2 bg-blue-600 hover:bg-blue-700">
                    <Shield className="mr-2 h-4 w-4" />
                    {roleText}
                  </Badge>
                </div>

                {/* Invitation Details */}
                <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                  <AlertDescription className="space-y-2">
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <span className="font-semibold">Role:</span>
                      <span className="capitalize">{roleText}</span>
                      
                      <span className="font-semibold">Email:</span>
                      <span>{invitation.email}</span>
                      
                      <span className="font-semibold">Invited by:</span>
                      <span>{invitation.invited_by_name}</span>
                      
                      <span className="font-semibold">Expires:</span>
                      <span>{formattedDate}</span>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Instructions */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold text-sm">Next Steps:</h3>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Sign in to your existing account or create a new one</li>
                    <li>You'll be prompted to verify your invitation with a code</li>
                    <li>Access your board member portal and start collaborating</li>
                  </ol>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button 
                  onClick={handleLogin}
                  className="w-full"
                  size="lg"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In to Accept
                </Button>
                
                <Button 
                  onClick={handleRegister}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Create Account & Accept
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-2">
                  Don't have an account? Create one to accept this invitation
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
