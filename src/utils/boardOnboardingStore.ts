import { create } from "zustand";

interface BoardOnboardingStore {
  showBoardOnboarding: boolean;
  isIncomplete: boolean; // true if board onboarding is incomplete for this user
  setShowBoardOnboarding: (open: boolean) => void;
  setIncomplete: (incomplete: boolean) => void;
}

export const useBoardOnboardingStore = create<BoardOnboardingStore>((set) => ({
  showBoardOnboarding: false,
  isIncomplete: false,
  setShowBoardOnboarding: (open) => set({ showBoardOnboarding: open }),
  setIncomplete: (incomplete) => set({ isIncomplete: incomplete }),
}));
