import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { MechModel3D } from '../mech/MechModel3D';
import { getHeroPalette } from '../mech/palettes';
import {
  createPlayerState, createBossState, updatePlayer, updateBossAI,
  ARENA_RADIUS, PLAYER_MAX_HP,
} from './combatEngine';
import { useFlightControls } from './useFlightControls';

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

const _camOffset = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _lookAtPoint = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);

// Owns the whole per-frame simulation: reads input, advances the flight
// model + AI (combatEngine.js), syncs the two MechModel3D instances, drives
// a chase camera, and writes HUD data out through refs/callbacks instead of
// React state so none of this costs a 60fps re-render.
//
// `engineRef` holds the mutable sim state (positions/velocities/hp/beams)
// and is only ever touched inside useFrame here, never read during render —
// palette lookups instead come straight from the `gundamId`/`bossDef`
// props, which is what they actually depend on.
function Rig({ engineRef, gundamId, bossDef, controlsRef, hudRef, onSnapshot, onExit }) {
  const { camera, size } = useThree();
  const playerGroupRef = useRef(null);
  const bossGroupRef = useRef(null);
  const snapshotTimer = useRef(0);
  const resultRef = useRef(null);
  const exitTimerRef = useRef(null);

  useEffect(() => () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const { player, boss, beams } = engineRef.current;

    if (resultRef.current) {
      if (!exitTimerRef.current) {
        exitTimerRef.current = setTimeout(() => onExit(resultRef.current), 900);
      }
      return;
    }

    const controls = controlsRef.current;
    const playerResult = updatePlayer(player, controls, dt, beams, boss);
    boss.hp = Math.max(0, boss.hp - playerResult.damageToBoss);

    const aiResult = updateBossAI(boss, player, dt, beams);
    player.hp = Math.max(0, player.hp - aiResult.damageToPlayer);

    for (let i = beams.length - 1; i >= 0; i--) {
      beams[i].life -= dt;
      if (beams[i].life <= 0) beams.splice(i, 1);
    }

    if (playerGroupRef.current) {
      playerGroupRef.current.position.copy(player.position);
      playerGroupRef.current.rotation.set(0, player.yaw, 0);
    }
    if (bossGroupRef.current) {
      bossGroupRef.current.position.copy(boss.position);
      bossGroupRef.current.rotation.y = Math.atan2(
        player.position.x - boss.position.x,
        player.position.z - boss.position.z
      ) + Math.PI;
    }

    _camOffset.set(0, 2.6, 7.5).applyAxisAngle(_yAxis, player.yaw);
    _camTarget.copy(player.position).add(_camOffset);
    camera.position.lerp(_camTarget, Math.min(1, 5 * dt));
    _lookAtPoint.copy(player.position).addScaledVector(playerResult.forward, 12);
    _lookAtPoint.y += 1.2;
    camera.lookAt(_lookAtPoint);

    const proj = (v) => {
      const p = v.clone().project(camera);
      return { x: (p.x * 0.5 + 0.5) * size.width, y: (1 - (p.y * 0.5 + 0.5)) * size.height, behind: p.z > 1 };
    };
    hudRef.current.bossScreen = proj(boss.position.clone().add(new THREE.Vector3(0, 1.6, 0)));
    hudRef.current.lockProgress = playerResult.lockProgress;
    hudRef.current.locked = playerResult.locked;
    hudRef.current.beams = beams.map((bm) => ({
      from: proj(bm.from), to: proj(bm.to), color: bm.color, alpha: bm.life / bm.maxLife, kind: bm.kind,
    }));

    if (boss.hp <= 0) resultRef.current = 'won';
    else if (player.hp <= 0) resultRef.current = 'lost';

    // Result panel is intentionally NOT part of this snapshot — Combat.jsx
    // only reveals it once onExit fires above, ~900ms after the sim froze,
    // so the finishing-blow flourish plays out on a still frame first
    // instead of a modal instantly slapping over the killing blow.
    snapshotTimer.current += dt;
    if (snapshotTimer.current > 0.08 || resultRef.current) {
      snapshotTimer.current = 0;
      onSnapshot({
        playerHpPct: player.hp / PLAYER_MAX_HP,
        bossHpPct: boss.hp / boss.maxHp,
        bossName: boss.def.name,
        boostPct: player.boostFuel / 100,
        locked: playerResult.locked,
      });
    }
  });

  const heroPalette = useMemo(() => getHeroPalette(gundamId), [gundamId]);
  const bossPalette = bossDef.palette;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1.3} />
      <directionalLight position={[-10, 5, -10]} intensity={0.4} color="#0090d9" />
      <Stars radius={90} depth={40} count={2500} factor={3} fade speed={0.4} />
      <Arena />
      <group ref={playerGroupRef}>
        <MechModel3D palette={heroPalette} pose="combat" animate={false} />
      </group>
      <group ref={bossGroupRef}>
        <MechModel3D palette={bossPalette} pose="combat" animate={false} />
      </group>
    </>
  );
}

export function CombatScene({ gundamId, bossDef, onExit, hudRef, onSnapshot }) {
  const controlsRef = useFlightControls(true);
  const engineRef = useRef(null);
  if (engineRef.current === null) {
    engineRef.current = {
      player: createPlayerState(),
      boss: createBossState(bossDef),
      beams: [],
    };
  }

  return (
    <Canvas camera={{ position: [0, 4.6, 23], fov: 55 }} dpr={[1, 1.5]}>
      <Rig
        engineRef={engineRef}
        gundamId={gundamId}
        bossDef={bossDef}
        controlsRef={controlsRef}
        hudRef={hudRef}
        onSnapshot={onSnapshot}
        onExit={onExit}
      />
    </Canvas>
  );
}
