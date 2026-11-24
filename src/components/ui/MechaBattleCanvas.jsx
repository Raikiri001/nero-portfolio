import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GUNDAM_ROSTER } from '../../data/gundamVisuals.jsx';
import { COMBAT_STYLES } from '../../data/gundamCombatStyles';

const NUM_MISSILES = 34;
const NUM_LASERS = 10;
const COUNTER_TIME = 650;
const DEFEND_DURATION = 1550;
// Evade mode: how long the pack genuinely chases before the Gundam's speed
// burst breaks the pursuit. Both cutoffs are on the SAME global clock as the
// boost trigger below (not relative to each projectile's own spawn delay) —
// otherwise a late-spawned projectile would still be mid-chase, live-steering
// toward the Gundam's position, for a beat after it has already teleported
// away with the boost, producing a visible snap/glitch toward the new spot.
const CHASE_PHASE_DURATION = 1850;
const MISSILE_CHASE_END = CHASE_PHASE_DURATION;
const LASER_CHASE_END = CHASE_PHASE_DURATION * 0.4;
// Must outlast the slowest possible scatter-miss tail: a missile's peel-off
// leg can run up to ~560ms (see convertToScatterMiss's duration range) and
// its explosion fades over another 480ms after that — worst case ~1040ms
// past the CHASE_PHASE_DURATION boost point. Cutting this shorter clips the
// explosion mid-fade instead of letting it finish after the Gundam is gone.
const EVADE_DURATION = CHASE_PHASE_DURATION + 1150;

function pickEdgeSpawn(vw, vh) {
  // Bottom / left / right only — the top stays clear since the Gundam
  // launches upward through it once the fight is won.
  const edge = Math.floor(Math.random() * 3);
  if (edge === 0) return { x: Math.random() * vw, y: vh + 60 + Math.random() * 120 };
  if (edge === 1) return { x: -60 - Math.random() * 120, y: Math.random() * vh };
  return { x: vw + 60 + Math.random() * 120, y: Math.random() * vh };
}

function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// Frame-rate-independent exponential smoothing: eases `current` toward
// `target` with time constant `tau` (seconds) instead of snapping to it in
// one frame. Used to tame direction estimates that would otherwise jump
// instantly whenever their source (the Gundam's own evade heading, or a
// missile's steering target) changes abruptly — see its use below.
function smoothTowards(current, target, dtSec, tau) {
  const alpha = 1 - Math.exp(-dtSec / tau);
  return current + (target - current) * alpha;
}

function quadBezier(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
  };
}

// Curved, individually-wobbling flight path for one projectile at parameter
// t (0 = spawn, 1 = target — can run past 1 for an overshoot/miss). A random
// bowed control point gives each one its own arc instead of a straight line,
// and a fading sine wobble adds organic in-flight variability. `m.targetX/Y`
// may be updated every frame (evade mode), bending the curve toward wherever
// the Gundam currently is.
function projectilePos(m, t) {
  const p0 = { x: m.x0, y: m.y0 };
  const p2 = { x: m.targetX, y: m.targetY };
  const base = quadBezier(p0, m.ctrl, p2, t);

  const dt = 0.02;
  const ahead = quadBezier(p0, m.ctrl, p2, Math.min(1.5, t + dt));
  const angle = Math.atan2(ahead.y - base.y, ahead.x - base.x);

  const wobbleFade = Math.max(0, 1 - t);
  const wobble = Math.sin(t * m.wobbleFreq * Math.PI * 2 + m.wobblePhase) * m.wobbleAmp * wobbleFade;

  return {
    x: base.x + m.perpX * wobble,
    y: base.y + m.perpY * wobble,
    angle
  };
}

