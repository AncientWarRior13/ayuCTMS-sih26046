import { Link } from "react-router-dom";

const ROLE_CHIPS = [
  "PI",
  "COORD",
  "MONITOR",
  "IEC",
  "PV",
  "ADMIN",
  "REGULATOR",
];

export default function ClosingCta() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-32 text-center flex flex-col items-center space-y-8">
      {/* Heading */}
      <h2 className="font-display text-5xl sm:text-6xl text-[#E8EFE9] leading-[1.05]">
        See it <em className="italic text-[#C8A45C]">in action.</em>
      </h2>

      {/* Body */}
      <p className="text-[18px] text-[#8FA398] max-w-md leading-relaxed">
        Explore with synthetic data. No setup required.
      </p>

      {/* Primary Button */}
      <div>
        <Link
          to="/login"
          className="inline-flex items-center justify-center bg-[#2FB39A] text-[#0A0F0D] rounded-[12px] px-8 py-3.5 font-semibold text-[16px] hover:bg-[#269984] transition-colors"
        >
          Enter workspace
        </Link>
      </div>

      {/* 7 Role Chips */}
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {ROLE_CHIPS.map((role) => (
          <Link
            key={role}
            to="/login"
            className="font-data text-[13px] font-semibold px-3 py-1 rounded-lg bg-[#16201C] border border-[#22302A] text-[#8FA398] hover:text-[#2FB39A] hover:border-[#2FB39A]/40 transition-colors"
          >
            {role}
          </Link>
        ))}
      </div>

      {/* Subtext */}
      <div className="font-data text-[13px] text-[#56685F] pt-2">
        Synthetic data only · Demo accounts on the sign-in page
      </div>
    </section>
  );
}
