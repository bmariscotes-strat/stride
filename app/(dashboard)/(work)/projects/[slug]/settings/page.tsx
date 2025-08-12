// app/(dashboard)/(work)/projects/[slug]/settings/page.tsx
import { getRequiredUserId } from "@/lib/utils/get-current-user";
import { getProjectBySlugForUser } from "@/lib/services/projects";
import { getTeamsForUser } from "@/lib/services/teams";
import { notFound } from "next/navigation";
import ProjectSettings from "./ProjectSettings.client";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const userId = await getRequiredUserId();
  const { slug } = await params;

  // Fetch project data (this already verifies user has access)
  const project = await getProjectBySlugForUser(slug, userId);

  if (!project) {
    notFound();
  }

  // Get teams for the settings component
  const teams = await getTeamsForUser(userId);

  return (
    <ProjectSettings project={project} teams={teams} currentUserId={userId} />
  );
}