// In defend mode a projectile flies a direct curved path straight at
// `target`. In evade mode it instead genuinely pursues a point just behind
// the Gundam's live position — see the steering loop in the frame handler —
// until the shared MISSILE_CHASE_END/LASER_CHASE_END cutoff, then peels off
// into a scattered near-miss (convertToScatterMiss below). Missiles sustain
// the chase close to the full CHASE_PHASE_DURATION (breaking off together
// once the Gundam's speed burst hits); lasers are
// quicker pot-shots that peel off well before that for variety.
function makeProjectile(kind, vw, vh, target, evading) {
  const spawn = pickEdgeSpawn(vw, vh);
  const base = {
    kind,
    x0: spawn.x,
    y0: spawn.y,
    size: kind === 'laser' ? 1.5 + Math.random() * 1 : 3 + Math.random() * 2.5,
    burstSeed: Math.random() * Math.PI * 2,
    destroyed: false,
    destroyedAt: 0,
    hitX: null,
    hitY: null
  };

  if (evading) {
    return {
      ...base,
      chasing: true,
      curX: spawn.x,
      curY: spawn.y,
      // Fast — clearly faster than the Gundam's own flight — so the pack
      // stays tucked in tight behind it rather than trailing far back.
      chaseSpeed: kind === 'laser' ? 640 + Math.random() * 180 : 480 + Math.random() * 140,
      // Formation offset behind (and slightly beside) the Gundam's travel
      // direction, so the pack reads as tailing it rather than surrounding it.
      trailDist: kind === 'laser' ? 30 + Math.random() * 60 : 45 + Math.random() * 110,
      lateralOffset: (Math.random() - 0.5) * (kind === 'laser' ? 90 : 140),
      wobbleAmp: kind === 'laser' ? 1.5 + Math.random() * 3 : 3 + Math.random() * 6,
      wobbleFreq: 1.4 + Math.random() * 1.8,
      wobblePhase: Math.random() * Math.PI * 2,
      delay: Math.random() * (kind === 'laser' ? 280 : 380),
      // Smoothed steering heading, populated on first chase frame — see
      // smoothTowards' use in the chase loop below.
      headingX: null,
      headingY: null,
      // Bezier flight fields, populated once it peels off — see
      // convertToScatterMiss. Placeholder values until then.
      targetX: spawn.x, targetY: spawn.y, ctrl: { x: spawn.x, y: spawn.y }, perpX: 0, perpY: 1, duration: 300
    };
  }

  const dx = target.x - spawn.x;
  const dy = target.y - spawn.y;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;
  const bendRange = kind === 'laser' ? 70 : 200;
  const bend = (20 + Math.random() * bendRange) * (Math.random() < 0.5 ? -1 : 1);

  return {
    ...base,
    chasing: false,
    targetX: target.x,
    targetY: target.y,
    ctrl: {
      x: (spawn.x + target.x) / 2 + perpX * bend,
      y: (spawn.y + target.y) / 2 + perpY * bend
    },
    perpX,
    perpY,
    wobbleAmp: kind === 'laser' ? 2 + Math.random() * 5 : 6 + Math.random() * 16,
    wobbleFreq: 1.2 + Math.random() * 2,
    wobblePhase: Math.random() * Math.PI * 2,
    delay: Math.random() * (kind === 'laser' ? 480 : 550),
    duration: kind === 'laser' ? 480 + Math.random() * 220 : 750 + Math.random() * 300
  };
}

// Called once a chasing projectile's lock window runs out: it keeps its
// current position but gets a fresh short curved leg toward a nearby miss
// point, so it reads as "lost the lock, peeling off" rather than resetting.
function convertToScatterMiss(m, elapsed, x, y) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 90 + Math.random() * 190;
  const missX = x + Math.cos(angle) * dist;
  const missY = y + Math.sin(angle) * dist;
  const dx = missX - x;
  const dy = missY - y;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;
  const bend = (10 + Math.random() * 50) * (Math.random() < 0.5 ? -1 : 1);

  m.x0 = x;
  m.y0 = y;
  m.targetX = missX;
  m.targetY = missY;
  m.ctrl = { x: (x + missX) / 2 + perpX * bend, y: (y + missY) / 2 + perpY * bend };
  m.perpX = perpX;
  m.perpY = perpY;
  m.wobbleAmp = m.kind === 'laser' ? 1 + Math.random() * 3 : 3 + Math.random() * 7;
  m.wobbleFreq = 1.5 + Math.random() * 2;
  m.wobblePhase = Math.random() * Math.PI * 2;
  m.delay = elapsed;
  m.duration = m.kind === 'laser' ? 200 + Math.random() * 160 : 300 + Math.random() * 260;
  m.chasing = false;
}

