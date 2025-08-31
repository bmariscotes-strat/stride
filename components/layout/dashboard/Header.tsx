"use client";

import type React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Notifications } from "@/components/shared/notifications";
import { useState, useEffect } from "react";
import NavDropdown from "@/components/shared/NavDropdown";
import UserDropdown from "@/components/shared/UserDropdown";
import { BaseNavSource } from "@/types";
import { mapToNavItem } from "@/lib/utils/map-nav-item";
import { Menu, X } from "lucide-react";

interface HeaderProps {
  teams: BaseNavSource[];
  projects: BaseNavSource[];
  userId: string | null;
}

const workspaceItems = [{ href: "/dashboard", name: "Dashboard" }];

export default function Header({ teams, projects, userId }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const isActive = (path: string) => pathname === path;

  // Mapping Navigation Items
  const teamNavItems = teams.map((team) =>
    mapToNavItem(team, {
      baseHref: "/team",
    })
  );

  const projectNavItems = projects.map((team) =>
    mapToNavItem(team, {
      baseHref: "/projects",
    })
  );

  const navLinks = [
    { href: "/", label: "About" },
    { href: "/sign-up", label: "Register" },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      <header className="w-full sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm px-4 sm:px-6 py-1 lg:px-10">
        <nav className="flex items-center justify-between max-w-10xl mx-auto">
          {/* Brand + Desktop Navigation */}
          <section className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 group flex-shrink-0"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center">
                <Image
                  src="/branding/logo.png"
                  alt="Logo"
                  width={30}
                  height={30}
                />
              </div>
              <span className="text-lg sm:text-xl font-sen font-medium text-primary">
                Stride
              </span>
            </Link>

            {/* Desktop Navigation Dropdowns */}
            <div className="hidden lg:flex items-center space-x-4">
              <NavDropdown
                title="My Workspace"
                items={workspaceItems}
                viewAllHref="/workspace"
              />
              <NavDropdown
                title="Teams"
                items={teamNavItems}
                viewAllHref="/team"
              />
              <NavDropdown
                title="Projects"
                items={projectNavItems}
                viewAllHref="/projects"
              />
            </div>

            {/* Tablet Navigation - Condensed */}
            <div className="hidden md:flex lg:hidden items-center space-x-2">
              <NavDropdown
                title="Workspace"
                items={workspaceItems}
                viewAllHref="/workspace"
              />
              <NavDropdown
                title="Teams"
                items={teamNavItems}
                viewAllHref="/team"
              />
              <NavDropdown
                title="Projects"
                items={projectNavItems}
                viewAllHref="/projects"
              />
            </div>
          </section>

          {/* Right Side Nav */}
          <section className="flex items-center space-x-2 sm:space-x-4">
            {/* Desktop/Tablet Notifications and User Dropdown */}
            <div className="hidden sm:flex items-center space-x-3">
              <Notifications
                userId={userId}
                limit={15}
                onViewAll={() => {
                  router.push("/notifications");
                }}
              />
              <UserDropdown />
            </div>

            {/* Mobile Right Section */}
            <div className="flex sm:hidden items-center space-x-2">
              <Notifications
                userId={userId}
                limit={5}
                onViewAll={() => {
                  router.push("/notifications");
                }}
              />
              <UserDropdown />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-foreground" />
              )}
            </button>
          </section>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Mobile Menu Panel */}
          <div className="md:hidden fixed top-[73px] left-0 right-0 bg-background border-b border-border shadow-lg z-50 max-h-[calc(100vh-73px)] overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Mobile Navigation Links */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Navigation
                </h3>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block transition-colors font-medium px-4 py-3 rounded-lg ${
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

              {/* Mobile Workspace Section */}
              <div className="border-t border-border pt-4 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Workspace
                </h3>
                {workspaceItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-4 py-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <Link
                  href="/workspace"
                  className="block px-4 py-2 text-sm text-primary hover:bg-accent rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  View All Workspace →
                </Link>
              </div>

              {/* Mobile Teams Section */}
              {teamNavItems.length > 0 && (
                <div className="border-t border-border pt-4 space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Teams
                  </h3>
                  {teamNavItems.slice(0, 3).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                  <Link
                    href="/team"
                    className="block px-4 py-2 text-sm text-primary hover:bg-accent rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    View All Teams →
                  </Link>
                </div>
              )}

              {/* Mobile Projects Section */}
              {projectNavItems.length > 0 && (
                <div className="border-t border-border pt-4 space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Projects
                  </h3>
                  {projectNavItems.slice(0, 3).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                  <Link
                    href="/projects"
                    className="block px-4 py-2 text-sm text-primary hover:bg-accent rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    View All Projects →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
