import * as THREE from 'three';

// Pure(-ish) game-logic layer for the combat arena — physics/AI mutate the
// player/boss state objects passed in, CombatScene.jsx only owns the R3F
// scene graph and reads these results back out each frame. Kept separate
// so the flight model and AI can be reasoned about without Three.js scene
// concerns tangled in.

export const ARENA_RADIUS = 46;
export const PLAYER_MAX_HP = 100;

const PLAYER_ACCEL = 30;
const BOOST_MULT = 2.3;
const DRAG = 2.0;
const MAX_SPEED = 15;
const BOOST_MAX_SPEED = 27;
const YAW_RATE = 1.7;
const PITCH_RATE = 1.2;
const PITCH_LIMIT = 1.2;

const FIRE_COOLDOWN = 0.22;
const FIRE_RANGE = 60;
const FIRE_HIT_RADIUS = 1.5;
const FIRE_DAMAGE = 9;
const FIRE_DAMAGE_LOCKED = 15;

const MELEE_COOLDOWN = 0.85;
const MELEE_RANGE = 5.5;
const MELEE_DAMAGE = 27;
const MELEE_BLOCK_FACTOR = 0.3;

const LOCK_CONE_COS = Math.cos(0.24);
const LOCK_MAX_RANGE = 42;
const LOCK_GAIN = 1 / 0.55;
const LOCK_DECAY = 1 / 0.3;

const BOOST_FUEL_MAX = 100;
const BOOST_DRAIN = 48;
const BOOST_REGEN = 16;

const BOSS_SPEED = 9;
const BOSS_BOOST_SPEED = 17;
const BOSS_TURN_SMOOTH = 2.2;
const BOSS_CONTACT_RADIUS = 3.6;

export function createPlayerState() {
  return {
    position: new THREE.Vector3(0, 2, 16),
    velocity: new THREE.Vector3(),
    // forwardFromYawPitch(0, 0) points down -Z — yaw 0 is "facing the boss"
    // given the boss spawns at z = -16 (see createBossState below).
    yaw: 0,
    pitch: 0,
    hp: PLAYER_MAX_HP,
    boostFuel: BOOST_FUEL_MAX,
    fireCooldown: 0,
    meleeCooldown: 0,
    lockProgress: 0,
  };
}

export function createBossState(bossDef) {
  return {
    def: bossDef,
    position: new THREE.Vector3(0, 2, -16),
    velocity: new THREE.Vector3(),
    hp: bossDef.hp,
    maxHp: bossDef.hp,
    state: 'seek',
    stateTimer: 0,
    attackCooldown: 1,
    blocking: false,
    strafeDir: Math.random() < 0.5 ? 1 : -1,
    dashDir: null,
    passDir: null,
  };
}

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _accel = new THREE.Vector3();
const _toBoss = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();

export function forwardFromYawPitch(yaw, pitch, out) {
  return out.set(
    -Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  );
}

