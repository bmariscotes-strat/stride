// lib/hooks/useDarkMode.ts
import { useState, useEffect } from "react";

export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // Initialize with proper SSR handling
    if (typeof window === "undefined") return false;

    return (
      document.documentElement.classList.contains("dark") ||
      (!document.documentElement.classList.contains("light") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    const checkTheme = (): void => {
      const hasExplicitDark =
        document.documentElement.classList.contains("dark");
      const hasExplicitLight =
        document.documentElement.classList.contains("light");
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

      // If explicit theme is set, use that; otherwise fall back to system preference
      const isDarkMode =
        hasExplicitDark || (!hasExplicitLight && systemPrefersDark);

      setIsDark(isDarkMode);
    };

    // Initial check
    checkTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => checkTheme();
    mediaQuery.addEventListener("change", handleMediaChange);

    // Listen for class changes on documentElement with more specific handling
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          // Small delay to ensure DOM has updated
          setTimeout(checkTheme, 0);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Also listen for storage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "theme" || e.key === "darkMode") {
        checkTheme();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      observer.disconnect();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return isDark;
}
