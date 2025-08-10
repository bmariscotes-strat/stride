// components/projects/form/ProjectFormNavigation.tsx
import React from "react";
import { Info, Settings } from "lucide-react";
import type { ProjectFormNavigationProps, NavigationItem } from "@/types";

const navigationItems: NavigationItem[] = [
  { id: "information", label: "Information", icon: Info },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function NavigationSidebar({
  activeSection,
  onSectionClick,
}: ProjectFormNavigationProps) {
  return (
    <nav className="mt-4">
      <ul className="space-y-1">
        {navigationItems.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSectionClick(id)}
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
  );
}
