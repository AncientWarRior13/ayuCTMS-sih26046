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

const COLOR_INK = new THREE.Color("#1B3C30");
const COLOR_TEAL = new THREE.Color("#2FB39A");
const COLOR_DANGER = new THREE.Color("#9B1B26");
const COLOR_GOLD = new THREE.Color("#F3C968");
const COLOR_DANGER_EDGE = new THREE.Color("#BF2633");

export function ChainMesh() {
  const { progressDampedRef, tamperState, onTamper } = useSceneProgress();

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const edgesRef = useRef<THREE.InstancedMesh>(null);

  const layouts = useMemo(() => computeBlockLayouts(), []);
  const hexGeometry = useMemo(() => createHexPrismGeometry(), []);

  const [shockwavePos, setShockwavePos] = useState<THREE.Vector3 | null>(null);

  // Temporary math objects to avoid garbage collection
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPos = useMemo(() => new THREE.Vector3(), []);
  const currentQuat = useMemo(() => new THREE.Quaternion(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const tempEdgeColor = useMemo(() => new THREE.Color(), []);

  // Initialize instance colors once
  useEffect(() => {
    if (!meshRef.current || !edgesRef.current) return;
    for (let i = 0; i < BLOCK_COUNT; i++) {
      meshRef.current.setColorAt(i, COLOR_INK);
      edgesRef.current.setColorAt(i, COLOR_GOLD);
    }
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    if (edgesRef.current.instanceColor) {
      edgesRef.current.instanceColor.needsUpdate = true;
    }
  }, []);

  useFrame((state) => {
    if (!meshRef.current || !edgesRef.current) return;

    // Read the single shared damped progress from ref
    const p = progressDampedRef.current;
    const time = state.clock.getElapsedTime();

    const now = performance.now();
    const { tamperedIndex, tamperTime, restoreTime } = tamperState;

    for (let i = 0; i < BLOCK_COUNT; i++) {
      // 1. Position and Quaternion blending across keyframes
      if (p <= 0.12) {
        // Phase 1: Lotus Idle (0.00 - 0.12)
        const floatOffset = Math.sin(time * 1.5 + i * 0.15) * 0.04;
        currentPos.copy(layouts.lotusPos[i]);
        currentPos.y += floatOffset;
        currentQuat.copy(layouts.lotusQuat[i]);
      } else if (p <= 0.28) {
        // Phase 2: Lotus → Chain (0.12 - 0.28, staggered by block index)
        const phaseP = (p - 0.12) / (0.28 - 0.12);
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
        const phaseP = (p - 0.85) / 0.15;
        // Graceful block stagger: blocks near the camera retreat first, creating a fluid wave
        const staggerStart = ((BLOCK_COUNT - 1 - i) / BLOCK_COUNT) * 0.25;
        const rawT = THREE.MathUtils.clamp((phaseP - staggerStart) / 0.75, 0, 1);
        const t = THREE.MathUtils.smootherstep(rawT, 0, 1);

        currentPos.lerpVectors(layouts.corridorPos[i], layouts.lotusPos[i], t);
        currentQuat.slerpQuaternions(layouts.corridorQuat[i], layouts.lotusQuat[i], t);
      }

      // Node scale: 1.25x at start (hero lotus) and end (final lotus), expanding to 1.95x in the spiral
      let nodeScale = 1.25;
      if (p <= 0.28) {
        nodeScale = 1.25;
      } else if (p <= 0.40) {
        const t = THREE.MathUtils.smoothstep((p - 0.28) / (0.40 - 0.28), 0, 1);
        nodeScale = THREE.MathUtils.lerp(1.25, 1.95, t);
      } else if (p <= 0.85) {
        nodeScale = 1.95;
      } else {
        const t = THREE.MathUtils.smootherstep((p - 0.85) / 0.15, 0, 1);
        nodeScale = THREE.MathUtils.lerp(1.95, 1.25, t);
      }

      dummy.position.copy(currentPos);
      dummy.quaternion.copy(currentQuat);
      dummy.scale.set(nodeScale, nodeScale, nodeScale);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
      edgesRef.current.setMatrixAt(i, dummy.matrix);

      // 2. Color resolution
      let blockColor = COLOR_INK;
      let edgeColor = COLOR_GOLD;

      if (p >= 0.85) {
        // Final section: maintain golden tint and elegant ink aesthetic
        blockColor = COLOR_INK;
        edgeColor = COLOR_GOLD;
      } else if (tamperedIndex !== null && i >= tamperedIndex) {
        // Tamper propagation: 25ms stagger per block index
        const delayMs = (i - tamperedIndex) * 25;
        const elapsedSinceTamper = now - tamperTime;

        if (elapsedSinceTamper > delayMs) {
          const redProgress = THREE.MathUtils.clamp((elapsedSinceTamper - delayMs) / 100, 0, 1);
          tempColor.lerpColors(COLOR_INK, COLOR_DANGER, redProgress);
          blockColor = tempColor;
          tempEdgeColor.lerpColors(COLOR_GOLD, COLOR_DANGER_EDGE, redProgress);
          edgeColor = tempEdgeColor;
        } else {
          blockColor = COLOR_INK;
          edgeColor = COLOR_GOLD;
        }
      } else if (restoreTime > 0) {
        // Green wave restore: 25ms stagger from 0 to 60
        const delayMs = i * 25;
        const elapsedSinceRestore = now - restoreTime;
        if (elapsedSinceRestore > delayMs) {
          const restoreProgress = THREE.MathUtils.clamp((elapsedSinceRestore - delayMs) / 200, 0, 1);
          if (restoreProgress < 0.7) {
            blockColor = COLOR_TEAL;
            edgeColor = COLOR_TEAL;
          } else {
            const settleProgress = (restoreProgress - 0.7) / 0.3;
            tempColor.lerpColors(COLOR_TEAL, COLOR_INK, settleProgress);
            blockColor = tempColor;
            tempEdgeColor.lerpColors(COLOR_TEAL, COLOR_GOLD, settleProgress);
            edgeColor = tempEdgeColor;
          }
        } else {
          blockColor = COLOR_DANGER;
          edgeColor = COLOR_DANGER_EDGE;
        }
      }

      meshRef.current.setColorAt(i, blockColor);
      edgesRef.current.setColorAt(i, edgeColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    edgesRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    if (edgesRef.current.instanceColor) {
      edgesRef.current.instanceColor.needsUpdate = true;
    }
  });

  // Click handler: always enabled regardless of scroll progress
  const handleClick = (e: any) => {
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (typeof instanceId === "number") {
      onTamper(instanceId);
      const mat = new THREE.Matrix4();
      meshRef.current?.getMatrixAt(instanceId, mat);
      const pos = new THREE.Vector3();
      pos.setFromMatrixPosition(mat);
      setShockwavePos(pos);
    }
  };

  return (
    <group>
      {/* 60 Hexagonal Prism Blocks - Lustrous Obsidian/Jadeite Physical Material */}
      <instancedMesh
        ref={meshRef}
        args={[hexGeometry, undefined, BLOCK_COUNT]}
        onClick={handleClick}
        frustumCulled={false}
      >
        <meshPhysicalMaterial
          roughness={0.18}
          metalness={0.65}
          clearcoat={0.65}
          clearcoatRoughness={0.15}
          reflectivity={0.6}
          color="#ffffff"
        />
      </instancedMesh>

      {/* Edge Wireframe Highlights with dynamic instance color */}
      <instancedMesh
        ref={edgesRef}
        args={[hexGeometry, undefined, BLOCK_COUNT]}
        raycast={() => null}
        frustumCulled={false}
      >
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.8} />
      </instancedMesh>

      {/* Tamper Shockwave Ring */}
      {shockwavePos && tamperState.tamperTime > 0 && (
        <ShockwaveRing
          position={shockwavePos}
          triggerTime={tamperState.tamperTime}
          color="#9B1B26"
        />
      )}
    </group>
  );
}
