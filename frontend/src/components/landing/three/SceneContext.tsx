import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { TamperState } from "./types";

export type SectionType = "hero" | "unfold" | "stations" | "final";

interface SceneContextValue {
  // Shared progress refs (read in useFrame without triggering React re-renders)
  progressTargetRef: MutableRefObject<number>;
  progressDampedRef: MutableRefObject<number>;
  setScrollTarget: (p: number) => void;

  // React state updated ONLY when discrete section or station changes
  activeSection: SectionType;
  activeStationIndex: number;

  // Debug override (used by /lab)
  overrideProgress: number | null;
  setOverrideProgress: (p: number | null) => void;

  // Tamper interactions
  tamperState: TamperState;
  onTamper: (index: number) => void;
  onRestore: () => void;

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
  const progressTargetRef = useRef(initialProgress);
  const progressDampedRef = useRef(initialProgress);

  const [activeSection, setActiveSection] = useState<SectionType>("hero");
  const [activeStationIndex, setActiveStationIndex] = useState<number>(0);
  const [overrideProgress, setOverrideProgressState] = useState<number | null>(null);
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

  // Update target progress without React re-render
  // Only update activeSection & activeStationIndex if the discrete bucket changes!
  const setScrollTarget = useCallback((rawP: number) => {
    const p = Math.max(0, Math.min(1, rawP));
    progressTargetRef.current = p;

    // Determine discrete section
    let newSection: SectionType = "hero";
    if (p >= 0.85) {
      newSection = "final";
    } else if (p >= 0.4) {
      newSection = "stations";
    } else if (p >= 0.12) {
      newSection = "unfold";
    }

    setActiveSection((curr) => (curr !== newSection ? newSection : curr));

    // Equal scroll distance for 5 stations across [0.40, 0.85]:
    // Math.min(4, Math.floor((p - 0.40) / 0.45 * 5))
    if (p >= 0.4 && p <= 0.85) {
      const stIdx = Math.min(4, Math.max(0, Math.floor(((p - 0.4) / 0.45) * 5)));
      setActiveStationIndex((curr) => (curr !== stIdx ? stIdx : curr));
    }
  }, []);

  const setOverrideProgress = useCallback((val: number | null) => {
    setOverrideProgressState(val);
    if (val !== null) {
      progressTargetRef.current = val;
      progressDampedRef.current = val;

      let newSection: SectionType = "hero";
      if (val >= 0.85) {
        newSection = "final";
      } else if (val >= 0.4) {
        newSection = "stations";
      } else if (val >= 0.12) {
        newSection = "unfold";
      }
      setActiveSection(newSection);

      if (val >= 0.4 && val <= 0.85) {
        const stIdx = Math.min(4, Math.max(0, Math.floor(((val - 0.4) / 0.45) * 5)));
        setActiveStationIndex(stIdx);
      }
    }
  }, []);

  const onTamper = useCallback((index: number) => {
    setTamperState({
      tamperedIndex: index,
      tamperTime: performance.now(),
      restoreTime: 0,
    });
  }, []);

  const onRestore = useCallback(() => {
    setTamperState((prev) => ({
      tamperedIndex: null,
      tamperTime: prev.tamperTime,
      restoreTime: performance.now(),
    }));
  }, []);

  return (
    <SceneContext.Provider
      value={{
        progressTargetRef,
        progressDampedRef,
        setScrollTarget,
        activeSection,
        activeStationIndex,
        overrideProgress,
        setOverrideProgress,
        tamperState,
        onTamper,
        onRestore,
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
