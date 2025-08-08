"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ActivityLogResult } from "@/types/enums/activity";
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

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Activity Logs</h1>

      {activities.map((log) => (
        <div key={log.id} className="border rounded p-3">
          <p className="text-sm">
            <strong>
              {log.user?.firstName} {log.user?.lastName}
            </strong>{" "}
            performed <strong>{log.actionType}</strong>
          </p>
          {log.card?.title && (
            <p className="text-xs text-gray-500">Card: {log.card.title}</p>
          )}
          <p className="text-xs text-gray-400">
            {new Date(log.createdAt).toLocaleString()}
          </p>
        </div>
      ))}

      {loading && (
        <p className="text-sm text-center text-gray-400">Loading...</p>
      )}
      <div ref={loaderRef} className="h-10" />
    </div>
  );
}
