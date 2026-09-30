import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const PARTICLE_COUNT = 320;

export function ParticleDust() {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate particle positions, colors, and random movement phases
  const [positions, colors, randomPhases] = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const phases = new Float32Array(PARTICLE_COUNT * 3);

    const goldColor = new THREE.Color("#E8BE68");
    const tealColor = new THREE.Color("#2FB39A");
    const whiteGlint = new THREE.Color("#FFF8E7");

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // Disperse around the scene and throughout the full corridor depth (Z: +6 to -50)
      pos[i3] = (Math.random() - 0.5) * 14.0 + 0.5;
      pos[i3 + 1] = (Math.random() - 0.5) * 9.0;
      pos[i3 + 2] = Math.random() * 56.0 - 50.0; // from -50 to +6

      // Color variation: 50% warm gold, 35% emerald teal, 15% bright starlight glint
      const rand = Math.random();
      const chosenColor = rand < 0.5 ? goldColor : rand < 0.85 ? tealColor : whiteGlint;
      col[i3] = chosenColor.r;
      col[i3 + 1] = chosenColor.g;
      col[i3 + 2] = chosenColor.b;

      // Random phase offsets for harmonic floating
      phases[i3] = Math.random() * Math.PI * 2;
      phases[i3 + 1] = Math.random() * Math.PI * 2;
      phases[i3 + 2] = Math.random() * 0.5 + 0.5; // oscillation speed
    }

    return [pos, col, phases];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime();
    const posAttr = pointsRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const speed = randomPhases[i3 + 2];

      // Gentle floating Brownian motion
      posArray[i3 + 1] += Math.sin(time * speed + randomPhases[i3]) * 0.0025;
      posArray[i3] += Math.cos(time * speed * 0.7 + randomPhases[i3 + 1]) * 0.0018;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
