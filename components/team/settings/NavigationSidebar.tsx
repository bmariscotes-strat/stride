"use client";
import React from "react";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import type { NavigationItem } from "@/types";

interface NavigationSidebarProps {
  activeSection: string;
  navigationItems: NavigationItem[];
  onScrollToSection: (sectionId: string) => void;
}

export default function NavigationSidebar({
  activeSection,
  navigationItems,
  onScrollToSection,
}: NavigationSidebarProps) {
  return (
    <>
      <AppBreadcrumb />
      <h2 className="font-bold text-lg pt-2">Update Team</h2>
      <nav className="mt-4">
        <ul className="space-y-1">
          {navigationItems.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onScrollToSection(id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  activeSection === id
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
