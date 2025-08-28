"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import TypingToVideo from "@/components/guest/landing/TransitionVideo";

export default function HeroSection() {
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
    <section className="h-screen flex items-center justify-center">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center h-full">
          {/* Left Side */}
          <div className="text-left">
            <h1 className="text-4xl text-gray-900 sm:text-5xl font-medium mb-6">
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
            </h1>
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
