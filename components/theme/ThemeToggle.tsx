"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useThemeStore } from "@/stores/ui/theme-store";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme: nextThemesSetTheme } = useTheme();
  const { setTheme: setZustandTheme } = useThemeStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";

    // Update both next-themes and zustand store
    nextThemesSetTheme(newTheme);
    setZustandTheme(newTheme as "light" | "dark", nextThemesSetTheme);
  };

  return (
    <button
      onClick={handleThemeToggle}
      className="bg-primary text-primary-foreground px-4 py-2 rounded"
    >
      {theme === "dark" ? "Light" : "Dark"} mode
    </button>
  );
}
