interface Activity {
  id: number;
  actionType: string;
  userId: string;
  createdAt: Date;
  // Add other fields from your activity log schema
}

interface RecentActivityProps {
  activities?: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-french_gray-300 dark:border-payne's_gray-400 p-6">
        <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-4">
          Recent Activity
        </h3>
        <div className="text-center py-8">
          <p className="text-payne's_gray-500 dark:text-french_gray-400">
            No recent activity
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-french_gray-300 dark:border-payne's_gray-400 p-6">
      <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-4">
        Recent Activity
      </h3>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start space-x-3 p-3 bg-platinum-800 dark:bg-outer_space-400 rounded-lg"
          >
            <div className="flex-1">
              <p className="text-sm text-outer_space-500 dark:text-platinum-500">
                {activity.actionType}
              </p>
              <p className="text-xs text-payne's_gray-500 dark:text-french_gray-400">
                {activity.createdAt.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
