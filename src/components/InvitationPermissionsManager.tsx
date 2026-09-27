import { useState, useEffect } from 'react';
import { apiClient } from "app";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Save, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { showErrorToast, showSuccessToast } from 'utils/errorHandling';

interface InvitationPermission {
  role_name: string;
  can_invite_roles: string[];
  created_at?: string;
  updated_at?: string;
}

interface Role {
  role_name: string;
  role_description?: string;
}

export function InvitationPermissionsManager() {
  const [permissions, setPermissions] = useState<InvitationPermission[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all roles
      const rolesResponse = await apiClient.list_all_roles();
      const rolesData = await rolesResponse.json();
      setAllRoles(rolesData || []);
      
      // Load existing permissions
      const permissionsResponse = await apiClient.list_invitation_permissions();
      const permissionsData = await permissionsResponse.json();
      setPermissions(permissionsData.permissions || []);
      
    } catch (error: any) {
      console.error('Error loading invitation permissions:', error);
      const errorMsg = error?.message || error?.detail || "Failed to load permissions";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (roleName: string, targetRole: string) => {
    setPermissions(prev => {
      const updated = prev.map(perm => {
        if (perm.role_name === roleName) {
          const canInviteRoles = perm.can_invite_roles || [];
          const hasPermission = canInviteRoles.includes(targetRole);
          
          return {
            ...perm,
            can_invite_roles: hasPermission
              ? canInviteRoles.filter(r => r !== targetRole)
              : [...canInviteRoles, targetRole]
          };
        }
        return perm;
      });
      
      // If this role doesn't exist yet, create it
      if (!updated.find(p => p.role_name === roleName)) {
        updated.push({
          role_name: roleName,
          can_invite_roles: [targetRole]
        });
      }
      
      return updated;
    });
    setHasChanges(true);
  };

  const canInvite = (roleName: string, targetRole: string): boolean => {
    const perm = permissions.find(p => p.role_name === roleName);
    return perm?.can_invite_roles?.includes(targetRole) || false;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.update_invitation_permissions(
        { permissions }
      );
      
      showSuccessToast('Permissions updated successfully');
      setHasChanges(false);
      
      // Reload to get updated timestamps
      await loadData();
      
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      showErrorToast(error, 'Unable to save permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleDisplayName = (roleName: string) => {
    return roleName.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getPermissionCount = (roleName: string): number => {
    const perm = permissions.find(p => p.role_name === roleName);
    return perm?.can_invite_roles?.length || 0;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#6d52a2]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button onClick={loadData} className="mt-4" variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter out super_admin from the source roles (they can always invite everyone)
  const configurableRoles = allRoles.filter(r => r.role_name !== 'super_admin');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Invitation Permissions
            </CardTitle>
            <CardDescription>
              Control which roles can invite other roles. Super Admin can always invite all roles.
            </CardDescription>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Check the boxes to allow a role to send invitations for specific roles. 
            Changes are saved when you click "Save Changes".
          </AlertDescription>
        </Alert>

        {/* Permission Matrix */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Role
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100" colSpan={allRoles.length}>
                    Can Invite
                  </th>
                </tr>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                    {/* Empty header for role name column */}
                  </th>
                  {allRoles.map(role => (
                    <th key={role.role_name} className="px-2 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400">
                      <div className="transform -rotate-45 origin-center whitespace-nowrap">
                        {getRoleDisplayName(role.role_name)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Super Admin Row (Read-only) */}
                <tr className="bg-blue-50 dark:bg-blue-950/20">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      Super Admin
                      <Badge variant="secondary" className="bg-blue-600 text-white">
                        ALL ROLES
                      </Badge>
                    </div>
                  </td>
                  {allRoles.map(role => (
                    <td key={role.role_name} className="px-2 py-3 text-center">
                      <Checkbox checked={true} disabled />
                    </td>
                  ))}
                </tr>

                {/* Configurable Roles */}
                {configurableRoles.map(sourceRole => (
                  <tr key={sourceRole.role_name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        {getRoleDisplayName(sourceRole.role_name)}
                        {getPermissionCount(sourceRole.role_name) > 0 && (
                          <Badge variant="outline">
                            {getPermissionCount(sourceRole.role_name)} roles
                          </Badge>
                        )}
                      </div>
                    </td>
                    {allRoles.map(targetRole => (
                      <td key={targetRole.role_name} className="px-2 py-3 text-center">
                        <Checkbox
                          checked={canInvite(sourceRole.role_name, targetRole.role_name)}
                          onCheckedChange={() => togglePermission(sourceRole.role_name, targetRole.role_name)}
                          disabled={saving}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2">Current Permissions Summary</h4>
          <div className="space-y-2">
            {configurableRoles.map(role => {
              const count = getPermissionCount(role.role_name);
              const invitableRoles = permissions.find(p => p.role_name === role.role_name)?.can_invite_roles || [];
              
              return (
                <div key={role.role_name} className="text-sm">
                  <span className="font-medium">{getRoleDisplayName(role.role_name)}:</span>
                  {count === 0 ? (
                    <span className="text-gray-500 ml-2">Cannot invite anyone</span>
                  ) : (
                    <span className="ml-2">
                      Can invite {invitableRoles.map(r => getRoleDisplayName(r)).join(', ')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {hasChanges && (
          <div className="flex justify-end pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadData} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
