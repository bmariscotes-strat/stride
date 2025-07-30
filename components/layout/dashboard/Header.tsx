"use client";

import type React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Notifications from "@/components/shared/Notification";
import { useState } from "react";
import NavDropdown from "@/components/shared/NavDropdown";

const teamsPlaceholder = [
  {
    slug: "getting-started-with-nextjs",
    name: "Getting Started with Next.js",
    type: "Software Project Team",
  },
  {
    slug: "typescript-best-practices",
    name: "TypeScript Best Practices",
    type: "Business Team",
  },
  {
    slug: "react-performance-tips",
    name: "React Performance Tips",
    type: "Main Team",
  },
];

const projectsPlaceholder = [
  {
    slug: "my-team-1",
    name: "My Team",
    description: "Lorem ipsum, lorem ipsum.....",
  },
  {
    slug: "my-team-2",
    name: "ProjectFlow Team",
    description: "Write better TypeScript code",
  },
  {
    slug: "my-team-3",
    name: "Stratpoint Team",
    description: "Optimize your React applications",
  },
];

const workspaceItems = [
  { href: "/dashboard", name: "Dashboard" },
  { href: "/calendar", name: "Calendar" },
  { href: "/analytics", name: "Analytics" },
];

export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: "/", label: "About" },
    { href: "/sign-up", label: "Register" },
  ];

  return (
    <header className="w-full px-6 py-1 bg-background sm:px-6 lg:px-10 sticky top-0 z-50 border-b border-border">
      <nav className="flex items-center justify-between max-w-10xl mx-auto">
        {/* Left Side Nav */}
        <section className="flex items-center space-x-6">
          {/* Brand */}
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

          {/* Workspace */}
          <NavDropdown
            title="My Workspace"
            items={workspaceItems}
            viewAllHref="/workspace"
          />

          {/* Teams */}
          <NavDropdown
            title="Teams"
            items={teamsPlaceholder}
            basePath="/blog"
            viewAllHref="/blog"
          />

          {/* Projects */}
          <NavDropdown
            title="Projects"
            items={projectsPlaceholder}
            basePath="/blog"
            viewAllHref="/blog"
          />
        </section>

        {/* Right Side Nav */}
        <section className="flex items-center space-x-4">
          <Notifications />
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/sign-in">Get Started</Link>
          </div>
        </section>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-muted-foreground hover:text-primary p-2 rounded-lg hover:bg-accent transition-colors"
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle mobile menu"
          >
            {/* SVG content */}
          </button>
        </div>
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
