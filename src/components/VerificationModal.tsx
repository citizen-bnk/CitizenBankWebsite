import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from "app";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import Confetti from 'react-confetti';
import { showErrorToast, showSuccessToast, showWarningToast } from 'utils/errorHandling';

interface Props {
  open: boolean;
  onClose: () => void;
  token: string;
  invitationDetails: {
    email: string;
    role: string;
    position?: string;
    invited_by_name: string;
  };
  onSuccess?: () => void;
}

export function VerificationModal({ open, onClose, token, invitationDetails, onSuccess }: Props) {
  const navigate = useNavigate();
  
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [codeExpired, setCodeExpired] = useState(false);
  const [remainingResends, setRemainingResends] = useState<number | null>(null);
  const [resendLimitReached, setResendLimitReached] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });

  // Countdown timer
  useEffect(() => {
    if (!codeSent || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCodeExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [codeSent, timeLeft]);

  // Window resize handler for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRequestCode = async () => {
    try {
      setSendingCode(true);
      const response = await apiClient.generate_verification_code({ token, admin_override: false });
      const data = await response.json();
      
      if (data.success) {
        setCodeSent(true);
        setTimeLeft(300); // 5 minutes
        setCodeExpired(false);
        setVerificationCode('');
        setRemainingResends(data.remaining_resends);
        
        if (data.remaining_resends !== null) {
          if (data.remaining_resends === 0) {
            setResendLimitReached(true);
          }
          showSuccessToast(`Verification code sent! ${data.remaining_resends} resend(s) remaining.`);
        } else {
          showSuccessToast('Verification code sent to your email!');
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || '';
      
      if (errorMsg.includes('Maximum resend attempts')) {
        setResendLimitReached(true);
        showWarningToast('Maximum verification attempts reached. Please contact support for assistance.');
      } else {
        showErrorToast(err, 'Unable to send verification code. Please try again.', 'send');
      }
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) return;
    
    if (verificationCode.length !== 6) {
      showWarningToast('Please enter a valid 6-digit code');
      return;
    }
    
    try {
      setVerifying(true);
      const response = await apiClient.verify_code_and_accept({ token, code: verificationCode });
      const data = await response.json();
      
      if (data.success) {
        setShowConfetti(true);
        
        const roleDisplay = invitationDetails.role === 'board_member' && invitationDetails.position
          ? `${invitationDetails.position.replace('_', ' ')} Board Member`
          : invitationDetails.role.replace('_', ' ');
        
        showSuccessToast(`🎉 Congratulations! You are now a ${roleDisplay}!`);

        // Wait for confetti animation before redirecting
        setTimeout(() => {
          onClose();
          navigate(data.redirect_to || '/board-portal');
        }, 3500);
      }
    } catch (err: any) {
      showErrorToast(err, 'Verification failed. Please check the code and try again.', 'verify');
    } finally {
      setVerifying(false);
    }
  };

  const handleCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const roleDisplay = invitationDetails.role === 'board_member' && invitationDetails.position
    ? `${invitationDetails.position.replace('_', ' ')} Board Member`
    : invitationDetails.role.replace('_', ' ');

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={500}
        />
      )}
      
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Verify Your Invitation
            </DialogTitle>
            <DialogDescription>
              {!codeSent ? (
                <span>Request a verification code to accept your invitation as <strong>{roleDisplay}</strong></span>
              ) : (
                <span>Enter the 6-digit code sent to <strong>{invitationDetails.email}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Invitation Details */}
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
              <AlertDescription className="space-y-1">
                <p><strong>Role:</strong> {roleDisplay}</p>
                <p><strong>Email:</strong> {invitationDetails.email}</p>
                <p><strong>Invited by:</strong> {invitationDetails.invited_by_name}</p>
              </AlertDescription>
            </Alert>

            {!codeSent ? (
              /* Request Code Button */
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Click below to receive a verification code via email. The code will be valid for 90 seconds.
                </p>
                <Button 
                  onClick={handleRequestCode} 
                  disabled={sendingCode}
                  className="w-full"
                >
                  {sendingCode ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Request Verification Code
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Code Input Section */
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Verification Code</label>
                  <Input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={handleCodeInputChange}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest font-mono"
                    disabled={verifying || codeExpired}
                    autoFocus
                  />
                </div>

                {/* Timer */}
                {!codeExpired && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Code expires in {formatTime(timeLeft)}</span>
                  </div>
                )}

                {/* Expired Warning */}
                {codeExpired && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Code has expired. Please request a new code or contact an admin.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Resend Information */}
                {remainingResends !== null && !codeExpired && (
                  <p className="text-xs text-center text-muted-foreground">
                    {remainingResends > 0 ? (
                      `You have ${remainingResends} resend attempt${remainingResends > 1 ? 's' : ''} remaining`
                    ) : (
                      "No resend attempts remaining"
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {codeSent && !codeExpired && (
              <>
                <Button
                  variant="outline"
                  onClick={handleRequestCode}
                  disabled={sendingCode || resendLimitReached}
                  className="w-full sm:w-auto"
                >
                  {sendingCode ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    'Resend Code'
                  )}
                </Button>
                
                <Button
                  onClick={handleVerifyCode}
                  disabled={verifying || verificationCode.length !== 6}
                  className="w-full sm:w-auto"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Verify & Accept
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
