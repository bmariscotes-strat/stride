interface Activity {
  id: number;
  actionType: string;
  userId: string;
  createdAt: Date;
}

interface RecentActivityProps {
  activities?: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center mr-3">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            Recent Activity
          </h3>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No recent activity
          </p>
        </div>
      </div>
    );
  }

  const getActivityDot = (index: number) => {
    switch (index) {
      case 0:
        return "bg-blue-500";
      case 1:
        return "bg-green-500";
      case 2:
        return "bg-amber-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center mr-3">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
          Recent Activity
        </h3>
      </div>

      {/* Activities list */}
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="p-5 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-transparent hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              {/* Left side */}
              <div className="flex items-start space-x-3 flex-1">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 ${getActivityDot(index)}`}
                ></div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {activity.actionType}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center mt-1">
                    <svg
                      className="w-4 h-4 mr-1 text-gray-400 dark:text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {activity.createdAt.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Right side: user badge */}
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {activity.userId}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
