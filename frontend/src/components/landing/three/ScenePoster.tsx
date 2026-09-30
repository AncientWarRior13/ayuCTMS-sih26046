export function ScenePoster({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-[#0A0F0D] ${className}`}
      aria-label="AyuCTMS Cryptographic Lotus Poster"
    >
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(47,179,154,0.12)_0%,transparent_70%)]" />

      {/* Static SVG Lotus */}
      <svg
        className="w-full max-w-[480px] h-auto text-[#C8A45C] drop-shadow-[0_0_35px_rgba(47,179,154,0.3)]"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="200" cy="200" r="185" stroke="#22302A" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="200" cy="200" r="150" stroke="#1D2A24" strokeWidth="1" />
        <circle cx="200" cy="200" r="115" stroke="rgba(200,164,92,0.25)" strokeWidth="1" />

        {/* Outer Hex Petals (24) */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 360) / 24;
          return (
            <g key={`outer-${i}`} transform={`rotate(${angle} 200 200)`}>
              <path
                d="M 200 45 L 210 95 L 200 130 L 190 95 Z"
                fill="#101815"
                stroke="#C8A45C"
                strokeWidth="1.2"
                strokeOpacity="0.7"
              />
              <circle cx="200" cy="45" r="2.5" fill="#2FB39A" />
            </g>
          );
        })}

        {/* Middle Hex Petals (18) */}
        {Array.from({ length: 18 }).map((_, i) => {
          const angle = (i * 360) / 18 + 10;
          return (
            <g key={`mid-${i}`} transform={`rotate(${angle} 200 200)`}>
              <path
                d="M 200 85 L 212 135 L 200 160 L 188 135 Z"
                fill="#16201C"
                stroke="#C8A45C"
                strokeWidth="1.4"
                strokeOpacity="0.85"
              />
              <circle cx="200" cy="85" r="2" fill="#C8A45C" />
            </g>
          );
        })}

        {/* Inner Hex Petals (12) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12 + 15;
          return (
            <g key={`inner-${i}`} transform={`rotate(${angle} 200 200)`}>
              <path
                d="M 200 120 L 210 155 L 200 175 L 190 155 Z"
                fill="#1D2A24"
                stroke="#2FB39A"
                strokeWidth="1.6"
              />
            </g>
          );
        })}

        {/* Core Seed Pod Hexagon (6) */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i * 360) / 6;
          return (
            <g key={`core-${i}`} transform={`rotate(${angle} 200 200)`}>
              <circle cx="200" cy="180" r="5" fill="#2FB39A" opacity="0.85" />
            </g>
          );
        })}

        {/* Central Anchor */}
        <circle cx="200" cy="200" r="14" fill="#101815" stroke="#C8A45C" strokeWidth="2" />
        <circle cx="200" cy="200" r="6" fill="#2FB39A" />
      </svg>
    </div>
  );
}
