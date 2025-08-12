"use client";
import React from "react";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import type { NavigationItem } from "@/types";

interface NavigationSidebarProps {
  activeSection: string;
  navigationItems: NavigationItem[];
  onScrollToSection: (sectionId: string) => void;
  title?: string;
  subtitle?: string;
}

export default function NavigationSidebar({
  activeSection,
  navigationItems,
  onScrollToSection,
  title = "Settings",
  subtitle,
}: NavigationSidebarProps) {
  return (
    <>
      <AppBreadcrumb />
      <h2 className="font-bold text-lg pt-2">{title}</h2>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      <nav className="mt-4">
        <ul className="space-y-1">
          {navigationItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            const isDangerZone = id === "danger-zone";

            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onScrollToSection(id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                    isActive
                      ? isDangerZone
                        ? "bg-red-100 text-red-700 font-medium border border-red-200"
                        : "bg-blue-100 text-blue-700 font-medium"
                      : isDangerZone
                        ? "text-red-600 hover:bg-red-50 hover:text-red-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
