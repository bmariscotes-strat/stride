"use client";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Target,
  Activity,
  Filter,
  Download,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shared/select";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import type { AnalyticsClientProps } from "@/types/analytics";
import { COLORS, PRIORITY_COLORS } from "@/lib/constants/analytics";

export default function AnalyticsClient({
  project,
  analyticsData,
  permissions,
  analyticsPermissions,
  userRole,
  initialTimeRange,
}: AnalyticsClientProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">(
    initialTimeRange
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const hasData = analyticsData.overview.totalCards > 0;

  // Export of Data
  const exportToExcel = async () => {
    if (!analyticsPermissions.canExportData) {
      alert("You do not have permission to export data.");
      return;
    }

    setIsExporting(true);

    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // 1. Overview Data Sheet
      const overviewData = [
        [`Analytics Report - ${project.name}`],
        [`Time Range: ${timeRange}`],
        [`Generated: ${new Date().toLocaleDateString()}`],
        [], // Empty row
        ["Metric", "Value", "Unit"],
        ["Total Cards", analyticsData.overview.totalCards, "cards"],
        ["Completed Cards", analyticsData.overview.completedCards, "cards"],
        [
          "Completion Rate",
          Math.round(
            (analyticsData.overview.completedCards /
              analyticsData.overview.totalCards) *
              100
          ),
          "%",
        ],
        ["Active Members", analyticsData.overview.activeMembers, "members"],
        [
          "Average Completion Time",
          analyticsData.overview.averageCompletionTime,
          "days",
        ],
        ["Overdue Tasks", analyticsData.overview.overdueTasks, "tasks"],
      ];
      const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
      overviewSheet["!cols"] = [{ width: 25 }, { width: 15 }, { width: 10 }];
      XLSX.utils.book_append_sheet(workbook, overviewSheet, "Overview");

      // 2. Cards by Status Sheet
      if (analyticsData.cardsByStatus.length > 0) {
        const statusData = [
          ["Status", "Count", "Percentage"],
          ...analyticsData.cardsByStatus.map((item) => [
            item.status,
            item.count,
            item.percentage + "%",
          ]),
        ];
        const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
        XLSX.utils.book_append_sheet(workbook, statusSheet, "Cards by Status");
      }

      // 3. Cards by Priority Sheet
      if (analyticsData.cardsByPriority.length > 0) {
        const priorityData = [
          ["Priority", "Count"],
          ...analyticsData.cardsByPriority.map((item) => [
            item.priority,
            item.count,
          ]),
        ];
        const prioritySheet = XLSX.utils.aoa_to_sheet(priorityData);
        XLSX.utils.book_append_sheet(
          workbook,
          prioritySheet,
          "Cards by Priority"
        );
      }

      // 4. Activity Trend Sheet
      if (analyticsData.activityTrend.length > 0) {
        const activityData = [
          ["Date", "Cards Created", "Cards Completed", "Cards Moved"],
          ...analyticsData.activityTrend.map((item) => [
            item.date,
            item.cardsCreated,
            item.cardsCompleted,
            item.cardsMoved,
          ]),
        ];
        const activitySheet = XLSX.utils.aoa_to_sheet(activityData);
        XLSX.utils.book_append_sheet(workbook, activitySheet, "Activity Trend");
      }

      // 5. Team Performance Sheet (if permission allows)
      if (
        analyticsPermissions.canViewTeamPerformance &&
        analyticsData.cardsByAssignee.length > 0
      ) {
        const teamData = [
          ["Assignee", "Assigned Cards", "Completed Cards", "Overdue Cards"],
          ...analyticsData.cardsByAssignee.map((item) => [
            item.assigneeName,
            item.assigned,
            item.completed,
            item.overdue,
          ]),
        ];
        const teamSheet = XLSX.utils.aoa_to_sheet(teamData);
        XLSX.utils.book_append_sheet(workbook, teamSheet, "Team Performance");
      }

      // 6. Individual Productivity Sheet (if permission allows)
      if (
        analyticsPermissions.canViewDetailedAnalytics &&
        analyticsData.teamProductivity.length > 0
      ) {
        const productivityData = [
          [
            "Member Name",
            "Tasks Completed",
            "Average Task Time (days)",
            "Productivity Score (%)",
          ],
          ...analyticsData.teamProductivity.map((item) => [
            item.memberName,
            item.tasksCompleted,
            formatNumber(item.averageTaskTime, 1),
            formatNumber(item.productivity, 0),
          ]),
        ];
        const productivitySheet = XLSX.utils.aoa_to_sheet(productivityData);
        XLSX.utils.book_append_sheet(
          workbook,
          productivitySheet,
          "Individual Productivity"
        );
      }

      // 7. Completion Rate Trend Sheet
      if (analyticsData.completionTrend.length > 0) {
        const completionData = [
          ["Week", "Completion Rate (%)"],
          ...analyticsData.completionTrend.map((item) => [
            item.week,
            item.completionRate,
          ]),
        ];
        const completionSheet = XLSX.utils.aoa_to_sheet(completionData);
        XLSX.utils.book_append_sheet(
          workbook,
          completionSheet,
          "Completion Trend"
        );
      }

      // 8. Average Time in Columns Sheet
      if (analyticsData.averageTimeInColumn.length > 0) {
        const timeData = [
          ["Column Name", "Average Time (hours)"],
          ...analyticsData.averageTimeInColumn.map((item) => [
            item.columnName,
            item.averageHours,
          ]),
        ];
        const timeSheet = XLSX.utils.aoa_to_sheet(timeData);
        XLSX.utils.book_append_sheet(workbook, timeSheet, "Time in Columns");
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `${project.name.replace(/[^a-z0-9]/gi, "_")}_Analytics_${timeRange}_${timestamp}.xlsx`;

      // Write and download the file
      XLSX.writeFile(workbook, filename);

      console.log(`Analytics data exported successfully as ${filename}`);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Error exporting data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle time range change with URL update
  const handleTimeRangeChange = async (
    newRange: "7d" | "30d" | "90d" | "1y"
  ) => {
    setIsLoading(true);
    setTimeRange(newRange);

    // Update URL without page refresh
    const url = new URL(window.location.href);
    url.searchParams.set("timeRange", newRange);
    window.history.pushState({}, "", url.toString());

    setTimeout(() => setIsLoading(false), 500);
  };

  // Helper function to safely format numbers
  const formatNumber = (value: any, decimals: number = 1): string => {
    const num = Number(value);
    return isNaN(num) ? "0" : num.toFixed(decimals);
  };

  // Empty state component
  const EmptyState = ({
    icon: Icon,
    title,
    description,
    suggestion,
  }: {
    icon: any;
    title: string;
    description: string;
    suggestion?: string;
  }) => (
    <div className="flex flex-col items-center justify-center h-64 text-center p-6">
      <Icon size={48} className="text-gray-400 dark:text-gray-600 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-2">{description}</p>
      {suggestion && (
        <p className="text-sm text-blue-600 dark:text-blue-400">{suggestion}</p>
      )}
    </div>
  );

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="p-5">
          <AppBreadcrumb />
        </div>

        <EmptyState
          icon={BarChart3}
          title="No Analytics Data Available"
          description="Start creating cards and moving them through your workflow to see analytics data."
          suggestion="Create your first card to begin tracking project metrics."
        />
      </div>
    );
  }

  const completionRate = Math.round(
    (analyticsData.overview.completedCards /
      analyticsData.overview.totalCards) *
      100
  );

  return (
    <>
      <div className="space-y-6 pt-3">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <AppBreadcrumb />

            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track{" "}
              <span className="font-bold text-primary">{project.name} </span>{" "}
              performance and team productivity
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-4 ">
            {/* Time Range Filter */}
            <div className="flex items-center space-x-2">
              <Filter size={16} className="text-gray-500" />

              <Select
                value={timeRange}
                onValueChange={(value) => handleTimeRangeChange(value as any)}
                disabled={isLoading}
              >
                <SelectTrigger className="w-[160px] text-sm disabled:opacity-50">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>

              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </div>

            {/* Export Button */}
            {analyticsPermissions.canExportData && (
              <button
                onClick={exportToExcel}
                disabled={isExporting}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md text-sm font-medium transition-colors"
              >
                {isExporting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Download size={16} />
                )}
                <span>{isExporting ? "Exporting..." : "Export Excel"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            {
              title: "Total Cards",
              value: analyticsData.overview.totalCards,
              unit: "cards",
              icon: Target,
              color: "blue",
            },
            {
              title: "Completion Rate",
              value: completionRate,
              unit: "%",
              icon: CheckCircle2,
              color: "green",
            },
            {
              title: "Active Members",
              value: analyticsData.overview.activeMembers,
              unit: "members",
              icon: Users,
              color: "purple",
            },
            {
              title: "Avg. Completion Time",
              value: analyticsData.overview.averageCompletionTime,
              unit: "days",
              icon: Clock,
              color: "orange",
            },
            {
              title: "Overdue Tasks",
              value: analyticsData.overview.overdueTasks,
              unit: "tasks",
              icon: AlertCircle,
              color: "red",
            },
          ].map((metric, index) => (
            <div
              key={index}
              className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-10 h-10 bg-${metric.color}-100 dark:bg-${metric.color}-900/20 rounded-lg flex items-center justify-center`}
                >
                  <metric.icon
                    className={`text-${metric.color}-500`}
                    size={20}
                  />
                </div>
              </div>
              <div className="text-2xl font-bold text-outer_space-500 dark:text-platinum-500 mb-1">
                {metric.value}
              </div>
              <div className="text-sm text-payne's_gray-500 dark:text-french_gray-400 mb-2">
                {metric.unit}
              </div>
              <div className="text-xs font-medium text-outer_space-500 dark:text-platinum-500">
                {metric.title}
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cards by Status */}
          <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6">
            <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-4">
              Cards by Status
            </h3>
            {analyticsData.cardsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.cardsByStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ status, percentage }) =>
                      `${status}: ${percentage}%`
                    }
                  >
                    {analyticsData.cardsByStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No Status Data"
                description="Cards will appear here once they're moved between columns."
              />
            )}
          </div>

          {/* Cards by Priority */}
          <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6">
            <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-4">
              Cards by Priority
            </h3>
            {analyticsData.cardsByPriority.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.cardsByPriority}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="priority" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={Target}
                title="No Priority Data"
                description="Priority distribution will show once cards have priorities assigned."
              />
            )}
          </div>

          {/* Activity Trend */}
          <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6">
            <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-4">
              Activity Trend
            </h3>
            {analyticsData.activityTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.activityTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="cardsCreated"
                    stackId="1"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.7}
                    name="Created"
                  />
                  <Area
                    type="monotone"
                    dataKey="cardsCompleted"
                    stackId="1"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.7}
                    name="Completed"
                  />
                  <Area
                    type="monotone"
                    dataKey="cardsMoved"
                    stackId="1"
                    stroke="#F59E0B"
                    fill="#F59E0B"
                    fillOpacity={0.7}
                    name="Moved"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={Activity}
                title="No Activity Data"
                description="Activity trends will appear as team members work on cards."
              />
            )}
          </div>

          {/* Team Performance - Only show if user has permission */}
          {analyticsPermissions.canViewTeamPerformance && (
            <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6">
              <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-4">
                Team Performance
              </h3>
              {analyticsData.cardsByAssignee.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.cardsByAssignee}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="assigneeName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="assigned" fill="#3B82F6" name="Assigned" />
                    <Bar dataKey="completed" fill="#10B981" name="Completed" />
                    <Bar dataKey="overdue" fill="#EF4444" name="Overdue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No Assignment Data"
                  description="Team performance metrics will show once cards are assigned to members."
                />
              )}
            </div>
          )}
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completion Rate Trend */}
          <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6">
            <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-4">
              Completion Rate Trend
            </h3>
            {analyticsData.completionTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.completionTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    stroke="#10B981"
                    strokeWidth={3}
                    name="Completion Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="No Trend Data"
                description="Completion trends will appear over time as cards are completed."
              />
            )}
          </div>

          {/* Average Time in Columns */}
          <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6">
            <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-4">
              Average Time in Columns
            </h3>
            {analyticsData.averageTimeInColumn.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={analyticsData.averageTimeInColumn}
                  layout="horizontal"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="columnName" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="averageHours" fill="#8B5CF6" name="Hours" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={Clock}
                title="No Time Data"
                description="Time tracking will show once cards move through different columns."
              />
            )}
          </div>
        </div>

        {/* Individual Productivity Table */}
        {analyticsPermissions.canViewDetailedAnalytics &&
          analyticsData.teamProductivity.length > 0 && (
            <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-gray-300 dark:border-payne's_gray-400 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500">
                  Individual Productivity
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-700">
                      <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">
                        Member
                      </th>
                      <th className="text-center p-3 font-medium text-gray-700 dark:text-gray-300">
                        Tasks Completed
                      </th>
                      <th className="text-center p-3 font-medium text-gray-700 dark:text-gray-300">
                        Avg. Task Time
                      </th>
                      <th className="text-center p-3 font-medium text-gray-700 dark:text-gray-300">
                        Productivity Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.teamProductivity.map((member, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <td className="p-3 font-medium text-gray-900 dark:text-gray-100">
                          {member.memberName}
                        </td>
                        <td className="p-3 text-center text-gray-600 dark:text-gray-400">
                          {member.tasksCompleted}
                        </td>
                        <td className="p-3 text-center text-gray-600 dark:text-gray-400">
                          {formatNumber(member.averageTaskTime)} days
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              Number(member.productivity) >= 80
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                : Number(member.productivity) >= 60
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                            }`}
                          >
                            {formatNumber(member.productivity, 0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                <p>
                  * Productivity score is calculated based on completion rate
                  (70%) and task efficiency (30%)
                </p>
                <p>
                  * Data reflects activity within the selected time range (
                  {timeRange})
                </p>
              </div>
            </div>
          )}

        {/* Permission-based empty state for restricted content */}
        {!analyticsPermissions.canViewDetailedAnalytics && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle
                className="text-yellow-600 dark:text-yellow-400"
                size={20}
              />
              <div>
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Limited Analytics Access
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Your role ({userRole}) has limited access to detailed
                  analytics. Contact a project admin to view individual
                  productivity metrics and detailed reports.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
