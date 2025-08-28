// components/guest/landing/NavigationPills.tsx
"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import type { Swiper as SwiperType } from "swiper";
import { Slide } from "@/lib/data/slides";

interface NavigationPillsProps {
  slides: Slide[];
  activeIndex: number;
  swiperRef: React.MutableRefObject<SwiperType | null>;
  onSlideChange: (index: number) => void;
  onAutoplayToggle: () => void;
}

export default function NavigationPills({
  slides,
  activeIndex,
  swiperRef,
  onSlideChange,
  onAutoplayToggle,
}: NavigationPillsProps) {
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const indicatorBlurRef = useRef<HTMLDivElement | null>(null);
  const navRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Animate pill on activeIndex change
  useEffect(() => {
    const activeEl = navRefs.current[activeIndex];
    const indicator = indicatorRef.current;
    const indicatorBlur = indicatorBlurRef.current;

    if (activeEl && indicator && indicatorBlur) {
      const { offsetLeft, offsetWidth } = activeEl;

      // Animate both elements together
      gsap.to([indicator, indicatorBlur], {
        x: offsetLeft,
        width: offsetWidth,
        duration: 1.2,
        ease: "power3.out",
      });
    }
  }, [activeIndex]);

  const handleSlideClick = (index: number) => {
    swiperRef.current?.slideTo(index);
    onSlideChange(index);
    onAutoplayToggle();
  };

  return (
    <div className="relative flex justify-center gap-8 mb-16">
      {/* Background container for pills - moved outside and positioned absolutely */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Blur glow effect */}
        <div
          ref={indicatorBlurRef}
          className={`absolute top-0 h-14 rounded-full bg-gradient-to-r ${slides[activeIndex]?.color} blur-sm opacity-60`}
          style={{ width: 0, transform: "translateX(0px)" }}
        />
        {/* Solid background pill */}
        <div
          ref={indicatorRef}
          className={`absolute top-0 h-14 rounded-full bg-gradient-to-r ${slides[activeIndex]?.color}`}
          style={{ width: 0, transform: "translateX(0px)" }}
        />
      </div>

      {/* Navigation buttons */}
      {slides.map((slide, index) => {
        const IconComponent = slide.icon;
        return (
          <button
            key={index}
            ref={(el) => {
              navRefs.current[index] = el;
            }}
            onClick={() => handleSlideClick(index)}
            className={`relative text-lg px-8 py-4 transition-all duration-700 rounded-full flex items-center gap-3 group ${
              activeIndex === index
                ? "text-white font-bold scale-110"
                : "text-gray-600 hover:text-gray-800 hover:scale-105"
            }`}
          >
            <IconComponent className="w-5 h-5 group-hover:scale-110 transition-transform duration-500" />
            {slide.title}
          </button>
        );
      })}
    </div>
  );
}
