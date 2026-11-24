import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as G from './gantryShapes';

// ============================================================
// THE LAUNCH HALL and THE CATAPULT TUNNEL — the enclosure the deploy shot
// plays in (CLAUDE.md PART 2: one continuous shot inside a real hangar).
//
// Without them nothing stood in front of the bay mouths but a floor slab,
// and once the sortie camera turned, most of the frame was the CSS
// starfield. Geometry lives in gantryShapes.js (hallParts, stubParts,
// tunnelParts, hatchDoorParts) as merged singletons, one geometry per
// material slot, so a segment costs a dozen draw calls; materials are the
// shared hangar set, animated once by GantryLighting.
//
// Both components are BAY-LOCAL: render them inside a bay's group (origin
// at its dock pad, +Z out of the bay mouth).
//
//   <HallSegment index bayCount signalsRef portalOpen />
//       one per mounted bay, plus one extra at index === bayCount (the
//       hall-only segment past the last bay, so its catapult has a portal
//       and the hall has a right end). index 0 adds the left end wall and
//       has no portal (no bay launches from its left).
//       portalOpen — true on the segment whose portal the mounted
//       CatapultTunnel runs through (index === deployingBay + 1): hides the
//       portal's dead-end stub and shutter, which occupy the tunnel's first
//       STUB_LEN units. Leave it false and the shutter blocks the tube.
//
//   <CatapultTunnel signalsRef />
//       the deploying bay only, alongside its <Catapult/>. The tube runs
//       from the far wall's back face to HATCH_Z on x = CATAPULT_X.
//
// Signals (signalsRef.current, read only; absent = all zero):
//   alert      the beacon bar spins (its glow is GantryLighting's)
//   lamps      tunnel lamps light in sequence towards the hatch
//   tunnelRun  every lamp blazes, a bright pulse racing down the tube
//   hatch      the two blast-door leaves slide apart (0 shut → 1 open)
// ============================================================

const mats = G.hangarMats;

function Slots({ parts, m }) {
  return parts.map(({ slot, geometry }) => (
    <mesh key={slot} geometry={geometry} material={m[slot]} />
  ));
}

const segmentKind = (index, bayCount) => {
  if (index <= 0) return 'first';
  if (index >= bayCount) return 'end';
  return 'mid';
};

const BEACON_SPIN = 6.5; // rad/s — a klaxon beacon, not a lighthouse

/**
 * One segment of the launch hall in front of bay `index`: apron
 * continuation, ceiling with ribs and strip lights, the far wall with its
 * launch portal, the lintel and roof plate over the bay, end walls at the
 * row's ends, and a spinning alert beacon.
 */
export function HallSegment({ index, bayCount, signalsRef = null, portalOpen = false }) {
  const m = mats();
  const kind = segmentKind(index, bayCount);
  const barRef = useRef(null);

  useFrame(({ clock }) => {
    const bar = barRef.current;
    if (!bar || !(signalsRef?.current?.alert > 0)) return;
    bar.rotation.y = clock.getElapsedTime() * BEACON_SPIN + index * 1.1;
  });

  return (
    <group dispose={null}>
      <Slots parts={G.hallParts(kind)} m={m} />
      {kind !== 'first' && (
        <group visible={!portalOpen}>
          <Slots parts={G.stubParts()} m={m} />
        </group>
      )}
      <mesh
        ref={barRef}
        geometry={G.BEACON_BAR_GEO}
        material={m.beaconBar}
        position={[G.HALL_BEACON[0], G.HALL_BEACON[1] + 0.1, G.HALL_BEACON[2]]}
      />
    </group>
  );
}

/**
 * A section bulkhead closing the hall at the edge of the MOUNTED bays, where
 * the row carries on but nothing is built (see BULKHEAD_GEO). `side` -1 sits
 * left of the group origin, +1 right; place the group at the edge bay.
 */
export function HallBulkhead({ side }) {
  const m = mats();
  const x = side * (G.BAY_WIDTH / 2 + 0.12);
  return (
    <group position={[x, 0, 0]} dispose={null}>
      <mesh geometry={G.BULKHEAD_GEO} material={m.wallDark} />
      <mesh geometry={G.BULKHEAD_BAND_GEO} material={m.hazard} position={[-side * 0.03, 0, 0]} />
    </group>
  );
}

// Tunnel lamp colours. MeshBasic + toneMapped:false, so these ARE the
// on-screen colours; the "blaze" is a brightness multiplier on BLAZE.
const LAMP_IDLE = new THREE.Color('#2c3640');
const LAMP_ARM = new THREE.Color('#ff4a1a');
const LAMP_READY = new THREE.Color('#28ff6a');
const LAMP_BLAZE = new THREE.Color('#bfeaff');
const _lamp = new THREE.Color();
const _place = new THREE.Object3D();
const ease = (k) => { const x = Math.min(1, Math.max(0, k)); return x * x * (3 - 2 * x); };

/**
 * The catapult tunnel, bay-local for the DEPLOYING bay: a chamfered tube on
 * x = CATAPULT_X from the far wall to the hatch, rib frames every 3 units,
 * four rows of lamp blocks (one instanced draw call, coloured per lamp per
 * frame), the hatch bulkhead and its two blast-door leaves.
 */
export function CatapultTunnel({ signalsRef = null }) {
  const m = mats();
  const lampRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  useLayoutEffect(() => {
    const mesh = lampRef.current;
    if (!mesh) return;
    G.TUNNEL_LAMPS.forEach(({ pos, rotZ }, j) => {
      _place.position.set(pos[0], pos[1], pos[2]);
      _place.rotation.set(0, 0, rotZ);
      _place.updateMatrix();
      mesh.setMatrixAt(j, _place.matrix);
      mesh.setColorAt(j, LAMP_IDLE);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  }, []);

  useFrame(({ clock }) => {
    const s = signalsRef?.current;
    const lamps = s?.lamps ?? 0;
    const run = s?.tunnelRun ?? 0;
    const hatch = ease(s?.hatch ?? 0);

    if (leftRef.current) leftRef.current.position.x = -G.HATCH_TRAVEL * hatch;
    if (rightRef.current) rightRef.current.position.x = G.HATCH_TRAVEL * hatch;

    const mesh = lampRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();
    // the run's bright front leads the shuttle down the tube
    const head = run * 1.2;
    G.TUNNEL_LAMPS.forEach(({ f }, j) => {
      if (run > 0) {
        const d = (f - head) * 7;
        const front = Math.exp(-d * d);
        const ripple = Math.max(0, Math.sin(f * 40 - t * 22)) ** 4;
        _lamp.copy(LAMP_BLAZE).multiplyScalar(0.6 + 0.4 * Math.max(front, ripple));
      } else if (lamps >= 1) {
        _lamp.copy(LAMP_READY);
      } else if (lamps > 0 && f < lamps * 1.05) {
        _lamp.copy(LAMP_ARM);
      } else {
        _lamp.copy(LAMP_IDLE);
      }
      mesh.setColorAt(j, _lamp);
    });
    mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group position={[G.CATAPULT_X, 0, 0]} dispose={null}>
      <Slots parts={G.tunnelParts()} m={m} />
      <instancedMesh
        ref={lampRef}
        args={[G.TUNNEL_LAMP_GEO, m.instLamp, G.TUNNEL_LAMPS.length]}
        frustumCulled={false}
      />
      <group ref={leftRef}>
        <Slots parts={G.hatchDoorParts(-1)} m={m} />
      </group>
      <group ref={rightRef}>
        <Slots parts={G.hatchDoorParts(1)} m={m} />
      </group>
    </group>
  );
}
