"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import DualPanelLayout from "@/components/layout/shared/DualPanelLayout";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import {
  FolderOpen,
  Rocket,
  Users,
  AlertTriangle,
  Info,
  Plus,
} from "lucide-react";
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
          <div className="p-4 h-full flex flex-col">
            <AppBreadcrumb />
            <h2 className="font-bold text-lg pt-2 mb-6">Create Project</h2>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1 dark:text-gray-300">
                    Ready to Start?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Projects help organize your work and collaborate with your
                    team members effectively.
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Rocket className="h-5 w-5 text-blue-600" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Organize tasks and milestones
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Collaborate with team members
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track progress and deadlines
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
        right={
          <div className="p-1 sm:p-1 md:p-6 lg:p-6 w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="mb-4">
                <FolderOpen className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Teams Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You need to be a member of at least one team to create a
                project.
              </p>
              <Link href="/team/create" className="flex-shrink-0">
                <Button
                  leftIcon={<Plus />}
                  variant="primary"
                  style="filled"
                  size="sm"
                >
                  <span className="hidden sm:inline">Create Project</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </Link>
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
