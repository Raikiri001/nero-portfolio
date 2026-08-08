import * as THREE from 'three';
import * as G from './gantryShapes';

const { BAY_WIDTH, BAY_DEPTH, BAY_HEIGHT } = G;

const WALL_MAT = new THREE.MeshStandardMaterial({ color: '#0b1720', roughness: 0.6, metalness: 0.45 });
const BEAM_MAT = new THREE.MeshStandardMaterial({ color: '#173349', roughness: 0.35, metalness: 0.65, emissive: '#0090d9', emissiveIntensity: 0.18 });
const VENT_MAT = new THREE.MeshStandardMaterial({ color: '#1c3a50', roughness: 0.4, metalness: 0.55, emissive: '#0090d9', emissiveIntensity: 0.35 });
const FLOOR_MAT = new THREE.MeshStandardMaterial({ color: '#0a1621', roughness: 0.75, metalness: 0.15 });
const STRIPE_MAT_A = new THREE.MeshStandardMaterial({ color: '#ffcc00', roughness: 0.5, emissive: '#ffaa00', emissiveIntensity: 0.2 });
const STRIPE_MAT_B = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.6 });
const ARM_MAT = new THREE.MeshStandardMaterial({ color: '#1c2f3d', roughness: 0.3, metalness: 0.75 });
const CLAMP_MAT = new THREE.MeshStandardMaterial({ color: '#0090d9', roughness: 0.3, metalness: 0.6, emissive: '#0090d9', emissiveIntensity: 0.4 });

// Two diagonal beams corner-to-corner of a w x h cell, forming an X —
// the cross-brace lattice seen throughout the reference dioramas.
function CrossBrace({ cx, cy, w, h }) {
  const diagLen = Math.hypot(w, h);
  const angle = Math.atan2(h, w);
  return (
    <group position={[cx, cy, 0.03]}>
      <mesh geometry={G.BEAM_GEO} material={BEAM_MAT} scale={[diagLen, 1, 1]} rotation={[0, 0, angle]} />
      <mesh geometry={G.BEAM_GEO} material={BEAM_MAT} scale={[diagLen, 1, 1]} rotation={[0, 0, -angle]} />
    </group>
  );
}

// One side wall's content, authored in the wall panel's own local frame
// (local X = bay depth axis, local Y = height) — the parent group applies
// the rotation that turns this into an actual side wall (see Wall below).
function WallFace({ mirror }) {
  const halfD = BAY_DEPTH / 2;
  const halfH = BAY_HEIGHT / 2;
  const cellW = BAY_DEPTH * 0.92;
  const cellH = halfH * 0.82;
  const ventX = mirror ? -BAY_DEPTH * 0.28 : BAY_DEPTH * 0.28;

  return (
    <group>
      <mesh geometry={G.WALL_PANEL_GEO} material={WALL_MAT} />

      {/* Border frame */}
      <mesh geometry={G.BEAM_GEO} material={BEAM_MAT} position={[0, halfH, 0.03]} scale={[BAY_DEPTH, 1, 1]} />
      <mesh geometry={G.BEAM_GEO} material={BEAM_MAT} position={[0, -halfH, 0.03]} scale={[BAY_DEPTH, 1, 1]} />
      <mesh geometry={G.BEAM_GEO} material={BEAM_MAT} position={[halfD, 0, 0.03]} scale={[BAY_HEIGHT, 1, 1]} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={G.BEAM_GEO} material={BEAM_MAT} position={[-halfD, 0, 0.03]} scale={[BAY_HEIGHT, 1, 1]} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={G.BEAM_GEO} material={BEAM_MAT} position={[0, 0, 0.03]} scale={[BAY_DEPTH, 1, 1]} />

      <CrossBrace cx={0} cy={halfH / 2} w={cellW} h={cellH} />
      <CrossBrace cx={0} cy={-halfH / 2} w={cellW} h={cellH} />

      <mesh geometry={G.HEX_VENT_GEO} material={VENT_MAT} position={[ventX, halfH / 2, 0.08]} />
      <mesh geometry={G.HEX_VENT_GEO} material={VENT_MAT} position={[-ventX, -halfH / 2, 0.08]} />
    </group>
  );
}

function Wall({ side }) {
  return (
    <group position={[side * (BAY_WIDTH / 2), BAY_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
      <WallFace mirror={side < 0} />
    </group>
  );
}

function HazardStripes() {
  const count = 9;
  const stripes = [];
  for (let i = 0; i < count; i++) {
    const x = -BAY_WIDTH / 2 + ((i + 0.5) * BAY_WIDTH) / count;
    stripes.push(
      <mesh
        key={i}
        geometry={G.STRIPE_GEO}
        material={i % 2 === 0 ? STRIPE_MAT_A : STRIPE_MAT_B}
        position={[x, 0.06, BAY_DEPTH / 2 - 0.22]}
        rotation={[0, Math.PI / 4, 0]}
      />
    );
  }
  return <group>{stripes}</group>;
}

const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _quat = new THREE.Quaternion();

// Connects two world-space points with a cylinder — used for the crane
// arm's segments so they can be aimed at exact anchor points instead of
// hand-derived rotation angles (which are easy to get subtly wrong).
function ArmBeam({ from, to, radius = 1 }) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  _mid.copy(start).add(end).multiplyScalar(0.5);
  _dir.copy(end).sub(start);
  const len = _dir.length();
  _quat.setFromUnitVectors(_up, _dir.clone().normalize());
  return (
    <mesh
      geometry={G.ARM_SEG_GEO}
      material={ARM_MAT}
      position={_mid.toArray()}
      quaternion={_quat.toArray()}
      scale={[radius, len, radius]}
    />
  );
}

// Overhead docking arm reaching down from the ceiling toward the mech's
// shoulder — the crane/clamp silhouette from the reference dioramas.
// Offset to one side (not directly behind the head) so it reads as a
// distinct shape instead of disappearing behind the mech in silhouette.
function CraneArm() {
  // Clamp point sits right at a scale-1.3 hero mech's right shoulder (see
  // HangarCorridor.jsx — mech group offset z=0.15, shoulder world pos
  // roughly [0.35, 1.65, 0.15] at that scale) so the arm visibly reaches
  // the mech rather than floating disconnected nearby.
  const ceiling = [0.6, BAY_HEIGHT * 0.92, -0.35];
  const elbow = [0.5, BAY_HEIGHT * 0.48, -0.05];
  const clamp = [0.4, 1.78, 0.22];
  return (
    <group>
      <ArmBeam from={ceiling} to={elbow} radius={1.5} />
      <ArmBeam from={elbow} to={clamp} radius={1.2} />
      <mesh geometry={G.CLAMP_GEO} material={CLAMP_MAT} position={clamp} scale={1.3} />
    </group>
  );
}

// One hangar bay's gantry set-dressing — cross-braced side walls with
// hex vent panels, a hazard-striped floor edge, and an overhead docking
// arm — positioned as one repeating unit along HangarCorridor's X axis.
// Purely decorative geometry; the docked MechModel3D is rendered
// separately by the caller so it can also be reused (undressed) elsewhere.
export function GantryBay() {
  return (
    <group>
      <Wall side={-1} />
      <Wall side={1} />
      <mesh geometry={G.FLOOR_GEO} material={FLOOR_MAT} position={[0, -0.05, 0]} />
      <HazardStripes />
      <CraneArm />
    </group>
  );
}
