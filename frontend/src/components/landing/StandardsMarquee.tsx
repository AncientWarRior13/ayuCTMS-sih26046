import React from "react";

const STANDARDS = [
  "FHIR R4",
  "CDISC SDTM",
  "ICH E2B(R3)",
  "ICH E6(R2)",
  "GCP Schedule Y",
  "ALCOA+",
  "DPDP Act 2023",
  "21 CFR Part 11",
  "SHA-256",
  "PRR/ROR",
];

export default function StandardsMarquee() {
  // Duplicate for seamless infinite loop
  const marqueeItems = [...STANDARDS, ...STANDARDS, ...STANDARDS, ...STANDARDS];

  return (
    <div className="relative w-full h-14 border-t border-b border-[#22302A] bg-[#0A0F0D] overflow-hidden flex items-center">
      {/* Edge gradient fades */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0A0F0D] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0A0F0D] to-transparent z-10" />

      {/* Marquee Track */}
      <div className="w-full flex items-center overflow-hidden">
        <div className="flex shrink-0 items-center gap-6 whitespace-nowrap animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:whitespace-normal py-2">
          {marqueeItems.map((item, idx) => (
            <React.Fragment key={`${item}-${idx}`}>
              <span className="font-data text-[13px] uppercase tracking-wider text-[#56685F] transition-colors hover:text-[#8FA398] select-none">
                {item}
              </span>
              <span className="text-[#33463E] select-none text-[13px] font-bold">·</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
