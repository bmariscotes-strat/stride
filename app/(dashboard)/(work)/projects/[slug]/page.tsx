// projects/[slug]/page.tsx - Server Component
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/users";
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";
import { getProjectBySlugForUser } from "@/lib/services/projects";
import type { ProjectWithPartialRelations } from "@/types";
import ProjectPageClient from "@/app/(dashboard)/(work)/projects/[slug]/ProjectPage.client";

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

  // Check permissions
  const permissionChecker = new ProjectPermissionChecker();
  await permissionChecker.loadContext(userId, project.id);

  const canEditProject = permissionChecker.canEditProject();
  const canManageTeams = permissionChecker.canManageTeams();
  const canCreateCards = permissionChecker.canCreateCards();
  const showSettings = canEditProject || canManageTeams;

  const isProjectOwner = project.ownerId === userId;

  // Get the first column for creating cards
  const defaultColumnId = project.columns?.[0]?.id;

  const views = [
    { id: "kanban", label: "Kanban", icon: "Kanban", isActive: true },
    { id: "calendar", label: "Calendar", icon: "Calendar", isActive: false },
    { id: "table", label: "Table", icon: "Table", isActive: false },
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
    />
  );
}
