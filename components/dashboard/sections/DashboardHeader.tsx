interface DashboardHeaderProps {
  user?: any;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  if (!user) {
    return null;
  }

  const currentTime = new Date().getHours();
  let greeting = "Good morning";

  if (currentTime >= 12 && currentTime < 17) {
    greeting = "Good afternoon";
  } else if (currentTime >= 17) {
    greeting = "Good evening";
  }

  const userName = user?.name || user?.firstName || "there"; // Fallback to "there" if no name

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue_munsell-50 to-platinum-200 dark:from-outer_space-600 dark:to-outer_space-500 rounded-2xl py-3 border-blue_munsell-100 dark:border-outer_space-400">
      <div className="absolute inset-0 bg-gradient-to-br from-blue_munsell-500/5 to-transparent"></div>
      <div className="relative">
        <h1 className="text-2xl font-bold text-primary dark:text-platinum-100 mb-2">
          {greeting}, {userName}!
        </h1>
        <p className="text-payne's_gray-600 dark:text-french_gray-300 text-md">
          Here's what's happening with your projects and tasks today.
        </p>
      </div>
    </div>
  );
}
