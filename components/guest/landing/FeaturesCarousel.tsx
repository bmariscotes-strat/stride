// components/guest/landing/FeaturesCarousel.tsx
"use client";

import { forwardRef, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import gsap from "gsap";
import "swiper/css";
import "swiper/css/effect-coverflow";

import { slides } from "@/lib/data/slides";
import NavigationPills from "@/components/guest/landing/carousel/NavigationPills";
import SlideContent from "@/components/guest/landing/carousel/SlideContent";
import ProgressIndicator from "@/components/guest/landing/carousel/ProgressIndicator";

const FeaturesCarousel = forwardRef<HTMLDivElement>((_, ref) => {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);

  const handleSlideChange = (index: number) => {
    setActiveIndex(index);
  };

  const handleAutoplayToggle = () => {
    setIsAutoplay(false);
    setTimeout(() => setIsAutoplay(true), 3000);
  };

  const onSlideChange = (swiper: SwiperType) => {
    const realIndex = swiper.realIndex;
    setActiveIndex(realIndex);

    const activeSlide = swiper.slides[swiper.activeIndex];
    const text = activeSlide.querySelector(".slide-text");
    const image = activeSlide.querySelector(".slide-image");
    const card = activeSlide.querySelector(".slide-card");

    if (text && image && card) {
      gsap.fromTo(
        card,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 1.8,
          ease: "power2.out",
        }
      );

      gsap.fromTo(
        text.children,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.3,
          duration: 1.5,
          ease: "power2.out",
          delay: 0.5,
        }
      );

      gsap.fromTo(
        image,
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 2,
          ease: "power2.out",
          delay: 0.3,
        }
      );
    }
  };

  return (
    <section
      ref={ref}
      className="relative py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 overflow-hidden"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full opacity-20 blur-xl" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-r from-green-200 to-cyan-200 rounded-full opacity-20 blur-xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-primary mb-4">
            Experience the Power
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover how our platform transforms the way you work with intuitive
            features designed for modern teams
          </p>
        </div>

        {/* Enhanced Text Navigator with Glowing Pills */}
        <NavigationPills
          slides={slides}
          activeIndex={activeIndex}
          swiperRef={swiperRef}
          onSlideChange={handleSlideChange}
          onAutoplayToggle={handleAutoplayToggle}
        />

        {/* Enhanced Swiper with 3D Effect */}
        <Swiper
          modules={[EffectCoverflow, Autoplay]}
          effect="coverflow"
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={1}
          spaceBetween={50}
          speed={1500}
          coverflowEffect={{
            rotate: 0,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: false,
          }}
          autoplay={
            isAutoplay
              ? {
                  delay: 8000,
                  disableOnInteraction: false,
                }
              : false
          }
          loop={true}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          onSlideChange={onSlideChange}
          className="w-full max-w-6xl mx-auto"
        >
          {slides.map((slide, index) => (
            <SwiperSlide key={index}>
              <SlideContent slide={slide} />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Progress Indicator */}
        <ProgressIndicator
          slides={slides}
          activeIndex={activeIndex}
          swiperRef={swiperRef}
          onSlideChange={handleSlideChange}
        />
      </div>
    </section>
  );
});

FeaturesCarousel.displayName = "FeaturesCarousel";

export default FeaturesCarousel;
