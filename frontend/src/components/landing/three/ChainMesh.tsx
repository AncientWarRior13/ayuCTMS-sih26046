import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { BLOCK_COUNT, computeBlockLayouts } from "./layouts";
import { useSceneProgress } from "./SceneContext";
import { ShockwaveRing } from "./ShockwaveRing";

// Hexagonal prism geometry
function createHexPrismGeometry() {
  const geo = new THREE.CylinderGeometry(0.26, 0.26, 0.14, 6);
  geo.rotateX(Math.PI / 2); // face outward
  return geo;
}

const COLOR_INK = new THREE.Color("#101815");
const COLOR_TEAL = new THREE.Color("#2FB39A");
const COLOR_DANGER = new THREE.Color("#E5484D");
const COLOR_BRASS = new THREE.Color("#C8A45C");

export function ChainMesh() {
  const { progress, tamperState, onTamper } = useSceneProgress();

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const edgesRef = useRef<THREE.InstancedMesh>(null);

  const layouts = useMemo(() => computeBlockLayouts(), []);
  const hexGeometry = useMemo(() => createHexPrismGeometry(), []);
  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(hexGeometry), [hexGeometry]);

  const [shockwavePos, setShockwavePos] = useState<THREE.Vector3 | null>(null);

  // Smooth damped progress
  const dampedProgressRef = useRef(progress);

  // Temporary math objects to avoid garbage collection
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPos = useMemo(() => new THREE.Vector3(), []);
  const currentQuat = useMemo(() => new THREE.Quaternion(), []);
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetQuat = useMemo(() => new THREE.Quaternion(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Initialize instance colors once
  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < BLOCK_COUNT; i++) {
      meshRef.current.setColorAt(i, COLOR_INK);
    }
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, []);

  useFrame((state, delta) => {
    // 1. Progress damping (lerp 0.08 per frame)
    dampedProgressRef.current = THREE.MathUtils.lerp(
      dampedProgressRef.current,
      progress,
      Math.min(1, delta * 12.0)
    );
    const p = dampedProgressRef.current;
    const time = state.clock.getElapsedTime();

    if (!meshRef.current || !edgesRef.current) return;

    const now = performance.now();
    const { tamperedIndex, tamperTime, restoreTime } = tamperState;

    for (let i = 0; i < BLOCK_COUNT; i++) {
      // 2. Position and Quaternion blending across keyframes
      if (p <= 0.12) {
        // Phase 1: Lotus Idle (0.00 - 0.12)
        // Gentle breathing animation
        const floatOffset = Math.sin(time * 1.5 + i * 0.15) * 0.04;
        currentPos.copy(layouts.lotusPos[i]);
        currentPos.y += floatOffset;
        currentQuat.copy(layouts.lotusQuat[i]);
      } else if (p <= 0.28) {
        // Phase 2: Lotus → Chain (0.12 - 0.28, staggered by block index)
        const phaseP = (p - 0.12) / (0.28 - 0.12);
        // Stagger index: earlier blocks move first
        const staggerStart = (i / BLOCK_COUNT) * 0.4;
        const rawT = THREE.MathUtils.clamp((phaseP - staggerStart) / 0.6, 0, 1);
        const t = THREE.MathUtils.smoothstep(rawT, 0, 1);

        currentPos.lerpVectors(layouts.lotusPos[i], layouts.chainPos[i], t);
        currentQuat.slerpQuaternions(layouts.lotusQuat[i], layouts.chainQuat[i], t);
      } else if (p <= 0.4) {
        // Phase 3: Chain → Corridor (0.28 - 0.40)
        const phaseP = (p - 0.28) / (0.4 - 0.28);
        const t = THREE.MathUtils.smoothstep(phaseP, 0, 1);

        currentPos.lerpVectors(layouts.chainPos[i], layouts.corridorPos[i], t);
        currentQuat.slerpQuaternions(layouts.chainQuat[i], layouts.corridorQuat[i], t);
      } else if (p <= 0.85) {
        // Phase 4: Inside Corridor (0.40 - 0.85)
        currentPos.copy(layouts.corridorPos[i]);
        currentQuat.copy(layouts.corridorQuat[i]);
      } else {
        // Phase 5: Corridor → Verified Lotus (0.85 - 1.00)
        const phaseP = (p - 0.85) / (1.0 - 0.85);
        const t = THREE.MathUtils.smoothstep(phaseP, 0, 1);

        currentPos.lerpVectors(layouts.corridorPos[i], layouts.lotusPos[i], t);
        currentQuat.slerpQuaternions(layouts.corridorQuat[i], layouts.lotusQuat[i], t);
      }

      dummy.position.copy(currentPos);
      dummy.quaternion.copy(currentQuat);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
      edgesRef.current.setMatrixAt(i, dummy.matrix);

      // 3. Color resolution (Ink, Red for tampered, Teal for verified/restored)
      let blockColor = COLOR_INK;

      if (p >= 0.85) {
        // Final section: all blocks verified (teal)
        const verifyFade = THREE.MathUtils.smoothstep((p - 0.85) / 0.15, 0, 1);
        tempColor.lerpColors(COLOR_INK, COLOR_TEAL, verifyFade);
        blockColor = tempColor;
      } else if (tamperedIndex !== null && i >= tamperedIndex) {
        // Tamper propagation: 30ms stagger per block index
        const delayMs = (i - tamperedIndex) * 30;
        const elapsedSinceTamper = now - tamperTime;

        if (elapsedSinceTamper > delayMs) {
          const redProgress = THREE.MathUtils.clamp((elapsedSinceTamper - delayMs) / 120, 0, 1);
          tempColor.lerpColors(COLOR_INK, COLOR_DANGER, redProgress);
          blockColor = tempColor;
        }
      } else if (restoreTime > 0) {
        // Green wave restore: 25ms stagger from 0 to 60
        const delayMs = i * 25;
        const elapsedSinceRestore = now - restoreTime;
        if (elapsedSinceRestore > delayMs) {
          const restoreProgress = THREE.MathUtils.clamp((elapsedSinceRestore - delayMs) / 200, 0, 1);
          if (restoreProgress < 0.7) {
            // Flash teal
            blockColor = COLOR_TEAL;
          } else {
            // Settle back to pristine ink
            const settleProgress = (restoreProgress - 0.7) / 0.3;
            tempColor.lerpColors(COLOR_TEAL, COLOR_INK, settleProgress);
            blockColor = tempColor;
          }
        } else {
          blockColor = COLOR_DANGER;
        }
      }

      meshRef.current.setColorAt(i, blockColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    edgesRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  // Click handler (raycasting) enabled in hero phase (progress < 0.15)
  const handleClick = (e: any) => {
    if (progress > 0.15) return;
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (typeof instanceId === "number") {
      onTamper(instanceId);
      // Position of clicked block
      const mat = new THREE.Matrix4();
      meshRef.current?.getMatrixAt(instanceId, mat);
      const pos = new THREE.Vector3();
      pos.setFromMatrixPosition(mat);
      setShockwavePos(pos);
    }
  };

  return (
    <group>
      {/* 60 Hexagonal Prism Blocks */}
      <instancedMesh
        ref={meshRef}
        args={[hexGeometry, undefined, BLOCK_COUNT]}
        onClick={handleClick}
      >
        <meshStandardMaterial
          roughness={0.25}
          metalness={0.8}
          color="#101815"
          emissive="#000000"
        />
      </instancedMesh>

      {/* Brass Edge Highlights */}
      <instancedMesh
        ref={edgesRef}
        args={[edgesGeometry, undefined, BLOCK_COUNT]}
        raycast={() => null}
      >
        <lineBasicMaterial color="#C8A45C" transparent opacity={0.7} />
      </instancedMesh>

      {/* Tamper Shockwave Ring */}
      {shockwavePos && tamperState.tamperTime > 0 && (
        <ShockwaveRing
          position={shockwavePos}
          triggerTime={tamperState.tamperTime}
          color="#E5484D"
        />
      )}
    </group>
  );
}
