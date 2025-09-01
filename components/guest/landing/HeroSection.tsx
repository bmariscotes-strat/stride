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
    <section className="hero min-h-[90vh] lg:h-[90vh] flex items-center justify-center py-8 lg:py-0">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center h-full gap-8 sm:gap-12">
          {/* Left Side */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium mb-4 sm:mb-6 leading-tight px-2 sm:px-0">
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
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 leading-relaxed px-2 sm:px-0">
              The workspace that works for you.
            </p>
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12 px-4 sm:px-0 justify-center lg:justify-start">
              <Link href="/sign-up" className="w-full sm:w-auto">
                <button className="bg-primary dark:bg-white hover:cursor-pointer dark:text-gray-950 text-white px-6 sm:px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto">
                  Sign Up
                </button>
              </Link>
              <Link href="/sign-in" className="w-full sm:w-auto">
                <button className="border border-gray-300 hover:cursor-pointer dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 sm:px-8 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full sm:w-auto">
                  Sign In
                </button>
              </Link>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex justify-center lg:justify-end order-1 lg:order-2">
            <TypingToVideo />
          </div>
        </div>
      </div>
    </section>
  );
}
