// app\(dashboard)\(work)\projects\[slug]\settings\ProjectSettings.client.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import { Settings, AlertTriangle, Info } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { ProjectEditForm } from "@/components/projects";
import NavigationSidebar from "@/components/layout/shared/NavigationSidebar";
import type {
  ProjectWithPartialRelations,
  NavigationItem,
  TeamWithRelations,
  ProjectPermissions,
} from "@/types";

interface ProjectSettingsProps {
  project: ProjectWithPartialRelations;
  teams: TeamWithRelations[];
  currentUserId: string;
  permissions: ProjectPermissions;
  isProjectOwner: boolean;
  userRole: string;
}

export default function ProjectSettings({
  project,
  teams,
  currentUserId,
  permissions,
  isProjectOwner,
  userRole,
}: ProjectSettingsProps) {
  const { userData, clerkUser, loading } = useUserContext();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>("information");

  const user = userData || clerkUser;

  // Scroll handling
  const scrollToSection = (sectionId: string): void => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["information", "settings", "danger-zone"];
      let currentSection = "information";

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= window.innerHeight / 2 && rect.bottom >= 0) {
            currentSection = sectionId;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Navigation items based on server-computed permissions
  const navigationItems: NavigationItem[] = [
    { id: "information", label: "Information", icon: Info },
  ];

  if (permissions.canEditProject || permissions.canManageTeams) {
    navigationItems.push({ id: "settings", label: "Settings", icon: Settings });
  }

  if (isProjectOwner) {
    navigationItems.push({
      id: "danger-zone",
      label: "Danger Zone",
      icon: AlertTriangle,
    });
  }

  const navigateBack = () => {
    router.push(`/team/${project.team?.slug}/project/${project.slug}`);
  };

  // Loading state
  if (loading || !user) {
    return (
      <DualPanelLayout
        left={<AppBreadcrumb />}
        right={
          <div className="p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          </div>
        }
      />
    );
  }

  // Since server already checked permissions, we can just render
  return (
    <DualPanelLayout
      left={
        <NavigationSidebar
          activeSection={activeSection}
          navigationItems={navigationItems}
          onScrollToSection={scrollToSection}
          title="Project Settings"
          subtitle={`Manage ${project.name} settings (${userRole})`}
        />
      }
      right={
        <ProjectEditForm
          project={project}
          teams={teams}
          currentUserId={currentUserId}
          isProjectOwner={isProjectOwner}
          onNavigateBack={navigateBack}
          canEditProject={permissions.canEditProject}
          canManageTeams={permissions.canManageTeams}
        />
      }
    />
  );
}
