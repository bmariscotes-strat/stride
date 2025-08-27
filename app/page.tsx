"use client";

import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import Header from "@/components/layout/guest/Header";

function TypingToVideo() {
  const [mode, setMode] = useState<"typing" | "video">("typing");
  const [text, setText] = useState<string>("");
  const [phraseIndex, setPhraseIndex] = useState<number>(0);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  const phrases: string[] = [
    "Plan your sprint effortlessly",
    "Stay aligned with your team",
  ];

  const phraseRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLDivElement | null>(null);
  const videoEl = useRef<HTMLVideoElement | null>(null);

  const startLoop = () => {
    setIsLooping(true);
    setMode("typing");
    setPhraseIndex(0);
    setText("");
  };

  useEffect(() => {
    let i = 0;
    let interval: NodeJS.Timeout | undefined = undefined;
    let timeout: NodeJS.Timeout | undefined = undefined;

    const typePhrase = () => {
      const phrase = phrases[phraseIndex];
      interval = setInterval(() => {
        setText(phrase.slice(0, i));
        i++;
        if (i > phrase.length) {
          clearInterval(interval);

          // after short delay, fade out phrase
          timeout = setTimeout(() => {
            if (phraseRef.current) {
              gsap.to(phraseRef.current, {
                opacity: 0,
                y: -30,
                duration: 0.8,
                ease: "power2.inOut",
                onComplete: () => {
                  // move to next phrase or video
                  if (phraseIndex < phrases.length - 1) {
                    setPhraseIndex((prev) => prev + 1);
                    setText("");
                    if (phraseRef.current) {
                      gsap.fromTo(
                        phraseRef.current,
                        { opacity: 0, y: 30 },
                        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
                      );
                    }
                  } else {
                    // switch to video
                    setMode("video");

                    // Wait for DOM update then animate and play video
                    setTimeout(() => {
                      if (videoRef.current) {
                        gsap.fromTo(
                          videoRef.current,
                          { opacity: 0, scale: 0.8, y: 30 },
                          {
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            duration: 1.2,
                            ease: "back.out(1.7)",
                            onComplete: () => {
                              // Play video after animation completes
                              if (videoEl.current) {
                                videoEl.current.currentTime = 0;
                                const playPromise = videoEl.current.play();

                                if (playPromise !== undefined) {
                                  playPromise.catch((error) => {
                                    console.log("Autoplay prevented:", error);
                                  });
                                }

                                // After video plays for 3 seconds, restart the loop
                                setTimeout(() => {
                                  if (videoRef.current) {
                                    gsap.to(videoRef.current, {
                                      opacity: 0,
                                      scale: 0.8,
                                      y: -30,
                                      duration: 0.8,
                                      ease: "power2.inOut",
                                      onComplete: () => {
                                        startLoop();
                                      },
                                    });
                                  }
                                }, 3000); // Show video for 3 seconds
                              }
                            },
                          }
                        );
                      }
                    }, 50);
                  }
                },
              });
            }
          }, 1500); // Increased pause time between transitions
        }
      }, 100); // Slightly slower typing for smoother effect
    };

    // Reset counter when phrase changes
    i = 0;
    typePhrase();

    // Cleanup function
    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [phraseIndex]);

  return (
    <div className="flex justify-center lg:justify-end min-h-[200px] items-center">
      {mode === "typing" ? (
        <div
          ref={phraseRef}
          className="px-8 py-6 rounded-2xl shadow-lg border border-gray-200/50 bg-white/80 backdrop-blur-sm text-xl sm:text-2xl font-medium text-gray-800 font-sans transition-all duration-300"
        >
          {text}
          <span className="animate-pulse ml-1 text-blue-500">|</span>
        </div>
      ) : (
        <div
          ref={videoRef}
          className="rounded-3xl shadow-2xl overflow-hidden border-4 border-white/20"
          style={{ opacity: 0 }}
        >
          <video
            ref={videoEl}
            src="/videos/hero/demo-loop.mp4"
            muted
            playsInline
            loop
            className="max-w-full h-auto rounded-2xl"
            onCanPlay={() => {
              // Additional attempt to play when video is ready
              if (videoEl.current && mode === "video") {
                videoEl.current.play().catch(() => {
                  // Silently handle autoplay prevention
                });
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

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
              <h1 className="text-md text-gray-900 sm:text-5xl font-medium mb-4 lg:mb-6">
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
              <TypingToVideo />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
