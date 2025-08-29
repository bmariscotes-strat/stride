// hooks/useScrollAnimations.ts
import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface UseScrollAnimationsProps {
  footerRef: React.MutableRefObject<HTMLElement | null>;
  carouselRef: React.MutableRefObject<HTMLDivElement | null>;
}

export const useScrollAnimations = ({
  footerRef,
  carouselRef,
}: UseScrollAnimationsProps) => {
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
  }, [footerRef, carouselRef]);
};
