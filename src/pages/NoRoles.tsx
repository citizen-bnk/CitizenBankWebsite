import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

/**
 * NoRoles Page
 * Displays when user has no roles assigned and tries to access protected resources
 */
export default function NoRoles() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Access Not Configured</CardTitle>
          <CardDescription className="text-base mt-2">
            Your account doesn't have the necessary permissions to access this area.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-sm mb-2 text-slate-900 dark:text-slate-100">
              What does this mean?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You currently don't have any roles assigned to your account. Roles determine which features and areas of the platform you can access.
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
              What should you do?
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>Contact your system administrator</li>
              <li>Request appropriate role assignment</li>
              <li>Verify your account status</li>
            </ul>
          </div>
        </CardContent>
        
        <CardFooter className="flex gap-3 pt-6">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button
            onClick={() => navigate("/")}
            className="flex-1 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
