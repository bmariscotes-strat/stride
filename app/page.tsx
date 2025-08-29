"use client";

import { useRef, useState, useEffect } from "react";
import Header from "@/components/layout/guest/Header";
import Footer from "@/components/layout/guest/Footer";
import HeroSection from "@/components/guest/landing/HeroSection";
import FeaturesCarousel from "@/components/guest/landing/FeaturesCarousel";
import BackgroundElements from "@/components/guest/landing/BackgroundElements";
import { useScrollAnimations } from "@/hooks/ui/useScrollAnimation";

const LoadingSpinner = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
    <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
);

export default function HomePage() {
  const footerRef = useRef<HTMLElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [componentsReady, setComponentsReady] = useState(false);

  // Initialize scroll animations after refs are set
  useScrollAnimations({ footerRef, carouselRef });

  // Check when components are mounted and refs are ready
  useEffect(() => {
    const checkRefsReady = () => {
      if (footerRef.current && carouselRef.current) {
        setComponentsReady(true);
      }
    };

    checkRefsReady();
    const interval = setInterval(checkRefsReady, 50);

    return () => clearInterval(interval);
  }, []);

  // Hide loading once everything is ready
  useEffect(() => {
    if (componentsReady) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [componentsReady]);

  return (
    <>
      {isLoading && <LoadingSpinner />}
      <div
        className={`relative min-h-screen flex flex-col overflow-hidden transition-opacity duration-500 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
      >
        <BackgroundElements />
        <Header />
        <HeroSection />
        <FeaturesCarousel ref={carouselRef} />
        <Footer ref={footerRef} />
      </div>
    </>
  );
}
