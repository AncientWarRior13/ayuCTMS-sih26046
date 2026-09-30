import { useState, useEffect } from "react";

export default function SecuritySection() {
  // Tile 1: RLS hover state
  const [hoveredSite, setHoveredSite] = useState<"site1" | "site2" | null>(null);

  // Tile 2: PII Reveal state
  const [isRevealed, setIsRevealed] = useState(false);
  const [reasonInput, setReasonInput] = useState("");
  const [showReasonBox, setShowReasonBox] = useState(false);

  useEffect(() => {
    if (!isRevealed) return;
    const timer = setTimeout(() => {
      setIsRevealed(false);
      setShowReasonBox(false);
      setReasonInput("");
    }, 3000);
    return () => clearTimeout(timer);
  }, [isRevealed]);

  const handleRevealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonInput.trim()) return;
    setIsRevealed(true);
  };

  // Tile 3: DPDP Consent toggle state
  const [consentActive, setConsentActive] = useState(true);

  return (
    <section id="security" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      {/* Header */}
      <div className="max-w-3xl mb-12 space-y-4">
        <div className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C]">
          Security and privacy
        </div>
        <h2 className="font-display text-4xl sm:text-5xl leading-[1.05] text-[#E8EFE9]">
          Your data <em className="italic text-[#C8A45C]">stays where it belongs.</em>
        </h2>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tile 1: Row-level security */}
        <div className="bg-[#101815] border border-[#22302A] hover:border-[#2FB39A]/40 rounded-[12px] p-6 flex flex-col justify-between space-y-6 transition-colors">
          <div className="space-y-2">
            <h3 className="text-[20px] font-medium text-[#E8EFE9]">
              Row-level security (RLS)
            </h3>
            <p className="text-[15px] text-[#8FA398] leading-relaxed">
              PostgreSQL row-level policies isolate every site. A Site 1 coordinator cannot view or modify Site 2.
            </p>
          </div>

          {/* Visual: Two boxes Site 1 / Site 2 with a lock; hovering one dims the other */}
          <div className="bg-[#0A0F0D] border border-[#22302A] rounded-lg p-5 flex items-center justify-between gap-4">
            <div
              onMouseEnter={() => setHoveredSite("site1")}
              onMouseLeave={() => setHoveredSite(null)}
              className={`flex-1 p-3.5 rounded-lg border text-center font-data transition-all duration-300 motion-reduce:transition-none cursor-pointer ${
                hoveredSite === "site2"
                  ? "opacity-30 border-[#22302A] bg-[#16201C]"
                  : hoveredSite === "site1"
                  ? "border-[#2FB39A] bg-[#2FB39A]/10 text-[#39C8AD]"
                  : "border-[#22302A] bg-[#16201C] text-[#E8EFE9]"
              }`}
            >
              <div className="text-[15px] font-bold">Site 01 · Delhi</div>
              <div className="text-[13px] text-[#8FA398] mt-0.5">Isolated Tenant</div>
            </div>

            <div className="flex flex-col items-center shrink-0 px-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#C8A45C]" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span className="font-data text-[13px] text-[#56685F] mt-1">RLS Guard</span>
            </div>

            <div
              onMouseEnter={() => setHoveredSite("site2")}
              onMouseLeave={() => setHoveredSite(null)}
              className={`flex-1 p-3.5 rounded-lg border text-center font-data transition-all duration-300 motion-reduce:transition-none cursor-pointer ${
                hoveredSite === "site1"
                  ? "opacity-30 border-[#22302A] bg-[#16201C]"
                  : hoveredSite === "site2"
                  ? "border-[#2FB39A] bg-[#2FB39A]/10 text-[#39C8AD]"
                  : "border-[#22302A] bg-[#16201C] text-[#E8EFE9]"
              }`}
            >
              <div className="text-[15px] font-bold">Site 02 · Jaipur</div>
              <div className="text-[13px] text-[#8FA398] mt-0.5">Isolated Tenant</div>
            </div>
          </div>
        </div>

        {/* Tile 2: Encrypted participant identity */}
        <div className="bg-[#101815] border border-[#22302A] hover:border-[#2FB39A]/40 rounded-[12px] p-6 flex flex-col justify-between space-y-6 transition-colors">
          <div className="space-y-2">
            <h3 className="text-[20px] font-medium text-[#E8EFE9]">
              Encrypted participant identity
            </h3>
            <p className="text-[15px] text-[#8FA398] leading-relaxed">
              Direct identifiers are encrypted with Fernet. Revealing PII requires a typed reason.
            </p>
          </div>

          {/* Visual: Masked value with Reveal button, input on reveal, re-masks after 3s */}
          <div className="bg-[#0A0F0D] border border-[#22302A] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-data text-[13px] text-[#56685F]">Patient Identifier</span>
              <span className="font-data text-[13px] text-[#C8A45C]">AES-128 Fernet</span>
            </div>

            <div className="flex items-center justify-between bg-[#16201C] border border-[#22302A] rounded p-2.5">
              <span className="font-data text-[15px] font-semibold text-[#E8EFE9] tracking-wider">
                {isRevealed ? "P-0142 (Aarav Sharma)" : "●●●● ●●●● 4821"}
              </span>

              {!isRevealed && !showReasonBox && (
                <button
                  type="button"
                  onClick={() => setShowReasonBox(true)}
                  className="font-data text-[13px] px-3 py-1 rounded bg-[#2FB39A] hover:bg-[#269984] text-[#0A0F0D] font-bold transition-colors"
                >
                  Reveal
                </button>
              )}

              {isRevealed && (
                <span className="font-data text-[13px] text-[#2FB39A] animate-pulse">
                  Revealed (Auto-locks)
                </span>
              )}
            </div>

            {showReasonBox && !isRevealed && (
              <form onSubmit={handleRevealSubmit} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Enter clinical audit reason..."
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  className="flex-1 bg-[#101815] border border-[#22302A] rounded px-3 py-1.5 text-[13px] text-[#E8EFE9] focus:outline-none focus:border-[#2FB39A]"
                  autoFocus
                />
                <button
                  type="submit"
                  className="font-data text-[13px] px-3 py-1.5 rounded bg-[#2FB39A] text-[#0A0F0D] font-bold hover:bg-[#269984]"
                >
                  Confirm
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Tile 3: DPDP consent */}
        <div className="bg-[#101815] border border-[#22302A] hover:border-[#2FB39A]/40 rounded-[12px] p-6 flex flex-col justify-between space-y-6 transition-colors">
          <div className="space-y-2">
            <h3 className="text-[20px] font-medium text-[#E8EFE9]">
              DPDP Act 2023 consent
            </h3>
            <p className="text-[15px] text-[#8FA398] leading-relaxed">
              Withdrawing consent immediately freezes future CRF data collection, while past audit records are retained.
            </p>
          </div>

          {/* Visual: Toggle Consent active; when off, small CRF form greys out and shows Frozen */}
          <div className="bg-[#0A0F0D] border border-[#22302A] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#22302A]">
              <span className="font-data text-[13px] text-[#E8EFE9]">DPDP Consent Status:</span>
              <button
                type="button"
                onClick={() => setConsentActive(!consentActive)}
                className={`font-data text-[13px] px-3 py-1 rounded-full font-bold transition-colors ${
                  consentActive
                    ? "bg-[#2FB39A]/20 text-[#2FB39A] border border-[#2FB39A]/40"
                    : "bg-[#E5484D]/20 text-[#E5484D] border border-[#E5484D]/40"
                }`}
              >
                {consentActive ? "Consent Active" : "Withdrawn"}
              </button>
            </div>

            {/* CRF Form Representation */}
            <div
              className={`p-3 rounded border space-y-2 transition-all duration-300 motion-reduce:transition-none ${
                consentActive
                  ? "bg-[#16201C] border-[#22302A] opacity-100"
                  : "bg-[#121614] border-[#22302A]/40 opacity-40 select-none pointer-events-none"
              }`}
            >
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[#8FA398]">CRF Section 4: Daily Vata Score</span>
                <span className="font-data text-[#C8A45C]">
                  {consentActive ? "Accepting entries" : "FROZEN"}
                </span>
              </div>
              <div className="h-7 w-full bg-[#101815] rounded border border-[#22302A] px-2 flex items-center text-[13px] text-[#56685F]">
                {consentActive ? "Input clinical score..." : "Data collection halted by consent withdrawal"}
              </div>
            </div>
          </div>
        </div>

        {/* Tile 4: Zero-write auditor */}
        <div className="bg-[#101815] border border-[#22302A] hover:border-[#2FB39A]/40 rounded-[12px] p-6 flex flex-col justify-between space-y-6 transition-colors">
          <div className="space-y-2">
            <h3 className="text-[20px] font-medium text-[#E8EFE9]">
              Zero-write auditor role
            </h3>
            <p className="text-[15px] text-[#8FA398] leading-relaxed">
              The regulator role is read-only, and every inspection view is itself logged to the audit trail.
            </p>
          </div>

          {/* Visual: Three buttons (Edit, Delete, Export) with Edit and Delete disabled, and audit log line */}
          <div className="bg-[#0A0F0D] border border-[#22302A] rounded-lg p-4 space-y-3">
            <div className="flex gap-2">
              <button
                disabled
                className="flex-1 py-1.5 rounded bg-[#16201C] border border-[#22302A] text-[#56685F] text-[13px] font-data cursor-not-allowed line-through"
              >
                Edit CRF
              </button>
              <button
                disabled
                className="flex-1 py-1.5 rounded bg-[#16201C] border border-[#22302A] text-[#56685F] text-[13px] font-data cursor-not-allowed line-through"
              >
                Delete Row
              </button>
              <button
                className="flex-1 py-1.5 rounded bg-[#2FB39A]/15 border border-[#2FB39A]/40 text-[#39C8AD] text-[13px] font-data font-semibold hover:bg-[#2FB39A]/25 transition-colors"
              >
                Export SDTM
              </button>
            </div>

            <div className="bg-[#16201C] rounded p-2.5 border border-[#22302A] font-data text-[13px] text-[#8FA398] flex items-center justify-between">
              <span className="text-[#39C8AD]">REGULATOR</span>
              <span>viewed /audit</span>
              <span className="text-[#56685F]">10:42 UTC · Logged</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
