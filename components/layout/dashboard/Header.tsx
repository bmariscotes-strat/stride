"use client";

import type React from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Menu, Bell, Search } from "lucide-react";

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  return (
    <div className="sticky top-0 z-30 flex h-16 items-center gap-x-4 border-b border-french_gray-300 dark:border-payne's_gray-400 bg-white dark:bg-outer_space-500 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden p-2 rounded-lg hover:bg-platinum-500 dark:hover:bg-payne's_gray-400"
      >
        <Menu size={20} />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Search bar */}
        <div className="flex flex-1 items-center">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-payne's_gray-500 dark:text-french_gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search projects, tasks..."
              className="w-full pl-10 pr-4 py-2 bg-platinum-500 dark:bg-payne's_gray-400 border border-french_gray-300 dark:border-payne's_gray-300 rounded-lg text-outer_space-500 dark:text-platinum-500 placeholder-payne's_gray-500 dark:placeholder-french_gray-400 focus:outline-none focus:ring-2 focus:ring-blue_munsell-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <button className="p-2 rounded-lg hover:bg-platinum-500 dark:hover:bg-payne's_gray-400">
            <Bell size={20} />
          </button>

          <ThemeToggle />

          <div className="w-8 h-8 bg-blue_munsell-500 rounded-full flex items-center justify-center text-white font-semibold">
            U
          </div>
        </div>
      </div>
    </div>
  );
}
