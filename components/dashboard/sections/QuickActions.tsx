"use client";

import { Plus, Users, Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      label: "Add New Project",
      icon: Folder,
      href: "/projects/create",
    },
    {
      label: "Create Team",
      icon: Users,
      href: "/team/create",
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 ">
      {/* Header */}
      <div className="mb-6">
        {/* Top row: icon + title */}
        <div className="flex items-center mb-1">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center mr-3">
            <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            Quick Actions
          </h3>
        </div>

        {/* Below row: description */}
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Shortcut actions buttons
        </p>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="primary"
            size="md"
            fullWidth
            leftIcon={<action.icon size={20} />}
            onClick={() => router.push(action.href)}
            className="!justify-start !text-left"
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
