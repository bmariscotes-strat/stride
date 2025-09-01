"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Plus, Rocket } from "lucide-react";

interface NavItem {
  readonly slug?: string; // Optional for direct links
  readonly href?: string; // Direct link path
  readonly name: string;
  readonly description?: string;
  readonly type?: string;
  readonly icon?: React.ReactNode;
}

interface NavDropdownProps {
  readonly title: string;
  readonly items: readonly NavItem[];
  readonly basePath?: string;
  readonly viewAllHref: string;
  readonly className?: string;
  readonly maxVisibleItems?: number;
  readonly onItemClick?: (item: NavItem) => void;
  readonly emptyStateText?: string;
  readonly createButtonText?: string;
}

const NavDropdown = React.memo<NavDropdownProps>(
  ({
    title,
    items,
    basePath,
    viewAllHref,
    className = "",
    maxVisibleItems = 8,
    onItemClick,
    emptyStateText,
    createButtonText,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pathname = usePathname();

    // Check if current route is active for this dropdown
    const isRouteActive = useCallback(() => {
      // Check if current path matches viewAllHref exactly
      if (pathname === viewAllHref) {
        return true;
      }

      // Check if current path starts with viewAllHref (for nested routes)
      if (pathname.startsWith(viewAllHref + "/")) {
        return true;
      }

      // Check if current path starts with basePath (for nested routes)
      if (
        basePath &&
        (pathname.startsWith(basePath + "/") || pathname === basePath)
      ) {
        return true;
      }

      // Check if current path matches or is nested under any item's href
      return items.some((item) => {
        if (item.href) {
          return pathname === item.href || pathname.startsWith(item.href + "/");
        }
        if (item.slug && basePath) {
          const itemPath = `${basePath}/${item.slug}`;
          return pathname === itemPath || pathname.startsWith(itemPath + "/");
        }
        return false;
      });
    }, [pathname, viewAllHref, basePath, items]);

    const closeDropdown = useCallback(() => {
      setIsOpen(false);
    }, []);

    const openDropdown = useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsOpen(true);
    }, []);

    const scheduleClose = useCallback(() => {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 150);
    }, []);

    const handleMouseEnter = useCallback(() => {
      openDropdown();
    }, [openDropdown]);

    const handleMouseLeave = useCallback(() => {
      scheduleClose();
    }, [scheduleClose]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        switch (e.key) {
          case "Escape":
            closeDropdown();
            break;
          case "Enter":
          case " ":
            if (e.target === e.currentTarget.querySelector("button")) {
              e.preventDefault();
              setIsOpen((prev) => !prev);
            }
            break;
        }
      },
      [closeDropdown]
    );

    const handleToggle = useCallback(() => {
      setIsOpen((prev) => !prev);
    }, []);

    const handleItemClick = useCallback(
      (item: NavItem) => {
        closeDropdown();
        onItemClick?.(item);
      },
      [closeDropdown, onItemClick]
    );

    // Helper function to get the correct href for an item
    const getItemHref = useCallback(
      (item: NavItem): string => {
        // If item has direct href, use it
        if (item.href) {
          return item.href;
        }
        // If item has slug and basePath is provided, construct the path
        if (item.slug && basePath) {
          return `${basePath}/${item.slug}`;
        }
        // Fallback (this shouldn't happen with proper usage)
        console.warn(
          "NavDropdown: Item missing both href and slug/basePath combination",
          item
        );
        return "#";
      },
      [basePath]
    );

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          closeDropdown();
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }, [isOpen, closeDropdown]);

    const visibleItems = items.slice(0, maxVisibleItems);
    const hasMoreItems = items.length > maxVisibleItems;
    const routeActive = isRouteActive();
    const isEmpty = items.length === 0;

    return (
      <div
        ref={dropdownRef}
        className={`relative ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
      >
        {/* Trigger Button */}
        <button
          type="button"
          className={`
          relative flex items-center gap-1 px-1 py-2 text-sm transition-colors
          ${
            routeActive
              ? "text-primary font-semibold"
              : "text-gray-700 dark:text-gray-300 font-medium hover:text-gray-900 dark:hover:text-gray-100"
          }
          ${isOpen ? "text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-md" : "hover:bg-gray-50 dark:hover:bg-gray-800 hover:rounded-md"}
        `}
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={`${title} menu`}
        >
          <span>{title}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />

          {/* Active Route Underline */}
          {routeActive && (
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
              aria-hidden="true"
            />
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className="absolute top-full left-0 mt-1 min-w-[280px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
            role="menu"
            aria-label={`${title} options`}
          >
            {isEmpty ? (
              /* Empty State */
              <div className="px-4 py-6 text-center">
                <div className="text-gray-400 dark:text-gray-500 mb-3">
                  <Rocket className="w-8 h-8 mx-auto opacity-50" />
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {emptyStateText || `No ${title.toLowerCase()} yet`}
                </div>
                <Link
                  href={viewAllHref}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary/80 hover:text-white/80 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  onClick={closeDropdown}
                  prefetch={false}
                  role="menuitem"
                >
                  <Plus className="w-4 h-4" />
                  {createButtonText || `Create ${title.slice(0, -1)}`}
                </Link>
              </div>
            ) : (
              <>
                {/* Items List */}
                <div className="max-h-64 overflow-y-auto">
                  {visibleItems.map((item, index) => {
                    const href = getItemHref(item);
                    const isActive = pathname === href;
                    // Use a combination of slug/href and index for unique keys
                    const key = item.slug || item.href || `item-${index}`;

                    return (
                      <Link
                        key={key}
                        href={href}
                        className={`
                        flex items-center gap-3 px-4 py-2 text-sm transition-colors rounded-md mx-2
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                        ${
                          isActive
                            ? "bg-blue-50 dark:bg-blue-900/30 text-primary border-r-2 border-blue-600"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                        }
                      `}
                        onClick={() => handleItemClick(item)}
                        prefetch={false}
                        role="menuitem"
                      >
                        {item.icon && (
                          <div
                            className={`flex-shrink-0 w-5 h-5 ${
                              isActive
                                ? "text-primary"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                            aria-hidden="true"
                          >
                            {item.icon}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {item.name}
                          </div>
                          {(item.description || item.type) && (
                            <div
                              className={`text-xs mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap ${
                                isActive
                                  ? "text-primary"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                              style={{ maxWidth: "220px" }}
                              title={item.description || item.type}
                            >
                              {item.description || item.type}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Items Counter */}
                {hasMoreItems && (
                  <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
                    <div className="px-4 py-1 text-xs text-gray-500 dark:text-gray-400">
                      Showing {visibleItems.length} of {items.length}{" "}
                      {title.toLowerCase()}
                    </div>
                  </div>
                )}

                {/* View All Link */}
                {(hasMoreItems || items.some((item) => item.slug)) && (
                  <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
                    <Link
                      href={viewAllHref}
                      className="flex items-center justify-center px-4 py-2 text-sm font-medium text-primary hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-md mx-2"
                      onClick={closeDropdown}
                      prefetch={false}
                      role="menuitem"
                    >
                      View All {title}
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);

NavDropdown.displayName = "NavDropdown";

export default NavDropdown;
