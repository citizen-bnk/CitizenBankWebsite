import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@stackframe/react';
import brain from 'brain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResponsiveTable } from 'components/ResponsiveTable';
import { DataCard } from 'components/DataCard';
import { Header } from 'components/Header';
import { Footer } from 'components/Footer';
import { apiClient } from 'app';
import { toast } from 'sonner';
import { Search, UserX, UserCheck, ArrowLeft, Shield, AlertTriangle, MoreVertical, Lock, Unlock, Eye, KeyRound, UserCog, Trash2, Mail, Clock, Activity, Users, UserPlus, DollarSign } from 'lucide-react';
import type { UserListItem, RoleInfo } from '../apiclient/data-contracts';
import { useUserRoles } from 'utils/useUserRoles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from "@/lib/utils";

interface UserDetailData extends UserListItem {
  roles?: string[];
  account_type?: string;
}

// Helper function to get user type badge
const getUserTypeBadge = (user: UserListItem) => {
  // Check if user_id starts with 'temp_' (invited but not registered)
  if (user.user_id.startsWith('temp_')) {
    return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Invited</Badge>;
  }
  
  // Check if user_id starts with 'test_' (test user)
  if (user.user_id.startsWith('test_')) {
    return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Test User</Badge>;
  }
  
  // Regular registered user
  return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Registered</Badge>;
};

type ActionType = 'suspend' | 'restore' | 'view' | 'reset_password' | 'assign_role' | 'delete' | 'send_reminder';

interface ActionDialogState {
  open: boolean;
  type: ActionType | null;
  user: UserListItem | null;
}

interface RoleManagementState {
  open: boolean;
  user: UserListItem | null;
  userRoles: string[];
  availableRoles: RoleInfo[];
  loading: boolean;
}

