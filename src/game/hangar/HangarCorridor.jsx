import { memo, Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MechModel3D } from '../mech/MechModel3D';
import { PerfReadout } from '../mech/debugPump';
import { getHeroPalette } from '../mech/palettes';
import { shoulderHeight } from '../mech/dims';
import { SceneEnvironment } from '../SceneEnvironment';
import { CombatStage } from '../combat/CombatScene';
import { GantryBay, GantryLighting, DockPad, Catapult } from './GantryBay';
import { HallSegment, HallBulkhead, CatapultTunnel } from './LaunchHall';
import { SortieDirector } from './SortieDirector';
import { SortieFX } from './SortieFX';
import { BAY_WIDTH, BAY_HEIGHT } from './gantryShapes';
import { ANCHOR_PARTS } from './anchorParts';

// `?perf=1` prints draw calls and triangles once the corridor settles — the
// units CLAUDE.md's cost budget is written in. Dev-only; the constant folds
// to false in a production build and the component is tree-shaken out.
const PERF = import.meta.env.DEV
  && new URLSearchParams(window.location.search).get('perf') === '1';

// How many bays either side of the focused one stay mounted. The camera
// only ever frames ~1.5 bays, so a ±2 window is generous enough that no
// pop-in is visible while keeping the live scene graph (and the number of
// active point lights) a fraction of the full roster's.
const WINDOW = 2;

// A docked mobile suit should nearly fill its bay. At the old value the
// unit stood two thirds of the bay height, which made every piece of set
// dressing read as oversized relative to it.
const MECH_SCALE = 2.6;
const PAD_Y = 0.075; // top of the docking pad the unit stands on
const SUIT_Z = -0.1; // the suit stands slightly back of the pad centre

/** The corridor's resting framing of a bay (bay-local; x tracks the scroll). */
const CAM_HOME = { y: BAY_HEIGHT * 0.50, z: 6.4, lookY: BAY_HEIGHT * 0.48, lookZ: -0.4 };

const _camTarget = new THREE.Vector3();

/**
 * The deploy's shared signals (contract: CLAUDE.md PART 2). SortieDirector
 * WRITES them every frame from sortie.js; the set (GantryBay, LaunchHall,
 * GantryLighting), SortieFX and the suit spotlight READ them. `bursts` is
 * one persistent queue the director pushes to and SortieFX drains.
 */
const restingSignals = () => ({
  alert: 0, undock: 0, lamps: 0, hatch: 0, thrust: 0, tunnelRun: 0,
  spot: 0, letterbox: 0, countdown: null, shuttle: null, bursts: [],
});

// The tunnel has no lamps that light anything (its strips are emissive), so
// during the launch one key light rides with the shuttle. Like SuitSpot it is
// ALWAYS mounted, at intensity 0 when idle: the light count never changes.
const RUN_LIGHT_INTENSITY = 60;
const RUN_LIGHT_AHEAD = 3; // world units ahead of the shuttle, at head height

function RunLight({ signalsRef }) {
  const ref = useRef(null);
  useFrame(() => {
    const light = ref.current;
    if (!light) return;
    const sig = signalsRef.current;
    if (sig.shuttle) {
      light.position.set(sig.shuttle[0], 3.4, sig.shuttle[2] + RUN_LIGHT_AHEAD);
      light.intensity = RUN_LIGHT_INTENSITY * Math.max(sig.lamps, sig.tunnelRun > 0 ? 1 : 0);
    } else {
      light.intensity = 0;
    }
  });
  return <pointLight ref={ref} intensity={0} distance={16} decay={1.5} color="#cfe6ff" />;
}

// Peak intensity of the suit's key spotlight at `signals.spot` = 1
const SPOT_INTENSITY = 90;

/**
 * The suit's key light for the sortie. Always mounted in the focused bay's
 * carriage (at intensity 0 when idle) so the scene's light count never
 * changes at DEPLOY — a change would recompile every lit shader mid-shot.
 */
function SuitSpot({ signalsRef }) {
  const lightRef = useRef(null);
  const targetRef = useRef(null);
  useEffect(() => {
    if (lightRef.current && targetRef.current) lightRef.current.target = targetRef.current;
  }, []);
  useFrame(() => {
    if (lightRef.current) lightRef.current.intensity = signalsRef.current.spot * SPOT_INTENSITY;
  });
  return (
    <>
      <spotLight ref={lightRef} position={[-1.2, 5.8, 3.6]} angle={0.42} penumbra={0.6}
        distance={14} decay={1.6} intensity={0} color="#e8f2ff" />
      <object3D ref={targetRef} position={[0, 2.4, 0]} />
    </>
  );
}

// Scroll-driven dolly. Idle while a sortie owns the camera; when control
// comes back (RETURN TO HANGAR) it snaps straight to the bay framing rather
// than flying back from wherever the fight left the camera.
function CameraRig({ scrollFractionRef, active }) {
  const { camera } = useThree();
  const snapRef = useRef(false);
  useEffect(() => {
    if (!active) snapRef.current = true;
  }, [active]);

  useFrame((_, dt) => {
    if (!active) return;
    const targetX = scrollFractionRef.current * BAY_WIDTH;
    _camTarget.set(targetX, CAM_HOME.y, CAM_HOME.z);
    if (snapRef.current) {
      camera.position.copy(_camTarget);
      snapRef.current = false;
    } else {
      camera.position.lerp(_camTarget, Math.min(1, 7 * dt));
    }
    camera.lookAt(camera.position.x, CAM_HOME.lookY, CAM_HOME.lookZ);
  });
  return null;
}

