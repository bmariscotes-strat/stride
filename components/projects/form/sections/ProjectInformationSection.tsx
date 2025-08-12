// components/projects/form/ProjectInformationSection.tsx (Updated)
import React from "react";
import { Info, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Select, type SelectOption } from "@/components/ui/Select";
import type { ProjectFormSectionProps } from "@/types";

interface ProjectInformationSectionProps extends ProjectFormSectionProps {
  informationRef: React.RefObject<HTMLElement | null>;
  isEdit?: boolean;
}

export default function ProjectInformationSection({
  formData,
  onInputChange,
  onSlugChange,
  teams,
  error,
  informationRef,
  isEdit = false,
}: ProjectInformationSectionProps) {
  // Prepare team options for select
  const teamOptions: SelectOption[] = teams.map((team) => ({
    value: team.id,
    label: team.name,
    disabled: team.isArchived,
  }));

  // Helper function to transform slug input (only basic cleaning, let server handle uniqueness)
  const handleSlugChange = (value: string) => {
    const basicSlug = value
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, "") // Remove invalid characters
      .replace(/--+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
    onSlugChange(basicSlug);
  };

  return (
    <section id="information" ref={informationRef} className="scroll-mt-6">
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Info size={20} />
          Project Information
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          {isEdit
            ? "Update your project details."
            : "Basic details about your project."}
        </p>
      </div>

      <div className="mt-6 space-y-6">
        <Input
          label="Project Name"
          value={formData.name}
          onChange={(e) => onInputChange("name", e.target.value)}
          placeholder="Enter project name"
          required
          maxLength={100}
        />

        {!isEdit && (
          <Select
            label="Team"
            value={formData.teamId}
            onChange={(e) => onInputChange("teamId", e.target.value)}
            options={teamOptions}
            placeholder="Select a team"
            required
            leftIcon={<FolderOpen className="h-4 w-4 text-gray-400" />}
            helperText="Choose which team this project belongs to"
          />
        )}

        {isEdit && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Team
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
              <FolderOpen className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700">
                {teams.find((t) => t.id === formData.teamId)?.name ||
                  "Unknown Team"}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Team cannot be changed after project creation. Contact your team
              admin if you need to move this project.
            </p>
          </div>
        )}

        <Input
          label="Project URL Slug"
          value={formData.slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder="project-url"
          required
          pattern="[a-z0-9-]+"
          maxLength={50}
          leftAddon="stride-pm.app/.../projects/"
          helperText="Only lowercase letters, numbers, and hyphens. The server will ensure uniqueness."
        />

        <TextArea
          label="Description"
          rows={4}
          value={formData.description}
          onChange={(e) => onInputChange("description", e.target.value)}
          placeholder="What's this project about?"
          maxLength={500}
          showCharCount
        />
      </div>
    </section>
  );
}
