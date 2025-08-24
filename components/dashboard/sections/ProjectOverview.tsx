import Link from "next/link";

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  updatedAt: Date;
  colorTheme?: string;
}

interface ProjectOverviewProps {
  projects?: Project[];
}

export function ProjectOverview({ projects }: ProjectOverviewProps) {
  if (!projects || projects.length === 0) {
    return (
      <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-french_gray-300 dark:border-payne's_gray-400 p-6">
        <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-4">
          Recent Projects
        </h3>
        <div className="text-center py-8">
          <p className="text-payne's_gray-500 dark:text-french_gray-400">
            No projects yet. Create your first project to get started!
          </p>
        </div>
      </div>
    );
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="bg-white dark:bg-outer_space-500 rounded-lg border border-french_gray-300 dark:border-payne's_gray-400 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500">
          Recent Projects
        </h3>
        <Link
          href="/projects"
          className="text-sm text-blue_munsell-500 hover:text-blue_munsell-600 transition-colors"
        >
          View all
        </Link>
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.slug}`}
            className="block p-3 bg-platinum-800 dark:bg-outer_space-400 rounded-lg hover:bg-platinum-600 dark:hover:bg-outer_space-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-outer_space-500 dark:text-platinum-500">
                  {project.name}
                </div>
                {project.description && (
                  <div className="text-sm text-payne's_gray-500 dark:text-french_gray-400 truncate">
                    {project.description}
                  </div>
                )}
                <div className="text-xs text-payne's_gray-400 dark:text-french_gray-500">
                  Updated {formatTimeAgo(project.updatedAt)}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
