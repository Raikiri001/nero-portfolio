import { forwardRef, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as P from './partShapes';

const { MECH_PROPORTIONS: PR } = P;

function useMechMaterials(palette) {
  return useMemo(() => ({
    chest: new THREE.MeshStandardMaterial({ color: palette.chest, roughness: 0.4, metalness: 0.3 }),
    waist: new THREE.MeshStandardMaterial({ color: palette.waist, roughness: 0.5, metalness: 0.2 }),
    shoulder: new THREE.MeshStandardMaterial({ color: palette.shoulder, roughness: 0.4, metalness: 0.3 }),
    shoulderAccent: new THREE.MeshStandardMaterial({ color: palette.shoulderAccent, roughness: 0.4, metalness: 0.3 }),
    arm: new THREE.MeshStandardMaterial({ color: palette.arm, roughness: 0.5, metalness: 0.2 }),
    leg: new THREE.MeshStandardMaterial({ color: palette.leg, roughness: 0.5, metalness: 0.2 }),
    joint: new THREE.MeshStandardMaterial({ color: palette.joint, roughness: 0.3, metalness: 0.6 }),
    knee: new THREE.MeshStandardMaterial({ color: palette.knee, roughness: 0.4, metalness: 0.3 }),
    foot: new THREE.MeshStandardMaterial({ color: palette.foot, roughness: 0.5, metalness: 0.2 }),
    headBase: new THREE.MeshStandardMaterial({ color: palette.headBase, roughness: 0.4, metalness: 0.3 }),
    chin: new THREE.MeshStandardMaterial({ color: palette.chin, roughness: 0.4, metalness: 0.3 }),
    vfin: new THREE.MeshStandardMaterial({ color: palette.vfin, roughness: 0.35, metalness: 0.4 }),
    visor: new THREE.MeshStandardMaterial({ color: palette.visor, emissive: palette.visor, emissiveIntensity: 1.1, roughness: 0.3, metalness: 0.1 }),
    centerChest: new THREE.MeshStandardMaterial({ color: palette.centerChest, emissive: palette.centerChest, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.4 }),
    vent: new THREE.MeshStandardMaterial({ color: '#1a1a1e', roughness: 0.6, metalness: 0.2 }),
    backpack: new THREE.MeshStandardMaterial({ color: palette.shoulder, roughness: 0.45, metalness: 0.3 }),
    thruster: new THREE.MeshStandardMaterial({ color: '#111', emissive: palette.thruster, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.5 }),
  }), [
    palette.chest, palette.waist, palette.shoulder, palette.shoulderAccent, palette.arm, palette.leg,
    palette.joint, palette.knee, palette.foot, palette.headBase, palette.chin, palette.vfin,
    palette.visor, palette.centerChest, palette.thruster,
  ]);
}

function Arm({ side, m, isHero }) {
  const x = side === 'left' ? -1 : 1;
  return (
    <group name={side === 'left' ? 'leftArm' : 'rightArm'}>
      <mesh geometry={P.BALL_JOINT_GEO} material={m.joint} />
      <mesh geometry={isHero ? P.SHOULDER_GEO : P.GRUNT_SHOULDER_GEO} material={m.shoulder} scale={[x, 1, 1]} />
      <group position={[0.04 * x, -0.05, 0]}>
        <mesh geometry={P.UPPER_ARM_GEO} material={m.arm} />
        <group position={[0, -PR.upperArmLen, 0]}>
          <mesh geometry={P.HINGE_JOINT_GEO} material={m.joint} rotation={[0, 0, Math.PI / 2]} scale={0.7} />
          <mesh geometry={P.FOREARM_GEO} material={m.arm} />
          <mesh geometry={P.FIST_GEO} material={m.joint} position={[0, -PR.forearmLen - 0.045, 0]} />
        </group>
      </group>
    </group>
  );
}

function Leg({ side, m }) {
  const x = side === 'left' ? -1 : 1;
  return (
    <group position={[PR.hipX * x, 0, 0]}>
      <mesh geometry={P.BALL_JOINT_GEO} material={m.joint} scale={0.85} />
      <mesh geometry={P.THIGH_GEO} material={m.leg} />
      <group position={[0, -PR.thighLen, 0]}>
        <mesh geometry={P.HINGE_JOINT_GEO} material={m.joint} rotation={[Math.PI / 2, 0, 0]} scale={0.75} />
        <mesh geometry={P.KNEE_GEO} material={m.knee} position={[0, 0, 0.09]} />
        <mesh geometry={P.SHIN_GEO} material={m.leg} />
        <group position={[0, -PR.shinLen, 0]}>
          <mesh geometry={P.FOOT_GEO} material={m.foot} position={[0, -0.02, 0.02]} />
        </group>
      </group>
    </group>
  );
}

// Procedurally-built "Gunpla kit" mech — extruded armor panels over simple
// joint primitives, recolored per palette (see palettes.js). Shared
// component for every hero Gundam (hangar + combat) and every enemy boss
// (combat only), so "what you inspect in the hangar is what launches into
// battle" is literally the same geometry, just a different palette.
//
// `dispose={null}` on the root group: the part geometries in partShapes.js
// are module-level singletons shared across every mech instance on screen.
// Without this, React Three Fiber's default auto-dispose-on-unmount would
// destroy a shared BufferGeometry the moment any ONE mech unmounts (e.g.
// paging the hangar), breaking every other instance still using it.
export const MechModel3D = forwardRef(function MechModel3D(
  { palette, pose = 'idle', animate = true, scale = 1 },
  ref
) {
  const isHero = palette.variant !== 'grunt';
  const m = useMechMaterials(palette);
  const groupRef = useRef(null);
  const armPoseX = pose === 'combat' ? -0.35 : 0;

  useFrame(({ clock }) => {
    if (!animate || !groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y = PR.ankleY * 0 + Math.sin(t * 1.4) * 0.012;
    const chest = groupRef.current.getObjectByName('chest');
    if (chest) chest.rotation.y = Math.sin(t * 0.6) * 0.02;
  });

  return (
    <group
      ref={(node) => {
        groupRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      name="mechRoot"
      dispose={null}
      scale={scale}
    >
      <group name="legs" position={[0, PR.ankleY + PR.shinLen + PR.thighLen, 0]}>
        <Leg side="left" m={m} />
        <Leg side="right" m={m} />
      </group>

      <group name="waist" position={[0, PR.ankleY + PR.shinLen + PR.thighLen, 0]}>
        <mesh geometry={P.WAIST_GEO} material={m.waist} />
        <mesh geometry={P.SKIRT_GEO} material={m.waist} position={[0.19, 0, 0]} />
        <mesh geometry={P.SKIRT_GEO} material={m.waist} position={[-0.19, 0, 0]} scale={[-1, 1, 1]} />

        <group name="chest" position={[0, PR.waistHeight, 0]}>
          <mesh geometry={P.CHEST_GEO} material={m.chest} />
          <mesh geometry={P.VENT_GEO} material={m.vent} position={[0.10, 0.30, 0.05]} />
          <mesh geometry={P.VENT_GEO} material={m.vent} position={[-0.10, 0.30, 0.05]} />
          <mesh geometry={P.CORE_GEO} material={m.centerChest} position={[0, 0.20, 0.05]} />
          <mesh geometry={P.BACKPACK_GEO} material={m.backpack} position={[0, 0.20, -0.12]} />
          <mesh geometry={P.THRUSTER_GEO} material={m.thruster} position={[0.09, 0.06, -0.16]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={P.THRUSTER_GEO} material={m.thruster} position={[-0.09, 0.06, -0.16]} rotation={[Math.PI / 2, 0, 0]} />

          <group name="head" position={[0, PR.chestHeight, 0]}>
            <mesh geometry={P.NECK_GEO} material={m.joint} />
            <group position={[0, PR.neckHeight, 0]}>
              <mesh geometry={isHero ? P.HEAD_GEO : P.GRUNT_HEAD_GEO} material={m.headBase} />
              <mesh geometry={P.CHIN_GEO} material={m.chin} position={[0, 0.02, 0.04]} />
              <mesh
                geometry={P.VENT_GEO}
                material={m.visor}
                scale={[1.6, 0.22, 0.6]}
                position={[0, isHero ? 0.11 : 0.09, 0.055]}
              />
              {isHero ? (
                <>
                  <mesh geometry={P.VFIN_BLADE_GEO} material={m.vfin} position={[0, PR.headHeight, 0]} />
                  <mesh geometry={P.VFIN_BLADE_GEO} material={m.vfin} position={[0, PR.headHeight, 0]} scale={[-1, 1, 1]} />
                </>
              ) : (
                <mesh geometry={P.GRUNT_HORN_GEO} material={m.vfin} position={[0, PR.headHeight, 0]} />
              )}
            </group>
          </group>

          <group position={[isHero ? PR.shoulderXHero : PR.shoulderXGrunt, PR.chestHeight - 0.05, 0]} rotation={[0, 0, armPoseX]}>
            <Arm side="right" m={m} isHero={isHero} />
          </group>
          <group position={[-(isHero ? PR.shoulderXHero : PR.shoulderXGrunt), PR.chestHeight - 0.05, 0]} rotation={[0, 0, -armPoseX]}>
            <Arm side="left" m={m} isHero={isHero} />
          </group>
        </group>
      </group>
    </group>
  );
});
