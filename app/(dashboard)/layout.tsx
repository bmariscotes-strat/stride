"use client";

import type React from "react";
import { useState, Suspense } from "react";
import Header from "@/components/layout/dashboard/Header";
import Sidebar from "@/components/layout/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-platinum-900 dark:bg-outer_space-600">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main content */}
      <div className="lg:pl-64">
        <Header setSidebarOpen={setSidebarOpen} />

        {/* Page content */}
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          <Suspense>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
