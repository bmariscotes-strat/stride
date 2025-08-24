export function DashboardHeader() {
  const currentTime = new Date().getHours();
  let greeting = "Good morning";

  if (currentTime >= 12 && currentTime < 17) {
    greeting = "Good afternoon";
  } else if (currentTime >= 17) {
    greeting = "Good evening";
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-outer_space-500 dark:text-platinum-500">
        {greeting}! 👋
      </h1>
      <p className="text-payne's_gray-500 dark:text-french_gray-500 mt-2">
        Here's what's happening with your projects and tasks today.
      </p>
    </div>
  );
}
