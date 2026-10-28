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
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get_user_profile();
      if (response.status === 404) {
        set({ profile: null, loading: false, error: null });
        return;
      }
      if (!response.ok) {
        throw new Error(`Profile service returned ${response.status}. Try again or return to the website.`);
      }
      const profile = await response.json();
      set({ profile, loading: false });
    } catch (error: any) {
      if (error?.status === 404) {
        set({ profile: null, loading: false, error: null });
      } else {
        const message = error?.message || 'Profile service is unavailable. Try again.';
        set({ error: message, loading: false });
      }
    }
  },

  clearProfile: () => {
    set({ profile: null, loading: false, error: null });
  },
}));
