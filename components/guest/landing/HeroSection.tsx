"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Link from "next/link";
import TypingToVideo from "@/components/guest/landing/TransitionVideo";

export default function HeroSection() {
  const strideRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (strideRef.current) {
      const letters = strideRef.current.querySelectorAll("span");

      gsap.fromTo(
        letters,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.8, stagger: 0.1, ease: "back.out(1.7)" }
      );
    }
  }, []);

  return (
    <section className="h-[90vh] flex items-center justify-center">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center h-full gap-12">
          {/* Left Side */}
          <div className="text-left">
            <h1 className="text-4xl sm:text-5xl font-medium mb-6 leading-tight">
              Take control of your projects and{" "}
              <span
                ref={strideRef}
                className="font-bold text-primary inline-flex font-sen"
              >
                {"Stride".split("").map((char, i) => (
                  <span key={i} className="inline-block">
                    {char}
                  </span>
                ))}
              </span>{" "}
              forward with ease.
            </h1>{" "}
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              The workspace that works for you.
            </p>
            {/* CTAs */}
            <div className="flex gap-4 mb-12">
              <Link href="/sign-up">
                <button className="bg-primary dark:bg-white hover:cursor-pointer dark:text-gray-950 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                  Sign Up
                </button>
              </Link>
              <Link href="/sign-in">
                <button className="border border-gray-300 hover:cursor-pointer dark:border-gray-600 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Sign In
                </button>
              </Link>
            </div>
            {/* Bottom Features - Simplified */}
            {/* <div className="grid grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">
                  Fast Setup
                </h3>
                <p className="text-sm text-gray-500">Ready in minutes</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">
                  Team Sync
                </h3>
                <p className="text-sm text-gray-500">Real-time collaboration</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">
                  Analytics
                </h3>
                <p className="text-sm text-gray-500">Track progress</p>
              </div>
            </div> */}
          </div>

          {/* Right Side */}
          <div className="flex justify-center lg:justify-end">
            <TypingToVideo />
          </div>
        </div>
      </div>
    </section>
  );
}
