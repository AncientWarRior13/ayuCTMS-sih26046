import { useState } from "react";
import { Link } from "react-router-dom";
import ChainScene from "../components/landing/three/ChainScene";
import { SceneProvider, useSceneProgress } from "../components/landing/three/SceneContext";
import { SCROLL_KEYFRAMES, STATIONS } from "../components/landing/three/types";

function LabControls() {
  const {
    progress,
    setOverrideProgress,
    tamperState,
    onTamper,
    onRestore,
    activeStationIndex,
  } = useSceneProgress();

  const [sliderVal, setSliderVal] = useState(progress);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSliderVal(val);
    setOverrideProgress(val);
  };

  const jumpTo = (target: number) => {
    setSliderVal(target);
    setOverrideProgress(target);
  };

  // Find current keyframe range
  const currentKeyframe = SCROLL_KEYFRAMES.find(
    (kf) => progress >= kf.start && progress <= kf.end
  ) || SCROLL_KEYFRAMES[0];

  return (
    <div className="absolute top-6 left-6 z-50 flex flex-col gap-4 max-w-sm w-full bg-[#101815]/85 backdrop-blur-xl border border-[#22302A] p-5 rounded-2xl shadow-2xl text-white font-sans">
      <div className="flex items-center justify-between border-b border-[#22302A] pb-3">
        <div>
          <h1 className="text-sm font-semibold tracking-wider text-[#E8EFE9] uppercase">
            AyuCTMS 3D Lab
          </h1>
          <p className="text-xs text-[#8FA398]">Debug Inspector & Scene Rig</p>
        </div>
        <Link
          to="/"
          className="text-xs px-2.5 py-1 rounded-md bg-[#16201C] hover:bg-[#1D2A24] text-[#39C8AD] border border-[#2FB39A]/30 transition-colors"
        >
          Back to Site
        </Link>
      </div>

      {/* Progress Slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-[#8FA398]">Scroll Progress:</span>
          <span className="text-[#39C8AD] font-bold">{(progress * 100).toFixed(1)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.005"
          value={sliderVal}
          onChange={handleSliderChange}
          className="w-full accent-[#2FB39A] cursor-pointer"
        />
        <div className="text-[11px] text-[#C8A45C] font-mono mt-0.5">
          Phase: {currentKeyframe.label}
        </div>
      </div>

      {/* Station Quick Jumps */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-[#8FA398] uppercase tracking-wider">
          Jump to Station
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => jumpTo(0.0)}
            className={`text-xs text-left px-2 py-1.5 rounded border transition-colors ${
              progress < 0.12
                ? "bg-[#2FB39A]/15 border-[#2FB39A] text-white"
                : "bg-[#16201C] border-[#22302A] text-[#8FA398] hover:text-white"
            }`}
          >
            0.00 · Lotus Idle
          </button>
          <button
            onClick={() => jumpTo(0.22)}
            className={`text-xs text-left px-2 py-1.5 rounded border transition-colors ${
              progress >= 0.12 && progress < 0.28
                ? "bg-[#2FB39A]/15 border-[#2FB39A] text-white"
                : "bg-[#16201C] border-[#22302A] text-[#8FA398] hover:text-white"
            }`}
          >
            0.22 · Chain Line
          </button>
          {STATIONS.map((st, i) => (
            <button
              key={st.title}
              onClick={() => jumpTo(st.progress)}
              className={`text-xs text-left px-2 py-1.5 rounded border transition-colors ${
                activeStationIndex === i && progress >= 0.35 && progress <= 0.85
                  ? "bg-[#2FB39A]/20 border-[#2FB39A] text-white"
                  : "bg-[#16201C] border-[#22302A] text-[#8FA398] hover:text-white"
              }`}
            >
              {st.progress.toFixed(2)} · Station {i + 1}
            </button>
          ))}
          <button
            onClick={() => jumpTo(0.95)}
            className={`text-xs text-left px-2 py-1.5 rounded border transition-colors ${
              progress >= 0.85
                ? "bg-[#2FB39A]/15 border-[#2FB39A] text-white"
                : "bg-[#16201C] border-[#22302A] text-[#8FA398] hover:text-white"
            }`}
          >
            0.95 · Verified Lotus
          </button>
        </div>
      </div>

      {/* Tamper Interaction Controls */}
      <div className="flex flex-col gap-1.5 border-t border-[#22302A] pt-3">
        <label className="text-[11px] font-semibold text-[#8FA398] uppercase tracking-wider">
          Tamper Simulation
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => onTamper(20)}
            className="flex-1 py-1.5 px-2 text-xs font-medium rounded bg-[#E5484D]/15 hover:bg-[#E5484D]/25 text-[#E5484D] border border-[#E5484D]/40 transition-colors"
          >
            Tamper @ #20
          </button>
          <button
            onClick={() => onTamper(42)}
            className="flex-1 py-1.5 px-2 text-xs font-medium rounded bg-[#E5484D]/15 hover:bg-[#E5484D]/25 text-[#E5484D] border border-[#E5484D]/40 transition-colors"
          >
            Tamper @ #42
          </button>
          <button
            onClick={onRestore}
            className="flex-1 py-1.5 px-2 text-xs font-medium rounded bg-[#2FB39A]/15 hover:bg-[#2FB39A]/25 text-[#39C8AD] border border-[#2FB39A]/40 transition-colors"
          >
            Restore
          </button>
        </div>

        {tamperState.tamperedIndex !== null && (
          <div className="flex items-center gap-2 mt-1 px-2.5 py-1.5 rounded-lg bg-[#E5484D]/10 border border-[#E5484D]/30 text-[#E5484D] text-xs font-mono animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#E5484D]" />
            CHAIN BROKEN AT BLOCK #{tamperState.tamperedIndex}
          </div>
        )}
      </div>

      {/* Active Station Readout Preview */}
      {progress >= 0.35 && progress <= 0.85 && (
        <div className="border-t border-[#22302A] pt-3 text-xs">
          <div className="text-[11px] text-[#C8A45C] font-semibold mb-1">
            {STATIONS[activeStationIndex].title}
          </div>
          <div className="p-2.5 rounded bg-[#16201C] border border-[#22302A] font-mono text-[11px]">
            <div className="text-[#8FA398]">{STATIONS[activeStationIndex].readoutData.label}</div>
            <div className="text-[#2FB39A] font-bold mt-0.5">
              {STATIONS[activeStationIndex].readoutData.value}
            </div>
            <div className="text-[#56685F] text-[10px] mt-1">
              {STATIONS[activeStationIndex].readoutData.subtext}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LabPage() {
  return (
    <SceneProvider initialProgress={0}>
      <div className="relative w-screen h-screen overflow-hidden bg-[#0A0F0D]">
        <ChainScene />
        <LabControls />
      </div>
    </SceneProvider>
  );
}
