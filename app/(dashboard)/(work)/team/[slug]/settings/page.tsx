// app/(dashboard)/(work)/team/[slug]/settings/page.tsx

import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/services/users";
import { getTeamBySlug } from "@/lib/services/teams"; // Import your function
import UpdateTeamPage from "./UpdateTeamPage"; // Import your client component

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function TeamSettingsPage({ params }: PageProps) {
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id || null;

  if (!userId) {
    // Redirect to login or handle unauthorized access
    notFound();
  }

  const { slug } = params;

  // Fetch the team data using the slug and current user ID
  const team = await getTeamBySlug(slug, userId);

  if (!team) {
    notFound(); // Redirect to 404 if team not found
  }

  // Check if user has permission to access team settings
  if (
    !team.currentUserRole ||
    !["owner", "admin"].includes(team.currentUserRole)
  ) {
    // You might want to redirect to the team page instead of 404
    // or show an unauthorized message
    notFound();
  }

  return <UpdateTeamPage team={team as any} />;
}
