import * as THREE from "three";

export const BLOCK_COUNT = 60;

export interface BlockLayouts {
  lotusPos: THREE.Vector3[];
  lotusQuat: THREE.Quaternion[];
  chainPos: THREE.Vector3[];
  chainQuat: THREE.Quaternion[];
  corridorPos: THREE.Vector3[];
  corridorQuat: THREE.Quaternion[];
}

export function computeBlockLayouts(): BlockLayouts {
  const lotusPos: THREE.Vector3[] = [];
  const lotusQuat: THREE.Quaternion[] = [];
  const chainPos: THREE.Vector3[] = [];
  const chainQuat: THREE.Quaternion[] = [];
  const corridorPos: THREE.Vector3[] = [];
  const corridorQuat: THREE.Quaternion[] = [];

  // Temporary objects to avoid GC
  const dummy = new THREE.Object3D();

  // 1. Lotus Layout (4 concentric rings: 6 + 12 + 18 + 24 = 60)
  const rings = [
    { count: 6, radius: 0.5, y: 0.12, tilt: 0.15 },
    { count: 12, radius: 1.35, y: 0.22, tilt: 0.38 },
    { count: 18, radius: 2.25, y: 0.1, tilt: 0.65 },
    { count: 24, radius: 3.15, y: -0.15, tilt: 0.95 },
  ];

  let currentBlock = 0;
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    const offsetAngle = (r * Math.PI) / 6;
    for (let j = 0; j < ring.count; j++) {
      const angle = (j / ring.count) * Math.PI * 2 + offsetAngle;
      // Lotus center shifted to X=0.75 for hero composition
      const lx = 0.75 + ring.radius * Math.cos(angle);
      const lz = ring.radius * Math.sin(angle);
      const ly = ring.y;

      lotusPos.push(new THREE.Vector3(lx, ly, lz));

      // Orient petal outward and slightly tilted up
      dummy.position.set(lx, ly, lz);
      dummy.rotation.set(0, 0, 0);
      dummy.lookAt(0.75, ly - 0.5, 0);
      dummy.rotateX(-ring.tilt);
      lotusQuat.push(dummy.quaternion.clone());

      currentBlock++;
    }
  }

  // 2. Chain Layout (Straight line along X)
  for (let i = 0; i < BLOCK_COUNT; i++) {
    const cx = (i - 29.5) * 0.44 + 0.5;
    const cy = 0.0;
    const cz = 0.0;
    chainPos.push(new THREE.Vector3(cx, cy, cz));

    dummy.position.set(cx, cy, cz);
    // Slight alternating tilt to look like interlinked chain nodes
    const altTilt = i % 2 === 0 ? 0.2 : -0.2;
    dummy.rotation.set(0, 0, altTilt);
    chainQuat.push(dummy.quaternion.clone());
  }

  // 3. Corridor Layout (Helix along -Z with radius 1.4)
  const helixRadius = 1.4;
  const helixPitch = 0.82;
  const angleStep = 0.38;

  for (let i = 0; i < BLOCK_COUNT; i++) {
    const angle = i * angleStep;
    const hx = helixRadius * Math.cos(angle);
    const hy = helixRadius * Math.sin(angle);
    const hz = -i * helixPitch + 2.0;

    corridorPos.push(new THREE.Vector3(hx, hy, hz));

    dummy.position.set(hx, hy, hz);
    // Orient facing the helix axis
    dummy.lookAt(0, 0, hz);
    dummy.rotateY(Math.PI / 2);
    corridorQuat.push(dummy.quaternion.clone());
  }

  return {
    lotusPos,
    lotusQuat,
    chainPos,
    chainQuat,
    corridorPos,
    corridorQuat,
  };
}
