"use client";

import { useEffect, useState, useRef } from "react";
import gsap from "gsap";

export default function TypingToVideo() {
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
