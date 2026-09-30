import { useState } from "react";

interface SignalRow {
  id: string;
  pair: string;
  reaction: string;
  ror: number;
  ciLower: number;
  ciUpper: number;
  prr: number;
  chiSquare: number;
  n: number;
  prakriti: {
    vata: number;
    pitta: number;
    kapha: number;
  };
}

const SIGNALS_DATA: SignalRow[] = [
  {
    id: "sig-1",
    pair: "Ashwagandha + Beta-blocker",
    reaction: "Sinus Bradycardia",
    ror: 3.42,
    ciLower: 1.85,
    ciUpper: 6.32,
    prr: 2.85,
    chiSquare: 8.92,
    n: 14,
    prakriti: { vata: 8, pitta: 4, kapha: 2 },
  },
  {
    id: "sig-2",
    pair: "Guggulu + Statin",
    reaction: "Myopathy / CK Elevation",
    ror: 2.65,
    ciLower: 1.32,
    ciUpper: 5.18,
    prr: 2.14,
    chiSquare: 5.64,
    n: 9,
    prakriti: { vata: 3, pitta: 5, kapha: 1 },
  },
  {
    id: "sig-3",
    pair: "Brahmi + Beta-blocker",
    reaction: "Postural Hypotension",
    ror: 1.84,
    ciLower: 0.92,
    ciUpper: 3.71,
    prr: 1.62,
    chiSquare: 2.15,
    n: 4,
    prakriti: { vata: 2, pitta: 1, kapha: 1 },
  },
  {
    id: "sig-4",
    pair: "Curcumin + Warfarin",
    reaction: "INR Prolongation / Bleeding",
    ror: 3.88,
    ciLower: 2.05,
    ciUpper: 7.34,
    prr: 3.12,
    chiSquare: 11.45,
    n: 18,
    prakriti: { vata: 4, pitta: 11, kapha: 3 },
  },
  {
    id: "sig-5",
    pair: "Shankhpushpi + Phenytoin",
    reaction: "Excess Sedation",
    ror: 1.45,
    ciLower: 0.76,
    ciUpper: 2.91,
    prr: 1.35,
    chiSquare: 1.42,
    n: 3,
    prakriti: { vata: 1, pitta: 1, kapha: 1 },
  },
];

