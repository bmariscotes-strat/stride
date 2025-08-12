// app/(dashboard)/layout.tsx
import Header from "@/components/layout/dashboard/Header";
import { getCurrentUser } from "@/lib/services/users";
import { getProjectsForUser } from "@/lib/services/projects";
import { getTeamsForUser } from "@/lib/services/teams";
import { Suspense } from "react";
import { BaseNavSource } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <div className="min-h-screen">
      <div>
        <Header userId={userId} teams={teams} projects={projects} />

        <main className="py-3 px-4 sm:px-6 lg:px-12">
          <Suspense>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
