"use client";

import { Plus, Users, FolderPlus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      label: "Create New Project",
      icon: FolderPlus,
      href: "/projects/new",
      primary: true,
    },
    {
      label: "Invite Team Member",
      icon: UserPlus,
      href: "/teams/invite",
      primary: false,
    },
    {
      label: "Create Team",
      icon: Users,
      href: "/teams/new",
      primary: false,
    },
  ];

  return (
    <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-french_gray-300 dark:border-payne's_gray-400 p-6">
      <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-4">
        Quick Actions
      </h3>

      <div className="space-y-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => router.push(action.href)}
            className={`w-full flex items-center justify-center px-4 py-3 rounded-lg transition-colors ${
              action.primary
                ? "bg-blue_munsell-500 text-white hover:bg-blue_munsell-600"
                : "border border-french_gray-300 dark:border-payne's_gray-400 text-outer_space-500 dark:text-platinum-500 hover:bg-platinum-500 dark:hover:bg-payne's_gray-400"
            }`}
          >
            <action.icon size={20} className="mr-2" />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
