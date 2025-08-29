"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <header className="w-full px-6 py-3 bg-background sm:px-6 lg:px-37 sticky top-0 z-50 border-b border-border">
      <nav className="flex items-center justify-between max-w-10xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10  rounded-lg flex items-center justify-center">
            <Image src="/branding/logo.png" alt="Logo" width={60} height={60} />
          </div>
          <span className="text-2xl font-sen font-medium text-primary">
            Stride
          </span>
        </Link>

        {/* Navigation Links - Desktop */}
        <div className="hidden md:flex items-center space-x-8">
          <ThemeToggle />
          <Link
            href="/sign-in"
            className="px-4 py-2 geist border-2 border-primary text-primary rounded-lg font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-200"
          >
            Get Started
          </Link>
        </div>

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
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  isMobileMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute left-0 right-0 bg-background border-b-2 pb-1 border-t-2 mt-2 border-border">
          <div className="flex flex-col space-y-4 p-4">
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
