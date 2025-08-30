import { createMetadata } from "@/lib/utils/metadata";
import TeamsClient from "@/app/(dashboard)/(work)/team/Team.client";

export const metadata = createMetadata({
  title: "Teams",
});

export default function TeamsPage() {
  return <TeamsClient />;
}
