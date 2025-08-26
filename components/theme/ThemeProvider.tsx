"use client";
import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { useThemeSync } from "@/hooks/ui/useThemeSync";

interface ProvidersProps {
  children: ReactNode;
}

function ThemeSync() {
  useThemeSync();
  return null;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeSync /> {/* Add this line */}
      {children}
    </ThemeProvider>
  );
}
