// components/guest/landing/BackgroundElements.tsx

export default function BackgroundElements() {
  return (
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
  );
}
