import { create } from 'zustand';
import { apiClient } from 'app';
import type { UserProfileResponse } from 'types';

interface UserProfileStore {
  profile: UserProfileResponse | null;
  loading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  clearProfile: () => void;
}

// Helper function to check if profile is complete
export const isProfileComplete = (profile: UserProfileResponse | null): boolean => {
  if (!profile) return false;
  
  // Check required fields
  const requiredFields = [
    profile.full_name,
    profile.phone,
    profile.id_number,
    profile.country,
    profile.nationality,
  ];
  
  return requiredFields.every(field => field && field.trim().length > 0);
};

// Helper function to calculate profile completion percentage
export const calculateProfileCompletion = (profile: UserProfileResponse | null): number => {
  if (!profile) return 0;
  
  // Define all profile fields to check
  const fields = [
    profile.full_name,
    profile.phone,
    profile.id_number,
    profile.country,
    profile.nationality,
    profile.street_address,
    profile.city,
    profile.postal_code,
    profile.date_of_birth,
    profile.gender,
  ];
  
  const filledFields = fields.filter(field => field && String(field).trim().length > 0).length;
  const percentage = Math.round((filledFields / fields.length) * 100);
  
  return percentage;
};

export const useUserProfile = create<UserProfileStore>((set) => ({
  profile: null,
  loading: false,
  error: null,

  fetchProfile: async () => {
    console.log('🔍 [userProfile] fetchProfile started');
    console.log('🔍 [userProfile] apiClient:', apiClient);
    console.log('🔍 [userProfile] apiClient.get_user_profile:', typeof apiClient.get_user_profile);
    
    set({ loading: true, error: null });
    try {
      console.log('🔍 [userProfile] Calling apiClient.get_user_profile()...');
      const response = await apiClient.get_user_profile();
      console.log('🔍 [userProfile] Got response:', response);
      const profile = await response.json();
      console.log('🔍 [userProfile] Parsed profile:', profile);
      set({ profile, loading: false });
    } catch (error: any) {
      console.error('❌ [userProfile] Error in fetchProfile:', error);
      // If 404, user hasn't completed profile yet
      if (error.status === 404) {
        console.log('ℹ️ [userProfile] 404 error - user has no profile yet');
        set({ profile: null, loading: false, error: null });
      } else {
        console.error('❌ [userProfile] Non-404 error:', error.message);
        set({ error: error.message || 'Failed to load profile', loading: false });
      }
    }
  },

  clearProfile: () => {
    set({ profile: null, loading: false, error: null });
  },
}));
