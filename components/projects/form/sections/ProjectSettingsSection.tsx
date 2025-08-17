// components/projects/form/ProjectSettingsSection.tsx
import React from "react";
import { Settings } from "lucide-react";
import { Select, type SelectOption } from "@/components/ui/Select";
import type { ProjectFormSectionProps } from "@/types";

interface ProjectSettingsSectionProps extends ProjectFormSectionProps {
  settingsRef: React.RefObject<HTMLElement | null>;
}

// Color theme options
const colorThemeOptions: SelectOption[] = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Yellow" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#ec4899", label: "Pink" },
  { value: "#6b7280", label: "Gray" },
];

export default function ProjectSettingsSection({
  formData,
  settingsRef,
}: ProjectSettingsSectionProps) {
  return (
    <section id="settings" ref={settingsRef} className="scroll-mt-6">
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Settings size={20} />
          Project Settings
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Configure your project appearance and preferences. You can change
          these settings later.
        </p>
      </div>
    </section>
  );
}
