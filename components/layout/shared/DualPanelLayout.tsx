"use client";

import { ReactNode, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * DualPanelLayout
 *
 * A two-column layout with a fixed left panel (sidebar) that stays in place
 * while the page scrolls, and a collapsible toggle.
 */
export default function DualPanelLayout({
  left,
  right,
  className = "",
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Prevent scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isMobileSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobile, isMobileSidebarOpen]);

  const sidebarWidth = isCollapsed ? "0" : "20%";

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className={`relative min-h-screen w-full ${className}`}>
      {/* Mobile Arrow Button */}
      {isMobile && (
        <button
          onClick={toggleMobileSidebar}
          className={`fixed top-1/2 -translate-y-1/2 z-50 w-8 h-12 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-md flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300 ${
            isMobileSidebarOpen
              ? "left-80 rounded-l-lg border-r-0"
              : "left-0 rounded-r-lg border-l-0"
          }`}
        >
          {isMobileSidebarOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Mobile Backdrop */}
      {isMobile && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-30"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white dark:bg-gray-900 flex flex-col w-20 transition-all duration-300 ${
          isMobile
            ? `!w-80 border-r border-gray-200 dark:border-gray-700 shadow-lg z-40 ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`
            : isCollapsed
              ? "opacity-0 overflow-hidden"
              : "opacity-100"
        }`}
        style={
          !isMobile
            ? {
                width: sidebarWidth,
                visibility: isCollapsed ? "hidden" : "visible",
              }
            : undefined
        }
      >
        <div className="h-25" /> {/* Spacer */}
        <div
          className={`h-full ${isMobile ? "px-4 overflow-y-auto" : "pl-12 pr-5"}`}
        >
          {left}
        </div>
      </aside>

      {/* Divider + Toggle Button */}
      <div
        className="hidden md:flex fixed top-0 h-screen items-center transition-all duration-300"
        style={{ left: sidebarWidth }}
      >
        <div className="w-px h-full bg-gray-300 dark:bg-gray-600" />

        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="ml-[-0.75rem] w-6 h-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 shadow-md"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="ml-2 w-6 h-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 shadow-md"
          >
            <svg
              className="w-3 h-3 rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${isMobile ? "ml-0 pt-4" : ""}`}
        style={!isMobile ? { marginLeft: sidebarWidth } : undefined}
      >
        <div className="pr-1 md:pr-5 lg:pr-5">{right}</div>
      </main>
    </div>
  );
}
