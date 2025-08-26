// lib/permissions/checkers/analytics-permission-checker.ts

import { ProjectPermissionChecker } from "./project-permission-checker";
import type { ProjectPermissions } from "@/types";
import type { AnalyticsPermissions } from "@/types/analytics";

export class AnalyticsPermissionChecker extends ProjectPermissionChecker {
  /**
   * Get analytics-specific permissions based on project permissions
   */
  static getAnalyticsPermissions(
    permissions: ProjectPermissions
  ): AnalyticsPermissions {
    return {
      canViewBasicMetrics: permissions.canViewProject,
      canViewTeamPerformance:
        permissions.canViewProject && permissions.canManageTeams,
      canViewDetailedAnalytics:
        permissions.canEditProject || permissions.canManageTeams,
      canExportData: permissions.canEditProject,
    };
  }

  /**
   * Check if user can access analytics page
   */
  static canViewAnalytics(permissions: ProjectPermissions): boolean {
    return permissions.canViewProject;
  }

  /**
   * Check if user can view team performance metrics
   */
  static canViewTeamPerformance(permissions: ProjectPermissions): boolean {
    return permissions.canViewProject;
  }

  /**
   * Check if user can view detailed analytics (individual productivity, etc.)
   */
  static canViewDetailedAnalytics(permissions: ProjectPermissions): boolean {
    return permissions.canEditProject || permissions.canManageTeams;
  }

  /**
   * Check if user can export analytics data
   */
  static canExportAnalyticsData(permissions: ProjectPermissions): boolean {
    return permissions.canEditProject;
  }

  /**
   * Get filtered analytics data based on permissions
   */
  static filterAnalyticsDataByPermissions(
    data: any,
    permissions: ProjectPermissions
  ): any {
    const filteredData = { ...data };

    // If user can't view detailed analytics, remove sensitive data
    if (!this.canViewDetailedAnalytics(permissions)) {
      // Remove individual productivity data
      filteredData.teamProductivity = [];

      // Remove detailed assignee performance
      if (filteredData.cardsByAssignee) {
        filteredData.cardsByAssignee = filteredData.cardsByAssignee.map(
          (item: any) => ({
            ...item,
            assigneeName:
              item.assigneeName === "Unassigned" ? "Unassigned" : "Team Member",
          })
        );
      }
    }

    // If user can't view team performance, remove team-related metrics
    if (!this.canViewTeamPerformance(permissions)) {
      filteredData.cardsByAssignee = [];
      filteredData.teamProductivity = [];
    }

    return filteredData;
  }
}

// Example usage in the server component:
/*
// In your page.tsx
const permissions = permissionChecker.getAllPermissions();
const analyticsPermissions = AnalyticsPermissionChecker.getAnalyticsPermissions(permissions);

if (!AnalyticsPermissionChecker.canViewAnalytics(permissions)) {
  redirect(`/dashboard?error=no-analytics-access`);
}

// Filter data based on permissions
const filteredAnalyticsData = AnalyticsPermissionChecker.filterAnalyticsDataByPermissions(
  analyticsData, 
  permissions
);
*/
