import { create } from 'zustand';
import { apiClient } from 'app';
import type { UserProfileResponse } from 'types';
import { calculateProfileCompletion, type ProfileStage } from './profileProgress';
export { calculateProfileCompletion } from './profileProgress';

interface UserProfileStore {
  profile: UserProfileResponse | null;
  activeStage: ProfileStage;
  setActiveStage: (stage: ProfileStage) => void;
  loading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  clearProfile: () => void;
}

export const isProfileComplete = (profile: UserProfileResponse | null): boolean => calculateProfileCompletion(profile) === 100;

export const useUserProfile = create<UserProfileStore>((set) => ({
  profile: null,
  activeStage: 'basic',
  setActiveStage: stage => set({ activeStage: stage }),
  loading: false,
  error: null,

  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get_user_profile();
      if (response.status === 404) {
        set({ profile: null, activeStage: 'basic', loading: false, error: null });
        return;
      }
      if (!response.ok) {
        throw new Error(`Profile service returned ${response.status}. Try again or return to the website.`);
      }
      const profile = await response.json();
      set(state => ({ profile, loading: false, activeStage: profile.profile_stages?.includes(state.activeStage) ? state.activeStage : 'basic' }));
    } catch (error: any) {
      if (error?.status === 404) {
        set({ profile: null, activeStage: 'basic', loading: false, error: null });
      } else {
        const message = error?.message || 'Profile service is unavailable. Try again.';
        set({ error: message, loading: false });
      }
    }
  },

  clearProfile: () => {
    set({ profile: null, activeStage: 'basic', loading: false, error: null });
  },
}));
