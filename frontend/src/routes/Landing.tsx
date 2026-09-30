import { Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Lenis from "lenis";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Fingerprint,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import ChainScene from "../components/landing/three/ChainScene";
import { SceneProvider, useSceneProgress } from "../components/landing/three/SceneContext";
import { ScenePoster } from "../components/landing/three/ScenePoster";
import { STATIONS } from "../components/landing/three/types";
import StandardsMarquee from "../components/landing/StandardsMarquee";
import Bento from "../components/landing/Bento";
import SignalSection from "../components/landing/SignalSection";
import SecuritySection from "../components/landing/SecuritySection";
import VerifyChain from "../components/landing/VerifyChain";
import ComplianceTable from "../components/landing/ComplianceTable";
import Roles from "../components/landing/Roles";
import Faq from "../components/landing/Faq";
import ClosingCta from "../components/landing/ClosingCta";
import Footer from "../components/landing/Footer";

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
    <div className="mt-4 p-4 rounded-xl bg-[#101815] border border-[#22302A] font-mono text-[13px] shadow-lg">
      <div className="flex items-center justify-between text-[#8FA398] mb-1.5">
        <span className="flex items-center gap-1.5 font-semibold tracking-wider text-[#C8A45C]">
          <span className="w-2 h-2 rounded-full bg-[#C8A45C]" />
          {station.readoutData.label}
        </span>
        <span className="text-[13px] px-2.5 py-0.5 rounded bg-[#16201C] border border-[#22302A] text-[#2FB39A]">
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

      <div className="text-[13px] text-[#A8C0B2] mt-1">{station.readoutData.subtext}</div>
    </div>
  );
}

// Section transition helper: hide-out 150ms, show-in 200ms with 200ms delay
const getSectionStyle = (isActive: boolean): React.CSSProperties => ({
  transition: isActive
    ? "opacity 200ms cubic-bezier(0.16, 1, 0.3, 1) 200ms, transform 200ms cubic-bezier(0.16, 1, 0.3, 1) 200ms"
    : "opacity 150ms cubic-bezier(0.7, 0, 0.84, 0) 0ms, transform 150ms cubic-bezier(0.7, 0, 0.84, 0) 0ms",
  opacity: isActive ? 1 : 0,
  transform: isActive ? "translateY(0px)" : "translateY(-10px)",
  pointerEvents: isActive ? "auto" : "none",
});

