import { useState } from "react";

// Ring order: 0=outer(24), 1=middle(18), 2=inner(12), 3=core(6)
// Clicking any node on ring R marks it + all rings > R (downstream) as compromised.

type CompromisedState = {
  ring: number;
  index: number;
} | null;

const RING_META = [
  { count: 24, label: "Outer" },
  { count: 18, label: "Middle" },
  { count: 12, label: "Inner" },
  { count: 6, label: "Core" },
];

function isCompromised(compromised: CompromisedState, ring: number, index: number): boolean {
  if (!compromised) return false;
  if (ring > compromised.ring) return true;
  if (ring === compromised.ring && index >= compromised.index) return true;
  return false;
}

export function ScenePoster({ className = "" }: { className?: string }) {
  const [compromised, setCompromised] = useState<CompromisedState>(null);
  const [hoveredNode, setHoveredNode] = useState<{ ring: number; index: number } | null>(null);

  function handleNodeClick(ring: number, index: number) {
    setCompromised({ ring, index });
  }

  function restoreChain() {
    setCompromised(null);
    setHoveredNode(null);
  }

  function isHoverPreview(ring: number, index: number): boolean {
    if (!hoveredNode || compromised) return false;
    if (ring > hoveredNode.ring) return true;
    if (ring === hoveredNode.ring && index >= hoveredNode.index) return true;
    return false;
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden bg-[#0A0F0D] ${className}`}
      aria-label="AyuCTMS Cryptographic Lotus Poster"
    >
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(47,179,154,0.12)_0%,transparent_70%)]" />

      {/* Chain status badge */}
      <div className="relative z-10 mb-3 flex items-center gap-2 flex-wrap justify-center px-2">
        <span
          className={`text-xs font-mono px-3 py-1 rounded-full border transition-all duration-300 ${
            compromised
              ? "border-red-500/60 bg-red-950/40 text-red-400"
              : "border-[#2FB39A]/40 bg-[#0D1A15]/60 text-[#2FB39A]"
          }`}
        >
          {compromised
            ? `⚠ Chain compromised at ${RING_META[compromised.ring].label} node #${compromised.index + 1}`
            : "✓ Hash chain intact"}
        </span>

        {compromised && (
          <button
            id="restore-chain-btn"
            onClick={restoreChain}
            className="text-xs font-mono px-3 py-1 rounded-full border border-[#2FB39A]/60
                       bg-[#0D1A15]/80 text-[#2FB39A] hover:bg-[#2FB39A]/20 hover:border-[#2FB39A]
                       transition-all duration-200 cursor-pointer"
          >
            ↺ Restore Chain
          </button>
        )}
      </div>

      {/* Interactive SVG Lotus */}
      <svg
        className="relative z-10 w-full max-w-[480px] h-auto drop-shadow-[0_0_35px_rgba(47,179,154,0.3)]"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ cursor: compromised ? "default" : "crosshair" }}
      >
        <circle cx="200" cy="200" r="185" stroke="#22302A" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="200" cy="200" r="150" stroke="#1D2A24" strokeWidth="1" />
        <circle cx="200" cy="200" r="115" stroke="rgba(200,164,92,0.25)" strokeWidth="1" />

        {/* ── Outer Petals (ring 0, 24 petals) ── */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 360) / 24;
          const red = isCompromised(compromised, 0, i);
          const preview = isHoverPreview(0, i);
          return (
            <g
              key={`outer-${i}`}
              transform={`rotate(${angle} 200 200)`}
              style={{ cursor: "pointer" }}
              onClick={() => handleNodeClick(0, i)}
              onMouseEnter={() => setHoveredNode({ ring: 0, index: i })}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <path
                d="M 200 45 L 210 95 L 200 130 L 190 95 Z"
                fill={red ? "#3B0000" : preview ? "#2a1010" : "#101815"}
                stroke={red ? "#FF3B3B" : preview ? "#FF7B7B" : "#C8A45C"}
                strokeWidth="1.2"
                strokeOpacity={red ? 1 : 0.7}
                style={{ transition: "fill 0.25s, stroke 0.25s" }}
              />
              <circle
                cx="200" cy="45" r="2.5"
                fill={red ? "#FF3B3B" : preview ? "#FF9999" : "#2FB39A"}
                style={{ transition: "fill 0.25s" }}
              />
            </g>
          );
        })}

        {/* ── Middle Petals (ring 1, 18 petals) ── */}
        {Array.from({ length: 18 }).map((_, i) => {
          const angle = (i * 360) / 18 + 10;
          const red = isCompromised(compromised, 1, i);
          const preview = isHoverPreview(1, i);
          return (
            <g
              key={`mid-${i}`}
              transform={`rotate(${angle} 200 200)`}
              style={{ cursor: "pointer" }}
              onClick={() => handleNodeClick(1, i)}
              onMouseEnter={() => setHoveredNode({ ring: 1, index: i })}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <path
                d="M 200 85 L 212 135 L 200 160 L 188 135 Z"
                fill={red ? "#3B0000" : preview ? "#2a1010" : "#16201C"}
                stroke={red ? "#FF3B3B" : preview ? "#FF7B7B" : "#C8A45C"}
                strokeWidth="1.4"
                strokeOpacity={red ? 1 : 0.85}
                style={{ transition: "fill 0.25s, stroke 0.25s" }}
              />
              <circle
                cx="200" cy="85" r="2"
                fill={red ? "#FF3B3B" : preview ? "#FF9999" : "#C8A45C"}
                style={{ transition: "fill 0.25s" }}
              />
            </g>
          );
        })}

        {/* ── Inner Petals (ring 2, 12 petals) ── */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12 + 15;
          const red = isCompromised(compromised, 2, i);
          const preview = isHoverPreview(2, i);
          return (
            <g
              key={`inner-${i}`}
              transform={`rotate(${angle} 200 200)`}
              style={{ cursor: "pointer" }}
              onClick={() => handleNodeClick(2, i)}
              onMouseEnter={() => setHoveredNode({ ring: 2, index: i })}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <path
                d="M 200 120 L 210 155 L 200 175 L 190 155 Z"
                fill={red ? "#3B0000" : preview ? "#2a1010" : "#1D2A24"}
                stroke={red ? "#FF3B3B" : preview ? "#FF7B7B" : "#2FB39A"}
                strokeWidth="1.6"
                style={{ transition: "fill 0.25s, stroke 0.25s" }}
              />
            </g>
          );
        })}

        {/* ── Core Seed Pods (ring 3, 6 dots) ── */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i * 360) / 6;
          const red = isCompromised(compromised, 3, i);
          const preview = isHoverPreview(3, i);
          return (
            <g
              key={`core-${i}`}
              transform={`rotate(${angle} 200 200)`}
              style={{ cursor: "pointer" }}
              onClick={() => handleNodeClick(3, i)}
              onMouseEnter={() => setHoveredNode({ ring: 3, index: i })}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <circle
                cx="200" cy="180" r="6"
                fill={red ? "#FF3B3B" : preview ? "#FF9999" : "#2FB39A"}
                opacity="0.85"
                style={{ transition: "fill 0.25s" }}
              />
            </g>
          );
        })}

        {/* ── Central Anchor (reflects overall integrity) ── */}
        <circle
          cx="200" cy="200" r="14"
          fill="#101815"
          stroke={compromised ? "#FF3B3B" : "#C8A45C"}
          strokeWidth="2"
          style={{ transition: "stroke 0.3s" }}
        />
        <circle
          cx="200" cy="200" r="6"
          fill={compromised ? "#FF3B3B" : "#2FB39A"}
          style={{ transition: "fill 0.3s" }}
        />
      </svg>

      {/* Hint label */}
      <p className="relative z-10 mt-2 text-[10px] font-mono text-[#2FB39A]/40 tracking-widest uppercase select-none">
        {compromised ? "click restore chain to reset" : "click any node to simulate tamper"}
      </p>
    </div>
  );
}
