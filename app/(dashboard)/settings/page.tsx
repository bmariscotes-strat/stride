import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/users";
import UserSettings from "./UserSettings.client";
import { createMetadata } from "@/lib/utils/metadata";

export const metadata = createMetadata({
  title: "User Settings",
});

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return <UserSettings user={user} clerkUserId={user.clerkUserId} />;
}
