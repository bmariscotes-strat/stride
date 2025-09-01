export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getRequiredUserId } from "@/lib/utils/get-current-user";
import { getProjectBySlugForUser } from "@/lib/services/projects";
import { ProjectPermissionChecker } from "@/lib/permissions/checkers/project-permission-checker";
import { AnalyticsPermissionChecker } from "@/lib/permissions/checkers/analytics-permission-checker";
import { notFound, redirect } from "next/navigation";
import { getProjectAnalytics } from "@/lib/services/analytics";
import AnalyticsClient from "./Analytics.client";
import { createMetadata } from "@/lib/utils/metadata";

export const metadata = createMetadata({
  title: "Project Analytics",
});

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ timeRange?: string }>;
}) {
  try {
    const userId = await getRequiredUserId();
    const { slug } = await params;
    const { timeRange = "30d" } = await searchParams;

    const project = await getProjectBySlugForUser(slug, userId);
    if (!project) {
      notFound();
    }

    // Check permissions
    const permissionChecker = new ProjectPermissionChecker();
    const context = await permissionChecker.loadContext(userId, project.id);
    const permissions = permissionChecker.getAllPermissions();

    // Basic access check
    if (!permissions.canViewProject) {
      redirect(`/dashboard?error=no-project-access`);
    }

    // Analytics-specific access check
    if (!AnalyticsPermissionChecker.canViewAnalytics(permissions)) {
      redirect(
        `/team/${project.team?.slug}/project/${project.slug}?error=no-analytics-access`
      );
    }

    // Get analytics data with time range
    const validTimeRange = ["7d", "30d", "90d", "1y"].includes(timeRange)
      ? (timeRange as "7d" | "30d" | "90d" | "1y")
      : "30d";

    const rawAnalyticsData = await getProjectAnalytics(
      project.id,
      validTimeRange
    );

    // Filter data based on permissions
    const analyticsData =
      AnalyticsPermissionChecker.filterAnalyticsDataByPermissions(
        rawAnalyticsData,
        permissions
      );

    // Get analytics-specific permissions
    const analyticsPermissions =
      AnalyticsPermissionChecker.getAnalyticsPermissions(permissions);

    // Get user role for display
    const isProjectOwner = context.isProjectOwner;
    const userRole = getUserDisplayRole(context, isProjectOwner);

    return (
      <AnalyticsClient
        project={project}
        analyticsData={analyticsData}
        permissions={permissions}
        analyticsPermissions={analyticsPermissions}
        userRole={userRole}
        initialTimeRange={validTimeRange}
      />
    );
  } catch (error) {
    console.error("Error loading analytics page:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes("permission")) {
        redirect(`/dashboard?error=analytics-permission-denied`);
      }
      if (error.message.includes("not-found")) {
        notFound();
      }
    }

    // Generic error - redirect to project page
    redirect(`/dashboard?error=analytics-error`);
  }
}

// Helper function to get display role
function getUserDisplayRole(context: any, isProjectOwner: boolean): string {
  if (isProjectOwner) {
    return "Owner";
  }

  if (!context?.teamMemberships || context.teamMemberships.length === 0) {
    return "No Access";
  }

  const roles = context.teamMemberships
    .map((m: any) => m.projectRole)
    .filter(Boolean);

  if (roles.includes("admin")) return "Admin";
  if (roles.includes("editor")) return "Editor";
  if (roles.includes("viewer")) return "Viewer";

  return "Viewer";
}

// Generate static params for better performance
export async function generateStaticParams() {
  return [];
}
