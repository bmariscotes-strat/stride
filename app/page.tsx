"use client";

import { useRef } from "react";
import Header from "@/components/layout/guest/Header";
import Footer from "@/components/layout/guest/Footer";
import HeroSection from "@/components/guest/landing/HeroSection";
import FeaturesCarousel from "@/components/guest/landing/FeaturesCarousel";
import BackgroundElements from "@/components/guest/landing/BackgroundElements";
import { useScrollAnimations } from "@/hooks/ui/useScrollAnimation";

export default function HomePage() {
  const footerRef = useRef<HTMLElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  useScrollAnimations({ footerRef, carouselRef });

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <BackgroundElements />
      <Header />
      <HeroSection />
      <FeaturesCarousel ref={carouselRef} />
      <Footer ref={footerRef} />
    </div>
  );
}
