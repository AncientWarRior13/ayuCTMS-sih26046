import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

interface ShockwaveRingProps {
  position: THREE.Vector3;
  triggerTime: number;
  color?: string;
}

export function ShockwaveRing({
  position,
  triggerTime,
  color = "#E5484D",
}: ShockwaveRingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (!meshRef.current || !materialRef.current || triggerTime === 0) return;

    const elapsed = (performance.now() - triggerTime) / 1000; // in seconds
    const duration = 1.4;

    if (elapsed < duration) {
      meshRef.current.visible = true;
      const progress = elapsed / duration;
      const scale = 0.5 + progress * 5.0;
      meshRef.current.scale.set(scale, scale, scale);
      materialRef.current.opacity = Math.max(0, 1.0 - progress);
    } else {
      meshRef.current.visible = false;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.8, 0.95, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
