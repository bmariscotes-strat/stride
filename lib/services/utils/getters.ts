import { db } from "@/lib/db/db";

export async function getSlugById(
  teamId: string,
  projectId?: string
): Promise<{ teamSlug: string; projectSlug?: string }> {
  const team = await db.query.teams.findFirst({
    where: (t, { eq }) => eq(t.id, teamId),
    columns: { slug: true },
  });

  const project = projectId
    ? await db.query.projects.findFirst({
        where: (p, { eq }) => eq(p.id, projectId),
        columns: { slug: true },
      })
    : null;

  return {
    teamSlug: team?.slug ?? "",
    projectSlug: project?.slug ?? undefined,
  };
}
