// app/(dashboard)/(work)/team/[slug]/settings/page.tsx

import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/services/users";
import { getTeamBySlug } from "@/lib/services/teams";
import UpdateTeamPage from "./Settings.client";

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function TeamSettingsPage({ params }: PageProps) {
  const currentUser = await getCurrentUser();

  // ✅ Await params before accessing its properties
  const { slug } = await params;

  // Fetch the team data using the slug and current user ID
  const team = await getTeamBySlug(slug, currentUser!.id);

  if (!team) {
    notFound(); // Redirect to 404 if team not found
  }

  // Check if user has permission to access team settings
  if (
    !team.currentUserRole ||
    !["owner", "admin"].includes(team.currentUserRole)
  ) {
    notFound();
  }

  return <UpdateTeamPage team={team as any} />;
}
