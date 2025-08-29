import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/users";
import UserSettings from "./UserSettings.client";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return <UserSettings user={user} clerkUserId={user.clerkUserId} />;
}
