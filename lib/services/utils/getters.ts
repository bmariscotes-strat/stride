// lib/services/utils/getters.ts
import { db } from "@/lib/db/db";

export async function getSlugById(
  teamId?: string,
  projectId?: string
): Promise<{ teamSlug: string; projectSlug?: string }> {
  let team = null;
  let project = null;

  // Fetch team if teamId is provided
  if (teamId) {
    team = await db.query.teams.findFirst({
      where: (t, { eq }) => eq(t.id, teamId),
      columns: { slug: true },
    });
  }

  // Fetch project if projectId is provided
  if (projectId) {
    project = await db.query.projects.findFirst({
      where: (p, { eq }) => eq(p.id, projectId),
      columns: { slug: true },
    });
  }

  return {
    teamSlug: team?.slug ?? "",
    projectSlug: project?.slug ?? undefined,
  };
}
