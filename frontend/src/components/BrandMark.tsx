import clsx from "clsx";

export interface BrandMarkProps {
  size?: number;
  className?: string;
  variant?: "badge" | "glyph";
}

/**
 * AyuCTMS BrandMark
 * The official circular emerald-gradient badge with the white botanical leaf-flame glyph.
 */
export function BrandMark({
  size = 32,
  className,
  variant = "badge",
}: BrandMarkProps) {

  if (variant === "glyph") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={clsx("inline-block shrink-0 select-none", className)}
        aria-hidden="true"
      >
        <path d="M12 21C12 21 5 14 5 7.5C5 3.5 12 3 12 3S19 3.5 19 7.5C19 14 12 21 12 21Z" />
        <path d="M12 3V21" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={clsx(
        "relative rounded-xl flex items-center justify-center shrink-0 select-none overflow-hidden",
        "bg-[#0A0F0D]",
        "shadow-[0_0_14px_rgba(47,179,154,0.45)]",
        className,
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(47,179,154,0.18)_0%,transparent_70%)]" />

      <svg viewBox="0 0 40 40" fill="none" className="w-[88%] h-[88%] relative z-10">
        {/* Outer gold ring */}
        <circle cx="20" cy="20" r="17" stroke="#C8A45C" strokeWidth="1.6"/>

        {/* 8 outer gold diamond petals + teal tip dot */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 20 20)`}>
            <path d="M20 3 L21.2 9 L20 13 L18.8 9Z" fill="#101815" stroke="#C8A45C" strokeWidth="0.8"/>
            <circle cx="20" cy="3.5" r="1.2" fill="#2FB39A"/>
          </g>
        ))}

        {/* 8 inner teal petals, offset 22.5° */}
        {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 20 20)`}>
            <path d="M20 10 L21 14 L20 16.5 L19 14Z" fill="#1D2A24" stroke="#2FB39A" strokeWidth="0.9"/>
          </g>
        ))}

        {/* Central anchor */}
        <circle cx="20" cy="20" r="3.5" fill="#101815" stroke="#C8A45C" strokeWidth="1.1"/>
        <circle cx="20" cy="20" r="1.6" fill="#2FB39A"/>
      </svg>
    </div>
  );
}

export interface BrandLogoProps {
  size?: number;
  withTagline?: boolean;
  taglineText?: string;
  badgeText?: string;
  className?: string;
}

/**
 * AyuCTMS BrandLogo
 * Pairs the BrandMark with the serif wordmark and uppercase mono tagline.
 */
export function BrandLogo({
  size = 36,
  withTagline = true,
  taglineText = "Clinical Trial Management & Safety Command",
  badgeText,
  className,
}: BrandLogoProps) {
  return (
    <div className={clsx("flex items-center gap-3 select-none", className)}>
      <BrandMark size={size} />
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span className="font-serif text-xl font-bold tracking-tight text-[#E8EFE9] leading-none">
            AyuCTMS
          </span>
          {badgeText && (
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#2FB39A]/15 text-[#39C8AD] border border-[#2FB39A]/30 leading-none">
              {badgeText}
            </span>
          )}
        </div>
        {withTagline && (
          <span className="font-mono text-[11px] text-[#8FA398] tracking-wide mt-1 leading-none">
            {taglineText}
          </span>
        )}
      </div>
    </div>
  );
}

export default BrandMark;
