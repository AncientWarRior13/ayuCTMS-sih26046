import { useEffect, useState } from "react";

export default function Bento() {
  // 1. Sweep index for Hash-chained audit (0 to 5)
  const [sweepIdx, setSweepIdx] = useState(0);
  useEffect(() => {
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced) return;
    const interval = setInterval(() => {
      setSweepIdx((prev) => (prev + 1) % 6);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // 2. Regulatory clocks live ticker
  const [clockSeconds, setClockSeconds] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setClockSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format clocks: 24h preliminary, 7d expedited, 14d comprehensive
  const clock24h = Math.max(0, 24 * 3600 - 5 * 3600 - 18 * 60 - (clockSeconds % 3600));
  const clock7d = Math.max(0, 7 * 86400 - 2 * 86400 - 9 * 3600 - (clockSeconds % 3600));
  const clock14d = Math.max(0, 14 * 86400 - 4 * 86400 - 14 * 3600 - (clockSeconds % 3600));

  const formatHms = (totalSec: number) => {
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
    return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  };

  // 4. Prakriti proportions oscillating subtly
  const [prakritiRatio, setPrakritiRatio] = useState({ v: 38, p: 34, k: 28 });
  useEffect(() => {
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced) return;
    const interval = setInterval(() => {
      const offset = (Math.sin(Date.now() / 2000) * 4);
      setPrakritiRatio({
        v: Math.round(38 + offset),
        p: Math.round(34 - offset * 0.5),
        k: Math.round(28 - offset * 0.5),
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // 5. ALCOA+ principles sequence checklist
  const [checkedCount, setCheckedCount] = useState(9);
  useEffect(() => {
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced) return;
    const interval = setInterval(() => {
      setCheckedCount((c) => (c >= 9 ? 1 : c + 1));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const ALCOA_PRINCIPLES = [
    "Attributable",
    "Legible",
    "Contemporaneous",
    "Original",
    "Accurate",
    "Complete",
    "Consistent",
    "Enduring",
    "Available",
  ];

  const BLOCKS = [
    { hash: "7a8f9c1d", status: "VALID" },
    { hash: "e2b4f501", status: "VALID" },
    { hash: "91dc83a2", status: "VALID" },
    { hash: "4f08e7b9", status: "VALID" },
    { hash: "3c29a81e", status: "VALID" },
    { hash: "d810f46b", status: "VALID" },
  ];

  return (
    <section id="platform" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      {/* Header */}
      <div className="max-w-3xl mb-12 space-y-4">
        <div className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C]">
          Platform
        </div>
        <h2 className="font-display text-4xl sm:text-5xl leading-[1.05] text-[#E8EFE9]">
          Built for the parts of trials <em className="italic text-[#C8A45C]">that can't fail.</em>
        </h2>
        <p className="text-[18px] text-[#8FA398] leading-relaxed">
          Compliant with Schedule Y, ICH E6(R2), CDISC SDTM and the National Pharmacovigilance Programme for ASU drugs.
        </p>
      </div>

      {/* 12-Column Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Tile 1: Hash-chained audit (col-span-7) */}
        <div className="lg:col-span-7 bg-[#101815] border border-[#22302A] hover:border-[#2FB39A]/40 rounded-[12px] p-6 transition-colors flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="font-data text-[13px] uppercase tracking-wider text-[#56685F]">
              Cryptographic Audit
            </div>
            <h3 className="text-[20px] font-medium text-[#E8EFE9]">
              Hash-chained audit trail
            </h3>
            <p className="text-[15px] text-[#8FA398]">
              Append-only SHA-256 blocks store the parent state hash to expose any retroactive modification.
            </p>
          </div>

          {/* Live Visual: 6 mini blocks with truncated mono hashes, teal borders & sweep highlight */}
          <div className="pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {BLOCKS.map((b, idx) => {
                const isSwept = sweepIdx === idx;
                return (
                  <div
                    key={b.hash}
                    className={`rounded-lg border p-2.5 transition-all duration-500 bg-[#0A0F0D] ${
                      isSwept
                        ? "border-[#2FB39A] bg-[#2FB39A]/10 shadow-[0_0_15px_rgba(47,179,154,0.2)]"
                        : "border-[#2FB39A]/30 text-[#8FA398]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[13px] font-data text-[#56685F] mb-1">
                      <span>#{idx + 1}</span>
                      <span className={isSwept ? "text-[#2FB39A]" : "text-[#56685F]"}>✓</span>
                    </div>
                    <div className="font-data text-[13px] font-semibold text-[#E8EFE9]">
                      {b.hash}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tile 2: Regulatory clocks (col-span-5) */}
        <div className="lg:col-span-5 bg-[#101815] border border-[#22302A] hover:border-[#2FB39A]/40 rounded-[12px] p-6 transition-colors flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="font-data text-[13px] uppercase tracking-wider text-[#56685F]">
              Pharmacovigilance
            </div>
            <h3 className="text-[20px] font-medium text-[#E8EFE9]">
              Regulatory clocks
            </h3>
            <p className="text-[15px] text-[#8FA398]">
              Automated statutory countdowns with deterministic multi-stakeholder alert escalation.
            </p>
          </div>

          {/* Live Visual: Three stacked bars with ticking remaining time */}
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-[13px] mb-1">
                <span className="text-[#E8EFE9]">24h Preliminary Report</span>
                <span className="font-data text-[#F2A93B] font-semibold">{formatHms(clock24h)}</span>
              </div>
              <div className="h-2 w-full bg-[#16201C] rounded-full overflow-hidden">
                <div className="h-full bg-[#F2A93B] rounded-full w-[78%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[13px] mb-1">
                <span className="text-[#E8EFE9]">7-Day Expedited Submission</span>
                <span className="font-data text-[#2FB39A] font-semibold">{formatHms(clock7d)}</span>
              </div>
              <div className="h-2 w-full bg-[#16201C] rounded-full overflow-hidden">
                <div className="h-full bg-[#2FB39A] rounded-full w-[45%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[13px] mb-1">
                <span className="text-[#E8EFE9]">14-Day Comprehensive Review</span>
                <span className="font-data text-[#39C8AD] font-semibold">{formatHms(clock14d)}</span>
              </div>
              <div className="h-2 w-full bg-[#16201C] rounded-full overflow-hidden">
                <div className="h-full bg-[#39C8AD] rounded-full w-[28%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Tile 3: Herb-drug interactions (col-span-4) */}
        <div className="lg:col-span-4 bg-[#101815] border border-[#22302A] hover:border-[#2FB39A]/40 rounded-[12px] p-6 transition-colors flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="font-data text-[13px] uppercase tracking-wider text-[#56685F]">
              Signal Analysis
            </div>
            <h3 className="text-[20px] font-medium text-[#E8EFE9]">
              Herb-drug interactions
            </h3>
            <p className="text-[15px] text-[#8FA398]">
              Automated Disproportionality mapping against WHO-ART and botanical vocabularies.
            </p>
          </div>

          {/* Live Visual: Tiny SVG with 3 nodes and 2 edges, edge width by PRR, label "PRR 4.2" */}
          <div className="pt-2 flex items-center justify-between bg-[#0A0F0D] border border-[#22302A] rounded-lg p-3">
            <svg viewBox="0 0 200 70" className="w-40 h-14 overflow-visible">
              {/* Edges */}
              <line x1="30" y1="35" x2="100" y2="35" stroke="#2FB39A" strokeWidth="4.2" strokeLinecap="round" opacity="0.8" />
              <line x1="100" y1="35" x2="170" y2="35" stroke="#C8A45C" strokeWidth="2.1" strokeLinecap="round" opacity="0.8" />
              {/* Nodes */}
              <circle cx="30" cy="35" r="10" fill="#16201C" stroke="#2FB39A" strokeWidth="2" />
              <text x="30" y="38" textAnchor="middle" fill="#E8EFE9" fontSize="8" fontFamily="monospace">Ashwa</text>
              <circle cx="100" cy="35" r="12" fill="#16201C" stroke="#E5484D" strokeWidth="2" />
              <text x="100" y="38" textAnchor="middle" fill="#E8EFE9" fontSize="8" fontFamily="monospace">Beta-B</text>
              <circle cx="170" cy="35" r="10" fill="#16201C" stroke="#C8A45C" strokeWidth="2" />
              <text x="170" y="38" textAnchor="middle" fill="#E8EFE9" fontSize="8" fontFamily="monospace">Brady</text>
            </svg>
            <div className="text-right">
              <span className="font-data text-[13px] px-2.5 py-1 rounded bg-[#E5484D]/15 text-[#E5484D] border border-[#E5484D]/30 font-semibold">
                PRR 4.2
              </span>
            </div>
          </div>
        </div>

        {/* Tile 4: Prakriti profiling (col-span-4) */}
        <div className="lg:col-span-4 bg-[#101815] border border-[#22302A] hover:border-[#2FB39A]/40 rounded-[12px] p-6 transition-colors flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="font-data text-[13px] uppercase tracking-wider text-[#56685F]">
              Phenotype Engine
            </div>
            <h3 className="text-[20px] font-medium text-[#E8EFE9]">
              Prakriti profiling
            </h3>
            <p className="text-[15px] text-[#8FA398]">
              Standardized tridosha phenotyping anchored in GCP Schedule Y trial cohorts.
            </p>
          </div>

          {/* Live Visual: Tri-tone bar using #7A8FB8 / #E0713A / #6FA36B with animated proportions & label "प्रकृति" */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-serif text-[#C8A45C] text-[15px]">प्रकृति</span>
              <span className="font-data text-[#8FA398]">V:{prakritiRatio.v}% · P:{prakritiRatio.p}% · K:{prakritiRatio.k}%</span>
            </div>
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-[#16201C]">
              <div
                style={{ width: `${prakritiRatio.v}%` }}
                className="h-full bg-[#7A8FB8] transition-all duration-700"
                title="Vata"
              />
              <div
                style={{ width: `${prakritiRatio.p}%` }}
                className="h-full bg-[#E0713A] transition-all duration-700"
                title="Pitta"
              />
              <div
                style={{ width: `${prakritiRatio.k}%` }}
                className="h-full bg-[#6FA36B] transition-all duration-700"
                title="Kapha"
              />
            </div>
            <div className="flex justify-between text-[13px] font-data text-[#56685F] pt-0.5">
              <span className="text-[#7A8FB8]">Vata</span>
              <span className="text-[#E0713A]">Pitta</span>
              <span className="text-[#6FA36B]">Kapha</span>
            </div>
          </div>
        </div>

        {/* Tile 5: ALCOA+ integrity (col-span-4) */}
        <div className="lg:col-span-4 bg-[#101815] border border-[#22302A] hover:border-[#2FB39A]/40 rounded-[12px] p-6 transition-colors flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="font-data text-[13px] uppercase tracking-wider text-[#56685F]">
              GCP Compliance
            </div>
            <h3 className="text-[20px] font-medium text-[#E8EFE9]">
              ALCOA+ integrity
            </h3>
            <p className="text-[15px] text-[#8FA398]">
              Automated data provenance validation for every clinical observation and signed CRF.
            </p>
          </div>

          {/* Live Visual: 3x3 grid of the 9 principles as small pills checking off */}
          <div className="pt-2 grid grid-cols-3 gap-1.5">
            {ALCOA_PRINCIPLES.map((principle, idx) => {
              const isChecked = idx < checkedCount;
              return (
                <div
                  key={principle}
                  className={`px-2 py-1.5 rounded text-[13px] text-center font-data transition-all duration-300 border ${
                    isChecked
                      ? "bg-[#2FB39A]/15 border-[#2FB39A]/40 text-[#39C8AD]"
                      : "bg-[#16201C] border-[#22302A] text-[#56685F]"
                  }`}
                >
                  <span className="mr-1">{isChecked ? "✓" : "·"}</span>
                  {principle.slice(0, 4)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tile 6: Standards-ready export (col-span-12, short) */}
        <div className="lg:col-span-12 bg-[#101815] border border-[#22302A] hover:border-[#2FB39A]/40 rounded-[12px] p-6 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="font-data text-[13px] uppercase tracking-wider text-[#56685F]">
              Data Portability
            </div>
            <h3 className="text-[20px] font-medium text-[#E8EFE9]">
              Standards-ready export
            </h3>
            <p className="text-[15px] text-[#8FA398]">
              One-click regulatory submission bundles formatted for international peer review and CDSCO inspections.
            </p>
          </div>

          {/* Visual: 6-line FHIR R4 JSON snippet on left, chips on right */}
          <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <pre className="font-data text-[13px] bg-[#0A0F0D] border border-[#22302A] rounded-lg p-3 text-[#A8C0B2] leading-tight overflow-x-auto">
{`{
  "resourceType": "ResearchStudy",
  "identifier": "CTRI/2026/046",
  "status": "active",
  "category": "Ayush-Clinical"
}`}
            </pre>
            <div className="flex sm:flex-col gap-2 shrink-0">
              <span className="font-data text-[13px] px-3 py-1.5 rounded-lg bg-[#16201C] border border-[#2FB39A]/40 text-[#2FB39A] font-semibold text-center">
                FHIR R4
              </span>
              <span className="font-data text-[13px] px-3 py-1.5 rounded-lg bg-[#16201C] border border-[#C8A45C]/40 text-[#C8A45C] font-semibold text-center">
                CDISC SDTM
              </span>
              <span className="font-data text-[13px] px-3 py-1.5 rounded-lg bg-[#16201C] border border-[#7A8FB8]/40 text-[#7A8FB8] font-semibold text-center">
                ICH E2B(R3)
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
