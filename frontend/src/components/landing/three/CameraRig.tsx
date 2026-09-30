import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useSceneProgress } from "./SceneContext";

export function CameraRig() {
  const { progressDampedRef } = useSceneProgress();
  const { camera } = useThree();

  const mousePos = useRef({ x: 0, y: 0 });
  const targetCamPos = useRef(new THREE.Vector3(0, 1.2, 5.5));
  const targetLookAt = useRef(new THREE.Vector3(0.6, 0, 0));
  const currentLookAt = useRef(new THREE.Vector3(0.6, 0, 0));

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePos.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame((_, delta) => {
    // Read the single shared damped progress from ref
    const p = progressDampedRef.current;
    // Damping factor: gentle in hero for mouse parallax, responsive in corridor & final to prevent rubber-banding
    const lerpFactor = p <= 0.28 ? Math.min(1, delta * 8.0) : Math.min(1, delta * 14.0);

    if (p <= 0.28) {
      // Hero Framing + Parallax
      const parallaxFade = Math.max(0, 1 - p / 0.16);
      const px = mousePos.current.x * 0.4 * parallaxFade;
      const py = mousePos.current.y * 0.25 * parallaxFade;

      targetCamPos.current.set(px, 1.2 + py, 5.5);
      targetLookAt.current.set(0.6, 0, 0);
    } else if (p <= 0.4) {
      // Transitioning into Corridor
      const t = THREE.MathUtils.smoothstep((p - 0.28) / (0.4 - 0.28), 0, 1);
      targetCamPos.current.lerpVectors(
        new THREE.Vector3(0, 1.2, 5.5),
        new THREE.Vector3(0.35, 0.4, 2.8),
        t
      );
      targetLookAt.current.lerpVectors(
        new THREE.Vector3(0.6, 0, 0),
        new THREE.Vector3(0.35, 0, -4.0),
        t
      );
    } else if (p <= 0.85) {
      // Flying down Corridor (Steps 1 to 5)
      const corridorT = (p - 0.4) / (0.85 - 0.4);
      const camZ = THREE.MathUtils.lerp(2.8, -44.0, corridorT);
      const camX = 0.35 + Math.sin(corridorT * Math.PI * 4) * 0.25;
      const camY = Math.cos(corridorT * Math.PI * 4) * 0.2;

      targetCamPos.current.set(camX, camY + 0.1, camZ);
      targetLookAt.current.set(0.35, 0, camZ - 7.0);
    } else {
      // Returning to Hero Framing for Final Verified Lotus (0.85 - 1.00)
      const t = THREE.MathUtils.smootherstep((p - 0.85) / 0.15, 0, 1);

      // Start position matches EXACT end of corridor at p=0.85
      targetCamPos.current.lerpVectors(
        new THREE.Vector3(0.35, 0.3, -44.0),
        new THREE.Vector3(0, 1.2, 5.5),
        t
      );

      // LookAt target: look smoothly ahead along -Z without any crossing or flip
      const lookZ = THREE.MathUtils.lerp(targetCamPos.current.z - 7.0, 0, t);
      const lookX = THREE.MathUtils.lerp(0.35, 0.6, t);
      targetLookAt.current.set(lookX, 0, lookZ);
    }

    camera.position.lerp(targetCamPos.current, lerpFactor);
    currentLookAt.current.lerp(targetLookAt.current, lerpFactor);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}
