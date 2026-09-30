import clsx from "clsx";

export interface BrandMarkProps {
  size?: number;
  className?: string;
  variant?: "badge" | "glyph";
  idPrefix?: string;
}

/**
 * AyuCTMS BrandMark
 * The official circular emerald-gradient badge with the white botanical leaf-flame glyph.
 */
export function BrandMark({
  size = 32,
  className,
  variant = "badge",
  idPrefix = "ayu",
}: BrandMarkProps) {
  const gradId = `${idPrefix}-brand-grad`;

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
        "relative rounded-xl flex items-center justify-center shrink-0 select-none",
        "bg-gradient-to-br from-[#39C8AD] via-[#2FB39A] to-[#0A1410]",
        "border border-[#39C8AD]/50 shadow-[0_0_16px_rgba(47,179,154,0.3)]",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className="w-[82%] h-[82%]"
      >
        <defs>
          <radialGradient id={gradId} cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#39C8AD" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0B1512" stopOpacity="0.2" />
          </radialGradient>
        </defs>

        {/* Botanical Leaf-Flame Outline */}
        <path
          d="M20 32C20 32 9 23.5 9 14.5C9 8 14 3.5 20 3.5C26 3.5 31 8 31 14.5C31 23.5 20 32 20 32Z"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Central Vertical Vein */}
        <path
          d="M20 3.5V32"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Central Seed / Flame Node */}
        <circle cx="20" cy="16" r="2.8" fill="#FFFFFF" />
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
