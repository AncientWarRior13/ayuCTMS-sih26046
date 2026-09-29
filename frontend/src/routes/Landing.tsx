import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Lenis from "lenis";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Eye,
  FileCheck,
  Fingerprint,
  Lock,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import ChainScene from "../components/landing/three/ChainScene";
import { SceneProvider, useSceneProgress } from "../components/landing/three/SceneContext";
import { STATIONS } from "../components/landing/three/types";

// Unfold 3 Problem -> Solution statements
const UNFOLD_STATEMENTS = [
  {
    step: "01",
    tag: "TAMPER-EVIDENT RECORDING",
    problem: "Traditional trial spreadsheets allow retroactive edits and missing date stamps.",
    solution: "AyuCTMS calculates cryptographic SHA-256 block hashes on every CRF mutation. Any retroactive alteration breaks the forward chain immediately.",
  },
  {
    step: "02",
    tag: "STRICT AYUSH ONTOLOGIES",
    problem: "Generic western EDC systems lack native Prakriti, Vikriti, Agni, and Ayush Morbidity vocabularies.",
    solution: "Built-in CDISC CT codelists + 30 Ayush morbidity terms mapped directly to CDISC SDTM and WHO-ART standards.",
  },
  {
    step: "03",
    tag: "REGULATORY SAE TIMERS",
    problem: "Adverse events reported after the 24-hour statutory deadline risk clinical suspension.",
    solution: "Hardware-precise 1Hz PV countdown clocks notify CDSCO, Sponsor, and IEC with automated audit trail generation.",
  },
];

