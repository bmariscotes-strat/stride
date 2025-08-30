// app/projects/page.tsx (Server Component)
import { createMetadata } from "@/lib/utils/metadata";
import ProjectsClient from "@/app/(dashboard)/(work)/projects/Projects.client";

export const metadata = createMetadata({
  title: "Projects",
});

export default function ProjectsPage() {
  return <ProjectsClient />;
}
