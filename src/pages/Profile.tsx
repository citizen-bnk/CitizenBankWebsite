import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserGuardContext } from "app/auth";
import brain from "brain";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { EditFieldDialog } from "components/EditFieldDialog";
import { showErrorToast } from "utils/errorHandling";
import { ProfileCompletionBanner } from "components/ProfileCompletionBanner";
import { ProfileHeader } from "components/ProfileHeader";
import { ProfileLoadingState } from "components/ProfileLoadingState";
import { PersonalInfoSection } from "components/PersonalInfoSection";
import { ContactInfoSection } from "components/ContactInfoSection";
import { AddressInfoSection } from "components/AddressInfoSection";
import { ProfessionalInfoSection } from "components/ProfessionalInfoSection";
import { InvestorInfoSection } from "components/InvestorInfoSection";
import { BusinessInfoSection } from "components/BusinessInfoSection";
import { AccountStatusCard } from "components/AccountStatusCard";
import { UserRolesCard } from "components/UserRolesCard";
import { BoardMemberCard } from "components/BoardMemberCard";
import { SystemSettingsCard } from "components/SystemSettingsCard";
import { BoardMemberProfileSection } from "components/BoardMemberProfileSection";
import { BioSection } from "components/BioSection";
import type { EditingField } from "components/EditableFieldComponent";
import { apiClient } from "app";
import { useUserProfile } from 'utils/userProfile';
import { clearNotificationCache } from 'utils/useNotifications';

type UserProfile = {
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  id_number?: string;
  account_type: 'personal' | 'business';
  status: string;
  created_at: string;
  street_address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  citizenship_status?: string;
  occupation?: string;
  employer?: string;
  linkedin_profile?: string;
  tax_id?: string;
  business_name?: string;
  company_registration_number?: string;
  email_verified?: boolean;
  mobile_verified?: boolean;
  profile_completion_percentage?: number;
  // Profile pictures
  profile_picture_selfie_url?: string;
  profile_picture_half_body_url?: string;
  // CV/Bio fields
  cv_filename?: string;
  bio?: string;
  // Investor fields
  source_of_funds?: string;
  investor_type?: string;
  investment_purpose?: string;
};

type BoardMemberData = {
  board_member_id: string;
  position: string;
  appointed_date: string;
  term_end_date?: string;
  total_shares?: number;
  minimum_investment_shares?: number;
  status: string;
};

