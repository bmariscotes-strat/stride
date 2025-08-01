"use client";
import { ReactNode, useState } from "react";

/**
 * DualPanelLayout
 *
 * A reusable two-column layout with a collapsible left panel (acts like a sidebar)
 * and a right panel for main content.
 *
 * @param left - Left panel (e.g., sidebar)
 * @param right - Right panel (e.g., main content)
 * @param className - Optional wrapper className
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

  return (
    <div className={`relative flex flex-col md:flex-row w-full ${className}`}>
      {/* Sidebar */}
      <aside
        className={`
          transition-all duration-300 overflow-hidden
          ${isCollapsed ? "md:w-0" : "md:w-[20%]"}
          w-full
        `}
      >
        {left}
      </aside>

      {/* Divider + Toggle Button */}
      <div
        className={`
          hidden md:flex fixed top-0 left-0 h-screen  items-center
          transition-transform duration-300
          ${isCollapsed ? "translate-x-0" : "translate-x-[20vw]"}
        `}
      >
        {/* Divider */}
        <div className="w-px h-full bg-gray-300" />

        {/* Toggle Button */}
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
      <main className="w-full">
        <div className="pl-10 pr-5">{right}</div>
      </main>
    </div>
  );
}
