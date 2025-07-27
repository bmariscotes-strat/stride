"use client";

import type React from "react";
import Link from "next/link";
import {
  Home,
  FolderOpen,
  Users,
  Settings,
  X,
  BarChart3,
  Calendar,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home, current: true },
  { name: "Projects", href: "/projects", icon: FolderOpen, current: false },
  { name: "Team", href: "/team", icon: Users, current: false },
  { name: "Analytics", href: "/analytics", icon: BarChart3, current: false },
  { name: "Calendar", href: "/calendar", icon: Calendar, current: false },
  { name: "Settings", href: "/settings", icon: Settings, current: false },
];

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-outer_space-500 border-r border-french_gray-300 dark:border-payne's_gray-400 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-french_gray-300 dark:border-payne's_gray-400">
          <Link href="/" className="text-2xl font-bold text-blue_munsell-500">
            ProjectFlow
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-platinum-500 dark:hover:bg-payne's_gray-400"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              📋 <strong>Task 2.6:</strong> Create protected dashboard layout
            </p>
          </div>

          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    item.current
                      ? "bg-blue_munsell-100 dark:bg-blue_munsell-900 text-blue_munsell-700 dark:text-blue_munsell-300"
                      : "text-outer_space-500 dark:text-platinum-500 hover:bg-platinum-500 dark:hover:bg-payne's_gray-400"
                  }`}
                >
                  <item.icon className="mr-3" size={20} />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