// Advances the player's flight/weapons state by one frame. Returns damage
// dealt this frame (if any) plus the player's current forward vector/lock
// state for the camera and HUD to use.
export function updatePlayer(p, controls, dt, beams, boss) {
  p.yaw -= controls.mouseX * YAW_RATE * dt;
  p.pitch = THREE.MathUtils.clamp(p.pitch - controls.mouseY * PITCH_RATE * dt, -PITCH_LIMIT, PITCH_LIMIT);

  forwardFromYawPitch(p.yaw, p.pitch, _forward);
  _right.crossVectors(_forward, _up).normalize();

  _accel.set(0, 0, 0);
  const boosting = controls.boost && p.boostFuel > 1;
  const accelMag = PLAYER_ACCEL * (boosting ? BOOST_MULT : 1);
  if (controls.forward) _accel.addScaledVector(_forward, accelMag);
  if (controls.backward) _accel.addScaledVector(_forward, -accelMag * 0.6);
  if (controls.right) _accel.addScaledVector(_right, accelMag * 0.85);
  if (controls.left) _accel.addScaledVector(_right, -accelMag * 0.85);
  if (controls.up) _accel.y += accelMag * 0.85;
  if (controls.down) _accel.y -= accelMag * 0.85;

  p.boostFuel = boosting
    ? Math.max(0, p.boostFuel - BOOST_DRAIN * dt)
    : Math.min(BOOST_FUEL_MAX, p.boostFuel + BOOST_REGEN * dt);

  p.velocity.addScaledVector(_accel, dt);
  p.velocity.multiplyScalar(1 / (1 + DRAG * dt));
  const maxSpeed = boosting ? BOOST_MAX_SPEED : MAX_SPEED;
  if (p.velocity.length() > maxSpeed) p.velocity.setLength(maxSpeed);

  p.position.addScaledVector(p.velocity, dt);

  if (p.position.length() > ARENA_RADIUS) {
    p.position.setLength(ARENA_RADIUS);
    const outward = p.position.clone().normalize();
    const outSpeed = p.velocity.dot(outward);
    if (outSpeed > 0) p.velocity.addScaledVector(outward, -outSpeed);
  }
  if (p.position.y < 1) {
    p.position.y = 1;
    if (p.velocity.y < 0) p.velocity.y = 0;
  }

  p.fireCooldown = Math.max(0, p.fireCooldown - dt);
  p.meleeCooldown = Math.max(0, p.meleeCooldown - dt);

  _toBoss.subVectors(boss.position, p.position);
  const rangeToBoss = _toBoss.length();
  const dirToBoss = _toBoss.clone().normalize();
  const facing = _forward.dot(dirToBoss);
  const inCone = facing > LOCK_CONE_COS && rangeToBoss < LOCK_MAX_RANGE;
  p.lockProgress = THREE.MathUtils.clamp(p.lockProgress + (inCone ? LOCK_GAIN : -LOCK_DECAY) * dt, 0, 1);
  const locked = p.lockProgress >= 1;

  let damageToBoss = 0;

  if (controls.fire && p.fireCooldown <= 0) {
    p.fireCooldown = FIRE_COOLDOWN;
    const muzzle = p.position.clone().addScaledVector(_forward, 1.1);
    let hit = false;
    if (facing > 0.4 && rangeToBoss < FIRE_RANGE) {
      const t = THREE.MathUtils.clamp(_toBoss.dot(_forward), 0, FIRE_RANGE);
      const closest = p.position.clone().addScaledVector(_forward, t);
      if (closest.distanceTo(boss.position) < FIRE_HIT_RADIUS) hit = true;
    }
    const endPoint = hit ? boss.position.clone() : muzzle.clone().addScaledVector(_forward, FIRE_RANGE);
    beams.push({ from: muzzle, to: endPoint, color: '#7fe8ff', life: 0.16, maxLife: 0.16 });
    if (hit) damageToBoss += (locked ? FIRE_DAMAGE_LOCKED : FIRE_DAMAGE) * (boss.blocking ? MELEE_BLOCK_FACTOR : 1);
  }

  if (controls.melee && p.meleeCooldown <= 0) {
    p.meleeCooldown = MELEE_COOLDOWN;
    if (rangeToBoss < MELEE_RANGE) {
      damageToBoss += MELEE_DAMAGE * (boss.blocking ? MELEE_BLOCK_FACTOR : 1);
    }
    beams.push({
      from: p.position.clone().addScaledVector(_forward, 0.6),
      to: p.position.clone().addScaledVector(_forward, MELEE_RANGE),
      color: '#ff3355', life: 0.18, maxLife: 0.18, kind: 'slash',
    });
  }

  return { damageToBoss, forward: _forward.clone(), locked, lockProgress: p.lockProgress };
}