// Full-screen, canvas-based cinematic: a missile + laser barrage converges
// on `target`. In 'defend' mode (the default) the Gundam's canon-appropriate
// combat archetype (see gundamCombatStyles.js) shoots/slices/blocks every
// projectile down right as it arrives, tied together with a shared impact
// beat (flash/shake/counter-VFX/label) so it reads as one deliberate action
// rather than the barrage just separately fizzling out. In 'evade' mode the
// Gundam instead runs — every projectile genuinely pursues its live position
// (`getLiveTarget`, polled every frame) for its own short lock window, then
// loses the lock and peels off into a scattered near-miss that explodes on
// arrival, so it reads as: chased for a few seconds, they lose the lock and
// scatter, and it bolts. Calls onComplete once resolved so the caller can
// continue (launch flight, navigation, etc).
export function MechaBattleCanvas({ target, gundamId, mode = 'defend', getLiveTarget, onCounter, onBoost, onComplete }) {
  const canvasRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const onCounterRef = useRef(onCounter);
  const onBoostRef = useRef(onBoost);
  const getLiveTargetRef = useRef(getLiveTarget);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onCounterRef.current = onCounter;
    onBoostRef.current = onBoost;
    getLiveTargetRef.current = getLiveTarget;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;
    ctx.scale(dpr, dpr);

    const evading = mode === 'evade';
    const totalDuration = evading ? EVADE_DURATION : DEFEND_DURATION;

    const gundam = GUNDAM_ROSTER[gundamId % GUNDAM_ROSTER.length];
    const style = COMBAT_STYLES[gundamId % COMBAT_STYLES.length];
    const color = gundam.thruster || '#00e5ff';

    const missiles = Array.from({ length: NUM_MISSILES }, () => makeProjectile('missile', vw, vh, target, evading));
    const lasers = Array.from({ length: NUM_LASERS }, () => makeProjectile('laser', vw, vh, target, evading));
    const projectiles = [...missiles, ...lasers];

    let dodgeGhostAngle = null;
    let counterFired = false;
    let boostFired = false;
    let rafId;
    const startTime = performance.now();
    let lastTime = startTime;
    let prevLiveX = null;
    let prevLiveY = null;
    let smoothVelX = 0;
    let smoothVelY = 0;

    const drawGlowLine = (x1, y1, x2, y2, w, glowColor, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = w;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    };

    const drawBurst = (x, y, progress, burstColor) => {
      const r = 4 + progress * 18;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.strokeStyle = burstColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = burstColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    // A proper explosion for a destroyed missile/laser: bright flash core,
    // radiating shrapnel streaks (fixed angles per projectile via `seed` so
    // they don't jitter frame to frame), and an outer shockwave ring.
    const drawExplosion = (x, y, progress, burstColor, seed) => {
      const p = Math.max(0, Math.min(progress, 1));
      ctx.save();

      const coreR = Math.max(0.1, 2 + p * 9);
      const coreAlpha = Math.max(0, 1 - p * 1.3);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, coreR);
      grad.addColorStop(0, `rgba(255,255,255,${coreAlpha})`);
      grad.addColorStop(0.5, burstColor);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = coreAlpha;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, coreR, 0, Math.PI * 2);
      ctx.fill();

      const numParticles = 6;
      ctx.strokeStyle = burstColor;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = burstColor;
      ctx.shadowBlur = 6;
      for (let i = 0; i < numParticles; i++) {
        const angle = seed + (i / numParticles) * Math.PI * 2;
        const dist = 4 + p * (16 + (i % 3) * 8);
        const innerDist = dist * 0.35;
        ctx.globalAlpha = Math.max(0, 1 - p) * 0.9;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * innerDist, y + Math.sin(angle) * innerDist);
        ctx.lineTo(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
        ctx.stroke();
      }

      ctx.globalAlpha = Math.max(0, 1 - p) * 0.5;
      ctx.strokeStyle = burstColor;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(x, y, 3 + p * 24, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    const drawMissile = (x, y, angle, size, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(angle);
      const grad = ctx.createLinearGradient(-size * 6, 0, 0, 0);
      grad.addColorStop(0, 'rgba(255,150,60,0)');
      grad.addColorStop(1, 'rgba(255,180,80,0.9)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = size * 0.8;
      ctx.beginPath();
      ctx.moveTo(-size * 6, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.fillStyle = '#fff3e0';
      ctx.beginPath();
      ctx.moveTo(size * 1.6, 0);
      ctx.lineTo(-size * 0.6, size * 0.9);
      ctx.lineTo(-size * 0.6, -size * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawLaser = (x, y, angle, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(angle);
      const len = 28;
      const grad = ctx.createLinearGradient(-len, 0, 4, 0);
      grad.addColorStop(0, 'rgba(140,235,255,0)');
      grad.addColorStop(0.6, 'rgba(160,240,255,0.9)');
      grad.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.lineTo(4, 0);
      ctx.stroke();
      ctx.restore();
    };

    const drawArchetype = (elapsed, activeHits) => {
      const t = elapsed - COUNTER_TIME;
      if (t < -80 || t > 650) return;
      const p = Math.max(0, Math.min(t / 500, 1));

      if (style.archetype === 'full-burst') {
        ctx.save();
        ctx.globalAlpha = 1 - p * 0.7;
        activeHits.forEach((m) => {
          if (m.hitX == null) return;
          drawGlowLine(target.x, target.y, m.hitX, m.hitY, 1.5, color, 0.85 * (1 - p));
        });
        ctx.restore();
      } else if (style.archetype === 'buster-rifle') {
        const spread = Math.PI * 0.22;
        const baseAngles = [Math.PI * 0.72, Math.PI * 0.28];
        baseAngles.forEach((a) => {
          const len = 900;
          drawGlowLine(
            target.x - Math.cos(a) * len * 0.15,
            target.y - Math.sin(a) * len * 0.15,
            target.x + Math.cos(a + spread * (p - 0.5)) * len,
            target.y + Math.sin(a + spread * (p - 0.5)) * len,
            6 * (1 - p * 0.6),
            color,
            0.9 * (1 - p * 0.8)
          );
        });
      } else if (style.archetype === 'melee-deflect') {
        const sweep = p * Math.PI * 2.2;
        ctx.save();
        ctx.globalAlpha = 0.9 * (1 - p);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(target.x, target.y, 70, sweep - 1.4, sweep);
        ctx.stroke();
        ctx.restore();
      } else if (style.archetype === 'shield-block') {
        let ax = 0, ay = 0;
        missiles.forEach((m) => { ax += m.x0 - target.x; ay += m.y0 - target.y; });
        const ang = Math.atan2(ay, ax);
        ctx.save();
        ctx.globalAlpha = 0.55 * (1 - p);
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(target.x, target.y, 46 + p * 10, ang - 0.9, ang + 0.9);
        ctx.stroke();
        ctx.restore();
        activeHits.forEach((m) => {
          if (m.hitX == null) return;
          drawBurst(m.hitX, m.hitY, p, '#fff');
        });
      } else if (style.archetype === 'funnel-intercept') {
        activeHits.forEach((m, i) => {
          if (m.hitX == null) return;
          const fp = Math.min(1, p * 1.6);
          const fx = lerp(target.x, m.hitX, fp);
          const fy = lerp(target.y, m.hitY, fp);
          ctx.save();
          ctx.globalAlpha = 0.9 * (1 - p * 0.5);
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(fx, fy, 2.5 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          if (fp >= 1) drawBurst(m.hitX, m.hitY, p, color);
        });
      } else if (style.archetype === 'gn-burst') {
        const r = p * 340;
        ctx.save();
        ctx.globalAlpha = 0.8 * (1 - p);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(target.x, target.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (style.archetype === 'newtype-dodge') {
        if (dodgeGhostAngle == null) dodgeGhostAngle = Math.random() * Math.PI * 2;
        for (let i = 0; i < 3; i++) {
          const offset = (i + 1) * 14;
          ctx.save();
          ctx.globalAlpha = 0.35 * (1 - p) * (1 - i * 0.25);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(
            target.x + Math.cos(dodgeGhostAngle) * offset,
            target.y + Math.sin(dodgeGhostAngle) * offset,
            18,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          ctx.restore();
        }
      }
    };

    // Impact flash + faint screen shake right at counter time — the beat
    // that ties the whole barrage's resolution to one decisive moment.
    const drawImpactFlash = (elapsed) => {
      const t = elapsed - COUNTER_TIME;
      if (t < -40 || t > 180) return { shakeX: 0, shakeY: 0 };
      const p = Math.max(0, Math.min((t + 40) / 220, 1));
      const alpha = (1 - p) * 0.18;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, vw, vh);
      ctx.restore();
      const shakeAmt = (1 - p) * 5;
      return {
        shakeX: (Math.random() - 0.5) * shakeAmt,
        shakeY: (Math.random() - 0.5) * shakeAmt
      };
    };

    const drawLabel = (elapsed) => {
      const t = elapsed - COUNTER_TIME;
      if (t < -60 || t > 600) return;
      const fadeIn = Math.min(1, Math.max(0, (t + 60) / 150));
      const fadeOut = Math.min(1, Math.max(0, (600 - t) / 200));
      const alpha = Math.min(fadeIn, fadeOut);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillText(style.label, target.x, target.y - 70);
      ctx.restore();
    };

    const drawEvadeLabel = (elapsed, liveTarget) => {
      const fadeIn = Math.min(1, elapsed / 200);
      const fadeOut = Math.min(1, Math.max(0, (totalDuration - elapsed) / 300));
      const alpha = Math.min(fadeIn, fadeOut) * 0.9;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff3355';
      ctx.shadowColor = '#ff3355';
      ctx.shadowBlur = 8;
      ctx.fillText('EVADING', liveTarget.x, liveTarget.y - 70);
      ctx.restore();
    };

    const frame = (now) => {
      const elapsed = now - startTime;
      const dtSec = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      ctx.clearRect(0, 0, vw, vh);

      const liveTarget = evading ? (getLiveTargetRef.current?.() ?? target) : target;

      const { shakeX, shakeY } = evading ? { shakeX: 0, shakeY: 0 } : drawImpactFlash(elapsed);
      ctx.save();
      ctx.translate(shakeX, shakeY);

      if (!evading && !counterFired && elapsed >= COUNTER_TIME) {
        counterFired = true;
        onCounterRef.current?.();
      }

      if (evading && !boostFired && elapsed >= CHASE_PHASE_DURATION) {
        boostFired = true;
        onBoostRef.current?.();
      }

      // Where the pack aims while chasing: a point trailing behind the
      // Gundam's current travel direction (estimated from consecutive live
      // positions), not the Gundam itself — a tailing formation, not a
      // ring converging on it from every side.
      let behindX = 0;
      let behindY = 1;
      let lateralX = 1;
      let lateralY = 0;
      if (evading) {
        if (prevLiveX == null) { prevLiveX = liveTarget.x; prevLiveY = liveTarget.y; }
        const rawVelX = (liveTarget.x - prevLiveX) / Math.max(dtSec, 0.001);
        const rawVelY = (liveTarget.y - prevLiveY) / Math.max(dtSec, 0.001);
        prevLiveX = liveTarget.x;
        prevLiveY = liveTarget.y;
        // Low-pass filter the Gundam's estimated travel direction. Its own
        // evade dash (see Home.jsx) snaps to a brand-new heading every
        // ~1.2-1.7s; feeding that raw frame-to-frame velocity straight into
        // the pack's aim point made every missile's steering direction (and
        // therefore its wobble axis + sprite rotation) snap with it, which
        // read as the whole pack flinching/wiggling instead of chasing
        // smoothly. Easing toward the new heading over ~0.12s fixes that
        // without meaningfully lagging the pursuit.
        smoothVelX = smoothTowards(smoothVelX, rawVelX, dtSec, 0.12);
        smoothVelY = smoothTowards(smoothVelY, rawVelY, dtSec, 0.12);
        const speed = Math.hypot(smoothVelX, smoothVelY);
        if (speed > 5) {
          behindX = -smoothVelX / speed;
          behindY = -smoothVelY / speed;
          lateralX = -behindY;
          lateralY = behindX;
        }
      }

      const activeForArchetype = [];
      projectiles.forEach((m) => {
        // Evade mode, still locked on: steer toward a point trailing just
        // behind the Gundam (a real pursuit, not a fixed curve) until its
        // lock window runs out, then peel off into a scattered miss below.
        if (m.chasing) {
          if (elapsed < m.delay) return;
          // Global-clock cutoff (not relative to this projectile's own
          // spawn delay) — every still-chasing projectile loses the lock in
          // the same frame the boost fires, so none of them keep live-
          // steering toward a Gundam that has already teleported away.
          const chaseEnd = m.kind === 'laser' ? LASER_CHASE_END : MISSILE_CHASE_END;
          if (elapsed >= chaseEnd) {
            convertToScatterMiss(m, elapsed, m.curX, m.curY);
            // falls through to the normal flight branch below, starting
            // its new short leg from this exact frame (t = 0)
          } else {
            const aimX = liveTarget.x + behindX * m.trailDist + lateralX * m.lateralOffset;
            const aimY = liveTarget.y + behindY * m.trailDist + lateralY * m.lateralOffset;
            const dxp = aimX - m.curX;
            const dyp = aimY - m.curY;
            const dist = Math.hypot(dxp, dyp) || 0.001;
            const dirX = dxp / dist;
            const dirY = dyp / dist;
            const step = Math.min(dist, m.chaseSpeed * dtSec);
            m.curX += dirX * step;
            m.curY += dirY * step;
            // The sprite's drawn heading is smoothed separately from the
            // raw steering direction above: `dirX/dirY` can flip hard from
            // one frame to the next (aim point jumps, missile briefly
            // overtaking its target, etc.), and using that same jittery
            // vector as the wobble's perpendicular axis made the wobble
            // itself look erratic rather than a clean sine wave. Easing the
            // drawn heading toward it instead keeps the pack's actual
            // pursuit responsive while the visible flight looks steady.
            if (m.headingX == null) { m.headingX = dirX; m.headingY = dirY; }
            m.headingX = smoothTowards(m.headingX, dirX, dtSec, 0.09);
            m.headingY = smoothTowards(m.headingY, dirY, dtSec, 0.09);
            const hLen = Math.hypot(m.headingX, m.headingY) || 1;
            const hx = m.headingX / hLen;
            const hy = m.headingY / hLen;
            const wob = Math.sin(elapsed * 0.006 * m.wobbleFreq + m.wobblePhase) * m.wobbleAmp;
            const px = -hy;
            const py = hx;
            const drawX = m.curX + px * wob;
            const drawY = m.curY + py * wob;
            const angle = Math.atan2(hy, hx);
            if (m.kind === 'laser') drawLaser(drawX, drawY, angle, 1);
            else drawMissile(drawX, drawY, angle, m.size, 1);
            return;
          }
        }

        const t = elapsed - m.delay;
        if (t < 0) return;

        // True canon Newtype precognition dodge (defend mode only) — the
        // projectile visibly continues past/through where the Gundam no
        // longer is. Evade mode instead always explodes on arrival (below),
        // just at a scattered near-miss point rather than a precise hit.
        const passThrough = !evading && style.archetype === 'newtype-dodge';

        if (passThrough) {
          const p = t / m.duration;
          if (p > 1.6) return;
          const easedT = p < 1 ? easeOutCubic(Math.min(p, 1)) : p;
          const { x, y, angle } = projectilePos(m, easedT);
          const overshoot = Math.max(0, p - 1);
          const alpha = Math.max(0, 1 - overshoot);
          if (m.kind === 'laser') drawLaser(x, y, angle, alpha);
          else drawMissile(x, y, angle, m.size, alpha);
          if (p > 1.3 && dodgeGhostAngle == null) {
            m.hitX = x; m.hitY = y;
          }
          return;
        }

        if (m.destroyed) {
          const bp = (elapsed - m.destroyedAt) / 480;
          if (bp < 1) drawExplosion(m.hitX, m.hitY, bp, m.kind === 'laser' ? '#9fefff' : '#ffcc66', m.burstSeed);
          return;
        }

        const p = Math.min(t / m.duration, 1);
        const ease = easeOutCubic(p);
        const { x, y, angle } = projectilePos(m, ease);

        // Defend mode destroys everything still incoming right at the
        // synced counter beat; evade mode just lets each one finish its own
        // flight and explode near its scattered aim point. Either way,
        // nothing is allowed to just reach p=1 and silently vanish.
        const shouldDestroy = evading ? p >= 0.97 : (p >= 0.97 || elapsed >= COUNTER_TIME);

        if (shouldDestroy) {
          m.destroyed = true;
          m.destroyedAt = elapsed;
          m.hitX = x;
          m.hitY = y;
          return;
        }

        if (m.kind === 'laser') drawLaser(x, y, angle, 1);
        else drawMissile(x, y, angle, m.size, 1);
        activeForArchetype.push({ hitX: x, hitY: y });
      });

      if (evading) {
        drawEvadeLabel(elapsed, liveTarget);
      } else {
        drawArchetype(elapsed, projectiles.filter(m => m.hitX != null));
        drawLabel(elapsed);
      }

      ctx.restore();

      if (elapsed < totalDuration) {
        rafId = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, vw, vh);
        onCompleteRef.current?.();
      }
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [target, gundamId, mode]);

  return createPortal(
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-fx)', pointerEvents: 'none', width: '100vw', height: '100vh' }}
    />,
    document.body
  );
}
