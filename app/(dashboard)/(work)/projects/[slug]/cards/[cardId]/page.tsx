// app/(dashboard)/(work)/projects/[slug]/cards/[cardId]/page.tsx - Server component
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/users";
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";
import { getProjectBySlugForUser } from "@/lib/services/projects";
import { db } from "@/lib/db/db";
import { cards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ProjectWithPartialRelations } from "@/types";
import CardPageClient from "./CardPage.client";

// Extended interface to include columns
interface ProjectPageData extends ProjectWithPartialRelations {
  currentUserRole?: string;
  columns?: Array<{
    id: string;
    name: string;
    position: number;
  }>;
}

interface CardPageProps {
  params: Promise<{
    slug: string;
    cardId: string;
  }>;
}

export default async function CardPage({ params }: CardPageProps) {
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id || null;

  if (!userId) {
    redirect("/sign-in");
  }

  const { slug, cardId } = await params;

  // Get project data
  const project = (await getProjectBySlugForUser(
    slug,
    userId
  )) as ProjectPageData;

  if (!project) {
    notFound();
  }

  // Verify the card exists and belongs to this project
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    with: {
      column: {
        with: {
          project: true,
        },
      },
    },
  });

  if (!card || card.column.project.id !== project.id) {
    notFound();
  }

  // Check permissions
  const permissionChecker = new ProjectPermissionChecker();
  await permissionChecker.loadContext(userId, project.id);

  if (!permissionChecker.canViewProject()) {
    notFound();
  }

  const canEditProject = permissionChecker.canEditProject();
  const canManageTeams = permissionChecker.canManageTeams();
  const canCreateCards = permissionChecker.canCreateCards();
  const showSettings = canEditProject || canManageTeams;

  const isProjectOwner = project.ownerId === userId;

  // Get the first column for creating cards
  const defaultColumnId = project.columns?.[0]?.id;

  const views = [
    { id: "kanban", label: "Kanban", icon: "Kanban", isActive: true },
    { id: "list", label: "List", icon: "List", isActive: false },
    { id: "table", label: "Table", icon: "Table", isActive: false },
  ];

  const serializedProject = JSON.parse(JSON.stringify(project));

  return (
    <CardPageClient
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

// Generate metadata for the card page
export async function generateMetadata({ params }: CardPageProps) {
  const { slug, cardId } = await params;

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        title: "Card Not Found",
      };
    }

    const project = await getProjectBySlugForUser(slug, currentUser.id);
    if (!project) {
      return {
        title: "Project Not Found",
      };
    }

    const card = await db.query.cards.findFirst({
      where: eq(cards.id, cardId),
      with: {
        column: {
          with: {
            project: true,
          },
        },
      },
    });

    if (!card || card.column.project.id !== project.id) {
      return {
        title: "Card Not Found",
      };
    }

    return {
      title: `${card.title} - ${project.name}`,
      description: card.description
        ? card.description.substring(0, 160)
        : `Task in ${project.name}`,
    };
  } catch (error) {
    return {
      title: "Card Not Found",
    };
  }
}
