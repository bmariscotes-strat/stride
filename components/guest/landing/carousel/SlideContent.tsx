import { Slide } from "@/lib/data/slides";

interface SlideContentProps {
  slide: Slide;
}

export default function SlideContent({ slide }: SlideContentProps) {
  return (
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
          <p className="text-xl text-gray-700 leading-relaxed">{slide.desc}</p>
        </div>
      </div>
    </div>
  );
}
