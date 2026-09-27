import { useNavigate } from "react-router-dom";
import { useUser } from "@stackframe/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home, ArrowLeft, LogIn, UserCircle } from "lucide-react";

interface ErrorPageProps {
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  showPortalButton?: boolean;
  showBackButton?: boolean;
  showLoginButton?: boolean;
}

/**
 * Reusable error page component with contextual navigation options.
 * Automatically shows appropriate navigation based on user authentication status.
 */
export function ErrorPage({
  title = "Page Not Found",
  message = "The page you're looking for doesn't exist or you don't have permission to access it.",
  showHomeButton = true,
  showPortalButton = true,
  showBackButton = true,
  showLoginButton = true,
}: ErrorPageProps) {
  const navigate = useNavigate();
  const user = useUser();
  const isLoggedIn = !!user;

  const handleGoHome = () => {
    navigate("/");
  };

  const handleGoToPortal = () => {
    navigate("/customer-portal");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleLogin = () => {
    navigate("/auth/sign-in");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-lg">
        <CardContent className="pt-12 pb-8 px-6 text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 rounded-full p-6">
              <AlertCircle className="h-16 w-16 text-red-600" />
            </div>
          </div>

          {/* Error Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h1>

          {/* Error Message */}
          <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto">
            {message}
          </p>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {/* Go Back Button */}
            {showBackButton && (
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="w-full sm:w-auto gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            )}

            {/* Home Button */}
            {showHomeButton && (
              <Button
                onClick={handleGoHome}
                variant="outline"
                className="w-full sm:w-auto gap-2"
              >
                <Home className="h-4 w-4" />
                Go to Home
              </Button>
            )}

            {/* Contextual Navigation - Different for logged in vs logged out users */}
            {isLoggedIn ? (
              // Logged in: Show Customer Portal button
              showPortalButton && (
                <Button
                  onClick={handleGoToPortal}
                  className="w-full sm:w-auto gap-2 bg-[#6d52a2] hover:bg-[#8f6ec4]"
                >
                  <UserCircle className="h-4 w-4" />
                  Go to Customer Portal
                </Button>
              )
            ) : (
              // Logged out: Show Login button
              showLoginButton && (
                <Button
                  onClick={handleLogin}
                  className="w-full sm:w-auto gap-2 bg-[#6d52a2] hover:bg-[#8f6ec4]"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Button>
              )
            )}
          </div>

          {/* Additional Help Text */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact support or try again later.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
