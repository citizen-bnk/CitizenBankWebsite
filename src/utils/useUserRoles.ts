import { useUser } from '@stackframe/react';
import { apiClient } from 'app';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRolesResponse } from 'types';
import { accessError } from './accessError';

const ROLES_QUERY_KEY = 'userRoles';

export function useUserRoles() {
  const user = useUser();
  const queryClient = useQueryClient();

  const {
    data: assignedRoles = [],
    isLoading: loading,
    error,
  } = useQuery<string[], Error>({
    queryKey: [ROLES_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user || !user.id) {
        return []; // Return empty array if no user
      }
      const response = await apiClient.get_my_roles().catch(async cause => { throw await accessError(cause); });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.detail === 'string' ? body.detail : 'Failed to load user roles.');
      }
      const data: UserRolesResponse = await response.json();
      return Array.isArray(data.roles) ? data.roles : [];
    },
    // Only fetch if there is a user
    enabled: !!user && !!user.id,
    // Refresh permissions when returning from another Citizen service.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    // Keep data fresh in the background, but not too often
    refetchIntervalInBackground: false,
    // Retry failed requests up to 2 times
    retry: 2,
  });

  const roles = error ? [] : assignedRoles;

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
    void queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY, user?.id] });
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
