"use client";

import { useEffect, useRef, useState } from "react";
import { Users, Calendar, BarChart3, Kanban } from "lucide-react";
import gsap from "gsap";
import Header from "@/components/layout/guest/Header";
import Footer from "@/components/layout/guest/Footer";
import TypingToVideo from "@/components/guest/landing/TransitionVideo";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/effect-coverflow";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Slide {
  image: string;
  title: string;
  desc: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function HomePage() {
  const strideRef = useRef<HTMLSpanElement | null>(null);
  const swiperRef = useRef<SwiperType | null>(null);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const indicatorBlurRef = useRef<HTMLDivElement | null>(null);
  const navRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const footerRef = useRef<HTMLElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (carouselRef.current) {
      gsap.fromTo(
        carouselRef.current,
        { autoAlpha: 0, y: 100 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: carouselRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }

    if (footerRef.current) {
      gsap.fromTo(
        footerRef.current,
        { autoAlpha: 0, y: 100 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }
  }, []);

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

  const slides: Slide[] = [
    {
      image: "/images/hero/analytics.png",
      title: "Analytics",
      desc: "Transform raw data into actionable insights with powerful visualizations, comprehensive reports, and real-time metrics that drive informed decision-making.",
      color: "from-blue-500 to-cyan-400",
      icon: BarChart3,
    },
    {
      image: "/images/hero/calendar.png",
      title: "Calendar",
      desc: "Never miss a deadline with intelligent scheduling, automated reminders, and seamless integration across all your devices and team workflows.",
      color: "from-purple-500 to-pink-400",
      icon: Calendar,
    },
    {
      image: "/images/hero/kanban.png",
      title: "Kanban",
      desc: "Visualize your workflow with intuitive boards, drag-and-drop simplicity, and customizable columns that adapt to your team's unique processes.",
      color: "from-green-500 to-emerald-400",
      icon: Kanban,
    },
  ];

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

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Enhanced Background with Moving Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#58c6eb]/30 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-40 -right-20 w-96 h-96 bg-[#2c6fc6]/30 blur-[120px] rounded-full animate-pulse delay-1000" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#1d416b]/20 blur-[180px] rounded-full animate-pulse delay-2000" />

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full animate-bounce"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + i * 0.5}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Header */}
      <Header />

      {/* Hero Section */}
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

      {/* Enhanced Carousel Section */}
      <section
        ref={carouselRef}
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
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Experience the Power
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover how our platform transforms the way you work with
              intuitive features designed for modern teams
            </p>
          </div>

          {/* Enhanced Text Navigator with Glowing Pills */}
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
                  onClick={() => {
                    swiperRef.current?.slideTo(index);
                    setActiveIndex(index);
                    setIsAutoplay(false);
                    setTimeout(() => setIsAutoplay(true), 3000);
                  }}
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
            onSlideChange={(swiper) => {
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
            }}
            className="w-full max-w-6xl mx-auto"
          >
            {slides.map((slide, index) => (
              <SwiperSlide key={index}>
                <div className="slide-card bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Left - Enhanced Image with Decorative Frame */}
                    <div className="relative flex justify-center">
                      <div
                        className={`absolute inset-0 bg-gradient-to-r ${slide.color} rounded-2xl blur-lg opacity-30 scale-105`}
                      />
                      <div className="relative p-2 bg-white rounded-2xl shadow-xl">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="slide-image rounded-xl shadow-lg w-full max-w-md object-cover transform hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      {/* Floating icon */}
                      <div
                        className={`absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-r ${slide.color} rounded-full flex items-center justify-center shadow-lg animate-bounce`}
                      >
                        <slide.icon className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    {/* Right - Enhanced Text with Better Typography */}
                    <div className="slide-text space-y-6">
                      <div className="space-y-2">
                        <span
                          className={`inline-block px-4 py-2 bg-gradient-to-r ${slide.color} text-white text-sm font-semibold rounded-full shadow-lg`}
                        >
                          Feature Spotlight
                        </span>
                        <h2 className="text-4xl font-bold text-gray-900 leading-tight">
                          {slide.title}
                        </h2>
                      </div>
                      <p className="text-xl text-gray-700 leading-relaxed">
                        {slide.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Progress Indicator */}
          <div className="flex justify-center mt-12 space-x-3">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  swiperRef.current?.slideTo(index);
                  setActiveIndex(index);
                }}
                className={`w-3 h-3 rounded-full transition-all duration-500 ${
                  activeIndex === index
                    ? `bg-gradient-to-r ${slides[activeIndex].color} scale-125 shadow-lg`
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <Footer ref={footerRef} />
    </div>
  );
}
