// components/projects/form/types.ts
import type { Team } from "@/types";

export interface ProjectSettings {
  colorTheme?: string;
}

export interface ProjectFormData {
  name: string;
  slug: string;
  description: string;
  teamId: string;
  settings: ProjectSettings;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

export interface ProjectCreationProps {
  teams: Team[];
  selectedTeamId?: string;
}

export interface ProjectFormSectionProps {
  formData: ProjectFormData;
  onInputChange: (
    field: keyof Omit<ProjectFormData, "settings">,
    value: string
  ) => void;
  onSlugChange: (value: string) => void;
  onSettingChange: (setting: keyof ProjectSettings, value: string) => void;
  teams: Team[];
  error: string;
}

export interface ProjectFormNavigationProps {
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

export interface ProjectFormMessagesProps {
  success: boolean;
  error: string;
}
