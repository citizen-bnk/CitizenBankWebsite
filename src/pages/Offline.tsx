import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import { toast } from "sonner";

/**
 * Offline Page
 * Displays when user loses network connectivity
 */
export default function Offline() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connection restored! You're back online.");
      // Wait a moment for user to see the message, then redirect
      setTimeout(() => {
        navigate(-1);
      }, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [navigate]);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Try to fetch a small resource to check connectivity
    try {
      const response = await fetch("/api/health", { 
        method: "GET",
        cache: "no-cache"
      });
      
      if (response.ok) {
        toast.success("Connection restored!");
        setTimeout(() => {
          navigate(-1);
        }, 500);
      } else {
        toast.error("Still offline. Please check your connection.");
      }
    } catch (error) {
      toast.error("Still offline. Please check your connection.");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-red-600 dark:text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold">No Internet Connection</CardTitle>
          <CardDescription className="text-base mt-2">
            {isOnline 
              ? "Your connection has been restored!"
              : "Please check your network connection and try again."
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-sm mb-2 text-slate-900 dark:text-slate-100">
              Connection Status
            </h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <h3 className="font-semibold text-sm mb-2 text-amber-900 dark:text-amber-100">
              Troubleshooting Tips
            </h3>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
              <li>Check your WiFi or mobile data connection</li>
              <li>Try turning airplane mode off and on</li>
              <li>Restart your router if using WiFi</li>
              <li>Contact your network provider if issues persist</li>
            </ul>
          </div>
        </CardContent>
        
        <CardFooter className="flex gap-3 pt-6">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="flex-1"
            disabled={isRetrying}
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Home
          </Button>
          <Button
            onClick={handleRetry}
            className="flex-1 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600"
            disabled={isRetrying}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? "Checking..." : "Retry"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
