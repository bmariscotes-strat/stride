"use client";

import {
  DashboardHeader,
  StatsGrid,
  RecentActivity,
  QuickActions,
  ProjectOverview,
  UpcomingDeadlines,
} from "@/components/dashboard";

interface DashboardClientProps {
  initialData?: {
    stats: {
      totalProjects: number;
      activeCards: number;
      completedTasks: number;
      teamMembers: number;
    };
    recentProjects: any[];
    upcomingDeadlines: any[];
    recentActivity: any[];
  };
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  return (
    <div className="space-y-6">
      <DashboardHeader />

      <StatsGrid stats={initialData?.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingDeadlines deadlines={initialData?.upcomingDeadlines} />
        <QuickActions />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={initialData?.recentActivity} />
        <ProjectOverview projects={initialData?.recentProjects} />
      </div>
    </div>
  );
}
