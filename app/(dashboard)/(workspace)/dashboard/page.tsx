import DashboardClient from "./Dashboard.client";
import { DashboardService } from "@/lib/services/dashboard";
import { getRequiredUserId } from "@/lib/utils/get-current-user";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const userId = await getRequiredUserId();

  if (!userId) {
    redirect("/sign-in");
  }

  const initialData = await DashboardService.getDashboardData(userId);

  return <DashboardClient initialData={initialData} />;
}
