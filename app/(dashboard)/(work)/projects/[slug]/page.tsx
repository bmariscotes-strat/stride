// projects/[slug]/page.tsx - Server Component
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/users";
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";
import { getProjectBySlugForUser } from "@/lib/services/projects";
import type { ProjectWithPartialRelations } from "@/types";
import ProjectPageClient from "@/app/(dashboard)/(work)/projects/[slug]/ProjectPage.client";
import { AnalyticsPermissionChecker } from "@/lib/permissions/checkers/analytics-permission-checker";
import { createMetadata } from "@/lib/utils/metadata";

// Extended interface to include columns
interface ProjectPageData extends ProjectWithPartialRelations {
  currentUserRole?: string;
  columns?: Array<{
    id: string;
    name: string;
    position: number;
  }>;
}

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata
export async function generateMetadata({ params }: ProjectPageProps) {
  const { slug } = await params;

  try {
    const currentUser = await getCurrentUser();
    const userId = currentUser?.id;

    if (!userId) {
      return createMetadata({
        title: "Project - Sign In Required",
        description: "Sign in to view this project",
      });
    }

    const project = await getProjectBySlugForUser(slug, userId);

    if (!project) {
      return createMetadata({
        title: "Project Not Found",
        description: "The requested project could not be found",
      });
    }

    return createMetadata({
      title: `${project.name}`,
      description:
        project.description ||
        `Manage and collaborate on ${project.name} project`,
    });
  } catch (error) {
    return createMetadata({
      title: "Project",
      description: "Project management and collaboration",
    });
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id || null;

  if (!userId) {
    redirect("/sign-in");
  }

  const { slug } = await params;
  const project = (await getProjectBySlugForUser(
    slug,
    userId
  )) as ProjectPageData;

  if (!project) {
    notFound();
  }

  const permissionChecker = new ProjectPermissionChecker();
  await permissionChecker.loadContext(userId, project.id);

  const canEditProject = permissionChecker.canEditProject();
  const canManageTeams = permissionChecker.canManageTeams();
  const canCreateCards = permissionChecker.canCreateCards();
  const showSettings = canEditProject || canManageTeams;
  const permissions = permissionChecker.getAllPermissions();
  const canViewAnalytics =
    AnalyticsPermissionChecker.canViewAnalytics(permissions);
  const isProjectOwner = project.ownerId === userId;

  const defaultColumnId = project.columns?.[0]?.id;

  const views = [
    { id: "kanban", label: "Kanban", icon: "Kanban", isActive: true },
    { id: "calendar", label: "Calendar", icon: "Calendar", isActive: false },
  ];

  const serializedProject = JSON.parse(JSON.stringify(project));

  return (
    <ProjectPageClient
      project={serializedProject}
      userId={userId}
      canCreateCards={canCreateCards}
      canEditProject={canEditProject}
      canManageTeams={canManageTeams}
      showSettings={showSettings}
      isProjectOwner={isProjectOwner}
      defaultColumnId={defaultColumnId}
      views={views}
      canViewAnalytics={canViewAnalytics}
    />
  );
}
