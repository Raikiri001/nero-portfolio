import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GUNDAM_ROSTER } from '../../data/gundamVisuals.jsx';
import { COMBAT_STYLES } from '../../data/gundamCombatStyles';

const NUM_MISSILES = 34;
const NUM_LASERS = 10;
const COUNTER_TIME = 650;
const DEFEND_DURATION = 1550;
const EVADE_DURATION = 1900;

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

function makeProjectile(kind, vw, vh, target) {
  const spawn = pickEdgeSpawn(vw, vh);
  const dx = target.x - spawn.x;
  const dy = target.y - spawn.y;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;
  const bendRange = kind === 'laser' ? 70 : 200;
  const bend = (20 + Math.random() * bendRange) * (Math.random() < 0.5 ? -1 : 1);

  return {
    kind,
    x0: spawn.x,
    y0: spawn.y,
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
    duration: kind === 'laser' ? 480 + Math.random() * 220 : 750 + Math.random() * 300,
    size: kind === 'laser' ? 1.5 + Math.random() * 1 : 3 + Math.random() * 2.5,
    burstSeed: Math.random() * Math.PI * 2,
    destroyed: false,
    destroyedAt: 0,
    hitX: null,
    hitY: null
  };
}

// Full-screen, canvas-based cinematic: a missile + laser barrage converges
// on `target`. In 'defend' mode (the default) the Gundam's canon-appropriate
// combat archetype (see gundamCombatStyles.js) shoots/slices/blocks every
// projectile down right as it arrives, tied together with a shared impact
// beat (flash/shake/counter-VFX/label) so it reads as one deliberate action
// rather than the barrage just separately fizzling out. In 'evade' mode the
// Gundam instead runs — `getLiveTarget` is polled every frame so the whole
// barrage keeps bending toward wherever it currently is, and every
// projectile just overshoots past a moving target instead of being blocked.
// Calls onComplete once resolved so the caller can continue (launch flight,
// navigation, etc).
export function MechaBattleCanvas({ target, gundamId, mode = 'defend', getLiveTarget, onCounter, onComplete }) {
  const canvasRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const onCounterRef = useRef(onCounter);
  const getLiveTargetRef = useRef(getLiveTarget);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onCounterRef.current = onCounter;
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

    const missiles = Array.from({ length: NUM_MISSILES }, () => makeProjectile('missile', vw, vh, target));
    const lasers = Array.from({ length: NUM_LASERS }, () => makeProjectile('laser', vw, vh, target));
    const projectiles = [...missiles, ...lasers];

    let dodgeGhostAngle = null;
    let counterFired = false;
    let rafId;
    const startTime = performance.now();

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
      ctx.shadowColor = '#9fefff';
      ctx.shadowBlur = 10;
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
      ctx.clearRect(0, 0, vw, vh);

      const liveTarget = evading ? (getLiveTargetRef.current?.() ?? target) : target;

      const { shakeX, shakeY } = evading ? { shakeX: 0, shakeY: 0 } : drawImpactFlash(elapsed);
      ctx.save();
      ctx.translate(shakeX, shakeY);

      if (!evading && !counterFired && elapsed >= COUNTER_TIME) {
        counterFired = true;
        onCounterRef.current?.();
      }

      const activeForArchetype = [];
      projectiles.forEach((m) => {
        const t = elapsed - m.delay;
        if (t < 0) return;

        if (evading) {
          m.targetX = liveTarget.x;
          m.targetY = liveTarget.y;
        }

        const passThrough = evading || style.archetype === 'newtype-dodge';

        if (passThrough) {
          const p = t / m.duration;
          if (p > 1.6) return;
          const easedT = p < 1 ? easeOutCubic(Math.min(p, 1)) : p;
          const { x, y, angle } = projectilePos(m, easedT);
          const overshoot = Math.max(0, p - 1);
          const alpha = Math.max(0, 1 - overshoot);
          if (m.kind === 'laser') drawLaser(x, y, angle, alpha);
          else drawMissile(x, y, angle, m.size, alpha);
          if (!evading && p > 1.3 && dodgeGhostAngle == null) {
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

        if (elapsed >= COUNTER_TIME && p < 0.97) {
          m.destroyed = true;
          m.destroyedAt = elapsed;
          m.hitX = x;
          m.hitY = y;
          return;
        }

        if (p < 0.97) {
          if (m.kind === 'laser') drawLaser(x, y, angle, 1);
          else drawMissile(x, y, angle, m.size, 1);
          activeForArchetype.push({ hitX: x, hitY: y });
        }
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
      style={{ position: 'fixed', inset: 0, zIndex: 5001, pointerEvents: 'none', width: '100vw', height: '100vh' }}
    />,
    document.body
  );
}
