import { useEffect, useRef, useState } from 'react';
import { CombatHUD } from './combat/CombatHUD';
import { ScrambleText } from '../components/ui/ScrambleText';
import { getUnitSpec } from './mech/unitSpecs';
import './combat/Combat.css';

// The game needs a keyboard and a mouse. A touch-only device gets told so
// rather than dropped into a fight it cannot control.
const HAS_FINE_POINTER = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? true;

// Launch control's call-outs over each beat of the sortie (hangar/sortie.js
// owns the beats and their timing; this is only what is SAID over them).
// The first line of a beat is its headline; the rest are status lines.
const CALLOUTS = {
  alert: ['CONDITION RED', 'ALL HANDS TO LAUNCH STATIONS'],
  ready: ['UMBILICALS DISCONNECTED', 'DOCKING CLAMPS RELEASED', 'MAIN CAMERA ONLINE'],
  pull: ['TRANSFER PLATFORM ENGAGED'],
  slide: ['MOVING TO CATAPULT DECK'],
  pan: ['CATAPULT CONNECTED', 'LAUNCH PATH CLEAR'],
  arm: ['HATCH OPEN', 'SYSTEMS ALL GREEN'],
};

// The countdown over the 'arm' beat: 3 · 2 · 1, one number per tick.
const COUNT_FROM = 3;
const COUNT_TICK_MS = 800;

/** 3 · 2 · 1 — mounted fresh (keyed) when 'arm' starts, so its timers
 *  start with the beat and die with it. */
function Countdown() {
  const [n, setN] = useState(COUNT_FROM);
  useEffect(() => {
    const ids = [];
    for (let i = 1; i <= COUNT_FROM; i++) {
      ids.push(setTimeout(() => setN(COUNT_FROM - i), i * COUNT_TICK_MS));
    }
    return () => ids.forEach(clearTimeout);
  }, []);
  if (n <= 0) return null;
  return (
    <div className="sortie-overlay__countdown" aria-label={`T minus ${n}`}>
      <span key={n} className="sortie-overlay__count">{n}</span>
    </div>
  );
}

/**
 * The DOM layer for a whole deploy, drawn OVER the live hangar canvas —
 * never a backdrop, never a black frame (CLAUDE.md PART 2, the vision).
 *
 *   phase 'sortie'  letterbox bars, launch control's lines per beat, the
 *                   3·2·1 countdown, the launch call, and SKIP
 *   phase 'combat'  the bars slide away under a short WHITE flash (the
 *                   hatch exit), then the combat HUD, Escape-to-pause,
 *                   result and pause menus
 *
 * All 3D (the launch shot and the fight) lives in the hangar canvas; App
 * owns the session state and passes it here and to the canvas alike.
 */
export function DeployOverlay({
  gundamId, phase, stage, hudRef, snapshot, bossName, result, paused,
  onTogglePause, onRetry, onReturn, onSkip, skipping,
}) {
  const unitName = getUnitSpec(gundamId).name.toUpperCase();
  const inCombat = phase === 'combat';
  const canSkip = !inCombat && !skipping && stage !== 'launch' && !!onSkip;

  // Escape pauses / resumes the fight (not once it is decided)
  useEffect(() => {
    if (!inCombat || result) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onTogglePause(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inCombat, result, onTogglePause]);

  // SPACE / ENTER / CLICK skips the rest of the launch — once. The guard
  // ref covers the gap between the first press and `skipping` arriving
  // back as a prop (a held key repeats faster than a re-render).
  const skipSent = useRef(false);
  useEffect(() => {
    if (!canSkip) return undefined;
    const skip = () => {
      if (skipSent.current) return;
      skipSent.current = true;
      onSkip();
    };
    const onKey = (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault(); // Space would otherwise scroll the hangar
        skip();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', skip);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', skip);
    };
  }, [canSkip, onSkip]);

  // Letterbox + flash: one layer across both phases, so the bars can slide
  // OUT as the fight starts instead of vanishing with the sortie branch.
  const cinema = (
    <div className={`sortie-cine${inCombat ? ' sortie-cine--out' : ''}`} aria-hidden="true">
      <div className="sortie-cine__bar sortie-cine__bar--top" />
      <div className="sortie-cine__bar sortie-cine__bar--bottom" />
      {/* mounts exactly once, at the sortie → combat hand-off */}
      {inCombat && <div className="sortie-cine__flash" />}
    </div>
  );

  if (!inCombat) {
    const lines = CALLOUTS[stage] ?? [];
    return (
      <>
        {cinema}
        <div className="sortie-overlay" aria-live="polite">
          {lines.length > 0 && (
            <div
              key={stage}
              className={`sortie-overlay__subtitle${stage === 'alert' ? ' sortie-overlay__subtitle--alert' : ''}`}
            >
              {lines.map((line, i) => (
                <div
                  key={line}
                  className={`sortie-overlay__line${i === 0 ? ' sortie-overlay__line--head' : ''}`}
                >
                  <ScrambleText text={line} delay={i * 160} />
                </div>
              ))}
            </div>
          )}
          {stage === 'arm' && <Countdown key="countdown" />}
          {stage === 'launch' && (
            <div className="sortie-overlay__call">
              <div className="sortie-overlay__unit-name">{unitName}</div>
              <div className="sortie-overlay__jp">行きます！</div>
            </div>
          )}
          {canSkip && (
            <div className="sortie-overlay__skip">SPACE / CLICK — SKIP</div>
          )}
        </div>
      </>
    );
  }

  if (!HAS_FINE_POINTER) {
    return (
      <>
        {cinema}
        <CombatHUD notice="KEYBOARD + MOUSE REQUIRED" onReturn={onReturn} />
      </>
    );
  }

  return (
    <>
      {cinema}
      <CombatHUD
        hudRef={hudRef}
        snapshot={snapshot}
        bossName={bossName}
        result={result}
        paused={paused}
        onResume={onTogglePause}
        onRetry={onRetry}
        onReturn={onReturn}
      />
    </>
  );
}
