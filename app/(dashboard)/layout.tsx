// app/(dashboard)/layout.tsx
import Header from "@/components/layout/dashboard/Header";
import { getCurrentUser } from "@/lib/services/users";
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

  return (
    <div className="min-h-screen">
      <div>
        <Header userId={userId} teams={teams} />

        <main className="py-8 px-4 sm:px-6 lg:px-12">
          <Suspense>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
