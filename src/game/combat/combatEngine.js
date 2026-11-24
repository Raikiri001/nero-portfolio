import * as THREE from 'three';

// ============================================================
// COMBAT ENGINE — the game logic, and nothing else.
//
// Pure functions over plain state objects: no React, no scene graph, no
// DOM (ESLint enforces it). CombatScene.jsx calls updatePlayer() and
// updateBossAI() once per frame and copies the results onto the models.
// three.js is used here only for its vector maths.
//
// Allocation rule: this runs every frame, so per-frame temporaries are the
// module-level scratch vectors below. `new Vector3`/`.clone()` only for a
// value that outlives the frame — a beam's endpoints, which the HUD reads.
// ============================================================

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

// A boss's cruise speed comes from its `speed` in bossRoster.js; this is
// the fallback, and boosting moves are this multiple of cruise.
const BOSS_SPEED = 9;
const BOSS_BOOST_FACTOR = 17 / 9;
const BOSS_TURN_SMOOTH = 2.2;
const BOSS_CONTACT_RADIUS = 3.6;

// Height of a suit's torso above its feet, in arena units. Positions are the
// FEET (that is where the model's origin is); shots leave from, and aim at,
// the torso. CombatScene passes the player's real value, measured off its
// unit's frame stations; a boss (never a built unit) uses this.
export const DEFAULT_TORSO_Y = 1.6;

// Trans-Am's speed multiplier while active
const TRANS_AM_SPEED = 1.5;

/** Where the player enters the arena, and which way it faces (-Z). */
export const PLAYER_SPAWN = Object.freeze([0, 2, 16]);

// `speed`: the player enters already moving forward at this many arena
// units/s — the deploy sequence fires it off a catapult straight into the
// fight, and the game must pick up that momentum, not restart from rest.
export function createPlayerState(combat, { torsoY = DEFAULT_TORSO_Y, speed = 0 } = {}) {
  const c = combat ?? {};
  return {
    position: new THREE.Vector3(...PLAYER_SPAWN),
    torsoY,
    velocity: new THREE.Vector3(0, 0, -Math.min(speed, MAX_SPEED)),
    // forwardFromYawPitch(0, 0) points down -Z — yaw 0 is "facing the boss"
    // given the boss spawns at z = -16 (see createBossState below).
    yaw: 0,
    pitch: 0,
    maxHp: c.hp ?? PLAYER_MAX_HP,
    hp: c.hp ?? PLAYER_MAX_HP,
    boostFuel: BOOST_FUEL_MAX,
    fireCooldown: 0,
    meleeCooldown: 0,
    lockProgress: 0,
    // Special ability state — one handler per spec.combat.special.id.
    specialCooldown: 0,
    specialActive: 0,
    specialTimer: 0,
    // which one-shot effects of the current activation have fired, by key
    specialFired: {},
  };
}

