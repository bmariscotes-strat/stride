interface Deadline {
  id: string;
  title: string;
  dueDate: Date;
  priority: "high" | "medium" | "low";
}

interface UpcomingDeadlinesProps {
  deadlines?: Deadline[];
}

export function UpcomingDeadlines({ deadlines }: UpcomingDeadlinesProps) {
  if (!deadlines || deadlines.length === 0) {
    return (
      <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-french_gray-300 dark:border-payne's_gray-400 p-6">
        <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-4">
          Upcoming Deadlines
        </h3>
        <div className="text-center py-8">
          <p className="text-payne's_gray-500 dark:text-french_gray-400">
            No upcoming deadlines
          </p>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-french_gray-300 dark:border-payne's_gray-400 p-6">
      <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-4">
        Upcoming Deadlines
      </h3>

      <div className="space-y-3">
        {deadlines.map((deadline) => (
          <div
            key={deadline.id}
            className="p-3 bg-platinum-800 dark:bg-outer_space-400 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-outer_space-500 dark:text-platinum-500">
                  {deadline.title}
                </p>
                <p className="text-sm text-payne's_gray-500 dark:text-french_gray-400">
                  Due: {deadline.dueDate.toLocaleDateString()}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(deadline.priority)}`}
              >
                {deadline.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