const formatLastLogin = (lastLogin: string | null) => {
  if (!lastLogin) return "Never";
  
  const loginDate = new Date(lastLogin);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - loginDate.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
  
  return loginDate.toLocaleDateString();
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const user = useUser();
  const { isSuperAdmin, loading: rolesLoading } = useUserRoles();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [lastLoginFilter, setLastLoginFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    online: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [actionDialog, setActionDialog] = useState<ActionDialogState>({
    open: false,
    type: null,
    user: null
  });
  const [actionReason, setActionReason] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const pageSize = 20;

  // User detail modal
  const [selectedUser, setSelectedUser] = useState<UserDetailData | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Suspend modal
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [suspending, setSuspending] = useState(false);

  // Reactivate modal
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  // Role management modal
  const [roleManagement, setRoleManagement] = useState<RoleManagementState>({
    open: false,
    user: null,
    userRoles: [],
    availableRoles: [],
    loading: false
  });

  useEffect(() => {
    if (!rolesLoading && !isSuperAdmin) {
      setShowAccessDialog(true);
    }
  }, [rolesLoading, isSuperAdmin]);

  useEffect(() => {
    if (!rolesLoading && isSuperAdmin) {
      loadUsers();
    }
  }, [page, statusFilter, userTypeFilter, roleFilter, lastLoginFilter, isSuperAdmin, rolesLoading]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = { page, page_size: pageSize };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await apiClient.list_all_users(params);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        if (response.status === 403) {
          setError('Access denied. You need super admin permissions to view users. Please contact an administrator.');
        } else {
          setError(errorData.detail || 'Failed to load users');
        }
        setUsers([]);
        setTotalUsers(0);
        return;
      }
      
      const data = await response.json();
      
      let filteredUsers = data.users || [];
      
      // Client-side filter by user type
      if (userTypeFilter !== 'all') {
        filteredUsers = filteredUsers.filter((u: UserListItem) => {
          if (userTypeFilter === 'invited') return u.user_id.startsWith('temp_');
          if (userTypeFilter === 'test') return u.user_id.startsWith('test_');
          if (userTypeFilter === 'registered') return !u.user_id.startsWith('temp_') && !u.user_id.startsWith('test_');
          return true;
        });
      }

      // Client-side filter by role
      if (roleFilter !== 'all') {
        filteredUsers = filteredUsers.filter((u: UserListItem) => 
          u.user_roles?.includes(roleFilter)
        );
      }

      // Client-side filter by last login
      if (lastLoginFilter !== 'all') {
        const now = new Date();
        filteredUsers = filteredUsers.filter((u: UserListItem) => {
          if (lastLoginFilter === 'never') return !u.last_login_at;
          if (!u.last_login_at) return false;
          
          const lastLogin = new Date(u.last_login_at);
          const daysDiff = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
          
          if (lastLoginFilter === '7days') return daysDiff <= 7;
          if (lastLoginFilter === '30days') return daysDiff <= 30;
          if (lastLoginFilter === '90days') return daysDiff <= 90;
          return true;
        });
      }

      // Client-side search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredUsers = filteredUsers.filter((u: UserListItem) => 
          u.email?.toLowerCase().includes(query) ||
          u.display_name?.toLowerCase().includes(query) ||
          u.id_number?.toLowerCase().includes(query)
        );
      }

      // Calculate stats
      const allUsers = data.users || [];
      setStats({
        total: allUsers.length,
        active: allUsers.filter((u: UserListItem) => !u.is_suspended).length,
        suspended: allUsers.filter((u: UserListItem) => u.is_suspended).length,
        online: allUsers.filter((u: UserListItem) => u.is_online).length
      });
      
      setUsers(filteredUsers);
      setTotalUsers(filteredUsers.length);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('Failed to load users. Please try again.');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      toast.error('Please enter at least 2 characters to search');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.search_users({ q: searchQuery, page: 1, page_size: pageSize });
      const data = await response.json();
      
      setUsers(data.users || []);
      setTotalUsers(data.total || 0);
      setPage(1);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (clickedUser: UserListItem) => {
    try {
      // Get full user details
      const response = await apiClient.get_user_profile_by_id(clickedUser.user_id);
      const userData = await response.json();
      
      setSelectedUser({
        ...clickedUser,
        roles: [] // TODO: Fetch user roles when endpoint is available
      });
      setShowUserModal(true);
    } catch (error) {
      console.error('Failed to load user details:', error);
      toast.error('Failed to load user details');
    }
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;
    
    if (!suspendReason.trim() || suspendReason.length < 10) {
      toast.error('Suspension reason must be at least 10 characters');
      return;
    }

    if (!secretKey.trim()) {
      toast.error('Secret key is required');
      return;
    }

    try {
      setSuspending(true);
      const response = await apiClient.suspend_user(
        { userId: selectedUser.user_id },
        { reason: suspendReason },
        { headers: { 'x-secret-key': secretKey } }
      );
      
      if (response.ok) {
        toast.success('User suspended successfully');
        setShowSuspendModal(false);
        setShowUserModal(false);
        setSuspendReason('');
        setSecretKey('');
        loadUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to suspend user');
      }
    } catch (error) {
      console.error('Suspension failed:', error);
      toast.error('Failed to suspend user');
    } finally {
      setSuspending(false);
    }
  };

  const handleReactivate = async () => {
    if (!selectedUser) return;

    if (!secretKey.trim()) {
      toast.error('Secret key is required');
      return;
    }

    try {
      setReactivating(true);
      const response = await apiClient.reactivate_user(
        { userId: selectedUser.user_id },
        { headers: { 'x-secret-key': secretKey } }
      );
      
      if (response.ok) {
        toast.success('User reactivated successfully');
        setShowReactivateModal(false);
        setShowUserModal(false);
        setSecretKey('');
        loadUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to reactivate user');
      }
    } catch (error) {
      console.error('Reactivation failed:', error);
      toast.error('Failed to reactivate user');
    } finally {
      setReactivating(false);
    }
  };

  const openActionDialog = (type: ActionType, user: UserListItem) => {
    if (type === 'view') {
      // Navigate to detail page with query parameter
      navigate(`/admin-user-detail?userId=${user.user_id}`);
      return;
    }
    setActionDialog({ open: true, type, user });
    setActionReason('');
  };

  const closeActionDialog = () => {
    setActionDialog({ open: false, type: null, user: null });
    setActionReason('');
  };

  const handleAction = async () => {
    if (!actionDialog.user || !actionDialog.type) return;

    // For suspend and restore, require secret key
    if (['suspend', 'restore'].includes(actionDialog.type) && !secretKey) {
      toast.error('Secret key is required for this action');
      return;
    }

    // For suspend, require reason
    if (actionDialog.type === 'suspend' && !actionReason.trim()) {
      toast.error('Please provide a reason for suspending this account');
      return;
    }

    setActionProcessing(true);
    try {
      switch (actionDialog.type) {
        case 'suspend':
          await apiClient.suspend_user(
            { userId: actionDialog.user.user_id },
            { reason: actionReason },
            { headers: { 'x-secret-key': secretKey } }
          );
          toast.success('User account suspended successfully');
          break;
        case 'restore':
          await apiClient.reactivate_user(
            { userId: actionDialog.user.user_id },
            { headers: { 'x-secret-key': secretKey } }
          );
          toast.success('User account restored successfully');
          break;
        case 'send_reminder':
          const reminderResponse = await apiClient.send_profile_completion_reminder({ userId: actionDialog.user.user_id });
          if (reminderResponse.ok) {
            const result = await reminderResponse.json();
            toast.success('Profile completion reminder sent successfully');
          } else {
            const error = await reminderResponse.json();
            toast.error(error.detail || 'Failed to send reminder');
          }
          break;
        case 'view':
          await handleUserClick(actionDialog.user);
          break;
        case 'reset_password':
          try {
            const { stackClientApp } = await import('app/auth');
            const result = await stackClientApp.sendPasswordResetEmail(actionDialog.user.email);
            if (result.status === 'success') {
              toast.success('Password reset email sent successfully');
            } else {
              toast.error('Failed to send password reset email');
            }
          } catch (err) {
            console.error('Password reset error:', err);
            toast.error('Failed to send password reset email');
          }
          break;
        case 'assign_role':
          // Open role management dialog instead of navigating
          await openRoleManagement(actionDialog.user);
          break;
        case 'delete':
          toast.info('Delete account functionality - to be implemented');
          break;
      }
      closeActionDialog();
      if (['suspend', 'restore', 'delete'].includes(actionDialog.type)) {
        loadUsers();
      }
    } catch (error) {
      console.error('Action failed:', error);
      toast.error(`Failed to ${actionDialog.type} user account`);
    } finally {
      setActionProcessing(false);
    }
  };

  const openRoleManagement = async (targetUser: UserListItem) => {
    setRoleManagement({ open: true, user: targetUser, userRoles: [], availableRoles: [], loading: true });
    
    try {
      // Fetch user's current roles and all available roles in parallel
      const [rolesResponse, allRolesResponse] = await Promise.all([
        apiClient.get_user_roles_by_id({ userId: targetUser.user_id }),
        apiClient.list_all_roles()
      ]);
      
      const rolesData = await rolesResponse.json();
      const allRolesData = await allRolesResponse.json();
      
      setRoleManagement(prev => ({
        ...prev,
        userRoles: rolesData.roles || [],
        availableRoles: allRolesData || [],
        loading: false
      }));
    } catch (error) {
      console.error('Failed to load roles:', error);
      toast.error('Failed to load role information');
      setRoleManagement(prev => ({ ...prev, loading: false }));
    }
  };

  const closeRoleManagement = () => {
    setRoleManagement({
      open: false,
      user: null,
      userRoles: [],
      availableRoles: [],
      loading: false
    });
  };

  const toggleRole = async (roleName: string) => {
    try {
      const hasRole = roleManagement.userRoles.includes(roleName);
      
      if (hasRole) {
        // Remove role
        const response = await apiClient.remove_role({
          user_id: roleManagement.user.user_id,
          role_name: roleName
        });
        
        if (response.ok) {
          const data = await response.json();
          setRoleManagement(prev => ({ ...prev, userRoles: data.roles }));
          toast.success(`Removed ${roleName} role`);
        } else {
          const errorData = await response.json();
          toast.error(errorData.detail || 'Failed to remove role');
        }
      } else {
        // Assign role
        const response = await apiClient.assign_role({
          user_id: roleManagement.user.user_id,
          role_name: roleName
        });
        
        if (response.ok) {
          const data = await response.json();
          setRoleManagement(prev => ({ ...prev, userRoles: data.roles }));
          toast.success(`Assigned ${roleName} role`);
        } else {
          const errorData = await response.json();
          toast.error(errorData.detail || 'Failed to assign role');
        }
      }
    } catch (error) {
      console.error('Failed to toggle role:', error);
      toast.error('Failed to update role');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProfileCompletionBadge = (percentage: number) => {
    if (percentage >= 100) {
      return <Badge variant="default" className="bg-green-600">Complete</Badge>;
    } else if (percentage >= 70) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">{percentage}%</Badge>;
    } else {
      return <Badge variant="destructive">{percentage}%</Badge>;
    }
  };

  const tableColumns = [
    { 
      key: 'profile_image', 
      label: '', 
      render: (user: UserListItem) => (
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.profile_image || undefined} alt={user.display_name || user.email} />
          <AvatarFallback>{(user.display_name || user.email).substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      )
    },
    { key: 'email', label: 'Email' },
    { key: 'display_name', label: 'Name' },
    { key: 'id_number', label: 'ID Number' },
    { 
      key: 'user_type', 
      label: 'Type', 
      render: (user: UserListItem) => getUserTypeBadge(user)
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (user: UserListItem) => (
        <div className="flex flex-wrap gap-1">
          {user.user_roles && user.user_roles.length > 0 ? (
            user.user_roles.map((role: string) => (
              <Badge key={role} variant="outline" className="text-xs">
                {role.replace('_', ' ')}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-gray-400">No roles</span>
          )}
        </div>
      )
    },
    { 
      key: 'profile_completion', 
      label: 'Profile', 
      render: (user: UserListItem) => (
        <div className="flex items-center gap-2">
          {getProfileCompletionBadge(user.profile_completion_percentage || 0)}
        </div>
      )
    },
    { 
      key: 'last_login', 
      label: 'Last Login', 
      render: (user: UserListItem) => (
        <div className="flex items-center gap-1">
          {user.is_online && (
            <Activity className="h-3 w-3 text-green-500" title="Online now" />
          )}
          <span className="text-sm">{formatLastLogin(user.last_login_at)}</span>
        </div>
      )
    },
    { 
      key: 'created_at', 
      label: 'Registered', 
      render: (user: UserListItem) => formatDate(user.created_at || '') 
    },
    { 
      key: 'is_suspended', 
      label: 'Status', 
      render: (user: UserListItem) => (
        <Badge variant={user.is_suspended ? 'destructive' : 'default'}>
          {user.is_suspended ? 'Suspended' : 'Active'}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user: UserListItem) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>User Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openActionDialog('view', user)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/back-office-subscribe-on-behalf?userId=${user.user_id}`)}>
              <DollarSign className="mr-2 h-4 w-4" />
              Subscribe Shares
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openRoleManagement(user)}>
              <UserCog className="mr-2 h-4 w-4" />
              Manage Roles
            </DropdownMenuItem>
            {(user.profile_completion_percentage || 0) < 100 && (
              <DropdownMenuItem onClick={() => openActionDialog('send_reminder', user)}>
                <Mail className="mr-2 h-4 w-4" />
                Send Profile Reminder
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => openActionDialog('reset_password', user)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Reset Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {user.is_suspended ? (
              <DropdownMenuItem onClick={() => openActionDialog('restore', user)}>
                <Unlock className="mr-2 h-4 w-4" />
                Restore Account
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => openActionDialog('suspend', user)}>
                <Lock className="mr-2 h-4 w-4" />
                Suspend Account
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => openActionDialog('delete', user)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  const totalPages = Math.ceil(totalUsers / pageSize);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Header with Back Button */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/back-office-dashboard')}
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage user accounts, roles, and permissions
              </p>
            </div>
          </div>
        </div>

        {/* Access Denied Dialog */}
        <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-center">Super Admin Access Required</DialogTitle>
              <DialogDescription className="text-center">
                You need Super Admin permissions to access user management.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-sm font-medium mb-1">Option 1: Development</p>
                <p className="text-xs text-muted-foreground">Visit Dev Setup to initialize test users with proper roles</p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-sm font-medium mb-1">Option 2: Production</p>
                <p className="text-xs text-muted-foreground">Sign in with an admin account or contact your system administrator</p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => navigate('/dev-setup')} className="w-full sm:w-auto">
                Go to Dev Setup
              </Button>
              <Button variant="outline" onClick={() => navigate('/auth/sign-in')} className="w-full sm:w-auto">
                Sign In as Admin
              </Button>
              <Button onClick={() => navigate('/')} className="w-full sm:w-auto">
                Return Home
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold mt-1">{stats.active}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Suspended</p>
                  <p className="text-2xl font-bold mt-1">{stats.suspended}</p>
                </div>
                <UserX className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Online Now</p>
                  <p className="text-2xl font-bold mt-1">{stats.online}</p>
                </div>
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by name, email, or ID number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="suspended">Suspended Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="invited">Invited Only</SelectItem>
                <SelectItem value="test">Test Users</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="board_member">Board Member</SelectItem>
                <SelectItem value="investor">Investor</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={lastLoginFilter} onValueChange={setLastLoginFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Last Login" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || statusFilter !== 'all' || userTypeFilter !== 'all' || roleFilter !== 'all' || lastLoginFilter !== 'all') && (
              <Button 
                variant="outline" 
                onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setUserTypeFilter('all');
                    setRoleFilter('all');
                    setLastLoginFilter('all');
                  }}
                >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users ({totalUsers})</CardTitle>
            <CardDescription>Click on a user to view details and manage their account</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-4">
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
                {error.includes('super admin') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => navigate('/admin-setup-guide')}
                  >
                    Go to Admin Setup
                  </Button>
                )}
              </div>
            )}
            {loading && users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            ) : (
              <>
                <ResponsiveTable
                  data={users}
                  columns={tableColumns}
                  keyExtractor={(user) => user.user_id}
                  onRowClick={handleUserClick}
                  mobileCardRenderer={(item) => (
                    <DataCard
                      title={
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={item.profile_image || undefined} alt={item.display_name || item.email} />
                            <AvatarFallback>{(item.display_name || item.email).substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{item.display_name || item.email}</span>
                        </div>
                      }
                      subtitle={item.email}
                      badge={getUserTypeBadge(item)}
                      fields={[
                        { label: 'ID Number', value: item.id_number || 'N/A' },
                        { label: 'Registered', value: formatDate(item.created_at) },
                        { 
                          label: 'Status', 
                          value: (
                            <Badge variant={item.is_suspended ? 'destructive' : 'default'}>
                              {item.is_suspended ? 'Suspended' : 'Active'}
                            </Badge>
                          )
                        },
                      ]}
                      onClick={() => handleUserClick(item)}
                    />
                  )}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || loading}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* User Detail Modal */}
        <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>View and manage user account</DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.profile_image || undefined} alt={selectedUser.display_name || selectedUser.email} />
                    <AvatarFallback className="text-lg">{(selectedUser.display_name || selectedUser.email).substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedUser.display_name || 'N/A'}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm">{selectedUser.display_name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">ID Number</Label>
                    <p className="text-sm">{selectedUser.id_number || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">User ID</Label>
                    <p className="text-sm font-mono text-xs">{selectedUser.user_id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Registered</Label>
                    <p className="text-sm">{formatDate(selectedUser.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={selectedUser.is_suspended ? 'destructive' : 'default'}>
                      {selectedUser.is_suspended ? 'Suspended' : 'Active'}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-sm font-medium mb-2 block">Actions</Label>
                  <div className="flex gap-2">
                    {selectedUser.is_suspended ? (
                      <Button
                        variant="default"
                        onClick={() => setShowReactivateModal(true)}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Restore Account
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        onClick={() => setShowSuspendModal(true)}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Suspend User
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Suspend Modal */}
        <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Suspend User</DialogTitle>
              <DialogDescription>
                This will restrict the user's access to most platform features (banking services remain accessible)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Reason for Suspension *</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter detailed reason (min 10 characters)..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="secret-key">Super Admin Secret Key *</Label>
                <Input
                  id="secret-key"
                  type="password"
                  placeholder="Enter secret key..."
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSuspendModal(false)} disabled={suspending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleSuspend} disabled={suspending}>
                {suspending ? 'Suspending...' : 'Suspend User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reactivate Modal */}
        <Dialog open={showReactivateModal} onOpenChange={setShowReactivateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reactivate User</DialogTitle>
              <DialogDescription>
                This will restore full access to the user's account
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="reactivate-secret-key">Super Admin Secret Key *</Label>
                <Input
                  id="reactivate-secret-key"
                  type="password"
                  placeholder="Enter secret key..."
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReactivateModal(false)} disabled={reactivating}>
                Cancel
              </Button>
              <Button onClick={handleReactivate} disabled={reactivating}>
                {reactivating ? 'Reactivating...' : 'Reactivate User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Action Dialog - for quick actions from dropdown */}
        <Dialog open={actionDialog.open} onOpenChange={closeActionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog.type === 'suspend' && 'Suspend User Account'}
                {actionDialog.type === 'restore' && 'Restore User Account'}
                {actionDialog.type === 'reset_password' && 'Reset User Password'}
                {actionDialog.type === 'send_reminder' && 'Send Profile Reminder'}
                {actionDialog.type === 'delete' && 'Delete User Account'}
              </DialogTitle>
              <DialogDescription>
                {actionDialog.type === 'suspend' && 'This will restrict the user\'s access to most platform features.'}
                {actionDialog.type === 'restore' && 'This will restore full access to the user\'s account.'}
                {actionDialog.type === 'reset_password' && 'A password reset link will be sent to the user\'s email.'}
                {actionDialog.type === 'send_reminder' && 'The user will receive an email reminder to complete their profile.'}
                {actionDialog.type === 'delete' && 'This action cannot be undone. All user data will be permanently deleted.'}
              </DialogDescription>
            </DialogHeader>

            {actionDialog.user && (
              <div className="rounded-lg border bg-muted/50 p-3 mb-4">
                <p className="text-sm font-medium">{actionDialog.user.display_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{actionDialog.user.email}</p>
              </div>
            )}

            <div className="space-y-4">
              {actionDialog.type === 'suspend' && (
                <>
                  <div>
                    <Label htmlFor="action-reason">Reason for Suspension *</Label>
                    <Textarea
                      id="action-reason"
                      placeholder="Enter detailed reason (min 10 characters)..."
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="action-secret-key">Super Admin Secret Key *</Label>
                    <Input
                      id="action-secret-key"
                      type="password"
                      placeholder="Enter secret key..."
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                    />
                  </div>
                </>
              )}

              {actionDialog.type === 'restore' && (
                <div>
                  <Label htmlFor="restore-secret-key">Super Admin Secret Key *</Label>
                  <Input
                    id="restore-secret-key"
                    type="password"
                    placeholder="Enter secret key..."
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                  />
                </div>
              )}

              {actionDialog.type === 'reset_password' && (
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950 p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    The user will receive an email with a secure link to reset their password.
                    The link will expire in 24 hours.
                  </p>
                </div>
              )}

              {actionDialog.type === 'send_reminder' && (
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950 p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    An email reminder will be sent to encourage profile completion.
                  </p>
                </div>
              )}

              {actionDialog.type === 'delete' && (
                <div className="rounded-lg border bg-destructive/10 p-4">
                  <p className="text-sm text-destructive font-semibold mb-2">
                    ⚠️ Warning: This action is permanent and cannot be undone!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All user data, transactions, and history will be permanently deleted.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={closeActionDialog} 
                disabled={actionProcessing}
              >
                Cancel
              </Button>
              <Button 
                variant={['suspend', 'delete'].includes(actionDialog.type || '') ? 'destructive' : 'default'}
                onClick={handleAction} 
                disabled={actionProcessing}
              >
                {actionProcessing ? 'Processing...' : (
                  actionDialog.type === 'suspend' ? 'Suspend User' :
                  actionDialog.type === 'restore' ? 'Restore User' :
                  actionDialog.type === 'reset_password' ? 'Send Reset Link' :
                  actionDialog.type === 'send_reminder' ? 'Send Reminder' :
                  actionDialog.type === 'delete' ? 'Delete Account' : 'Confirm'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Role Management Modal */}
        <Dialog open={roleManagement.open} onOpenChange={(open) => !open && closeRoleManagement()}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage User Roles</DialogTitle>
              <DialogDescription>
                Assign or remove roles for this user. Changes take effect immediately.
              </DialogDescription>
            </DialogHeader>

            {roleManagement.user && (
              <div className="rounded-lg border bg-muted/50 p-3 mb-4">
                <p className="text-sm font-medium">{roleManagement.user.display_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{roleManagement.user.email}</p>
              </div>
            )}

            {roleManagement.loading ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>Loading roles...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-3 block">Available Roles</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select the roles you want to assign to this user
                  </p>
                  
                  {roleManagement.availableRoles.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No roles available in the system
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {roleManagement.availableRoles.map((role) => {
                        const hasRole = roleManagement.userRoles.includes(role.role_name);
                        return (
                          <div
                            key={role.id}
                            className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                          >
                            <Checkbox
                              id={`role-${role.id}`}
                              checked={hasRole}
                              onCheckedChange={() => toggleRole(role.role_name)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`role-${role.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {role.role_name}
                                {hasRole && (
                                  <Badge variant="default" className="ml-2 text-xs">
                                    Active
                                  </Badge>
                                )}
                              </label>
                              {role.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {role.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {roleManagement.userRoles.length > 0 && (
                  <div className="pt-4 border-t">
                    <Label className="text-sm font-medium mb-2 block">Current Roles Summary</Label>
                    <div className="flex flex-wrap gap-2">
                      {roleManagement.userRoles.map((roleName) => (
                        <Badge key={roleName} variant="secondary">
                          <Shield className="h-3 w-3 mr-1" />
                          {roleName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        <Footer />
      </main>
    </div>
  );
}
