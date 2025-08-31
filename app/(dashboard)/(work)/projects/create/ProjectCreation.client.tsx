"use client";
import React, { useState, useEffect } from "react";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import { FolderOpen, Users, AlertTriangle, Info } from "lucide-react";
import { useUserContext } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { ProjectCreationForm } from "@/components/projects";
import type { ProjectCreationProps, NavigationItem } from "@/types";
import NavigationSidebar from "@/components/layout/shared/NavigationSidebar";

export default function ProjectCreation({
  teams,
  selectedTeamId,
}: ProjectCreationProps) {
  const { userData, clerkUser, loading } = useUserContext();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>("information");

  // Use userData if available, otherwise fall back to clerkUser
  const currentUserId = userData?.id || clerkUser?.id;

  const scrollToSection = (sectionId: string): void => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const navigationItems: NavigationItem[] = [
    {
      id: "information",
      label: "Information",
      icon: Info,
    },
    {
      id: "teams",
      label: "Teams",
      icon: Users,
    },
  ];

  const navigateBack = () => {
    router.back();
  };

  // Show loading if user is not loaded yet
  if (loading || !currentUserId) {
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

  // Show message if no teams available
  if (!teams || teams.length === 0) {
    return (
      <DualPanelLayout
        left={
          <div className="p-4">
            <AppBreadcrumb />
            <h2 className="font-bold text-lg pt-2">Create Project</h2>
          </div>
        }
        right={
          <div className="p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-4">
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Teams Available
              </h3>
              <p className="text-gray-600 mb-4">
                You need to be a member of at least one team to create a
                project.
              </p>
              <button
                onClick={() => router.push("/teams/create")}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create a Team
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
        <>
          <NavigationSidebar
            activeSection={activeSection}
            navigationItems={navigationItems}
            onScrollToSection={scrollToSection}
            title="Project Creation"
            subtitle="Create new project"
          />
        </>
      }
      right={
        <ProjectCreationForm
          teams={teams}
          selectedTeamId={selectedTeamId}
          currentUserId={currentUserId}
          onNavigateBack={navigateBack}
        />
      }
    />
  );
}
