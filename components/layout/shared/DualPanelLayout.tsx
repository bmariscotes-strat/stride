"use client";
import { ReactNode, useState } from "react";

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

  const sidebarWidth = isCollapsed ? "0" : "20%";

  return (
    <div className={`relative min-h-screen w-full ${className}`}>
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white flex flex-col w-20 transition-all duration-300 ${
          isCollapsed ? "opacity-0 overflow-hidden" : "opacity-100"
        }`}
        style={{
          width: sidebarWidth,
          visibility: isCollapsed ? "hidden" : "visible",
        }}
      >
        <div className="h-25" /> {/* Spacer */}
        <div className="pl-12 pr-5 h-full">{left}</div>
      </aside>

      {/* Divider + Toggle Button */}
      <div
        className="hidden md:flex fixed top-0 h-screen items-center transition-all duration-300"
        style={{ left: sidebarWidth }}
      >
        <div className="w-px h-full bg-gray-300" />

        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="ml-[-0.75rem] w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 shadow-md"
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
            className="ml-2 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 shadow-md"
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
        className="transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="pr-5">{right}</div>
      </main>
    </div>
  );
}
