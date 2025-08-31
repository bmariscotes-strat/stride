"use client";
import React, { useEffect } from "react";
import { Palette, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useUpdateAppearance } from "@/hooks/useUserSettings";
import { useThemeStore, type Theme } from "@/stores/ui/theme-store";

interface AppearanceSectionProps {
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

export default function AppearanceSection({
  sectionRef,
}: AppearanceSectionProps) {
  const { theme, setTheme: nextThemesSetTheme } = useTheme();
  const { selectedTheme, setTheme, initializeFromNextThemes } = useThemeStore();
  const updateAppearance = useUpdateAppearance();

  // Sync with next-themes on mount and when theme changes
  useEffect(() => {
    initializeFromNextThemes(theme);
  }, [theme, initializeFromNextThemes]);

  const handleThemeChange = (theme: Theme) => {
    setTheme(theme, nextThemesSetTheme);
    updateAppearance.mutate({ theme });
  };

  const themeOptions = [
    {
      value: "light" as Theme,
      label: "Light Mode",
      description: "Clean and bright interface",
      icon: Sun,
      preview: "bg-white border-gray-200",
    },
    {
      value: "dark" as Theme,
      label: "Dark Mode",
      description: "Easy on the eyes in low light",
      icon: Moon,
      preview: "bg-gray-900 border-gray-700",
    },
    {
      value: "system" as Theme,
      label: "System Preference",
      description: "Adapts to your system setting",
      icon: Monitor,
      preview: "bg-gradient-to-r from-white to-gray-900 border-gray-400",
    },
  ];

  return (
    <div id="appearance" ref={sectionRef} className="scroll-mt-6">
      <section>
        <div className="pb-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Palette size={20} />
            Appearance
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Customize the look and feel of your interface.
          </p>
        </div>

        <div className="pt-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Theme Preference
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedTheme === option.value;

                  return (
                    <button
                      key={option.value}
                      onClick={() => handleThemeChange(option.value)}
                      className={`relative p-4 border rounded-lg text-left transition-all hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {/* Theme Preview */}
                      <div
                        className={`w-full h-16 rounded-md mb-3 border-2 ${option.preview}`}
                      >
                        <div className="p-2 h-full flex flex-col">
                          <div
                            className={`w-full h-2 rounded mb-1 ${
                              option.value === "light"
                                ? "bg-gray-100"
                                : option.value === "dark"
                                  ? "bg-gray-800"
                                  : "bg-gradient-to-r from-gray-100 to-gray-800"
                            }`}
                          ></div>
                          <div
                            className={`w-3/4 h-2 rounded ${
                              option.value === "light"
                                ? "bg-gray-200"
                                : option.value === "dark"
                                  ? "bg-gray-700"
                                  : "bg-gradient-to-r from-gray-200 to-gray-700"
                            }`}
                          ></div>
                        </div>
                      </div>

                      {/* Theme Info */}
                      <div className="flex items-center gap-3 mb-2">
                        <Icon
                          size={20}
                          className={
                            isSelected ? "text-blue-600" : "text-gray-600"
                          }
                        />
                        <span
                          className={`font-medium ${isSelected ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-gray-100"}`}
                        >
                          {option.label}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {option.description}
                      </p>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme Preview Section */}
            <div className="mt-8 p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                Preview
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-gray-100">
                      Sample Card
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This is how content will appear
                    </p>
                  </div>
                  <button className="px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    Action
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Primary Color
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Accent and interactive elements
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Settings Placeholder */}
            <div className="mt-8 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <div className="text-center">
                <Palette className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  More Customization Coming Soon
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Additional appearance options will be available in future
                  updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
