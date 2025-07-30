"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

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
  readonly basePath?: string; // Optional for direct links mode
  readonly viewAllHref: string;
  readonly className?: string;
  readonly maxVisibleItems?: number;
  readonly onItemClick?: (item: NavItem) => void;
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
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pathname = usePathname();

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
          flex items-center gap-1 px-1 py-2 text-sm font-medium text-gray-700 
          hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          ${isOpen ? "text-gray-900 bg-gray-50" : ""}
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
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className="absolute top-full left-0 mt-1 min-w-[280px] bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
            role="menu"
            aria-label={`${title} options`}
          >
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
                    flex items-center gap-3 px-4 py-2 text-sm transition-colors
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                    ${
                      isActive
                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                    onClick={() => handleItemClick(item)}
                    prefetch={false}
                    role="menuitem"
                  >
                    {item.icon && (
                      <div
                        className={`flex-shrink-0 w-5 h-5 ${
                          isActive ? "text-blue-600" : "text-gray-400"
                        }`}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      {item.description ||
                        (item.type && (
                          <div
                            className={`text-xs mt-0.5 truncate ${
                              isActive ? "text-blue-600" : "text-gray-500"
                            }`}
                          >
                            {item.description}
                            {item.type}
                          </div>
                        ))}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Items Counter */}
            {hasMoreItems && (
              <div className="border-t border-gray-100 mt-2 pt-2">
                <div className="px-4 py-1 text-xs text-gray-500">
                  Showing {visibleItems.length} of {items.length}{" "}
                  {title.toLowerCase()}
                </div>
              </div>
            )}

            {/* View All Link - Only show if not all items are direct links or if there are more items */}
            {(hasMoreItems || items.some((item) => item.slug)) && (
              <div className="border-t border-gray-100 mt-2 pt-2">
                <Link
                  href={viewAllHref}
                  className="flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                  onClick={closeDropdown}
                  prefetch={false}
                  role="menuitem"
                >
                  View All {title}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

NavDropdown.displayName = "NavDropdown";

export default NavDropdown;
