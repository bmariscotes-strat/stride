import { ActivityService } from "@/lib/services/activity";
import ActivityLogsClient from "./Activity.client";
import { ACTIVITY_LOGS_LIMIT as LIMIT } from "@/lib/constants/limits";
import { getRequiredUserId } from "@/lib/utils/get-current-user";

// Add this line to force dynamic rendering
export const dynamic = "force-dynamic";

export default async function ActivityLogsPage() {
  const userId = await getRequiredUserId();

  const initialActivities = await ActivityService.getAllActivities({
    userId,
    limit: LIMIT,
    offset: 0,
  });

  return (
    <ActivityLogsClient initialActivities={initialActivities} userId={userId} />
  );
}
