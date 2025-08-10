import { getRequiredUserId } from "@/lib/utils/get-current-user";
import ProjectCreation from "@/app/(dashboard)/(work)/projects/create/ProjectCreation.client";
import { getTeamsForUser } from "@/lib/services/teams";

export default async function CreateProjectPage({
  searchParams,
}: {
  searchParams?: Promise<{ teamId?: string }>;
}) {
  const userId = await getRequiredUserId();

  const params = await searchParams;
  const selectedTeamId = params?.teamId;

  // Fetch teams for the authenticated user
  const teams = await getTeamsForUser(userId);

  return <ProjectCreation teams={teams} selectedTeamId={selectedTeamId} />;
}
