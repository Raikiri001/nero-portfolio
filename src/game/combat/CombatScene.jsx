import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { MechModel3D } from '../mech/MechModel3D';
import { getHeroPalette, getBossPalette } from '../mech/palettes';
import { shoulderHeight } from '../mech/dims';
import { getUnitSpec } from '../mech/unitSpecs';
import {
  createPlayerState, createBossState, updatePlayer, updateBossAI,
  ARENA_RADIUS, DEFAULT_TORSO_Y, PLAYER_SPAWN,
} from './combatEngine';
import { useFlightControls } from './useFlightControls';

// ============================================================
// COMBAT STAGE — the fight, as a group INSIDE the hangar's own canvas.
//
// There is no combat canvas. Per the game's vision (CLAUDE.md PART 2) the
// suit is fired off the hangar catapult and the game "just plays after it's
// launched" — same renderer, same scene, same camera, no loading screen and
// no black frame. So the arena is a group placed in the hangar's world:
//
//   world = arenaOrigin + R_y(π) · (ARENA_SCALE · enginePoint)
//
// chosen so that the engine's PLAYER_SPAWN lands exactly on `entry` (where
// the suit left the catapult). The engine's forward is -Z; the catapult
// fires along world +Z; the π turn lines them up. ARENA_SCALE makes the
// combat model (MODEL_SCALE) the same size as the docked one (hangar
// MECH_SCALE), so the hand-off is invisible.
// ============================================================

// Both suits are drawn at this scale in arena units.
const MODEL_SCALE = 1.25;
// The models are authored facing +Z; the engine's yaw 0 faces -Z.
const MODEL_YAW_OFFSET = Math.PI;
// Sim freezes on a result; the result panel follows after this beat, so the
// finishing blow plays out on a still frame first.
const RESULT_DELAY_MS = 900;
const SNAPSHOT_INTERVAL = 0.08; // s — HUD bars update ~12×/s, not 60

