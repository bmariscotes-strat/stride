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

  const isDark = theme === "dark";

  return (
    <div className="relative">
      <button
        onClick={handleThemeToggle}
        className="group relative flex items-center justify-between w-16 h-8 rounded-full border-2 transition-all duration-700 ease-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-20 p-0.5"
        style={{
          background: isDark
            ? "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)"
            : "linear-gradient(135deg, #fef3c7 0%, #fde047 50%, #f59e0b 100%)",
          borderColor: isDark ? "#64748b" : "#f59e0b",
          boxShadow: isDark
            ? "0 8px 32px rgba(15, 23, 42, 0.4), inset 0 1px 0 rgba(148, 163, 184, 0.1)"
            : "0 8px 32px rgba(245, 158, 11, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
        }}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      >
        {/* Animated background overlay */}
        <div
          className="absolute inset-0.5 rounded-full transition-all duration-700 ease-out opacity-50"
          style={{
            background: isDark
              ? "radial-gradient(circle at 30% 20%, rgba(147, 197, 253, 0.3) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%)"
              : "radial-gradient(circle at 70% 20%, rgba(254, 240, 138, 0.8) 0%, rgba(251, 191, 36, 0.3) 60%, transparent 100%)",
          }}
        />

        {/* Sliding orb */}
        <div
          className={`relative z-20 flex items-center justify-center w-7 h-7 rounded-full transition-all duration-700 ease-out transform ${
            isDark ? "translate-x-8" : "translate-x-0"
          }`}
          style={{
            background: isDark
              ? "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #fef3c7 50%, #fde047 100%)",
            boxShadow: isDark
              ? "0 6px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
              : "0 6px 20px rgba(251, 191, 36, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
          }}
        >
          {/* Sun Icon */}
          <svg
            className={`w-3.5 h-3.5 transition-all duration-500 ease-out ${
              isDark
                ? "opacity-0 scale-0 rotate-180"
                : "opacity-100 scale-100 rotate-0"
            }`}
            style={{ color: "#f59e0b" }}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
          </svg>

          {/* Moon Icon */}
          <svg
            className={`absolute w-3.5 h-3.5 transition-all duration-500 ease-out ${
              isDark
                ? "opacity-100 scale-100 rotate-0"
                : "opacity-0 scale-0 -rotate-180"
            }`}
            style={{ color: "#e2e8f0" }}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fillRule="evenodd"
              d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Ambient particles/stars */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            isDark ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="absolute top-2 left-3 w-1 h-1 bg-blue-200 rounded-full animate-pulse"
            style={{ animationDuration: "2s" }}
          />
          <div
            className="absolute bottom-2 left-2 w-0.5 h-0.5 bg-indigo-200 rounded-full animate-pulse"
            style={{ animationDuration: "3s", animationDelay: "0.5s" }}
          />
          <div
            className="absolute top-3 right-4 w-0.5 h-0.5 bg-blue-100 rounded-full animate-pulse"
            style={{ animationDuration: "2.5s", animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-3 right-3 w-1 h-1 bg-slate-300 rounded-full animate-pulse"
            style={{ animationDuration: "4s", animationDelay: "1.5s" }}
          />
        </div>

        {/* Light rays for sun mode */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            !isDark ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="absolute top-1 left-1/2 w-0.5 h-2 bg-gradient-to-t from-amber-300 to-transparent rounded-full transform -translate-x-0.5"
            style={{ animation: "pulse 2s ease-in-out infinite" }}
          />
          <div
            className="absolute bottom-1 left-1/2 w-0.5 h-2 bg-gradient-to-b from-amber-300 to-transparent rounded-full transform -translate-x-0.5"
            style={{
              animation: "pulse 2s ease-in-out infinite",
              animationDelay: "0.5s",
            }}
          />
          <div
            className="absolute left-1 top-1/2 w-2 h-0.5 bg-gradient-to-l from-amber-300 to-transparent rounded-full transform -translate-y-0.5"
            style={{
              animation: "pulse 2s ease-in-out infinite",
              animationDelay: "1s",
            }}
          />
          <div
            className="absolute right-1 top-1/2 w-2 h-0.5 bg-gradient-to-r from-amber-300 to-transparent rounded-full transform -translate-y-0.5"
            style={{
              animation: "pulse 2s ease-in-out infinite",
              animationDelay: "1.5s",
            }}
          />
        </div>

        {/* Floating clouds for light mode */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            !isDark ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="absolute top-1 left-2 transition-transform duration-[8s] ease-linear"
            style={{
              animation: "float 8s ease-in-out infinite",
              background:
                "radial-gradient(ellipse 4px 2px, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 60%, transparent 100%)",
              width: "8px",
              height: "4px",
              borderRadius: "50%",
            }}
          />
          <div
            className="absolute bottom-1.5 right-3 transition-transform duration-[10s] ease-linear"
            style={{
              animation: "float 10s ease-in-out infinite 2s",
              background:
                "radial-gradient(ellipse 6px 3px, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.3) 60%, transparent 100%)",
              width: "6px",
              height: "3px",
              borderRadius: "50%",
            }}
          />
          <div
            className="absolute top-2 right-2 transition-transform duration-[12s] ease-linear"
            style={{
              animation: "float 12s ease-in-out infinite 4s",
              background:
                "radial-gradient(ellipse 3px 2px, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.2) 60%, transparent 100%)",
              width: "5px",
              height: "2px",
              borderRadius: "50%",
            }}
          />
        </div>

        <style jsx>{`
          @keyframes float {
            0%,
            100% {
              transform: translateX(0px) translateY(0px);
            }
            33% {
              transform: translateX(2px) translateY(-1px);
            }
            66% {
              transform: translateX(-1px) translateY(1px);
            }
          }
        `}</style>
      </button>
    </div>
  );
}
