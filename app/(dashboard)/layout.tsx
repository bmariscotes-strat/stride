// app/(dashboard)/layout.tsx
import { Suspense } from "react";
import HeaderWrapper from "./header-wrapper";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div>
        <Suspense
          fallback={
            <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="px-4 sm:px-6 lg:px-12 h-full flex items-center">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          }
        >
          <HeaderWrapper />
        </Suspense>

        <main className="py-3 px-4 sm:px-6 lg:px-12">
          <Suspense
            fallback={
              <div className="animate-pulse space-y-6">
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-24 bg-gray-200 dark:bg-gray-700 rounded"
                    ></div>
                  ))}
                </div>
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
