import { useUser } from '@stackframe/react';
import { apiClient } from 'app';
import { useQuery } from '@tanstack/react-query';
import { UserRolesResponse } from 'types';

const ROLES_QUERY_KEY = 'userRoles';

export function useUserRoles() {
  const user = useUser();

  const {
    data: roles = [],
    isLoading: loading,
    error,
  } = useQuery<string[], Error>({
    queryKey: [ROLES_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user || !user.id) {
        return []; // Return empty array if no user
      }
      try {
        const response = await apiClient.get_my_roles();
        if (!response.ok) {
          throw new Error(`Failed to fetch user roles: ${response.statusText}`);
        }
        const data: UserRolesResponse = await response.json();
        return data.roles;
      } catch (err) {
        console.error('Failed to fetch user roles:', err);
        // Let react-query handle the error state
        throw new Error('Failed to load user roles');
      }
    },
    // Only fetch if there is a user
    enabled: !!user && !!user.id,
    // Cache roles for 2 minutes to reduce redundant API calls
    staleTime: 1000 * 60 * 2, // 2 minutes
    // Don't refetch every time the window is focused
    refetchOnWindowFocus: false,
    // Keep data fresh in the background, but not too often
    refetchIntervalInBackground: false,
    // Retry failed requests up to 2 times
    retry: 2,
    // IMPORTANT: Disable suspense to prevent "component suspended" errors
    suspense: false,
  });

  /**
   * Check if user has a specific role
   */
  const hasRole = (role: string): boolean => {
    return roles.includes(role);
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roleList: string[]): boolean => {
    return roleList.some(role => roles.includes(role));
  };

  /**
   * Check if user has all of the specified roles
   */
  const hasAllRoles = (roleList: string[]): boolean => {
    return roleList.every(role => roles.includes(role));
  };

  const clearCache = () => {
    // Invalidate the query to force a refetch
    // This is handled by react-query's queryClient, but we don't have it here.
    // A full page refresh will also work.
    window.location.reload();
  };

  return {
    roles,
    loading,
    error: error ? error.message : null,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isCustomer: hasRole('customer'),
    isInvestor: hasRole('investor'),
    isBoardMember: hasRole('board_member'),
    isStaff: hasRole('staff'),
    isSuperAdmin: hasRole('super_admin'),
    clearCache,
  };
}
