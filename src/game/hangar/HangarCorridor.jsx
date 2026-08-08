import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MechModel3D } from '../mech/MechModel3D';
import { getHeroPalette } from '../mech/palettes';
import { GantryBay } from './GantryBay';
import { BAY_WIDTH } from './gantryShapes';
import { ANCHOR_PARTS } from './anchorParts';

const _camTarget = new THREE.Vector3();

// scrollFractionRef is written imperatively by Projects.jsx's scroll
// listener (0..bayCount-1, continuous) and read here every frame — no
// React state round-trip for a value that can change on every scroll
// event, matching the perf-sensitive pattern already used in
// game/combat/CombatScene.jsx.
function CameraRig({ scrollFractionRef }) {
  const { camera } = useThree();
  useFrame((_, dt) => {
    const targetX = scrollFractionRef.current * BAY_WIDTH;
    _camTarget.set(targetX, camera.position.y, camera.position.z);
    camera.position.lerp(_camTarget, Math.min(1, 7 * dt));
    camera.lookAt(camera.position.x, 1.5, -0.5);
  });
  return null;
}

// Projects the CURRENT (nearest) bay's named anchors to screen space every
// few frames and reports them up to the DOM callout overlay, along with
// which bay index they belong to (so the overlay can bail out cleanly on a
// bay change instead of showing one frame of stale positions).
function CalloutProjector({ mechRefs, scrollFractionRef, onProject }) {
  const { camera, size } = useThree();
  const frame = useRef(0);

  useFrame(() => {
    frame.current += 1;
    if (frame.current % 4 !== 0) return;
    const idx = Math.round(scrollFractionRef.current);
    const mech = mechRefs.current[idx];
    if (!mech) return;

    const v = new THREE.Vector3();
    const next = {};
    for (const part of ANCHOR_PARTS) {
      const obj = mech.getObjectByName(part);
      if (!obj) continue;
      obj.getWorldPosition(v);
      v.project(camera);
      next[part] = { x: (v.x * 0.5 + 0.5) * size.width, y: (1 - (v.y * 0.5 + 0.5)) * size.height };
    }
    onProject(idx, next);
  });

  return null;
}

function CorridorContents({ bayCount, mechRefs, scrollFractionRef, onProject }) {
  return (
    <>
      <CameraRig scrollFractionRef={scrollFractionRef} />
      <CalloutProjector mechRefs={mechRefs} scrollFractionRef={scrollFractionRef} onProject={onProject} />

      {/* Both walls need comparable light — a single strong directional
          light only ever grazes the one it's angled toward (dot product of
          its direction against each wall's inward-facing normal has
          opposite sign left vs right), so the second light here is a
          near-equal counter-light, not just a dim rim accent. */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 7, 5]} intensity={1.1} />
      <directionalLight position={[-3, 5, -4]} intensity={0.85} color="#0090d9" />

      {Array.from({ length: bayCount }, (_, i) => (
        <group key={i} position={[i * BAY_WIDTH, 0, 0]}>
          <GantryBay />
          <group position={[0, 0, 0.15]}>
            <MechModel3D
              ref={(node) => { mechRefs.current[i] = node; }}
              palette={getHeroPalette(i)}
              pose="idle"
              scale={1.3}
            />
          </group>
          <pointLight position={[0, 2.2, 1.8]} intensity={0.7} color="#0090d9" distance={6} />
        </group>
      ))}
    </>
  );
}

// The hangar's single persistent 3D scene — every bay's gantry set-dressing
// + docked mech lives here permanently; Projects.jsx's real scroll
// container drives `scrollFractionRef` to dolly the camera down the row,
// which is what makes scrolling read as walking past each bay rather than
// pages hard-swapping.
export function HangarCorridor({ bayCount, scrollFractionRef, onProject }) {
  const mechRefs = useRef([]);

  return (
    <Canvas camera={{ position: [0, 1.6, 5.4], fov: 52 }} dpr={[1, 1.5]}>
      <Suspense fallback={null}>
        <CorridorContents
          bayCount={bayCount}
          mechRefs={mechRefs}
          scrollFractionRef={scrollFractionRef}
          onProject={onProject}
        />
      </Suspense>
    </Canvas>
  );
}
