"use client";

import type React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Notifications } from "@/components/shared/notifications";
import { useState } from "react";
import NavDropdown from "@/components/shared/NavDropdown";
import UserDropdown from "@/components/shared/UserDropdown";
import { BaseNavSource } from "@/types";
import { mapToNavItem } from "@/lib/utils/map-nav-item";

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

  return (
    <header className="w-full sticky top-0 z-50 border-b border-border bg-background px-6 py-1 sm:px-6 lg:px-10">
      <nav className="flex items-center justify-between max-w-10xl mx-auto">
        {/* Brand + Dropdowns */}
        <section className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-1 group">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center">
              <Image
                src="/branding/logo.png"
                alt="Logo"
                width={30}
                height={30}
              />
            </div>
            <span className="text-xl font-sen font-medium text-primary">
              Stride
            </span>
          </Link>

          {/* Workspace Items */}
          <NavDropdown
            title="My Workspace"
            items={workspaceItems}
            viewAllHref="/workspace"
          />

          {/* Teams */}
          <NavDropdown title="Teams" items={teamNavItems} viewAllHref="/team" />

          {/* Projects */}
          <NavDropdown
            title="Projects"
            items={projectNavItems}
            viewAllHref="/projects"
          />
        </section>

        {/* Right Side Nav */}
        <section className="flex items-center space-x-4">
          <Notifications
            userId={userId}
            limit={15}
            onViewAll={() => {
              router.push("/notifications");
            }}
          />
          <UserDropdown />
        </section>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute left-0 right-0 bg-background border-b-2 pb-1 border-t-2 mt-2 border-border">
          <div className="flex flex-col space-y-4 p-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors font-medium px-4 py-2 rounded-lg ${
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
            <Link
              href="/sign-in"
              className="mx-4 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-accent hover:border-primary/80 transition-all duration-200 font-medium text-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