// Advances one boss's AI/movement by one frame. `archetype` drives distinct
// movement + attack patterns (see bossRoster.js for the roster).
export function updateBossAI(b, player, dt, beams) {
  _toPlayer.subVectors(player.position, b.position);
  const dist = _toPlayer.length();
  const dir = _toPlayer.clone().normalize();

  b.stateTimer -= dt;
  b.attackCooldown = Math.max(0, b.attackCooldown - dt);

  let desiredVel = new THREE.Vector3();
  let damageToPlayer = 0;

  const fireAt = (spreadFactor, damage) => {
    const missChance = THREE.MathUtils.clamp((dist - 14) / 60, 0, 0.5) * spreadFactor;
    const hit = Math.random() > missChance;
    const aim = player.position.clone();
    if (!hit) aim.add(new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6));
    beams.push({ from: b.position.clone().addScaledVector(_up, 0.3), to: aim, color: b.def.palette.thruster, life: 0.2, maxLife: 0.2 });
    if (hit) damageToPlayer += damage;
  };

  switch (b.def.archetype) {
    case 'kiting-sniper': {
      const preferred = 18;
      if (dist < preferred - 4) desiredVel = dir.clone().multiplyScalar(-BOSS_SPEED);
      else if (dist > preferred + 6) desiredVel = dir.clone().multiplyScalar(BOSS_SPEED);
      else {
        desiredVel = new THREE.Vector3().crossVectors(dir, _up).normalize().multiplyScalar(BOSS_SPEED * b.strafeDir);
        if (b.stateTimer <= 0) { b.strafeDir *= -1; b.stateTimer = 2 + Math.random() * 1.5; }
      }
      if (b.attackCooldown <= 0 && dist < 34) {
        b.attackCooldown = 1.3 + Math.random() * 0.4;
        fireAt(1, b.def.damage);
      }
      break;
    }
    case 'shield-turtle': {
      if (b.stateTimer <= 0) {
        b.blocking = !b.blocking;
        b.stateTimer = b.blocking ? 1.1 : 3 + Math.random();
      }
      if (dist > 20) desiredVel = dir.clone().multiplyScalar(BOSS_SPEED * 0.6);
      if (!b.blocking && b.attackCooldown <= 0 && dist < 30) {
        b.attackCooldown = 1.6 + Math.random() * 0.5;
        fireAt(0.8, b.def.damage);
      }
      break;
    }
    case 'boost-evader': {
      if (b.stateTimer <= 0) {
        const angle = Math.random() * Math.PI * 2;
        b.dashDir = new THREE.Vector3(Math.cos(angle), (Math.random() - 0.5) * 0.4, Math.sin(angle));
        b.stateTimer = 0.9 + Math.random() * 0.7;
      }
      desiredVel = (b.dashDir || dir).clone().multiplyScalar(BOSS_BOOST_SPEED * 0.75);
      if (b.attackCooldown <= 0 && dist < 30) {
        b.attackCooldown = 0.95 + Math.random() * 0.4;
        fireAt(1.3, Math.round(b.def.damage * 0.7));
      }
      break;
    }
    case 'dual-rusher': {
      if (b.state === 'seek') {
        desiredVel = dir.clone().multiplyScalar(BOSS_BOOST_SPEED);
        if (dist < BOSS_CONTACT_RADIUS + 1.5) {
          b.state = 'passby';
          b.stateTimer = 0.6;
          b.passDir = desiredVel.clone().normalize();
        }
      } else {
        desiredVel = (b.passDir || dir).clone().multiplyScalar(BOSS_BOOST_SPEED);
        if (dist < BOSS_CONTACT_RADIUS && b.attackCooldown <= 0) {
          b.attackCooldown = 1.4;
          damageToPlayer += b.def.damage;
        }
        if (b.stateTimer <= 0) b.state = 'seek';
      }
      break;
    }
    case 'aggressive-melee':
    default: {
      if (dist > BOSS_CONTACT_RADIUS) {
        desiredVel = dir.clone().multiplyScalar(BOSS_SPEED * 1.1);
      } else if (b.attackCooldown <= 0) {
        b.attackCooldown = 1.1 + Math.random() * 0.3;
        damageToPlayer += b.def.damage;
        beams.push({ from: b.position.clone(), to: player.position.clone(), color: b.def.palette.thruster, life: 0.15, maxLife: 0.15, kind: 'slash' });
      } else {
        desiredVel.multiplyScalar(0.2);
      }
      break;
    }
  }

  if (b.blocking) desiredVel.multiplyScalar(0.3);

  b.velocity.lerp(desiredVel, Math.min(1, BOSS_TURN_SMOOTH * dt));
  b.position.addScaledVector(b.velocity, dt);

  if (b.position.length() > ARENA_RADIUS) b.position.setLength(ARENA_RADIUS);
  if (b.position.y < 1) b.position.y = 1;
  if (b.position.y > 30) b.position.y = 30;

  return { damageToPlayer };
}