export function createBossState(bossDef) {
  return {
    def: bossDef,
    position: new THREE.Vector3(0, 2, -16),
    torsoY: DEFAULT_TORSO_Y,
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
const _dir = new THREE.Vector3();
const _shot = new THREE.Vector3();
const _closest = new THREE.Vector3();
const _outward = new THREE.Vector3();
const _side = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _playerTorso = new THREE.Vector3();
const _bossTorso = new THREE.Vector3();

const torsoOf = (unit, out) => out.copy(unit.position).setY(unit.position.y + unit.torsoY);

function forwardFromYawPitch(yaw, pitch, out) {
  return out.set(
    -Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  );
}

// Advances the player's flight/weapons state by one frame. Returns damage
// dealt this frame plus the forward vector and lock state for the camera
// and HUD. `forward` is a scratch vector: read it this frame, don't keep it.
export function updatePlayer(p, controls, dt, beams, boss, combat = {}) {
  // Per-unit stats. A missing field falls back to the baseline so an
  // unspecced unit still flies.
  const prim = combat.primary ?? {};
  const mel = combat.melee ?? {};
  const sp = combat.special;
  const transAm = sp?.id === 'trans-am' && p.specialActive > 0;
  const spd = (combat.speed ?? 1) * (transAm ? TRANS_AM_SPEED : 1);
  const bst = combat.boost ?? 1;

  p.yaw -= controls.mouseX * YAW_RATE * dt;
  p.pitch = THREE.MathUtils.clamp(p.pitch - controls.mouseY * PITCH_RATE * dt, -PITCH_LIMIT, PITCH_LIMIT);

  forwardFromYawPitch(p.yaw, p.pitch, _forward);
  _right.crossVectors(_forward, _up).normalize();

  _accel.set(0, 0, 0);
  const boosting = controls.boost && p.boostFuel > 1;
  const accelMag = PLAYER_ACCEL * spd * (boosting ? BOOST_MULT * bst : 1);
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
    _outward.copy(p.position).normalize();
    const outSpeed = p.velocity.dot(_outward);
    if (outSpeed > 0) p.velocity.addScaledVector(_outward, -outSpeed);
  }
  if (p.position.y < 1) {
    p.position.y = 1;
    if (p.velocity.y < 0) p.velocity.y = 0;
  }

  p.fireCooldown = Math.max(0, p.fireCooldown - dt);
  p.meleeCooldown = Math.max(0, p.meleeCooldown - dt);

  torsoOf(p, _playerTorso);
  torsoOf(boss, _bossTorso);
  _toBoss.subVectors(_bossTorso, _playerTorso);
  const rangeToBoss = _toBoss.length();
  _dir.copy(_toBoss).normalize();
  const facing = _forward.dot(_dir);
  const inCone = facing > LOCK_CONE_COS && rangeToBoss < LOCK_MAX_RANGE;
  p.lockProgress = THREE.MathUtils.clamp(p.lockProgress + (inCone ? LOCK_GAIN : -LOCK_DECAY) * dt, 0, 1);
  const locked = p.lockProgress >= 1;

  let damageToBoss = 0;

  const fireRate = prim.rate ?? FIRE_COOLDOWN;
  const fireRange = prim.range ?? FIRE_RANGE;
  const fireDmg = prim.damage ?? FIRE_DAMAGE;
  const shots = prim.shots ?? 1;
  const spread = prim.spread ?? 0;

  if (controls.fire && p.fireCooldown <= 0) {
    p.fireCooldown = fireRate;
    // Multi-barrel units fire a small spread volley per trigger pull.
    for (let i = 0; i < shots; i++) {
      const off = shots > 1 ? (i - (shots - 1) / 2) * spread : 0;
      _shot.copy(_forward);
      if (off) _shot.addScaledVector(_right, off).normalize();
      let hit = false;
      if (facing > 0.4 && rangeToBoss < fireRange) {
        const t = THREE.MathUtils.clamp(_toBoss.dot(_shot), 0, fireRange);
        _closest.copy(_playerTorso).addScaledVector(_shot, t);
        if (_closest.distanceTo(_bossTorso) < FIRE_HIT_RADIUS) hit = true;
      }
      const muzzle = _playerTorso.clone().addScaledVector(_shot, 1.1);
      const endPoint = hit ? _bossTorso.clone() : muzzle.clone().addScaledVector(_shot, fireRange);
      beams.push({ from: muzzle, to: endPoint, color: '#7fe8ff', life: 0.16, maxLife: 0.16 });
      if (hit) {
        const base = locked ? fireDmg * (FIRE_DAMAGE_LOCKED / FIRE_DAMAGE) : fireDmg;
        damageToBoss += base * (boss.blocking ? MELEE_BLOCK_FACTOR : 1);
      }
    }
  }

  const meleeRange = mel.range ?? MELEE_RANGE;
  const meleeDmg = mel.damage ?? MELEE_DAMAGE;

  if (controls.melee && p.meleeCooldown <= 0) {
    p.meleeCooldown = mel.cooldown ?? MELEE_COOLDOWN;
    if (rangeToBoss < meleeRange) {
      damageToBoss += meleeDmg * (boss.blocking ? MELEE_BLOCK_FACTOR : 1);
    }
    beams.push({
      from: _playerTorso.clone().addScaledVector(_forward, 0.6),
      to: _playerTorso.clone().addScaledVector(_forward, meleeRange),
      color: '#ff3355', life: 0.18, maxLife: 0.18, kind: 'slash',
    });
  }

  // ---- special ability -----------------------------------------
  p.specialCooldown = Math.max(0, p.specialCooldown - dt);
  if (sp) {
    if (controls.special && p.specialCooldown <= 0 && p.specialActive <= 0) {
      p.specialCooldown = sp.cooldown;
      p.specialActive = sp.duration;
      p.specialTimer = 0;
      p.specialFired = {};
    }
    if (p.specialActive > 0) {
      p.specialActive -= dt;
      p.specialTimer += dt;
      // A shield holds against specials exactly as against normal fire.
      const special = runSpecial(sp, p, boss, beams, dt, _forward, rangeToBoss, facing);
      damageToBoss += special * (boss.blocking ? MELEE_BLOCK_FACTOR : 1);
    }
  }

  return {
    damageToBoss,
    forward: _forward,
    locked,
    lockProgress: p.lockProgress,
    specialActive: p.specialActive > 0,
    specialCharge: sp ? 1 - p.specialCooldown / sp.cooldown : 1,
  };
}

/**
 * One handler per `combat.special.id` (unitSpecs.js). Each emits into the
 * shared `beams` array, so the HUD draws it for free, and returns the damage
 * dealt this frame. Sustained abilities tick damage; burst abilities use
 * `once(key, …)`, which fires each KEY once per activation — the visual and
 * the damage of a single swing are separate keys, so drawing the slash can
 * never swallow the hit.
 *
 * Adding a special: add a case here, and give a unit that id in unitSpecs.
 * An unknown id falls through to `default` (one hit, in range).
 */
function runSpecial(sp, p, boss, beams, dt, forward, range, facing) {
  // _dir already points from the player's torso to the boss's, this frame.
  const dir = _dir;
  let dmg = 0;

  const beamTo = (from, color, life = 0.18, kind) => {
    beams.push({ from, to: _bossTorso.clone(), color, life, maxLife: life, kind });
  };
  const once = (key, fn) => {
    if (p.specialFired[key]) return;
    p.specialFired[key] = true;
    fn();
  };

  switch (sp.id) {
    // Sustained swarms: pods/bits orbit and tick damage over the duration.
    case 'dragoons':
    case 'sword-bits': {
      const n = sp.id === 'dragoons' ? 8 : 6;
      const t = p.specialTimer;
      for (let i = 0; i < n; i++) {
        if (Math.random() >= 0.28) continue; // only allocate for pods that fire
        const a = t * 2.2 + (i / n) * Math.PI * 2;
        const pod = _playerTorso.clone().add(_side.set(
          Math.cos(a) * 5.5, Math.sin(a * 1.7) * 2.2, Math.sin(a) * 5.5
        ));
        beamTo(pod, sp.id === 'dragoons' ? '#8fe9ff' : '#7fffd0', 0.14);
      }
      if (range < LOCK_MAX_RANGE) dmg += sp.damage * dt;
      break;
    }

    // Multi-origin simultaneous volleys — aimed fire, so facing matters.
    case 'full-burst':
    case 'agni-burst':
    case 'armor-barrage':
    case 'silhouette-burst':
    case 'last-shooting': {
      once('volley', () => {
        const origins = [[0, 0.6, 0], [1.2, 0.4, 0], [-1.2, 0.4, 0], [0.8, -0.5, 0], [-0.8, -0.5, 0]];
        origins.forEach((o) => beamTo(_playerTorso.clone().add(_side.set(...o)), '#bfefff', 0.35));
        if (range < LOCK_MAX_RANGE && facing > 0.4) dmg += sp.damage;
      });
      break;
    }

    // Single heavy charged beam.
    case 'disruptor':
    case 'twin-buster': {
      // Charge for the first half, then release.
      if (p.specialTimer > sp.duration * 0.5) {
        once('beam', () => {
          const from = _playerTorso.clone().addScaledVector(forward, 1.2);
          beams.push({
            from, to: from.clone().addScaledVector(forward, 90),
            color: '#e8f6ff', life: 0.5, maxLife: 0.5, kind: 'heavy',
          });
          const cos = forward.dot(dir);
          if (cos > 0.9 && range < 90) dmg += sp.damage;
        });
      }
      break;
    }

    // Close-range burst attacks; dash the player toward the target.
    case 'arondight':
    case 'mace-crush':
    case 'iaido':
    case 'blade-dance':
    case 'seven-swords': {
      if (range > 4) p.position.addScaledVector(dir, Math.min(range - 3, 42 * dt));
      once('slash', () => {
        beams.push({
          from: _playerTorso.clone().addScaledVector(forward, 0.6),
          to: _bossTorso.clone(),
          color: '#ff5577', life: 0.3, maxLife: 0.3, kind: 'slash',
        });
      });
      // Multi-hit moves tick; single heavy swings land once, on arrival.
      if (sp.id === 'blade-dance' || sp.id === 'seven-swords') {
        if (range < 8) dmg += sp.damage * dt;
      } else if (range < 9) {
        once('hit', () => { dmg += sp.damage; });
      }
      break;
    }

    // Strafing runs — a detached lifter/MA pass across the target.
    case 'fatum-strafe':
    case 'fatum-charge':
    case 'ma-strafe':
    case 'aile-assault':
    case 'mirage-ambush':
    case 'psycho-burst':
    case 'ntd-activate': {
      const t = p.specialTimer / Math.max(sp.duration, 0.001);
      if (Math.random() < 0.5) {
        _side.crossVectors(dir, _up).normalize();
        const from = _bossTorso.clone().addScaledVector(_side, (t - 0.5) * 16);
        from.y += 2.5;
        beamTo(from, '#a8f0ff', 0.16);
      }
      if (range < LOCK_MAX_RANGE) dmg += sp.damage * dt;
      break;
    }

    // Trans-Am: a buff rather than an attack — while active the unit flies
    // at TRANS_AM_SPEED (see updatePlayer) and its boost refills.
    case 'trans-am': {
      p.boostFuel = Math.min(BOOST_FUEL_MAX, p.boostFuel + 60 * dt);
      break;
    }

    default:
      once('hit', () => { if (range < LOCK_MAX_RANGE) dmg += sp.damage; });
  }

  return dmg;
}

// Advances one boss's AI/movement by one frame. `archetype` drives distinct
// movement + attack patterns (see bossRoster.js for the roster).
export function updateBossAI(b, player, dt, beams) {
  _toPlayer.subVectors(player.position, b.position);
  const dist = _toPlayer.length();
  const dir = _toPlayer.normalize(); // scratch, this frame only
  const speed = b.def.speed ?? BOSS_SPEED;
  const boostSpeed = speed * BOSS_BOOST_FACTOR;
  const beamColor = b.def.colors?.thruster ?? '#ff2222';

  b.stateTimer -= dt;
  b.attackCooldown = Math.max(0, b.attackCooldown - dt);

  const desiredVel = _desired.set(0, 0, 0);
  let damageToPlayer = 0;

  const fireAt = (spreadFactor, damage) => {
    const missChance = THREE.MathUtils.clamp((dist - 14) / 60, 0, 0.5) * spreadFactor;
    const hit = Math.random() > missChance;
    const aim = torsoOf(player, new THREE.Vector3());
    if (!hit) aim.add(_side.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6));
    beams.push({ from: torsoOf(b, new THREE.Vector3()), to: aim, color: beamColor, life: 0.2, maxLife: 0.2 });
    if (hit) damageToPlayer += damage;
  };

  switch (b.def.archetype) {
    case 'kiting-sniper': {
      const preferred = 18;
      if (dist < preferred - 4) desiredVel.copy(dir).multiplyScalar(-speed);
      else if (dist > preferred + 6) desiredVel.copy(dir).multiplyScalar(speed);
      else {
        desiredVel.crossVectors(dir, _up).normalize().multiplyScalar(speed * b.strafeDir);
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
      if (dist > 20) desiredVel.copy(dir).multiplyScalar(speed * 0.6);
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
      desiredVel.copy(b.dashDir || dir).multiplyScalar(boostSpeed * 0.75);
      if (b.attackCooldown <= 0 && dist < 30) {
        b.attackCooldown = 0.95 + Math.random() * 0.4;
        fireAt(1.3, Math.round(b.def.damage * 0.7));
      }
      break;
    }
    case 'dual-rusher': {
      if (b.state === 'seek') {
        desiredVel.copy(dir).multiplyScalar(boostSpeed);
        if (dist < BOSS_CONTACT_RADIUS + 1.5) {
          b.state = 'passby';
          b.stateTimer = 0.6;
          b.passDir = desiredVel.clone().normalize();
        }
      } else {
        desiredVel.copy(b.passDir || dir).multiplyScalar(boostSpeed);
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
        desiredVel.copy(dir).multiplyScalar(speed * 1.1);
      } else if (b.attackCooldown <= 0) {
        b.attackCooldown = 1.1 + Math.random() * 0.3;
        damageToPlayer += b.def.damage;
        beams.push({ from: torsoOf(b, new THREE.Vector3()), to: torsoOf(player, new THREE.Vector3()), color: beamColor, life: 0.15, maxLife: 0.15, kind: 'slash' });
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
