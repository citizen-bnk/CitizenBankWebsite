/**
 * RoleGuard component - Protects content based on user roles
 * Shows access denied message if user doesn't have required roles
 */
import { ReactNode } from 'react';
import { useUserRoles } from 'utils/useUserRoles';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export interface Props {
  /** List of roles that are allowed to view the content */
  allowedRoles: string[];
  /** Content to show if user has required role */
  children: ReactNode;
  /** Optional custom message for access denied */
  deniedMessage?: string;
  /** Whether to require ALL roles (AND logic) or ANY role (OR logic). Default is 'any' */
  requireAll?: boolean;
}

export function RoleGuard({ allowedRoles, children, deniedMessage, requireAll = false }: Props) {
  const { roles, loading, hasAnyRole, hasAllRoles } = useUserRoles();
  const navigate = useNavigate();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Check if user has required roles
  const hasAccess = requireAll ? hasAllRoles(allowedRoles) : hasAnyRole(allowedRoles);

  // Show access denied if user doesn't have required roles
  if (!hasAccess) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Alert variant="destructive" className="border-2">
          <ShieldAlert className="h-6 w-6" />
          <AlertTitle className="text-xl font-semibold mb-2">Access Denied</AlertTitle>
          <AlertDescription className="space-y-4">
            <p className="text-base">
              {deniedMessage || 
                `You do not have the required permissions to access this area. This section is restricted to ${allowedRoles.join(', ')} users.`
              }
            </p>
            
            {roles.length > 0 ? (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Your current roles:</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map(role => (
                    <span 
                      key={role} 
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm mt-4">
                You are not assigned any roles yet. Please contact support if you believe this is an error.
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <Button onClick={() => navigate('/')} variant="default">
                Return to Home
              </Button>
              <Button onClick={() => navigate(-1)} variant="outline">
                Go Back
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // User has access, show the protected content
  return <>{children}</>;
}
