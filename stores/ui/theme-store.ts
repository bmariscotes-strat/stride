import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface ThemeState {
  selectedTheme: Theme;
  setTheme: (
    theme: Theme,
    nextThemesSetTheme?: (theme: string) => void
  ) => void;
  initializeFromNextThemes: (currentTheme: string | undefined) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      selectedTheme: "system",

      setTheme: (
        theme: Theme,
        nextThemesSetTheme?: (theme: string) => void
      ) => {
        set({ selectedTheme: theme });

        // If next-themes setTheme is provided, use it to apply the theme
        if (nextThemesSetTheme) {
          nextThemesSetTheme(theme);
        }
      },

      initializeFromNextThemes: (currentTheme: string | undefined) => {
        // Only initialize if we don't have a stored theme or if it differs
        const { selectedTheme } = get();
        if (currentTheme && currentTheme !== selectedTheme) {
          // Sync with next-themes if there's a mismatch
          if (["light", "dark", "system"].includes(currentTheme)) {
            set({ selectedTheme: currentTheme as Theme });
          }
        }
      },
    }),
    {
      name: "theme-storage",
      partialize: (state) => ({ selectedTheme: state.selectedTheme }),
    }
  )
);
