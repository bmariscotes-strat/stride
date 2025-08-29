import {
  formatActivityMessage,
  getActivityIconComponent,
} from "@/lib/utils/activity-formatter";
import type { ActivityLogResult } from "@/types";
import { Zap, Archive, Clock } from "lucide-react";
import Link from "next/link";

interface RecentActivityProps {
  activities?: ActivityLogResult[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center mr-3">
            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            Recent Activity
          </h3>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Archive className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No recent activity
          </p>
        </div>
      </div>
    );
  }

  // Helper function to get relative time
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center mr-3">
            <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            Recent Activity
          </h3>
        </div>
        <Link
          href="/activity"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30"
        >
          View all →
        </Link>
      </div>

      {/* Activities list */}
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const IconComponent = getActivityIconComponent(activity.actionType);

          return (
            <div
              key={activity.id}
              className="p-5 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-transparent hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-start justify-between">
                {/* Left side */}
                <div className="flex items-start space-x-3 flex-1">
                  {/* Activity icon and dot */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                      <IconComponent className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* User-friendly activity message */}
                    <p className="font-medium text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-relaxed">
                      {formatActivityMessage(activity)}
                    </p>

                    {/* Time and user info */}
                    <div className="flex items-center mt-2 space-x-2 text-sm text-gray-600 dark:text-gray-300">
                      <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span>{getRelativeTime(activity.createdAt)}</span>

                      {/* Show full timestamp on hover */}
                      <span className="hidden group-hover:inline text-xs text-gray-500">
                        ({activity.createdAt.toLocaleString()})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: user info */}
                <div className="flex items-center space-x-2 ml-4">
                  {/* User avatar or initials */}
                  {activity.user?.avatarUrl ? (
                    <img
                      src={activity.user.avatarUrl}
                      alt={`${activity.user.firstName} ${activity.user.lastName}`}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                        {activity.user?.firstName?.[0] ||
                          activity.user?.id?.[0] ||
                          "U"}
                        {activity.user?.lastName?.[0] || ""}
                      </span>
                    </div>
                  )}

                  {/* User badge */}
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {activity.user?.username || activity.user?.id || "user"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
