import DashboardClient from "./Dashboard.client";
import { DashboardService } from "@/lib/services/dashboard";
import { getRequiredUserId } from "@/lib/utils/get-current-user";
import { getCurrentUser } from "@/lib/services/users";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const userId = await getRequiredUserId();

  if (!userId) {
    redirect("/sign-in");
  }

  const [user, initialData] = await Promise.all([
    getCurrentUser(),
    DashboardService.getDashboardData(userId),
  ]);

  return <DashboardClient user={user} initialData={initialData} />;
}