// Live mini-readout component for How It Works
function StationReadout({ station }: { station: (typeof STATIONS)[number] }) {
  const [countdown, setCountdown] = useState({ h: 18, m: 42, s: 10 });

  useEffect(() => {
    if (station.readoutType !== "sae") return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { ...prev, m: 59, s: 59 };
        return { h: Math.max(0, prev.h - 1), m: 59, s: 59 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [station.readoutType]);

  return (
    <div className="mt-4 p-4 rounded-xl bg-[#101815] border border-[#22302A] font-mono text-xs shadow-lg">
      <div className="flex items-center justify-between text-[#8FA398] text-[11px] mb-1.5">
        <span className="flex items-center gap-1.5 font-semibold tracking-wider text-[#C8A45C]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C8A45C]" />
          {station.readoutData.label}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#16201C] border border-[#22302A] text-[#2FB39A]">
          LIVE
        </span>
      </div>

      <div className="text-[#E8EFE9] font-medium text-sm my-1 break-all">
        {station.readoutType === "sae" ? (
          <span className="text-[#F2A93B] font-bold">
            {String(countdown.h).padStart(2, "0")}h : {String(countdown.m).padStart(2, "0")}m :{" "}
            {String(countdown.s).padStart(2, "0")}s
          </span>
        ) : (
          station.readoutData.value
        )}
      </div>

      <div className="text-[11px] text-[#56685F] mt-1">{station.readoutData.subtext}</div>
    </div>
  );
}

// Inner Landing Content that consumes useSceneProgress
function LandingContent() {
  const {
    progress,
    setProgress,
    tamperState,
    onRestore,
    activeStationIndex,
    isMobileOrReduced,
  } = useSceneProgress();

  const journeyRef = useRef<HTMLDivElement>(null);

  // Initialize Lenis smooth scroll and update progress
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
    });

    const handleScroll = () => {
      if (!journeyRef.current) return;
      const rect = journeyRef.current.getBoundingClientRect();
      const journeyHeight = rect.height - window.innerHeight;
      if (journeyHeight <= 0) return;

      const scrolled = -rect.top;
      const rawP = Math.max(0, Math.min(1, scrolled / journeyHeight));
      setProgress(rawP);
    };

    lenis.on("scroll", handleScroll);

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      lenis.destroy();
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [setProgress]);

  return (
    <div className="relative min-h-screen bg-[#0A0F0D] text-[#E8EFE9] selection:bg-[#2FB39A] selection:text-[#0A0F0D]">
      {/* 3D WebGL Background Canvas */}
      <ChainScene />

      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 border-b border-[#22302A]/60 bg-[#0A0F0D]/70 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16201C] border border-[#2FB39A]/40 text-[#2FB39A]">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-[#E8EFE9]">
                AyuCTMS
              </span>
              <span className="ml-2 text-[10px] uppercase tracking-wider text-[#8FA398]">
                SIH26046 · Ministry of Ayush
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/lab"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#C8A45C] bg-[#16201C] hover:bg-[#1D2A24] border border-[#C8A45C]/30 rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              3D Lab Rig
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-[#2FB39A] px-4 py-2 text-xs font-semibold text-[#0A0F0D] hover:bg-[#269984] transition-colors"
            >
              Sign In
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* PINNED SCROLL JOURNEY CONTAINER (550vh)                        */}
      {/* Drives progress 0.0 -> 1.0                                   */}
      {/* ============================================================ */}
      <div
        ref={journeyRef}
        className={isMobileOrReduced ? "relative" : "relative h-[550vh]"}
      >
        <div
          className={
            isMobileOrReduced
              ? "relative pt-24 px-6 space-y-24"
              : "sticky top-0 h-screen w-full overflow-hidden pointer-events-none"
          }
        >
          {/* ========================================================== */}
          {/* HERO SECTION (Progress 0.00 - 0.12)                         */}
          {/* ========================================================== */}
          <section
            className={`absolute inset-0 flex items-center transition-opacity duration-500 ${
              isMobileOrReduced || progress <= 0.14
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="mx-auto w-full max-w-7xl px-6 pt-16">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                {/* Left Column (Hero Content) */}
                <div className="lg:col-span-6 space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#22302A] bg-[#101815] px-3.5 py-1 text-xs text-[#C8A45C]">
                    <span className="w-2 h-2 rounded-full bg-[#2FB39A]" />
                    Tamper-Evident Ayurveda Clinical Trials
                  </div>

                  <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] tracking-tight text-[#E8EFE9]">
                    Cryptographic integrity for traditional medicine research.
                  </h1>

                  <p className="text-base text-[#8FA398] leading-relaxed max-w-xl">
                    Every participant consent, Ayurvedic CRF entry, and adverse event anchored in a
                    forward-secure cryptographic audit chain. Purpose-built for GCP Schedule Y,
                    CDISC SDTM, and DPDP 2023 compliance.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#2FB39A] px-6 py-3 text-sm font-semibold text-[#0A0F0D] hover:bg-[#269984] shadow-lg shadow-[#2FB39A]/20 transition-all hover:scale-[1.02]"
                    >
                      Enter Workspace
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a
                      href="#spec"
                      className="inline-flex items-center gap-2 rounded-xl border border-[#22302A] bg-[#101815] px-5 py-3 text-sm font-medium text-[#E8EFE9] hover:bg-[#16201C] transition-colors"
                    >
                      Regulatory Spec
                    </a>
                  </div>

                  {/* Interactive Tamper Status Chip */}
                  <div className="pt-4">
                    {tamperState.tamperedIndex !== null ? (
                      <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#E5484D]/15 border border-[#E5484D]/40 text-[#E5484D] text-xs font-mono shadow-xl animate-pulse">
                        <ShieldAlert className="w-4 h-4 text-[#E5484D]" />
                        <span>CHAIN BROKEN AT BLOCK #{tamperState.tamperedIndex}</span>
                        <button
                          onClick={onRestore}
                          className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#2FB39A] hover:bg-[#269984] text-[#0A0F0D] font-bold text-xs transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Restore Chain
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-xs text-[#56685F] font-mono">
                        <Fingerprint className="w-3.5 h-3.5 text-[#C8A45C]" />
                        <span>Interactive 3D: Click any petal block in the lotus to test tamper detection</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Empty to leave space for 3D Lotus */}
                <div className="hidden lg:block lg:col-span-6 pointer-events-none" />
              </div>
            </div>
          </section>

          {/* ========================================================== */}
          {/* UNFOLD SECTION (Progress 0.14 - 0.38)                       */}
          {/* Text in left 45%, 3D chain line visible on right           */}
          {/* ========================================================== */}
          <section
            className={`absolute inset-0 flex items-center transition-opacity duration-500 ${
              !isMobileOrReduced && progress > 0.14 && progress <= 0.38
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="mx-auto w-full max-w-7xl px-6">
              <div className="w-full lg:w-[45%] space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#22302A] bg-[#101815] px-3 py-1 text-xs text-[#C8A45C]">
                  <span>The Architectural Transformation</span>
                </div>

                <h2 className="font-serif text-3xl sm:text-4xl text-[#E8EFE9] leading-tight">
                  From scattered clinical spreadsheets to a verified blockchain ledger.
                </h2>

                <div className="space-y-4 pt-2">
                  {UNFOLD_STATEMENTS.map((item) => (
                    <div
                      key={item.step}
                      className="p-4 rounded-xl bg-[#101815]/90 border border-[#22302A] backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between text-xs font-mono text-[#C8A45C] mb-1">
                        <span>{item.tag}</span>
                        <span>{item.step}</span>
                      </div>
                      <div className="text-xs text-[#8FA398] line-through mb-1.5 opacity-80">
                        {item.problem}
                      </div>
                      <div className="text-xs text-[#E8EFE9] leading-relaxed">
                        {item.solution}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================== */}
          {/* HOW IT WORKS SECTION (Progress 0.38 - 0.85)                 */}
          {/* Left rail with 5 stations + live readouts                  */}
          {/* ========================================================== */}
          <section
            className={`absolute inset-0 flex items-center transition-opacity duration-500 ${
              !isMobileOrReduced && progress > 0.38 && progress <= 0.85
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="mx-auto w-full max-w-7xl px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Rail: 5 Stations */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="text-xs font-mono text-[#C8A45C] uppercase tracking-wider mb-2">
                    Station {activeStationIndex + 1} of 5 · Clinical Data Pipeline
                  </div>

                  {STATIONS.map((station, idx) => {
                    const isActive = idx === activeStationIndex;
                    return (
                      <div
                        key={station.title}
                        className={`p-4 rounded-xl transition-all duration-300 border ${
                          isActive
                            ? "bg-[#101815] border-[#2FB39A] shadow-lg shadow-[#2FB39A]/10 scale-[1.02]"
                            : "bg-[#101815]/40 border-[#22302A] opacity-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h3
                            className={`text-sm font-semibold ${
                              isActive ? "text-[#E8EFE9]" : "text-[#8FA398]"
                            }`}
                          >
                            {station.title}
                          </h3>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                              isActive
                                ? "bg-[#2FB39A]/15 text-[#39C8AD] border border-[#2FB39A]/30"
                                : "bg-[#16201C] text-[#56685F]"
                            }`}
                          >
                            {station.badge}
                          </span>
                        </div>

                        {isActive && (
                          <div className="mt-2 space-y-3">
                            <p className="text-xs text-[#8FA398] leading-relaxed">
                              {station.description}
                            </p>
                            <StationReadout station={station} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Open tunnel view for 3D corridor */}
                <div className="hidden lg:block lg:col-span-7" />
              </div>
            </div>
          </section>

          {/* ========================================================== */}
          {/* FINAL CTA SECTION (Progress 0.85 - 1.00)                    */}
          {/* Centered headline, verified lotus glowing behind it         */}
          {/* ========================================================== */}
          <section
            className={`absolute inset-0 flex items-center justify-center text-center transition-opacity duration-500 ${
              !isMobileOrReduced && progress > 0.85
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="max-w-2xl px-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2FB39A]/50 bg-[#101815] px-4 py-1.5 text-xs text-[#39C8AD] shadow-lg shadow-[#2FB39A]/15">
                <CheckCircle2 className="w-4 h-4 text-[#2FB39A]" />
                All 60 Cryptographic Blocks Verified · Hash Chain Intact
              </div>

              <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#E8EFE9] leading-tight">
                Ready to run compliance-grade Ayurvedic clinical trials?
              </h2>

              <p className="text-base text-[#8FA398] leading-relaxed">
                Connect your institutional trial sites, launch prospectively registered CTRI
                protocols, and automate pharmacovigilance reporting.
              </p>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2FB39A] px-8 py-3.5 text-sm font-semibold text-[#0A0F0D] hover:bg-[#269984] shadow-xl shadow-[#2FB39A]/30 transition-all hover:scale-105"
                >
                  Enter Clinical Workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SOLID SECTIONS: Bento, Roles, Regulatory, Footer             */}
      {/* Sits after the pinned journey on solid bg covering canvas     */}
      {/* ============================================================ */}
      <div id="spec" className="relative z-10 bg-[#0A0F0D] border-t border-[#22302A]">
        {/* Bento Grid */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#E8EFE9]">
              Built for regulatory scrutiny from day zero
            </h2>
            <p className="text-sm text-[#8FA398]">
              Compliant with the National Pharmacovigilance Programme for ASU Drugs and Schedule Y
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#101815] border border-[#22302A] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#16201C] border border-[#22302A] flex items-center justify-center text-[#2FB39A]">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg text-[#E8EFE9]">Schedule Y PV Clocks</h3>
              <p className="text-xs text-[#8FA398] leading-relaxed">
                Automated 24-hour statutory timers for serious adverse reactions (ADR/SAE).
                Deterministic escalations notify the licensing authority and ethics committee.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101815] border border-[#22302A] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#16201C] border border-[#22302A] flex items-center justify-center text-[#C8A45C]">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg text-[#E8EFE9]">CDISC SDTM & FHIR R4</h3>
              <p className="text-xs text-[#8FA398] leading-relaxed">
                Export submission-ready SDTM DM and AE domains alongside de-identified FHIR R4
                ResearchStudy bundles for international peer review.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101815] border border-[#22302A] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#16201C] border border-[#22302A] flex items-center justify-center text-[#4C8DFF]">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg text-[#E8EFE9]">Row-Level Security (RLS)</h3>
              <p className="text-xs text-[#8FA398] leading-relaxed">
                PostgreSQL multi-tenant database policies enforce strict site isolation.
                Coordinators at Site 1 cannot view or modify participant data from Site 2.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101815] border border-[#22302A] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#16201C] border border-[#22302A] flex items-center justify-center text-[#2FBF71]">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg text-[#E8EFE9]">DPDP Act 2023 Consent</h3>
              <p className="text-xs text-[#8FA398] leading-relaxed">
                Direct participant identifiers encrypted with Fernet AES-128. Consent withdrawal
                immediately freezes future CRF data collection while retaining past audits.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101815] border border-[#22302A] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#16201C] border border-[#22302A] flex items-center justify-center text-[#E0713A]">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg text-[#E8EFE9]">Classical Prakriti CRFs</h3>
              <p className="text-xs text-[#8FA398] leading-relaxed">
                Standardized forms capturing Vata, Pitta, Kapha, Agni, and Kostha phenotypes alongside
                conventional biochemical and hematological laboratory panels.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101815] border border-[#22302A] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#16201C] border border-[#22302A] flex items-center justify-center text-[#7A8FB8]">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg text-[#E8EFE9]">Zero-Write Auditor Role</h3>
              <p className="text-xs text-[#8FA398] leading-relaxed">
                Specialized regulator persona with strict read-only access. Every inspection view is
                itself immutably logged into the system audit trail.
              </p>
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section className="mx-auto max-w-7xl px-6 py-20 border-t border-[#22302A]">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#E8EFE9]">
              Seven specialized stakeholder personas
            </h2>
            <p className="text-sm text-[#8FA398]">
              Tailored dashboards designed specifically for each role's compliance duties
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { role: "PI", name: "Principal Investigator", desc: "Protocol & Approvals" },
              { role: "COORD", name: "Study Coordinator", desc: "Patient Visits & CRF" },
              { role: "MONITOR", name: "CRA Monitor", desc: "Source Data SDV" },
              { role: "IEC", name: "Ethics Committee", desc: "Expiry & Safety Reviews" },
              { role: "PV", name: "Safety Officer", desc: "24h SAE Timelines" },
              { role: "ADMIN", name: "System Admin", desc: "Users & Rule Sets" },
              { role: "REGULATOR", name: "CDSCO Auditor", desc: "Read-only Inspection" },
            ].map((item) => (
              <div
                key={item.role}
                className="p-3.5 rounded-xl bg-[#101815] border border-[#22302A] text-center space-y-1.5"
              >
                <div className="text-xs font-mono font-bold text-[#2FB39A]">{item.role}</div>
                <div className="text-xs font-medium text-[#E8EFE9]">{item.name}</div>
                <div className="text-[10px] text-[#56685F]">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#22302A] py-12 px-6">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-[#2FB39A]" />
              <span className="font-serif font-bold text-sm text-[#E8EFE9]">AyuCTMS</span>
              <span className="text-xs text-[#56685F]">
                © 2026 Smart India Hackathon · Problem Statement 26046
              </span>
            </div>

            <div className="flex items-center gap-6 text-xs text-[#8FA398]">
              <Link to="/lab" className="hover:text-[#2FB39A] transition-colors">
                3D Lab
              </Link>
              <Link to="/login" className="hover:text-[#2FB39A] transition-colors">
                Sign In
              </Link>
              <a
                href="https://ayush.gov.in"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-[#2FB39A] transition-colors"
              >
                Ministry of Ayush
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <SceneProvider initialProgress={0}>
      <LandingContent />
    </SceneProvider>
  );
}