// Inner Landing Content that consumes useSceneProgress
function LandingContent() {
  const {
    setScrollTarget,
    activeSection,
    activeStationIndex,
    tamperState,
    onRestore,
    isMobileOrReduced,
  } = useSceneProgress();

  const [progress, setProgress] = useState(0);
  const journeyRef = useRef<HTMLDivElement>(null);

  // Initialize Lenis smooth scroll and update target progress ref
  // Removed duplicate window scroll listener per specification
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
    });

    const handleLenisScroll = () => {
      if (!journeyRef.current) return;
      const rect = journeyRef.current.getBoundingClientRect();
      const journeyHeight = rect.height - window.innerHeight;
      if (journeyHeight <= 0) return;

      const scrolled = -rect.top;
      const rawP = Math.max(0, Math.min(1, scrolled / journeyHeight));
      setScrollTarget(rawP);
      setProgress(rawP);
    };

    lenis.on("scroll", handleLenisScroll);

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    // Observe document and spec sections so Lenis recalculates scroll height
    const resizeObserver = new ResizeObserver(() => {
      lenis.resize();
    });
    if (journeyRef.current) resizeObserver.observe(journeyRef.current);
    const specEl = document.getElementById("spec");
    if (specEl) resizeObserver.observe(specEl);
    if (document.body) resizeObserver.observe(document.body);

    const t1 = setTimeout(() => lenis.resize(), 100);
    const t2 = setTimeout(() => lenis.resize(), 500);
    const t3 = setTimeout(() => lenis.resize(), 1500);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      lenis.destroy();
      cancelAnimationFrame(rafId);
    };
  }, [setScrollTarget]);

  return (
    <div className="landing-root relative min-h-screen bg-[#0A0F0D] text-[#E8EFE9] selection:bg-[#2FB39A] selection:text-[#0A0F0D]">
      {/* 3D WebGL Background Canvas with Poster Fallback */}
      <Suspense
        fallback={
          <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center opacity-40">
            <ScenePoster className="w-full h-full" />
          </div>
        }
      >
        <ChainScene />
      </Suspense>

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
              <span className="ml-2 text-[13px] uppercase tracking-wider text-[#8FA398]">
                SIH26046 · Ministry of Ayush
              </span>
            </div>
          </div>

          {/* Centred Anchor Links (hidden below 900px) */}
          <nav className="hidden min-[900px]:flex items-center gap-8 font-ui text-[14px] text-[#8FA398]">
            <a href="#journey-top" className="hover:text-[#E8EFE9] transition-colors">
              How it works
            </a>
            <a href="#platform" className="hover:text-[#E8EFE9] transition-colors">
              Platform
            </a>
            <a href="#verify" className="hover:text-[#E8EFE9] transition-colors">
              Verify
            </a>
            <a href="#roles" className="hover:text-[#E8EFE9] transition-colors">
              Roles
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-[#2FB39A] px-4 py-2 font-ui text-[14px] font-semibold text-[#0A0F0D] hover:bg-[#269984] transition-colors"
            >
              Sign In
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* PINNED SCROLL JOURNEY CONTAINER (750vh)                        */}
      {/* Drives progress 0.0 -> 1.0 with equal station distances       */}
      {/* ============================================================ */}
      <div
        id="journey-top"
        ref={journeyRef}
        className={isMobileOrReduced ? "relative z-10" : "relative z-10 h-[550vh] pointer-events-none"}
      >
        <div
          className={
            isMobileOrReduced
              ? "relative pt-24 px-6 space-y-24"
              : "sticky top-0 h-screen w-full overflow-hidden pointer-events-none z-10"
          }
        >
          {/* ========================================================== */}
          {/* HERO SECTION (Progress 0.00 - 0.12)                         */}
          {/* ========================================================== */}
          <section
            className={`absolute inset-0 flex items-center pointer-events-none transition-opacity duration-500 ${isMobileOrReduced || progress <= 0.14 ? "opacity-100" : "opacity-0"}`}
          >
            <div className="mx-auto w-full max-w-7xl px-6 pt-16">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                {/* Left Column (Hero Content) */}
                <div className="lg:col-span-6 space-y-6 pointer-events-auto">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#22302A] bg-[#101815] px-3.5 py-1 text-[13px] text-[#C8A45C]">
                    <span className="w-2 h-2 rounded-full bg-[#2FB39A]" />
                    Tamper-Evident Ayurveda Clinical Trials
                  </div>

                  <h1 className="font-serif text-4xl sm:text-5xl font-medium leading-[1.1] tracking-tight text-[#E8EFE9]">
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
                      className="inline-flex items-center gap-2 rounded-xl bg-[#2FB39A] px-6 py-3 text-sm font-semibold text-[#0A0F0D] hover:bg-[#269984] transition-all hover:scale-[1.02]"
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
                      <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#E5484D]/15 border border-[#E5484D]/40 text-[#E5484D] text-[13px] font-mono shadow-xl animate-pulse">
                        <ShieldAlert className="w-4 h-4 text-[#E5484D]" />
                        <span>CHAIN BROKEN AT BLOCK #{tamperState.tamperedIndex}</span>
                        <button
                          onClick={onRestore}
                          className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#2FB39A] hover:bg-[#269984] text-[#0A0F0D] font-bold text-[13px] transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Restore Chain
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-[13px] text-[#A8C0B2] font-mono">
                        <Fingerprint className="w-4 h-4 text-[#C8A45C]" />
                        <span>Interactive 3D: Click any petal block in the lotus to test tamper detection</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Open space for 3D Lotus */}
                <div className="hidden lg:block lg:col-span-6 pointer-events-none" />
              </div>
            </div>
          </section>

          {/* ========================================================== */}
          {/* UNFOLD SECTION (Progress 0.14 - 0.38)                       */}
          {/* ========================================================== */}
          <section
            style={isMobileOrReduced ? undefined : getSectionStyle(activeSection === "unfold")}
            className="absolute inset-0 flex items-center"
          >
            <div className="mx-auto w-full max-w-7xl px-6">
              <div className="w-full lg:max-w-[45%] space-y-8">
                <div>
                  <div className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C] mb-3">
                    The shift
                  </div>

                  <h2 className="font-display text-4xl sm:text-5xl leading-[1.05] text-[#E8EFE9]">
                    From scattered spreadsheets to a <em className="italic text-[#C8A45C]">verifiable</em> audit chain.
                  </h2>
                </div>

                <div className="divide-y divide-[#22302A]">
                  <div className="py-5 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C]">
                      INTEGRITY
                    </div>
                    <div className="text-[13px] text-[#8FA398]">
                      Records get edited, and nobody can prove it.
                    </div>
                    <div className="text-[18px] text-[#E8EFE9] leading-snug">
                      Every change becomes a new SHA-256 hash-chained block.
                    </div>
                  </div>

                  <div className="py-5 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C]">
                      SAFETY
                    </div>
                    <div className="text-[13px] text-[#8FA398]">
                      Adverse events slip past their deadlines.
                    </div>
                    <div className="text-[18px] text-[#E8EFE9] leading-snug">
                      Live regulatory clocks run on every serious adverse event.
                    </div>
                  </div>

                  <div className="py-5 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C]">
                      SIGNAL
                    </div>
                    <div className="text-[13px] text-[#8FA398]">
                      Herb-drug interactions go unseen.
                    </div>
                    <div className="text-[18px] text-[#E8EFE9] leading-snug">
                      PRR and ROR signals are flagged automatically.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================== */}
          {/* HOW IT WORKS SECTION (Progress 0.40 - 0.85)                 */}
          {/* Left rail with 5 stations; equal scroll distance for each  */}
          {/* ========================================================== */}
          <section
            style={isMobileOrReduced ? undefined : getSectionStyle(activeSection === "stations")}
            className="absolute inset-0 flex items-center"
          >
            <div className="mx-auto w-full max-w-7xl px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Rail: 5 Stations with AA contrast for inactive rows */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="text-[13px] font-mono text-[#C8A45C] uppercase tracking-wider mb-2">
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
                            : "bg-[#131E18] border-[#2B3F34]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h3
                            className={`text-sm font-semibold ${
                              isActive ? "text-[#FFFFFF]" : "text-[#8FA398]"
                            }`}
                          >
                            {station.title}
                          </h3>
                          <span
                            className={`text-[13px] px-2.5 py-0.5 rounded font-mono ${
                              isActive
                                ? "bg-[#2FB39A]/15 text-[#39C8AD] border border-[#2FB39A]/40"
                                : "bg-[#1B2922] text-[#8FA398] border border-[#334D3F]"
                            }`}
                          >
                            {station.badge}
                          </span>
                        </div>

                        {isActive && (
                          <div className="mt-2 space-y-3">
                            <p className="text-[13px] text-[#CBDAD0] leading-relaxed">
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
          {/* Flat surfaces, clean typography without stray apostrophe    */}
          {/* ========================================================== */}
          <section
            style={isMobileOrReduced ? undefined : getSectionStyle(activeSection === "final")}
            className="absolute inset-0 flex items-center justify-center text-center"
          >
            <div className="max-w-2xl px-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2FB39A]/50 bg-[#101815] px-4 py-1.5 text-[13px] text-[#39C8AD]">
                <CheckCircle2 className="w-4 h-4 text-[#2FB39A]" />
                All 60 Cryptographic Blocks Verified · Hash Chain Intact
              </div>

              <h2 className="font-serif text-4xl sm:text-5xl font-medium text-[#E8EFE9] leading-tight">
                Ready to run compliance-grade Ayurvedic clinical trials?
              </h2>

              <p className="text-base text-[#8FA398] leading-relaxed">
                Connect your institutional trial sites, launch prospectively registered CTRI
                protocols, and automate pharmacovigilance reporting.
              </p>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2FB39A] px-8 py-3.5 text-[15px] font-semibold text-[#0A0F0D] hover:bg-[#269984] transition-all hover:scale-105"
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
      {/* SOLID SECTIONS: Marquee, Bento, Signals, Security, etc.      */}
      {/* ============================================================ */}
      <div id="spec" className="relative z-10 bg-[#0A0F0D] border-t border-[#22302A]">
        <StandardsMarquee />
        <Bento />
        <SignalSection />
        <SecuritySection />
        <VerifyChain />
        <ComplianceTable />
        <Roles />
        <Faq />
        <ClosingCta />
        <Footer />
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
