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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const indicatorBlurRef = useRef<HTMLDivElement | null>(null);
  const navRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Animate pill on activeIndex change
  useEffect(() => {
    const activeEl = navRefs.current[activeIndex];
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    const indicatorBlur = indicatorBlurRef.current;

    if (activeEl && container && indicator && indicatorBlur) {
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();

      const offsetLeft = activeRect.left - containerRect.left;
      const width = activeRect.width;

      // Kill any existing animations to prevent conflicts
      gsap.killTweensOf([indicator, indicatorBlur]);

      // Animate both elements together with shorter duration
      gsap.to([indicator, indicatorBlur], {
        x: offsetLeft,
        width: width,
        duration: 0.6,
        ease: "power2.out",
      });
    }
  }, [activeIndex]);

  const handleSlideClick = (index: number) => {
    // Prevent rapid clicking issues
    if (activeIndex === index) return;

    // Stop autoplay first to prevent conflicts
    if (swiperRef.current?.autoplay) {
      swiperRef.current.autoplay.stop();
    }

    // Navigate to slide
    swiperRef.current?.slideTo(index);
    onSlideChange(index);

    // Restart autoplay after a delay
    setTimeout(() => {
      if (swiperRef.current?.autoplay) {
        swiperRef.current.autoplay.start();
      }
    }, 100);

    onAutoplayToggle();
  };

  return (
    <div className="flex justify-center mb-16">
      <div ref={containerRef} className="relative inline-flex gap-8">
        {/* Background indicators - positioned relative to container */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Blur glow effect */}
          <div
            ref={indicatorBlurRef}
            className={`absolute top-0 h-14 rounded-full bg-gradient-to-r ${slides[activeIndex]?.color} blur-sm opacity-60 dark:opacity-40`}
            style={{ width: 0, transform: "translateX(0px)" }}
          />
          {/* Solid background pill */}
          <div
            ref={indicatorRef}
            className={`absolute top-0 h-14 rounded-full bg-gradient-to-r ${slides[activeIndex]?.color} dark:opacity-90`}
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
              className={`relative z-10 text-lg px-8 py-4 transition-all duration-300 rounded-full flex items-center gap-3 group whitespace-nowrap ${
                activeIndex === index
                  ? "text-white dark:text-white font-bold scale-110"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:scale-105 hover:cursor-pointer"
              }`}
              disabled={activeIndex === index}
            >
              <IconComponent className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              {slide.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
