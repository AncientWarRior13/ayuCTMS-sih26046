import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import * as THREE from "three";
import { CameraRig } from "./CameraRig";
import { ChainMesh } from "./ChainMesh";
import { useSceneProgress } from "./SceneContext";
import { ScenePoster } from "./ScenePoster";

// WebGL Error Boundary
class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("WebGL Context Failed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Single central frame updater for shared damped progress
function ProgressUpdater() {
  const { progressTargetRef, progressDampedRef, overrideProgress } = useSceneProgress();

  useFrame((_, delta) => {
    if (overrideProgress !== null) {
      progressDampedRef.current = overrideProgress;
    } else {
      progressDampedRef.current = THREE.MathUtils.lerp(
        progressDampedRef.current,
        progressTargetRef.current,
        Math.min(1, delta * 5.0)
      );
    }
  });

  return null;
}

export function ChainScene() {
  const { progressDampedRef, isMobileOrReduced } = useSceneProgress();

  const [dpr, setDpr] = useState<number>(1.25);
  const [enableEffects, setEnableEffects] = useState<boolean>(true);
  const [tabVisible, setTabVisible] = useState<boolean>(true);

  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  // Probe WebGL capabilities on mount (handles outdated laptops / disabled hardware acceleration)
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setWebglSupported(false);
      }
    } catch {
      setWebglSupported(false);
    }
  }, []);

  // Pause rendering when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setTabVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handlePerformanceDrop = () => {
    setDpr(1.0);
    setEnableEffects(false);
  };

  // If mobile (<768px), prefers-reduced-motion, or outdated laptop without WebGL, render static SVG poster
  if (isMobileOrReduced || !webglSupported) {
    return (
      <div className="fixed inset-0 z-0 flex items-center justify-center opacity-80">
        <ScenePoster className="w-full h-full" />
      </div>
    );
  }

  const isInteractive = progressDampedRef.current < 0.15;

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden"
      style={{ pointerEvents: "auto" }}
    >
      <WebGLErrorBoundary
        fallback={
          <div className="w-full h-full" style={{ pointerEvents: "auto" }}>
            <ScenePoster className="w-full h-full" />
          </div>
        }
      >
        <Canvas
          dpr={dpr}
          camera={{ position: [0, 1.2, 5.5], fov: 45 }}
          frameloop={tabVisible ? "always" : "never"}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
          }}
        >
          <fogExp2 attach="fog" args={["#0A0F0D", 0.038]} />

          {/* Performance Monitor */}
          <PerformanceMonitor onDecline={handlePerformanceDrop} />

          {/* Central Progress Updater */}
          <ProgressUpdater />

          {/* Lighting */}
          <color attach="background" args={["#0A0F0D"]} />
          <ambientLight intensity={0.4} color="#E8EFE9" />
          <directionalLight position={[5, 8, 5]} intensity={1.5} color="#FFF5E0" />
          <directionalLight position={[-5, -2, -3]} intensity={0.8} color="#2FB39A" />
          <pointLight position={[0.75, 0.5, 0]} intensity={1.2} color="#C8A45C" distance={6} />

          {/* Camera Controller & Parallax */}
          <CameraRig />

          {/* 60 Hexagonal Prism Blocks */}
          <ChainMesh />

          {/* Postprocessing */}
          {enableEffects && (
            <EffectComposer multisampling={0}>
              <Bloom
                intensity={0.45}
                luminanceThreshold={0.25}
                luminanceSmoothing={0.9}
                mipmapBlur
              />
              <Vignette eskil={false} offset={0.18} darkness={0.65} />
            </EffectComposer>
          )}
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
export default ChainScene;