const Profile = () => {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();
  const { profile: profileFromStore, loading: profileLoading, fetchProfile } = useUserProfile();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [boardData, setBoardData] = useState<BoardMemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile data
  useEffect(() => {
    console.log('🔍 [Profile] Component mounted, fetching profile data...');
    fetchProfileData();
    fetchUserRoles();
    fetchBoardMemberData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync store profile to local state
  useEffect(() => {
    console.log('🔍 [Profile] profileFromStore changed:', profileFromStore);
    if (profileFromStore) {
      setProfile(profileFromStore as UserProfile);
    }
  }, [profileFromStore]);

  const fetchProfileData = async () => {
    console.log('🔍 [Profile] fetchProfileData called');
    setLoading(true);
    setError(null);
    try {
      // Use the zustand store to fetch profile
      console.log('🔍 [Profile] Calling fetchProfile from store...');
      await fetchProfile();
      console.log('🔍 [Profile] fetchProfile completed, profileFromStore:', profileFromStore);
    } catch (error: any) {
      console.error('❌ [Profile] Error loading profile:', error);
      setError(error.message || 'Failed to load profile');
      toast.error('Failed to load profile. Please try again.');
    } finally {
      console.log('🔍 [Profile] Setting loading to false');
      setLoading(false);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const response = await apiClient.get_my_roles();
      const data = await response.json();
      setUserRoles(data.roles || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchBoardMemberData = async () => {
    try {
      // Check if user has board_member role
      const rolesResponse = await apiClient.get_my_roles();
      const rolesData = await rolesResponse.json();
      const isBoardMember = rolesData.roles?.includes('board_member');
      
      if (isBoardMember) {
        const response = await apiClient.get_my_board_profile();
        const data = await response.json();
        setBoardData(data);
      }
    } catch (error) {
      console.error('Failed to fetch board member data:', error);
      // Not a critical error - user might not be a board member
    }
  };

  // Handle field update
  const handleFieldUpdate = async (fieldName: string, newValue: string) => {
    try {
      const updateData: any = { [fieldName]: newValue };

      const response = await apiClient.update_user_profile(updateData);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to update profile");
      }

      // Read from source of truth to ensure we show the committed DB value
      await fetchProfileData();

      // Close the dialog and notify the user
      setEditingField(null);
      toast.success("Profile updated");
    } catch (error: any) {
      console.error('Error updating field:', fieldName, error);
      // Re-throw the error so EditFieldDialog can handle it
      throw error;
    }
  };

  // Open edit dialog
  const openEditDialog = (field: EditingField) => {
    setEditingField(field);
  };

  // Helper to check if field has value
  const hasValue = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  };

  // Use backend's calculated profile completion percentage for consistency
  const completionPercentage = profile?.profile_completion_percentage || 0;

  // Show loading state
  if (loading) {
    console.log('🔍 [Profile] Rendering loading state');
    return <ProfileLoadingState />;
  }

  // Show error state
  if (error) {
    console.log('🔍 [Profile] Rendering error state:', error);
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-800 font-semibold mb-2">Error Loading Profile</p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <Button onClick={() => {
              setError(null);
              fetchProfileData();
            }}>
              Try Again
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Redirect to complete profile if no profile exists
  if (!profile) {
    console.log('🔍 [Profile] No profile found, redirecting to complete-profile');
    navigate('/complete-profile');
    return <ProfileLoadingState />;
  }

  console.log('🔍 [Profile] Rendering full profile view');
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <ProfileHeader
          fullName={profile.full_name}
          onBackClick={() => navigate(-1)}
        />

        {/* Profile Completion Banner */}
        <ProfileCompletionBanner completionPercentage={completionPercentage} />

        {/* Board Member Profile Section - Prominent for board members */}
        {boardData && (
          <BoardMemberProfileSection 
            bio={profile.bio} 
            profilePictureUrl={profile.profile_picture_selfie_url}
            onUpdate={fetchProfileData} 
          />
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <PersonalInfoSection profile={profile} onEditField={openEditDialog} />

            {/* Bio Section - Available to all users */}
            <BioSection 
              bio={profile.bio}
              profilePictureUrl={profile.profile_picture_selfie_url}
              userName={profile.full_name}
              onUpdate={fetchProfileData}
              onPictureUploadSuccess={(newUrl) => {
                setProfile({ ...profile, profile_picture_selfie_url: newUrl });
                toast.success("Profile picture updated");
              }}
            />

            {/* Contact Information */}
            <ContactInfoSection profile={profile} onEditField={openEditDialog} />

            {/* Address Information */}
            <AddressInfoSection profile={profile} onEditField={openEditDialog} />

            {/* Professional Information */}
            <ProfessionalInfoSection 
              profile={profile} 
              onEditField={openEditDialog}
              onUpdate={fetchProfileData}
            />

            {/* Investor Information - Show if user is investor or has subscriptions */}
            <InvestorInfoSection profile={profile} onEditField={openEditDialog} />

            {/* Business Information - Show if business account */}
            {profile.account_type === 'business' && (
              <BusinessInfoSection profile={profile} onEditField={openEditDialog} />
            )}
          </div>

          {/* Sidebar - 1 column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Account Status */}
            <AccountStatusCard profile={profile} />

            {/* Roles */}
            <UserRolesCard roles={userRoles} />

            {/* Board Member Info (if applicable) */}
            {boardData && (
              <BoardMemberCard boardData={boardData} />
            )}

            {/* System Settings */}
            <SystemSettingsCard />
          </div>
        </div>
      </div>

      {/* Edit Field Dialog */}
      {editingField && (
        <EditFieldDialog
          open={!!editingField}
          onOpenChange={(open) => !open && setEditingField(null)}
          fieldName={editingField.name}
          fieldLabel={editingField.label}
          currentValue={editingField.currentValue}
          fieldType={editingField.type}
          selectOptions={editingField.selectOptions}
          onSave={handleFieldUpdate}
          required={editingField.required}
          description={editingField.description}
        />
      )}

      <Footer />
    </div>
  );
};

export default Profile;
