// app/(dashboard)/header-wrapper.tsx
import Header from "@/components/layout/dashboard/Header";
import { getCurrentUser } from "@/lib/services/users";
import { getProjectsForUser } from "@/lib/services/projects";
import { getTeamsForUser } from "@/lib/services/teams";
import { BaseNavSource } from "@/types";

export default async function HeaderWrapper() {
  const user = await getCurrentUser();
  const userId = user?.id || null;

  const teams: BaseNavSource[] = user
    ? (await getTeamsForUser(user.id)).slice(0, 3).map((team) => ({
        slug: team.slug,
        name: team.name,
        description: team.description,
      }))
    : [];

  const projects: BaseNavSource[] = user
    ? (await getProjectsForUser(user.id)).slice(0, 3).map((project) => ({
        slug: project.slug,
        name: project.name,
        description: project.description,
      }))
    : [];

  return <Header userId={userId} teams={teams} projects={projects} />;
}
