import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserPreferences, BudgetBand, TimeWindow, MoodTag } from '@/types/preferences';

export interface PreferencesState {
  // Current preferences
  budgetBand: BudgetBand | null;
  moodTags: MoodTag[];
  timeWindow: TimeWindow | null;

  // UI state
  isSubmitting: boolean;
  validationErrors: Record<string, string>;

  // Actions
  setBudgetBand: (budget: BudgetBand) => void;
  toggleMoodTag: (tag: MoodTag) => void;
  setTimeWindow: (time: TimeWindow) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setValidationErrors: (errors: Record<string, string>) => void;
  clearValidationErrors: () => void;
  resetPreferences: () => void;
  clearPersistedData: () => void;
  getPreferences: () => Partial<UserPreferences>;
  isValid: () => boolean;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      // Initial state
      budgetBand: null,
      moodTags: [],
      timeWindow: null,
      isSubmitting: false,
      validationErrors: {},

      // Actions
      setBudgetBand: (budget: BudgetBand) => {
        set({ budgetBand: budget });
        // Clear budget-related validation errors
        const errors = get().validationErrors;
        if (errors.budgetBand) {
          const { budgetBand, ...rest } = errors;
          set({ validationErrors: rest });
        }
      },

      toggleMoodTag: (tag: MoodTag) => {
        const currentTags = get().moodTags;
        const newTags = currentTags.includes(tag)
          ? currentTags.filter(t => t !== tag)
          : [...currentTags, tag];

        set({ moodTags: newTags });

        // Clear mood-related validation errors if we have at least one tag
        if (newTags.length > 0) {
          const errors = get().validationErrors;
          if (errors.moodTags) {
            const { moodTags, ...rest } = errors;
            set({ validationErrors: rest });
          }
        }
      },

      setTimeWindow: (time: TimeWindow) => {
        set({ timeWindow: time });
        // Clear time-related validation errors
        const errors = get().validationErrors;
        if (errors.timeWindow) {
          const { timeWindow, ...rest } = errors;
          set({ validationErrors: rest });
        }
      },

      setSubmitting: (isSubmitting: boolean) => {
        set({ isSubmitting });
      },

      setValidationErrors: (errors: Record<string, string>) => {
        set({ validationErrors: errors });
      },

      clearValidationErrors: () => {
        set({ validationErrors: {} });
      },

      resetPreferences: () => {
        set({
          budgetBand: null,
          moodTags: [],
          timeWindow: null,
          isSubmitting: false,
          validationErrors: {}
        });
      },

      clearPersistedData: () => {
        // Clear localStorage data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('preferences-storage');
        }
        // Reset store state
        set({
          budgetBand: null,
          moodTags: [],
          timeWindow: null,
          isSubmitting: false,
          validationErrors: {}
        });
      },

      getPreferences: (): Partial<UserPreferences> => {
        const { budgetBand, moodTags, timeWindow } = get();
        return {
          ...(budgetBand && { budgetBand }),
          ...(moodTags.length > 0 && { moodTags }),
          ...(timeWindow && { timeWindow })
        };
      },

      isValid: (): boolean => {
        const { budgetBand, moodTags, timeWindow } = get();
        return !!(budgetBand && moodTags.length > 0 && timeWindow);
      }
    }),
    {
      name: 'preferences-storage',
      // Only persist the preferences data, not UI state
      partialize: (state) => ({
        budgetBand: state.budgetBand,
        moodTags: state.moodTags,
        timeWindow: state.timeWindow
      }),
    }
  )
);