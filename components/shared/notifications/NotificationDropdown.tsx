// components/notifications/NotificationDropdown.tsx
import React, { useCallback, useRef, useEffect } from "react";
import { X, Bell, Loader2 } from "lucide-react";
import { NotificationWithRelations } from "@/types";
import NotificationItem from "./NotificationItem";

interface NotificationDropdownProps {
  notifications: NotificationWithRelations[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore?: boolean;
  hasMoreNotifications?: boolean;
  error: string | null;
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: number) => void;
  onRemoveNotification: (id: number) => void;
  onRefresh: () => void;
  onLoadMore?: () => void;
  onViewAll?: () => void;
}

export default function NotificationDropdown({
  notifications,
  unreadCount,
  isLoading,
  isLoadingMore = false,
  hasMoreNotifications = false,
  error,
  onClose,
  onMarkAllAsRead,
  onMarkAsRead,
  onRemoveNotification,
  onRefresh,
  onLoadMore,
  onViewAll,
}: NotificationDropdownProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (
        entry.isIntersecting &&
        !isLoading &&
        !isLoadingMore &&
        hasMoreNotifications &&
        onLoadMore
      ) {
        console.log("[NotificationDropdown] Loading more notifications...");
        onLoadMore();
      }
    },
    [isLoading, isLoadingMore, hasMoreNotifications, onLoadMore]
  );

  const fetchSlugs = async (teamId?: string, projectId?: string) => {
    try {
      // Must provide at least one ID
      if (!teamId && !projectId) {
        console.warn("[fetchSlugs] No teamId or projectId provided");
        return { teamSlug: "", projectSlug: undefined };
      }

      const res = await fetch("/api/slugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, projectId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Failed to fetch slugs: ${errorData.error}`);
      }

      return await res.json();
    } catch (err) {
      console.error("[fetchSlugs] Error:", err);
      return { teamSlug: "", projectSlug: undefined };
    }
  };

  // Set up intersection observer
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    if (!trigger || !onLoadMore) return;

    const observer = new IntersectionObserver(handleIntersection, {
      root: scrollContainerRef.current,
      rootMargin: "100px",
      threshold: 0.1,
    });

    observer.observe(trigger);

    return () => {
      observer.unobserve(trigger);
      observer.disconnect();
    };
  }, [handleIntersection, onLoadMore]);

  return (
    <div className="fixed sm:absolute custom-scrollbar left-4 right-4 sm:left-auto sm:right-0 sm:w-80 md:w-96 lg:w-96 bg-white dark:bg-gray-800 rounded sm:rounded-lg shadow-xl border-0 sm:border border-gray-200 dark:border-gray-700 z-[9999] max-h-[80vh] sm:max-h-96 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">
              ({unreadCount} unread)
            </span>
          )}
        </h3>
        <div className="flex items-center space-x-1 sm:space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
              disabled={isLoading}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500">
          <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
          <button
            onClick={onRefresh}
            className="mt-2 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div
        ref={scrollContainerRef}
        className="max-h-72 sm:max-h-80 overflow-y-auto"
      >
        {isLoading && notifications.length === 0 ? (
          <div className="py-6 sm:py-8">
            {/* Just empty space while loading initially */}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-gray-500 dark:text-gray-400">
            <Bell className="w-10 h-10 sm:w-12 sm:h-12 mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-xs sm:text-sm">No notifications yet</p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onRemove={onRemoveNotification}
                fetchSlugs={fetchSlugs}
                onClose={onClose}
              />
            ))}

            {/* Load More Trigger */}
            {hasMoreNotifications && onLoadMore && (
              <div ref={loadMoreTriggerRef} className="h-4" />
            )}

            {/* Loading More Indicator */}
            {isLoadingMore && (
              <div className="flex items-center justify-center py-3 sm:py-4 border-t border-gray-100 dark:border-gray-700">
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-2 text-blue-600 dark:text-blue-400" />
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Loading more...
                </span>
              </div>
            )}

            {/* No More Notifications Indicator */}
            {!hasMoreNotifications &&
              notifications.length > 0 &&
              notifications.length >= 10 && (
                <div className="flex items-center justify-center py-3 sm:py-4 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    No more notifications
                  </span>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}
