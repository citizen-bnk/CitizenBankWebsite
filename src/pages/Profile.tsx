import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { EditFieldDialog } from "components/EditFieldDialog";
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
import { useUserProfile, calculateProfileCompletion } from 'utils/userProfile';

type UserProfile = {
  user_id: string;
  profile_stages?: Array<'basic' | 'standard' | 'advanced'>;
  has_investment_subscription?: boolean;
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
  const navigate = useNavigate();
  const { profile: profileFromStore, fetchProfile, activeStage, setActiveStage } = useUserProfile();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [boardData, setBoardData] = useState<BoardMemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [section, setSection] = useState<string | null>(null);

  // Fetch profile data
  useEffect(() => {
    fetchProfileData();
    fetchUserRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync store profile to local state
  useEffect(() => {
    if (profileFromStore) {
      setProfile(profileFromStore as UserProfile);
    }
  }, [profileFromStore]);

  const fetchProfileData = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchProfile();
      const profileError = useUserProfile.getState().error;
      if (profileError) setError(profileError);
    } catch (error: any) {
      console.error('❌ [Profile] Error loading profile:', error);
      setError(error.message || 'Failed to load profile');
      toast.error('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const response = await apiClient.get_my_roles();
      const data = await response.json();
      const roles = data.roles || [];
      setUserRoles(roles);
      if (roles.includes('board_member')) {
        const boardResponse = await apiClient.get_my_board_profile();
        if (boardResponse.ok) setBoardData(await boardResponse.json());
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
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

  const availableStages = profile?.profile_stages || ['basic'];
  const canSeeInvestor = !!profile?.has_investment_subscription ||
    userRoles.some(role => ['investor', 'shareholder'].includes(role)) ||
    (availableStages.includes('advanced') && !userRoles.some(role => ['employee', 'back_office', 'admin', 'super_admin', 'board_member'].includes(role)));

  // Show loading state
  if (loading) {
    return <ProfileLoadingState />;
  }

  // Show error state
  if (error) {
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
            <Button variant="outline" className="ml-3" onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Redirect to complete profile if no profile exists
  if (!profile) {
    return <Navigate to="/complete-profile" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
        {/* Header */}
        <ProfileHeader
          fullName={profile.full_name}
          onBackClick={() => navigate(-1)}
        />

        <nav aria-label="Profile sections" className="mb-6 flex flex-wrap gap-3">
          {(['basic', 'standard', 'advanced'] as const).map(stage => {
            const unlocked = availableStages.includes(stage);
            return unlocked ? (
              <Button key={stage} type="button" variant={activeStage === stage ? 'default' : 'outline'}
                aria-current={activeStage === stage ? 'page' : undefined}
                onClick={() => setActiveStage(stage)} className="min-w-28 capitalize">
                {stage} · {calculateProfileCompletion(profile, stage)}%
              </Button>
            ) : null;
          })}
        </nav>

        <section className="rounded-xl border bg-white p-5 mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0"><h2 className="font-semibold text-lg break-words">{profile.full_name}</h2><p className="text-sm text-gray-600 break-all">{profile.email}</p>{profile.phone && <p className="text-sm text-gray-600">{profile.phone}</p>}</div>
          <Button variant="outline" onClick={() => setSection('contact')}>Edit contact details</Button>
        </section>
        <div className="grid sm:grid-cols-2 gap-3">
          {(activeStage === 'basic' ? [['personal','Personal details'],['photo','Photo & introduction'],['settings','Preferences & security']] : activeStage === 'standard' ? [['identity','Identity verification'],['address','Residential address'],...(profile.account_type === 'business' ? [['business','Business details']] : [])] : [['professional','Professional details'],...(canSeeInvestor ? [['investor','Investor details']] : []),...(boardData ? [['board','Board information']] : [])]).map(([key,label]) =>
            <button key={key} onClick={() => setSection(key)} className="flex items-center justify-between gap-4 rounded-xl border bg-white p-5 text-left hover:border-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500"><span className="font-medium">{label}</span><span aria-hidden="true">↗</span></button>)}
        </div>
        <p className="text-xs text-gray-500 mt-4">Additional information is requested when a service needs it.</p>
        <Dialog open={!!section} onOpenChange={open => !open && setSection(null)}>
          <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Profile details</DialogTitle></DialogHeader>
            {section === 'contact' && <ContactInfoSection profile={profile} onEditField={openEditDialog}/>}
            {section === 'personal' && <PersonalInfoSection profile={profile} onEditField={openEditDialog}/>}
            {section === 'identity' && <PersonalInfoSection profile={profile} onEditField={openEditDialog} section="identity"/>}
            {section === 'photo' && <BioSection bio={profile.bio} profilePictureUrl={profile.profile_picture_selfie_url} userName={profile.full_name} onUpdate={fetchProfileData} onPictureUploadSuccess={url => setProfile({...profile,profile_picture_selfie_url:url})}/>}
            {section === 'address' && <AddressInfoSection profile={profile} onEditField={openEditDialog}/>}
            {section === 'professional' && <ProfessionalInfoSection profile={profile} onEditField={openEditDialog} onUpdate={fetchProfileData}/>}
            {section === 'investor' && <InvestorInfoSection profile={profile} onEditField={openEditDialog}/>}
            {section === 'business' && <BusinessInfoSection profile={profile} onEditField={openEditDialog}/>}
            {section === 'board' && boardData && <BoardMemberCard boardData={boardData}/>}
            {section === 'settings' && <SystemSettingsCard/>}
          </DialogContent>
        </Dialog>
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