// Projects the focused bay's named mech anchors to screen space for the DOM
// callout overlay, and drives the mount window. Only REPORTS when something
// moved by at least a pixel (or the focused bay changed): each report is a
// React state update in Projects, and reporting every few frames regardless
// re-rendered the whole page ~15 times a second while nothing moved.
// Scratch vector — this runs in the render loop.
const _project = new THREE.Vector3();
const PROJECT_EVERY = 4; // frames
const PROJECT_EPS = 1;   // px

function samePositions(a, b) {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => b[k]
    && Math.abs(a[k].x - b[k].x) < PROJECT_EPS && Math.abs(a[k].y - b[k].y) < PROJECT_EPS);
}

function Director({ mechRefs, scrollFractionRef, onProject, onCenterChange }) {
  const { camera, size } = useThree();
  const frame = useRef(0);
  const last = useRef({ idx: -1, positions: {} });

  useFrame(() => {
    const idx = Math.round(scrollFractionRef.current);
    onCenterChange(idx);

    frame.current += 1;
    if (frame.current % PROJECT_EVERY !== 0) return;
    const mech = mechRefs.current[idx];
    if (!mech) return;

    const next = {};
    for (const part of ANCHOR_PARTS) {
      const obj = mech.getObjectByName(part);
      if (!obj) continue;
      obj.getWorldPosition(_project);
      _project.project(camera);
      next[part] = {
        x: (_project.x * 0.5 + 0.5) * size.width,
        y: (1 - (_project.y * 0.5 + 0.5)) * size.height,
      };
    }
    if (last.current.idx === idx && samePositions(last.current.positions, next)) return;
    last.current = { idx, positions: next };
    onProject(idx, next);
  });

  return null;
}

