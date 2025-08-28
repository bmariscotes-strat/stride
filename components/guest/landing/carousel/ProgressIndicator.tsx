// components/guest/landing/ProgressIndicator.tsx
import type { Swiper as SwiperType } from "swiper";
import { Slide } from "@/lib/data/slides";

interface ProgressIndicatorProps {
  slides: Slide[];
  activeIndex: number;
  swiperRef: React.MutableRefObject<SwiperType | null>;
  onSlideChange: (index: number) => void;
}

export default function ProgressIndicator({
  slides,
  activeIndex,
  swiperRef,
  onSlideChange,
}: ProgressIndicatorProps) {
  const handleIndicatorClick = (index: number) => {
    swiperRef.current?.slideTo(index);
    onSlideChange(index);
  };

  return (
    <div className="flex justify-center mt-12 space-x-3">
      {slides.map((_, index) => (
        <button
          key={index}
          onClick={() => handleIndicatorClick(index)}
          className={`w-3 h-3 rounded-full transition-all duration-500 ${
            activeIndex === index
              ? `bg-gradient-to-r ${slides[activeIndex].color} scale-125 shadow-lg`
              : "bg-gray-300 hover:bg-gray-400"
          }`}
        />
      ))}
    </div>
  );
}
