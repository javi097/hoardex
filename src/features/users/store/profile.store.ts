import { create } from 'zustand';
import type { Profile } from '@/interfaces/user.interface';

export interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  setProfile: (profile: Profile | null) => void;
  updateProfile: (partial: Partial<Profile>) => void;
  setIsLoading: (isLoading: boolean) => void;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: false,
  setProfile: (profile) => set({ profile, isLoading: false }),
  updateProfile: (partial) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...partial } : null,
    })),
  setIsLoading: (isLoading) => set({ isLoading }),
  clearProfile: () => set({ profile: null, isLoading: false }),
}));
