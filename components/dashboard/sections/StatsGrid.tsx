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
    },
    {
      name: "Teams Joined",
      value: stats.teamMembers.toString(),
      icon: Users,
      change: stats.changes?.teamMembers,
    },
    {
      name: "Active Cards",
      value: stats.activeCards.toString(),
      icon: Clock,
      change: stats.changes?.cards,
    },
    {
      name: "Completed Tasks",
      value: stats.completedTasks.toString(),
      icon: CheckCircle,
      change: stats.changes?.tasks,
    },
  ];

  const getChangeColor = (change: string | null) => {
    if (!change || change === "No change")
      return "text-gray-500 dark:text-gray-400";
    if (change.startsWith("+")) return "text-green-600 dark:text-green-400";
    if (change.startsWith("-")) return "text-red-600 dark:text-red-400";
    return "text-gray-500 dark:text-gray-400";
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat) => (
        <div
          key={stat.name}
          className="bg-white dark:bg-outer_space-500 overflow-hidden rounded-lg border border-french_gray-300 dark:border-payne's_gray-400 p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue_munsell-100 dark:bg-blue_munsell-900 rounded-lg flex items-center justify-center">
                <stat.icon className="text-blue_munsell-500" size={20} />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-payne's_gray-500 dark:text-french_gray-400 truncate">
                  {stat.name}
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-outer_space-500 dark:text-platinum-500">
                    {stat.value}
                  </div>
                  {stat.change && (
                    <div
                      className={`ml-2 flex items-baseline text-sm font-semibold ${getChangeColor(stat.change)}`}
                    >
                      {stat.change}
                    </div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
