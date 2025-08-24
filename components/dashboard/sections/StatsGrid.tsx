import { FolderKanban, Users, CheckCircle, Clock } from "lucide-react";

interface StatsGridProps {
  stats?: {
    totalProjects: number;
    activeCards: number;
    completedTasks: number;
    teamMembers: number;
    changes?: {
      projects: string | null;
      cards: string | null;
      tasks: string | null;
      teamMembers: string | null;
    };
  };
}

export function StatsGrid({ stats }: StatsGridProps) {
  if (!stats) return null;

  const statsData = [
    {
      name: "Active Projects",
      value: stats.totalProjects.toString(),
      icon: FolderKanban,
      change: stats.changes?.projects,
      color: "blue",
      bg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      name: "Teams Joined",
      value: stats.teamMembers.toString(),
      icon: Users,
      change: stats.changes?.teamMembers,
      color: "emerald",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      name: "Active Cards",
      value: stats.activeCards.toString(),
      icon: Clock,
      change: stats.changes?.cards,
      color: "amber",
      bg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      name: "Completed Tasks",
      value: stats.completedTasks.toString(),
      icon: CheckCircle,
      change: stats.changes?.tasks,
      color: "green",
      bg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
  ];

  const getChangeColor = (change: string | null) => {
    if (!change || change === "No change") return "text-gray-400";
    if (change.startsWith("+")) return "text-green-600 dark:text-green-400";
    if (change.startsWith("-")) return "text-red-600 dark:text-red-400";
    return "text-gray-400";
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat) => (
        <div
          key={stat.name}
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
        >
          {/* Top Row */}
          <div className="flex items-center justify-between mb-6">
            {/* Icon Circle */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}
            >
              <stat.icon
                className={`text-${stat.color}-600 dark:text-${stat.color}-400`}
                size={24}
              />
            </div>

            {/* Change */}
            {stat.change && (
              <span
                className={`text-sm font-medium ${getChangeColor(stat.change)}`}
              >
                {stat.change}
              </span>
            )}
          </div>

          {/* Label + Value */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {stat.name}
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
