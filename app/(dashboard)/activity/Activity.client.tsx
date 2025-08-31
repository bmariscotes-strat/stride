"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ActivityLogResult } from "@/types";
import {
  formatActivityMessage,
  getActivityIconComponent,
} from "@/lib/utils/activity-formatter";
import { ACTIVITY_LOGS_LIMIT as LIMIT } from "@/lib/constants/limits";

interface Props {
  initialActivities: ActivityLogResult[];
  userId: string;
}

export default function ActivityLogsClient({
  initialActivities,
  userId,
}: Props) {
  const [activities, setActivities] =
    useState<ActivityLogResult[]>(initialActivities);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialActivities.length === LIMIT);

  const loaderRef = useRef<HTMLDivElement | null>(null);

  const fetchMore = useCallback(async () => {
    if (!hasMore || loading) return;

    setLoading(true);
    const res = await fetch(
      `/api/activity-logs?userId=${userId}&page=${page}&limit=${LIMIT}`
    );
    const newData: ActivityLogResult[] = await res.json();

    setActivities((prev) => [...prev, ...newData]);
    setHasMore(newData.length === LIMIT);
    setPage((prev) => prev + 1);
    setLoading(false);
  }, [page, userId, hasMore, loading]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchMore();
      }
    });

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [fetchMore]);

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
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-3 sm:pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Activity Logs
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
          Track all your recent actions and changes
        </p>
      </div>

      {activities.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3 sm:mb-4">
            <svg
              className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-1">
            No activity yet
          </p>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Your activity logs will appear here as you use the platform.
          </p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {activities.map((log) => {
            const IconComponent = getActivityIconComponent(log.actionType);

            return (
              <div
                key={log.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start space-x-2 sm:space-x-3">
                  {/* Icon */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Formatted activity message */}
                    <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium leading-relaxed">
                      {formatActivityMessage(log)}
                    </p>

                    {/* Additional context - show card/project info if available */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-y-1 sm:space-y-0">
                      <span>{getRelativeTime(log.createdAt)}</span>

                      {/* Show full timestamp on hover */}
                      <span className="text-xs opacity-75 hidden sm:block">
                        {log.createdAt.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* User avatar */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {log.user?.avatarUrl ? (
                      <img
                        src={log.user.avatarUrl}
                        alt={`${log.user.firstName} ${log.user.lastName}`}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {log.user?.firstName?.[0] || "U"}
                          {log.user?.lastName?.[0] || ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6 sm:py-8">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <svg
              className="animate-spin w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-sm sm:text-base">
              Loading more activities...
            </span>
          </div>
        </div>
      )}

      <div ref={loaderRef} className="h-4" />
    </div>
  );
}
