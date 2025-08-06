"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileMenuProps {
  teams: Array<{
    slug: string;
    name: string;
    type: string;
  }>;
  projects: Array<{
    slug: string;
    name: string;
    description: string;
  }>;
}

export default function MobileMenu({ teams, projects }: MobileMenuProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/calendar", label: "Calendar" },
    { href: "/analytics", label: "Analytics" },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-muted-foreground hover:text-primary p-2 rounded-lg hover:bg-accent transition-colors"
          aria-expanded={isMobileMenuOpen}
          aria-label="Toggle mobile menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute left-0 right-0 bg-background border-b-2 pb-1 border-t-2 mt-2 border-border shadow-lg z-50">
          <div className="flex flex-col space-y-2 p-4">
            {/* Workspace Links */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Workspace
              </h3>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block transition-colors font-medium px-4 py-2 rounded-lg ${
                    isActive(link.href)
                      ? "text-primary bg-accent font-semibold"
                      : "text-muted-foreground hover:text-primary hover:bg-accent"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  scroll={false}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Teams */}
            {teams.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Teams
                </h3>
                {teams.map((team) => (
                  <Link
                    key={team.slug}
                    href={`/team/${team.slug}`}
                    className="block px-4 py-2 rounded-lg hover:bg-accent transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="font-medium text-foreground">
                      {team.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {team.type}
                    </div>
                  </Link>
                ))}
                <Link
                  href="/team"
                  className="block px-4 py-2 mt-2 text-sm text-primary hover:bg-accent rounded transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  View all teams
                </Link>
              </div>
            )}

            {/* Projects */}
            {projects.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Projects
                </h3>
                {projects.map((project) => (
                  <Link
                    key={project.slug}
                    href={`/workspace/${project.slug}`}
                    className="block px-4 py-2 rounded-lg hover:bg-accent transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="font-medium text-foreground">
                      {project.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {project.description}
                    </div>
                  </Link>
                ))}
                <Link
                  href="/work/projects"
                  className="block px-4 py-2 mt-2 text-sm text-primary hover:bg-accent rounded transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  View all projects
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