function Arena() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ARENA_RADIUS - 0.4, ARENA_RADIUS, 64]} />
        <meshBasicMaterial color="#0090d9" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      {[0.4, 0.7].map((f) => (
        <mesh key={f} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <ringGeometry args={[ARENA_RADIUS * f - 0.06, ARENA_RADIUS * f, 64]} />
          <meshBasicMaterial color="#0090d9" transparent opacity={0.08} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// Per-frame scratch (this file allocates nothing inside useFrame)
const _camOffset = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _lookAtPoint = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);
const _proj = new THREE.Vector3();

/** Engine point → world → HUD pixels, written into `out`. */
function projectTo(out, v, arena, camera, size) {
  arena.localToWorld(_proj.copy(v)).project(camera);
  out.x = (_proj.x * 0.5 + 0.5) * size.width;
  out.y = (1 - (_proj.y * 0.5 + 0.5)) * size.height;
  out.behind = _proj.z > 1;
  return out;
}

/**
 * Write this frame's screen-space HUD data (reticle, beams) into `hud`,
 * reusing its objects rather than building fresh ones every frame.
 */
function writeHud(hud, { boss, beams }, playerResult, arena, camera, size) {
  _camTarget.copy(boss.position).setY(boss.position.y + DEFAULT_TORSO_Y);
  hud.bossScreen = projectTo(hud.bossScreen ?? {}, _camTarget, arena, camera, size);
  hud.lockProgress = playerResult.lockProgress;
  hud.locked = playerResult.locked;
  hud.beams.length = beams.length;
  for (let i = 0; i < beams.length; i++) {
    const bm = beams[i];
    const out = hud.beams[i] ?? (hud.beams[i] = { from: {}, to: {} });
    projectTo(out.from, bm.from, arena, camera, size);
    projectTo(out.to, bm.to, arena, camera, size);
    out.color = bm.color;
    out.alpha = bm.life / bm.maxLife;
    out.kind = bm.kind;
  }
}

// Owns one fight: creates the engine state, and every frame reads input,
// advances the engine (combatEngine.js), moves the two models, drives the
// chase camera, and writes HUD data into `hudRef` — refs, never React
// state. Keyed by the run: RETRY remounts this, and only this.
function Rig({ gundamId, bossDef, entrySpeed, arenaRef, controlsRef, frozenRef, hudRef, onSnapshot, onExit }) {
  const unit = getUnitSpec(gundamId);
  const { camera, size } = useThree();
  const playerGroupRef = useRef(null);
  const bossGroupRef = useRef(null);
  const snapshotTimer = useRef(0);
  const resultRef = useRef(null);
  const exitTimerRef = useRef(null);
  // The suit is at full alert for the whole fight (eyes stay bright)
  const alertRef = useRef(1);

  // The mutable sim state. Only ever touched inside useFrame, never read
  // during render.
  const engineRef = useRef(null);
  if (engineRef.current === null) {
    engineRef.current = {
      player: createPlayerState(unit.combat, {
        torsoY: shoulderHeight(gundamId) * MODEL_SCALE,
        speed: entrySpeed,
      }),
      boss: createBossState(bossDef),
      beams: [],
    };
  }

  useEffect(() => () => clearTimeout(exitTimerRef.current), []);

  useFrame((_, rawDt) => {
    if (frozenRef.current) return;
    const arena = arenaRef.current;
    if (!arena) return;
    const dt = Math.min(0.05, rawDt);
    const engine = engineRef.current;
    const { player, boss, beams } = engine;

    if (resultRef.current) {
      if (!exitTimerRef.current) {
        exitTimerRef.current = setTimeout(() => onExit(resultRef.current), RESULT_DELAY_MS);
      }
      return;
    }

    const playerResult = updatePlayer(player, controlsRef.current, dt, beams, boss, unit.combat);
    boss.hp = Math.max(0, boss.hp - playerResult.damageToBoss);

    const aiResult = updateBossAI(boss, player, dt, beams);
    player.hp = Math.max(0, player.hp - aiResult.damageToPlayer);

    for (let i = beams.length - 1; i >= 0; i--) {
      beams[i].life -= dt;
      if (beams[i].life <= 0) beams.splice(i, 1);
    }

    if (playerGroupRef.current) {
      playerGroupRef.current.position.copy(player.position);
      playerGroupRef.current.rotation.set(0, player.yaw + MODEL_YAW_OFFSET, 0);
    }
    if (bossGroupRef.current) {
      bossGroupRef.current.position.copy(boss.position);
      // Face the player: rotating +Z by θ about Y points it at (sin θ, cos θ).
      bossGroupRef.current.rotation.y = Math.atan2(
        player.position.x - boss.position.x,
        player.position.z - boss.position.z,
      );
    }

    // Chase camera, computed in arena space and carried into the world.
    // It eases from wherever the launch shot left the camera.
    _camOffset.set(0, 2.6, 7.5).applyAxisAngle(_yAxis, player.yaw);
    arena.localToWorld(_camTarget.copy(player.position).add(_camOffset));
    camera.position.lerp(_camTarget, Math.min(1, 5 * dt));
    _lookAtPoint.copy(player.position).addScaledVector(playerResult.forward, 12);
    _lookAtPoint.y += 1.2;
    camera.lookAt(arena.localToWorld(_lookAtPoint));

    writeHud(hudRef.current, engine, playerResult, arena, camera, size);

    if (boss.hp <= 0) resultRef.current = 'won';
    else if (player.hp <= 0) resultRef.current = 'lost';

    snapshotTimer.current += dt;
    if (snapshotTimer.current > SNAPSHOT_INTERVAL || resultRef.current) {
      snapshotTimer.current = 0;
      onSnapshot({
        playerHpPct: player.hp / player.maxHp,
        bossHpPct: boss.hp / boss.maxHp,
        boostPct: player.boostFuel / 100,
        specialCharge: playerResult.specialCharge,
        specialActive: playerResult.specialActive,
        specialLabel: unit.combat.special?.label,
        unitName: unit.name,
      });
    }
  });

  return (
    <>
      {/* Only what is built renders (hard rule 9): the player is whatever
          exists of its unit; a boss is never a roster unit, so it renders
          nothing and the HUD reticle marks it. Both start at their engine
          spawns, so the player's first frame already matches the launch. */}
      <group ref={playerGroupRef} position={PLAYER_SPAWN} rotation={[0, MODEL_YAW_OFFSET, 0]}>
        <MechModel3D palette={getHeroPalette(gundamId)} gundamId={gundamId} pose="combat"
          animate={false} scale={MODEL_SCALE} alertRef={alertRef} />
      </group>
      <group ref={bossGroupRef}>
        <MechModel3D palette={getBossPalette(bossDef)} gundamId={null} pose="combat" animate={false} scale={MODEL_SCALE} />
      </group>
    </>
  );
}

/**
 * The fight, mounted inside an existing <Canvas> (the hangar's). `entry` is
 * where — and how fast — the suit left the catapult, in WORLD units:
 * `{ position: [x, y, z], speed, worldScale }`, where `worldScale` is the
 * hangar's MECH_SCALE. `runKey` remounts the Rig (RETRY) without moving
 * the arena.
 */
export const CombatStage = memo(function CombatStage({
  gundamId, bossDef, entry, runKey, frozen, hudRef, onSnapshot, onExit,
}) {
  const controlsRef = useFlightControls(!frozen);
  const frozenRef = useRef(frozen);
  useEffect(() => { frozenRef.current = frozen; }, [frozen]);
  const arenaRef = useRef(null);

  const k = entry.worldScale / MODEL_SCALE;
  // arenaOrigin = entry − R_y(π)·(k · PLAYER_SPAWN)
  const origin = useMemo(() => [
    entry.position[0] + k * PLAYER_SPAWN[0],
    entry.position[1] - k * PLAYER_SPAWN[1],
    entry.position[2] + k * PLAYER_SPAWN[2],
  ], [entry, k]);

  // The arena's world matrix must be current before the Rig's first frame
  // converts through it.
  useLayoutEffect(() => { arenaRef.current?.updateWorldMatrix(true, false); }, [origin, k]);

  return (
    <>
      {/* Open space has no bounce light; the arena leans on ambient. */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[10, 20, 10]} intensity={1.3} />
      <directionalLight position={[-10, 5, -10]} intensity={0.4} color="#0090d9" />
      <group ref={arenaRef} position={origin} rotation={[0, Math.PI, 0]} scale={k}>
        <Stars radius={90} depth={40} count={2500} factor={3} fade speed={0.4} />
        <Arena />
        <Rig
          key={runKey}
          gundamId={gundamId}
          bossDef={bossDef}
          entrySpeed={(entry.speed ?? 0) / k}
          arenaRef={arenaRef}
          controlsRef={controlsRef}
          frozenRef={frozenRef}
          hudRef={hudRef}
          onSnapshot={onSnapshot}
          onExit={onExit}
        />
      </group>
    </>
  );
});
