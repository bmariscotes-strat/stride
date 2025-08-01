import { ReactNode } from "react";

/**
 * DualPanelLayout
 *
 * A reusable two-column layout with a left panel (acts like a sidebar)
 * and a right panel for main content.
 * The left panel scales up to 30% but maintains a minimum width.
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
  return (
    <div className={`flex flex-col md:flex-row w-full gap-6 ${className}`}>
      <aside className="w-full md:max-w-[30%] md:min-w-[280px] md:flex-shrink-0">
        {left}
      </aside>
      <main className="w-full">{right}</main>
    </div>
  );
}
