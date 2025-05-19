import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';
export type LanguagePreference = 'system' | 'en' | 'uk';

interface SettingsState {
  theme: ThemePreference;
  language: LanguagePreference;
  setTheme(theme: ThemePreference): void;
  setLanguage(language: LanguagePreference): void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'system',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => Storage),
      partialize: ({ theme, language }) => ({ theme, language }),
    },
  ),
);
