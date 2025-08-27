"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Header from "@/components/layout/guest/Header";

export default function HomePage() {
  const strideRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (strideRef.current) {
      const letters = strideRef.current.querySelectorAll("span");

      gsap.fromTo(
        letters,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.5, stagger: 0.1, ease: "back.out(1.7)" }
      );
    }
  }, []);

  return (
    <div className="relative min-h-screen h-screen flex flex-col overflow-hidden">
      {/* Blurry background */}
      <div className="absolute inset-0 -z-10">
        {/* Top Left - Aqua Highlight */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#58c6eb]/30 blur-[120px] rounded-full" />

        {/* Right Side - Accent Blue */}
        <div className="absolute top-40 -right-20 w-96 h-96 bg-[#2c6fc6]/30 blur-[120px] rounded-full" />

        {/* Bottom Center - Deep Navy */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#1d416b]/20 blur-[180px] rounded-full" />
      </div>

      {/* Header */}
      <Header />

      {/* Hero Section */}
      <main className="md:flex-1 lg:flex-1 px-4 py-2 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 items-center h-full">
            {/* Left Side - Content */}
            <div className="text-left lg:text-left">
              <h1 className="text-md text-gray-900 sm:text-5xl font-medium  mb-4 lg:mb-6">
                Take control of your projects and move forward with{" "}
                <span
                  ref={strideRef}
                  className="font-bold text-primary inline-flex font-sen"
                >
                  {"Stride".split("").map((char, i) => (
                    <span key={i} className="inline-block">
                      {char}
                    </span>
                  ))}
                </span>
              </h1>

              <div className="flex flex-col sm:flex-row gap-4 w-full">
                {/* <Link href="/sign-up">
                  <Button
                    variant="primary"
                    style="filled"
                    size="lg"
                    className="font-semibold tracking-wide w-full"
                  >
                    Sign Up
                  </Button>
                </Link> */}
              </div>
            </div>

            {/* Right Side - Illustration Area */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">Image Placeholder</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
