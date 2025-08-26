import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useThemeStore } from "@/stores/ui/theme-store";

/**
 * Hook to sync Zustand store with next-themes
 * Use this in your root layout or main app component
 */
export function useThemeSync() {
  const { theme } = useTheme();
  const { initializeFromNextThemes } = useThemeStore();

  useEffect(() => {
    // Sync zustand store with next-themes on mount and theme changes
    if (theme) {
      initializeFromNextThemes(theme);
    }
  }, [theme, initializeFromNextThemes]);
}
