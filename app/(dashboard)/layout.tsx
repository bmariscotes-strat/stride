"use client";

import type React from "react";
import { useState, Suspense } from "react";
import Header from "@/components/layout/dashboard/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Main content */}
      <div>
        <Header />

        {/* Page content */}
        <main className="py-8 px-4 sm:px-6 lg:px-12">
          <Suspense>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