function CorridorContents({ bayCount, mechRefs, scrollFractionRef, onProject, sortie }) {
  const [center, setCenter] = useState(0);
  // One stable ref callback per bay, so re-renders don't detach/reattach
  const [refCallbacks] = useState(() => new Map());
  const refFor = (i) => {
    if (!refCallbacks.has(i)) refCallbacks.set(i, (node) => { mechRefs.current[i] = node; });
    return refCallbacks.get(i);
  };

  // Sortie handles — see SortieDirector. They live here, above the bays, so
  // the deploying bay, its suit, the hall, the tunnel and the FX can share them.
  const signalsRef = useRef(null);
  if (signalsRef.current === null) signalsRef.current = restingSignals();
  const alertRef = useRef(0);
  const carriageRef = useRef(null);
  const suitRef = useRef(null);
  const deflectorRef = useRef(null);

  const handleCenter = (idx) => {
    setCenter((c) => (c === idx ? c : idx));
  };

  const sortieBay = sortie ? sortie.gundamId : -1;
  // Once launched, the fight is out in space: the corridor behind it is
  // unmounted (it is behind the camera at the hand-off) and the combat
  // stage takes over the same canvas.
  const inCombat = sortie?.phase === 'combat' && sortie.entry;

  const bays = [];
  const firstMounted = Math.max(0, center - WINDOW);
  const lastMounted = Math.min(bayCount - 1, center + WINDOW);
  if (!inCombat) {
    for (let i = firstMounted; i <= lastMounted; i++) bays.push(i);
  }
  // The launch hall runs in front of every mounted bay, plus one END segment
  // past the last bay (it closes the hall and holds the last bay's portal).
  const hallSegments = inCombat ? [] : [...bays, ...(lastMounted === bayCount - 1 ? [bayCount] : [])];

  return (
    <>
      <SceneEnvironment intensity={1.15} />
      {PERF && <PerfReadout label="corridor" />}
      <CameraRig scrollFractionRef={scrollFractionRef} active={!sortie} />
      <Director
        mechRefs={mechRefs}
        scrollFractionRef={scrollFractionRef}
        onProject={onProject}
        onCenterChange={handleCenter}
      />
      <GantryLighting signalsRef={signalsRef} />

      {sortie?.phase === 'sortie' && (
        <SortieDirector
          bay={sortieBay}
          camHome={CAM_HOME}
          suitY={PAD_Y}
          suitZ0={SUIT_Z}
          worldScale={MECH_SCALE}
          clampY={PAD_Y + shoulderHeight(sortieBay) * MECH_SCALE}
          skip={sortie.skip}
          signalsRef={signalsRef}
          alertRef={alertRef}
          carriageRef={carriageRef}
          suitRef={suitRef}
          deflectorRef={deflectorRef}
          onStage={sortie.onStage}
          onLaunched={sortie.onLaunched}
        />
      )}
      {sortie?.phase === 'sortie' && <SortieFX signalsRef={signalsRef} suitRef={suitRef} />}

      {/* close the hall wherever the mounted window stops short of the
          row's real ends — otherwise a shot looking down the hall sees space */}
      {!inCombat && firstMounted > 0 && (
        <group position={[firstMounted * BAY_WIDTH, 0, 0]}><HallBulkhead side={-1} /></group>
      )}
      {!inCombat && lastMounted < bayCount - 1 && (
        <group position={[lastMounted * BAY_WIDTH, 0, 0]}><HallBulkhead side={1} /></group>
      )}
      {hallSegments.map((i) => (
        <group key={`hall${i}`} position={[i * BAY_WIDTH, 0, 0]}>
          {/* the segment after the deploying bay holds its portal: open it
              so the tunnel behind it is a clear tube */}
          <HallSegment index={i} bayCount={bayCount} signalsRef={signalsRef}
            portalOpen={!!sortie && i === sortieBay + 1} />
        </group>
      ))}

      {inCombat ? (
        <CombatStage
          gundamId={sortie.gundamId}
          bossDef={sortie.bossDef}
          entry={sortie.entry}
          runKey={sortie.runKey}
          frozen={sortie.frozen}
          hudRef={sortie.hudRef}
          onSnapshot={sortie.onSnapshot}
          onExit={sortie.onExit}
        />
      ) : (
        <>
          <ambientLight intensity={0.22} />
          {/* fill for the launch hall and tunnel, which sit outside every
              bay's point lights */}
          <hemisphereLight args={['#7d8ea8', '#1b1612', 0.55]} />
          <RunLight signalsRef={signalsRef} />
          <directionalLight position={[4, 9, 6]} intensity={1.0} />
          <directionalLight position={[-5, 4, -4]} intensity={0.35} color="#5fb4ff" />
        </>
      )}

      {bays.map((i) => {
        const deploying = i === sortieBay;
        return (
          <group key={i} position={[i * BAY_WIDTH, 0, 0]}>
            {/* Suits differ in height, so the bay's docking clamps track
                this unit's actual shoulder station rather than a fixed one. */}
            <GantryBay
              index={i}
              animate={Math.abs(i - center) <= 1}
              clampY={PAD_Y + shoulderHeight(i) * MECH_SCALE}
              signalsRef={deploying ? signalsRef : null}
              // a shared wall is drawn once: by the bay on its left, except
              // at the left edge of what is mounted
              drawLeftWall={i === firstMounted}
            />
            {/* The carriage: the pad and the suit standing on it. On DEPLOY
                this is what moves — forward, right, and off the catapult. */}
            <group ref={deploying ? carriageRef : undefined}>
              <DockPad />
              {i === center && <SuitSpot signalsRef={signalsRef} />}
              <group ref={deploying ? suitRef : undefined} position={[0, PAD_Y, SUIT_Z]}>
                <MechModel3D
                  ref={refFor(i)}
                  palette={getHeroPalette(i)}
                  gundamId={i}
                  pose="idle"
                  scale={MECH_SCALE}
                  phase={i * 1.3}
                  animate={Math.abs(i - center) <= 1}
                  detail={Math.abs(i - center) <= 1 || deploying ? 'hero' : 'far'}
                  alertRef={deploying ? alertRef : null}
                />
              </group>
            </group>
            {/* The catapult only exists beside the bay that is deploying —
                off-screen right until the camera pans round to it. */}
            {deploying && <Catapult signalsRef={signalsRef} deflectorRef={deflectorRef} />}
            {deploying && <CatapultTunnel signalsRef={signalsRef} />}
            {/* Warm key from the bay mouth + cool fill from the rear so the
                docked unit reads against the deep bay behind it. */}
            <pointLight position={[0, 2.6, 2.6]} intensity={26} distance={9} decay={2} color="#ffd9b0" />
            <pointLight position={[0, 1.4, -1.9]} intensity={14} distance={7} decay={2} color="#4fa8ff" />
          </group>
        );
      })}
    </>
  );
}

// The hangar's single persistent 3D scene — bays are laid out along X and
// the camera dollies down the row from Projects.jsx's real scroll position.
// It is ALSO the stage for the deploy sequence and the fight: `sortie`
// (from App, via Projects) turns the same canvas into the launch and then
// the arena, so DEPLOY never cuts away (CLAUDE.md PART 2, the vision).
//
// Memoised: Projects re-renders on every callout update, and none of this
// component's props change when it does.
export const HangarCorridor = memo(function HangarCorridor({ bayCount, scrollFractionRef, onProject, sortie = null }) {
  const mechRefs = useRef([]);

  return (
    <Canvas
      camera={{ position: [0, CAM_HOME.y, CAM_HOME.z], fov: 46, far: 2000 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
      // Paused / decided fight: nothing moves, so stop drawing frames
      frameloop={sortie?.frozen ? 'demand' : 'always'}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
    >
      <Suspense fallback={null}>
        <CorridorContents
          bayCount={bayCount}
          mechRefs={mechRefs}
          scrollFractionRef={scrollFractionRef}
          onProject={onProject}
          sortie={sortie}
        />
      </Suspense>
    </Canvas>
  );
});
