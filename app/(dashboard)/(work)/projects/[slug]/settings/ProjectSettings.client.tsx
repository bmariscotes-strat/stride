// app/(dashboard)/(work)/projects/[id]/settings/ProjectSettings.client.tsx
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
} from "@/types";

interface ProjectSettingsProps {
  project: ProjectWithPartialRelations;
  teams: TeamWithRelations[];
  currentUserId: string;
}

export default function ProjectSettings({
  project,
  teams,
  currentUserId,
}: ProjectSettingsProps) {
  const { userData, clerkUser, loading } = useUserContext();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>("information");

  // Use userData if available, otherwise fall back to clerkUser
  const user = userData || clerkUser;

  const isProjectOwner = project.ownerId === currentUserId;
  const userTeam = teams.find((team) => team.id === project.teamId);
  const userRole = userTeam?.members?.find(
    (member) => member.userId === currentUserId
  )?.role;
  const canManageProject =
    isProjectOwner || userRole === "owner" || userRole === "admin";

  const scrollToSection = (sectionId: string): void => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Navigation items for the sidebar
  const navigationItems: NavigationItem[] = [
    {
      id: "information",
      label: "Information",
      icon: Info,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  // Add danger zone for project owners - now isProjectOwner is available
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

  // Show loading if user is not loaded yet
  if (loading || !user) {
    return (
      <DualPanelLayout
        left={
          <div className="p-4">
            <AppBreadcrumb />
          </div>
        }
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

  // Show unauthorized access
  if (!canManageProject) {
    return (
      <DualPanelLayout
        left={
          <div className="p-4">
            <AppBreadcrumb />
            <h2 className="font-bold text-lg pt-2">Project Settings</h2>
          </div>
        }
        right={
          <div className="p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-4">
                <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600 mb-4">
                You don't have permission to manage this project's settings.
              </p>
              <button
                onClick={navigateBack}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Project
              </button>
            </div>
          </div>
        }
      />
    );
  }

  return (
    <DualPanelLayout
      left={
        <NavigationSidebar
          activeSection={activeSection}
          navigationItems={navigationItems}
          onScrollToSection={scrollToSection}
          title="Project Settings"
          subtitle={`Manage ${project.name} settings`}
        />
      }
      right={
        <ProjectEditForm
          project={project}
          teams={teams}
          currentUserId={currentUserId}
          isProjectOwner={isProjectOwner}
          onNavigateBack={navigateBack}
        />
      }
    />
  );
}
