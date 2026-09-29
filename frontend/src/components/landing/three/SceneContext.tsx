import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { STATIONS, type TamperState } from "./types";

interface SceneContextValue {
  progress: number;
  setProgress: (p: number) => void;
  overrideProgress: number | null;
  setOverrideProgress: (p: number | null) => void;
  tamperState: TamperState;
  onTamper: (index: number) => void;
  onRestore: () => void;
  activeStationIndex: number;
  isMobileOrReduced: boolean;
}

const SceneContext = createContext<SceneContextValue | null>(null);

export function SceneProvider({
  children,
  initialProgress = 0,
}: {
  children: ReactNode;
  initialProgress?: number;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [overrideProgress, setOverrideProgress] = useState<number | null>(null);
  const [isMobileOrReduced, setIsMobileOrReduced] = useState(false);

  const [tamperState, setTamperState] = useState<TamperState>({
    tamperedIndex: null,
    tamperTime: 0,
    restoreTime: 0,
  });

  // Media query detection
  useEffect(() => {
    const checkMedia = () => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const smallScreen = window.innerWidth < 768;
      setIsMobileOrReduced(reducedMotion || smallScreen);
    };

    checkMedia();
    window.addEventListener("resize", checkMedia);
    return () => window.removeEventListener("resize", checkMedia);
  }, []);

  const effectiveProgress = overrideProgress !== null ? overrideProgress : progress;

  // Compute active station (closest station within 0.40 - 0.85)
  let activeStationIndex = 0;
  if (effectiveProgress >= 0.35) {
    let closestDist = Infinity;
    STATIONS.forEach((st, idx) => {
      const dist = Math.abs(effectiveProgress - st.progress);
      if (dist < closestDist) {
        closestDist = dist;
        activeStationIndex = idx;
      }
    });
  }

  const onTamper = (index: number) => {
    setTamperState({
      tamperedIndex: index,
      tamperTime: performance.now(),
      restoreTime: 0,
    });
  };

  const onRestore = () => {
    setTamperState((prev) => ({
      tamperedIndex: null,
      tamperTime: prev.tamperTime,
      restoreTime: performance.now(),
    }));
  };

  return (
    <SceneContext.Provider
      value={{
        progress: effectiveProgress,
        setProgress,
        overrideProgress,
        setOverrideProgress,
        tamperState,
        onTamper,
        onRestore,
        activeStationIndex,
        isMobileOrReduced,
      }}
    >
      {children}
    </SceneContext.Provider>
  );
}

export function useSceneProgress(): SceneContextValue {
  const ctx = useContext(SceneContext);
  if (!ctx) {
    throw new Error("useSceneProgress must be used within a SceneProvider");
  }
  return ctx;
}