export default function SignalSection() {
  const [selectedSignal, setSelectedSignal] = useState<SignalRow>(SIGNALS_DATA[0]);

  // Log scale conversion: log10(0.5) to log10(10.0) -> mapped to SVG width [220, 520]
  const plotLeft = 220;
  const plotRight = 520;
  const logMin = Math.log10(0.5);
  const logMax = Math.log10(10.0);

  const getX = (val: number) => {
    const clamped = Math.max(0.5, Math.min(10.0, val));
    const ratio = (Math.log10(clamped) - logMin) / (logMax - logMin);
    return plotLeft + ratio * (plotRight - plotLeft);
  };

  const baselineX = getX(1.0);

  return (
    <section id="signals" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      {/* Header */}
      <div className="max-w-3xl mb-12 space-y-4">
        <div className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C]">
          Pharmacovigilance
        </div>
        <h2 className="font-display text-4xl sm:text-5xl leading-[1.05] text-[#E8EFE9]">
          See the herb-drug signal <em className="italic text-[#C8A45C]">before it becomes a headline.</em>
        </h2>
        <p className="text-[18px] text-[#8FA398] leading-relaxed">
          Disproportionality analysis with PRR and ROR, 95% confidence intervals, and Evans criteria, plus Prakriti-linked safety profiles.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Forest Plot SVG (col-span-7) */}
        <div className="lg:col-span-7 bg-[#101815] border border-[#22302A] rounded-[12px] p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#22302A]">
            <span className="font-data text-[13px] text-[#56685F] uppercase tracking-wider">
              Disproportionality Forest Plot (ROR & 95% CI)
            </span>
            <span className="font-data text-[13px] text-[#8FA398]">
              Baseline ROR = 1.0
            </span>
          </div>

          {/* Horizontally scrollable wrapper on mobile */}
          <div className="overflow-x-auto pb-2">
            <svg
              viewBox="0 0 560 300"
              className="w-full min-w-[540px] h-[300px] select-none"
            >
              {/* Vertical baseline at ROR = 1.0 */}
              <line
                x1={baselineX}
                y1={20}
                x2={baselineX}
                y2={250}
                stroke="#56685F"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <text
                x={baselineX}
                y={15}
                textAnchor="middle"
                fill="#56685F"
                fontSize="11"
                fontFamily="monospace"
              >
                1.0 (No signal)
              </text>

              {/* X Axis ticks */}
              {[0.5, 1.0, 2.0, 5.0, 10.0].map((t) => (
                <g key={t} transform={`translate(${getX(t)}, 265)`}>
                  <line y1={0} y2={6} stroke="#33463E" strokeWidth={1} />
                  <text
                    y={18}
                    textAnchor="middle"
                    fill="#8FA398"
                    fontSize="11"
                    fontFamily="monospace"
                  >
                    {t}
                  </text>
                </g>
              ))}

              {/* Rows */}
              {SIGNALS_DATA.map((row, idx) => {
                const y = 50 + idx * 42;
                const isSelected = selectedSignal.id === row.id;
                const meetsEvans = row.prr >= 2.0 && row.chiSquare >= 4.0 && row.n >= 3;
                const xVal = getX(row.ror);
                const xMin = getX(row.ciLower);
                const xMax = getX(row.ciUpper);

                return (
                  <g
                    key={row.id}
                    className="cursor-pointer transition-opacity"
                    onClick={() => setSelectedSignal(row)}
                    onMouseEnter={() => setSelectedSignal(row)}
                  >
                    {/* Hover hit box */}
                    <rect
                      x={5}
                      y={y - 18}
                      width={550}
                      height={36}
                      rx={6}
                      fill={isSelected ? "#16201C" : "transparent"}
                      stroke={isSelected ? "#2FB39A" : "transparent"}
                      strokeWidth={1}
                    />

                    {/* Pair Label */}
                    <text
                      x={15}
                      y={y - 2}
                      fill={isSelected ? "#E8EFE9" : "#CDE0D5"}
                      fontSize="13"
                      fontWeight="500"
                    >
                      {row.pair}
                    </text>
                    <text
                      x={15}
                      y={y + 12}
                      fill="#8FA398"
                      fontSize="11"
                      fontFamily="monospace"
                    >
                      {row.reaction}
                    </text>

                    {/* CI Whisker */}
                    <line
                      x1={xMin}
                      y1={y}
                      x2={xMax}
                      y2={y}
                      stroke={isSelected ? "#2FB39A" : "#8FA398"}
                      strokeWidth={2}
                    />
                    <line
                      x1={xMin}
                      y1={y - 5}
                      x2={xMin}
                      y2={y + 5}
                      stroke={isSelected ? "#2FB39A" : "#8FA398"}
                      strokeWidth={2}
                    />
                    <line
                      x1={xMax}
                      y1={y - 5}
                      x2={xMax}
                      y2={y + 5}
                      stroke={isSelected ? "#2FB39A" : "#8FA398"}
                      strokeWidth={2}
                    />

                    {/* Point Estimate (Square) */}
                    <rect
                      x={xVal - 4}
                      y={y - 4}
                      width={8}
                      height={8}
                      fill={meetsEvans ? "#2FB39A" : "#C8A45C"}
                      stroke="#0A0F0D"
                      strokeWidth={1}
                    />

                    {/* Status Badge */}
                    {meetsEvans ? (
                      <g transform={`translate(${520}, ${y})`}>
                        <text
                          x={-5}
                          y={4}
                          textAnchor="end"
                          fill="#2FB39A"
                          fontSize="11"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          EVANS ✓
                        </text>
                      </g>
                    ) : (
                      <g transform={`translate(${520}, ${y})`}>
                        <text
                          x={-5}
                          y={4}
                          textAnchor="end"
                          fill="#56685F"
                          fontSize="11"
                          fontFamily="monospace"
                        >
                          Below threshold
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[13px] font-data text-[#8FA398] pt-1 border-t border-[#22302A]">
            <span>Click or hover any row to inspect statistical parameters</span>
            <span className="text-[#56685F]">Evans criteria: PRR ≥ 2, χ² ≥ 4, N ≥ 3</span>
          </div>
        </div>

        {/* Right Column: Detail Card & Prakriti Table (col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Signal Detail Card */}
          <div className="bg-[#101815] border border-[#22302A] rounded-[12px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-data text-[13px] text-[#C8A45C] uppercase tracking-wider">
                Signal Details
              </span>
              <span
                className={`font-data text-[13px] px-2.5 py-0.5 rounded border font-semibold ${
                  selectedSignal.prr >= 2 && selectedSignal.chiSquare >= 4
                    ? "bg-[#2FB39A]/15 border-[#2FB39A]/40 text-[#2FB39A]"
                    : "bg-[#16201C] border-[#22302A] text-[#8FA398]"
                }`}
              >
                {selectedSignal.prr >= 2 && selectedSignal.chiSquare >= 4
                  ? "Evans Criteria Met"
                  : "Below Threshold"}
              </span>
            </div>

            <div>
              <h3 className="text-[20px] font-medium text-[#E8EFE9]">
                {selectedSignal.pair}
              </h3>
              <p className="text-[15px] text-[#8FA398] mt-0.5">
                Reported reaction: <span className="text-[#E8EFE9] font-medium">{selectedSignal.reaction}</span>
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-[#0A0F0D] border border-[#22302A] rounded-lg p-3">
                <div className="font-data text-[13px] text-[#56685F]">ROR (95% CI)</div>
                <div className="font-data text-[18px] font-semibold text-[#E8EFE9] mt-0.5">
                  {selectedSignal.ror.toFixed(2)}
                </div>
                <div className="font-data text-[13px] text-[#8FA398]">
                  [{selectedSignal.ciLower.toFixed(2)} - {selectedSignal.ciUpper.toFixed(2)}]
                </div>
              </div>

              <div className="bg-[#0A0F0D] border border-[#22302A] rounded-lg p-3">
                <div className="font-data text-[13px] text-[#56685F]">PRR / χ²</div>
                <div className="font-data text-[18px] font-semibold text-[#E8EFE9] mt-0.5">
                  {selectedSignal.prr.toFixed(2)}
                </div>
                <div className="font-data text-[13px] text-[#8FA398]">
                  Chi-Square: {selectedSignal.chiSquare.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between font-data text-[13px] bg-[#16201C] rounded-lg p-3 border border-[#22302A]">
              <span className="text-[#8FA398]">Observed Adverse Cases (N):</span>
              <span className="font-bold text-[#E8EFE9] text-[15px]">{selectedSignal.n}</span>
            </div>
          </div>

          {/* Mini Prakriti Table */}
          <div className="bg-[#101815] border border-[#22302A] rounded-[12px] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-data text-[13px] text-[#C8A45C] uppercase tracking-wider">
                Prakriti Phenotype Cohort
              </span>
              {selectedSignal.n < 5 && (
                <span className="font-data text-[13px] px-2 py-0.5 rounded bg-[#F2A93B]/15 text-[#F2A93B] border border-[#F2A93B]/30 font-semibold">
                  small-n
                </span>
              )}
            </div>

            <p className="text-[13px] text-[#8FA398]">
              Reported phenotype vulnerability breakdown across enrolled trial subjects:
            </p>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[13px] font-data">
                <span className="text-[#7A8FB8] font-medium">Vata Phenotype</span>
                <span className="text-[#E8EFE9] font-semibold">{selectedSignal.prakriti.vata} cases</span>
              </div>
              <div className="h-1.5 w-full bg-[#16201C] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7A8FB8] rounded-full"
                  style={{
                    width: `${(selectedSignal.prakriti.vata / selectedSignal.n) * 100}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[13px] font-data pt-1">
                <span className="text-[#E0713A] font-medium">Pitta Phenotype</span>
                <span className="text-[#E8EFE9] font-semibold">{selectedSignal.prakriti.pitta} cases</span>
              </div>
              <div className="h-1.5 w-full bg-[#16201C] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E0713A] rounded-full"
                  style={{
                    width: `${(selectedSignal.prakriti.pitta / selectedSignal.n) * 100}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[13px] font-data pt-1">
                <span className="text-[#6FA36B] font-medium">Kapha Phenotype</span>
                <span className="text-[#E8EFE9] font-semibold">{selectedSignal.prakriti.kapha} cases</span>
              </div>
              <div className="h-1.5 w-full bg-[#16201C] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#6FA36B] rounded-full"
                  style={{
                    width: `${(selectedSignal.prakriti.kapha / selectedSignal.n) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
