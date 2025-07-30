"use client";

import type React from "react";
import { useState, Suspense } from "react";
import Header from "@/components/layout/dashboard/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} /> */}

      {/* Main content */}
      <div>
        <Header setSidebarOpen={setSidebarOpen} />

        {/* Page content */}
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          <Suspense>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
