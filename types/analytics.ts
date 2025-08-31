// types/analytics.ts

export interface ProjectAnalyticsOverview {
  totalCards: number;
  completedCards: number;
  averageCompletionTime: number;
  activeMembers: number;
  overdueTasks: number;
}

export interface CardStatusData {
  status: string;
  count: number;
  percentage: number;
}

export interface CardPriorityData {
  priority: string;
  count: number;
  color: string;
}

export interface AssigneePerformanceData {
  assigneeName: string;
  assigned: number;
  completed: number;
  overdue: number;
}

export interface ActivityTrendData {
  date: string;
  cardsCreated: number;
  cardsCompleted: number;
  cardsMoved: number;
}

export interface CompletionTrendData {
  week: string;
  completionRate: number;
  totalCards: number;
}

export interface ColumnTimeData {
  columnName: string;
  averageDays: number;
}

export interface TeamProductivityData {
  memberName: string;
  tasksCompleted: number;
  averageTaskTime: number;
  productivity: number;
}

export interface ProjectAnalyticsData {
  overview: ProjectAnalyticsOverview;
  cardsByStatus: CardStatusData[];
  cardsByPriority: CardPriorityData[];
  cardsByAssignee: AssigneePerformanceData[];
  activityTrend: ActivityTrendData[];
  completionTrend: CompletionTrendData[];
  averageTimeInColumn: ColumnTimeData[];
  teamProductivity: TeamProductivityData[];
}

export interface AnalyticsTimeRange {
  value: "7d" | "30d" | "90d" | "1y";
  label: string;
  days: number;
}

export const ANALYTICS_TIME_RANGES: AnalyticsTimeRange[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "1y", label: "Last year", days: 365 },
];

export interface AnalyticsMetric {
  title: string;
  value: number | string;
  unit: string;
  icon: any;
  color: "blue" | "green" | "purple" | "orange" | "red" | "yellow";
  change?: {
    value: number;
    trend: "up" | "down" | "neutral";
  };
}

export interface AnalyticsChartConfig {
  title: string;
  type: "bar" | "line" | "pie" | "area";
  data: any[];
  config: {
    xAxis?: string;
    yAxis?: string;
    colors?: string[];
    stacked?: boolean;
  };
}

// Permission-based analytics features
export interface AnalyticsPermissions {
  canViewBasicMetrics: boolean;
  canViewTeamPerformance: boolean;
  canViewDetailedAnalytics: boolean;
  canExportData: boolean;
}

export interface AnalyticsExportData {
  projectName: string;
  exportDate: string;
  timeRange: string;
  data: ProjectAnalyticsData;
  summary: {
    totalDataPoints: number;
    analysisDate: string;
    keyInsights: string[];
  };
}

// Analytics Page
export interface ProjectAnalyticsData {
  overview: {
    totalCards: number;
    completedCards: number;
    averageCompletionTime: number;
    activeMembers: number;
    overdueTasks: number;
  };
  cardsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  cardsByPriority: Array<{
    priority: string;
    count: number;
    color: string;
  }>;
  cardsByAssignee: Array<{
    assigneeName: string;
    assigned: number;
    completed: number;
    overdue: number;
  }>;
  activityTrend: Array<{
    date: string;
    cardsCreated: number;
    cardsCompleted: number;
    cardsMoved: number;
  }>;
  completionTrend: Array<{
    week: string;
    completionRate: number;
    totalCards: number;
  }>;
  averageTimeInColumn: Array<{
    columnName: string;
    averageDays: number;
  }>;
  teamProductivity: Array<{
    memberName: string;
    tasksCompleted: number;
    averageTaskTime: number;
    productivity: number;
  }>;
}

export interface AnalyticsClientProps {
  project: any;
  analyticsData: ProjectAnalyticsData;
  permissions: any;
  analyticsPermissions: any;
  userRole: string;
  initialTimeRange: "7d" | "30d" | "90d" | "1y";
}
