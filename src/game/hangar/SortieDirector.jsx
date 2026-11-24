import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  sampleSortie, eventsBetween, LAUNCH_SPEED, SKIP_TIME_SCALE, SKIP_UNTIL,
} from './sortie';
import { BAY_WIDTH, CATAPULT_X, undockAnchors } from './gantryShapes';

const _suitWorld = new THREE.Vector3();
const DEFLECTOR_DOWN = -Math.PI / 2;
const HOME_FOV = 46;
// Red alert: the IBL and exposure come down so the red lamps carry the scene
const ALERT_ENV = 0.95;
const ALERT_EXPOSURE = 1.0;

/**
 * Plays the sortie (hangar/sortie.js) on the live hangar scene. It owns the
 * camera (position, look, FOV, roll — shake is already in the sampled
 * position), moves the deploying bay's carriage and suit, and writes the
 * shared `signalsRef.current` that the set, the FX and the lighting read
 * (contract in CLAUDE.md PART 2). It starts from wherever the camera
 * already is — the shot never cuts.
 *
 * `skip` fast-forwards (×SKIP_TIME_SCALE) to the start of the launch — still
 * one continuous shot, just quicker. When the suit is past the hatch it
 * calls `onLaunched(entry)` once; the combat stage is placed from that.
 */
export function SortieDirector({
  bay, camHome, suitY, suitZ0, worldScale, clampY, skip,
  signalsRef, alertRef, carriageRef, suitRef, deflectorRef,
  onStage, onLaunched,
}) {
  const timeRef = useRef(0);
  const cam0Ref = useRef(null);
  const stageRef = useRef(null);
  const doneRef = useRef(false);
  const homeRef = useRef(null);

  // Put the set back for the next time this bay is seen: RETURN TO HANGAR
  // remounts the bay, but the signal and light state outlive it.
  useEffect(() => () => {
    const sig = signalsRef.current;
    Object.assign(sig, {
      alert: 0, undock: 0, lamps: 0, hatch: 0, thrust: 0, tunnelRun: 0,
      spot: 0, letterbox: 0, countdown: null, shuttle: null,
    });
    sig.bursts.length = 0;
    alertRef.current = 0;
    const home = homeRef.current;
    if (home) {
      home.scene.environmentIntensity = home.env;
      home.gl.toneMappingExposure = home.exposure;
      home.camera.fov = HOME_FOV;
      home.camera.updateProjectionMatrix();
    }
  }, [signalsRef, alertRef]);

  useFrame((state, dt) => {
    if (doneRef.current) return;
    const { camera, scene, gl } = state;
    const bayX = bay * BAY_WIDTH;

    if (!cam0Ref.current) {
      // Start from the camera's current framing of this bay.
      cam0Ref.current = {
        pos: [camera.position.x - bayX, camera.position.y, camera.position.z],
        look: [camera.position.x - bayX, camHome.lookY, camHome.lookZ],
      };
      homeRef.current = { scene, gl, camera, env: scene.environmentIntensity, exposure: gl.toneMappingExposure };
    }

    const t0 = timeRef.current;
    const scale = skip && t0 < SKIP_UNTIL ? SKIP_TIME_SCALE : 1;
    // never fast-forward PAST the launch: it always plays at speed
    const t1 = Math.min(t0 + Math.min(dt, 0.05) * scale, scale > 1 ? Math.max(SKIP_UNTIL, t0) : Infinity);
    timeRef.current = t1;
    const s = sampleSortie(t1, cam0Ref.current);

    // ---- signals for the set, the FX and the overlay ------------------
    const sig = signalsRef.current;
    sig.alert = s.alert;
    sig.undock = s.undock;
    sig.lamps = s.lamps;
    sig.hatch = s.hatch;
    sig.thrust = s.thrust;
    sig.tunnelRun = s.tunnelRun;
    sig.spot = s.spot;
    sig.letterbox = s.letterbox;
    sig.countdown = s.countdown;
    sig.shuttle = s.stage === 'launch' ? [bayX + CATAPULT_X, 0.1, s.shuttleZ] : null;
    alertRef.current = s.eyes;

    // One-shot bursts, at world positions (skipped ones still fire — a
    // fast-forward passes through them).
    for (const e of eventsBetween(t0, t1)) {
      let at;
      if (e.kind === 'launch') {
        at = [bayX + CATAPULT_X, 0.15, s.shuttleZ];
      } else {
        const anchors = undockAnchors(clampY);
        const p = (e.kind === 'clamp' ? anchors.clamps : anchors.umbilicals)[e.side < 0 ? 0 : 1];
        at = [bayX + p[0], p[1], p[2]];
      }
      sig.bursts.push({ kind: e.kind, at });
    }

    // ---- the hardware --------------------------------------------------
    carriageRef.current?.position.set(s.pad[0], 0, s.pad[1]);
    if (suitRef.current) {
      suitRef.current.position.set(0, suitY, suitZ0 + (s.suitZ - s.pad[1]));
      suitRef.current.rotation.x = s.lean;
    }
    if (deflectorRef.current) {
      // the blast deflector rises behind the suit as the lamps arm
      deflectorRef.current.rotation.x = DEFLECTOR_DOWN * (1 - Math.min(1, s.lamps * 1.6));
    }

    // red alert: dim the image-based light and exposure
    const home = homeRef.current;
    scene.environmentIntensity = home.env + (ALERT_ENV - home.env) * s.alert;
    gl.toneMappingExposure = home.exposure + (ALERT_EXPOSURE - home.exposure) * s.alert;

    // ---- the camera ----------------------------------------------------
    camera.position.set(bayX + s.camPos[0], s.camPos[1], s.camPos[2]);
    camera.lookAt(bayX + s.camLook[0], s.camLook[1], s.camLook[2]);
    if (s.roll) camera.rotateZ(s.roll);
    if (Math.abs(camera.fov - s.fov) > 1e-3) {
      camera.fov = s.fov;
      camera.updateProjectionMatrix();
    }

    if (s.stage !== stageRef.current) {
      stageRef.current = s.stage;
      onStage?.(s.stage);
    }

    if (s.done && suitRef.current) {
      doneRef.current = true;
      // the arena takes over at the combat FOV and full lighting
      camera.fov = HOME_FOV;
      camera.updateProjectionMatrix();
      scene.environmentIntensity = home.env;
      gl.toneMappingExposure = home.exposure;
      suitRef.current.getWorldPosition(_suitWorld);
      onLaunched({
        position: [_suitWorld.x, _suitWorld.y, _suitWorld.z],
        speed: LAUNCH_SPEED,
        worldScale,
      });
    }
  });

  return null;
}
