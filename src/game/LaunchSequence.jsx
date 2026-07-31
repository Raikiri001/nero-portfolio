import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GUNDAM_ROSTER } from '../data/gundamVisuals.jsx';
import { ScrambleText } from '../components/ui/ScrambleText';
import './LaunchSequence.css';

// Rushing horizontal light streaks — the catapult-tunnel motion blur behind
// a Gundam SEED launch. Same hand-rolled canvas rAF pattern as BeamCanvas/
// MultiLockCanvas (components/ui), just authored fresh here since the
// motion (streaks converging from the right, not a radial burst) is
// distinct enough not to share code with either.
function StreakCanvas({ color }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;
    ctx.scale(dpr, dpr);

    const streaks = Array.from({ length: 46 }, () => ({
      y: Math.random() * vh,
      len: 50 + Math.random() * 200,
      speed: 700 + Math.random() * 1300,
      x: vw + Math.random() * vw,
      width: 1 + Math.random() * 2.5,
    }));

    const duration = 1400;
    const start = performance.now();
    let rafId;

    const frame = (now) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / duration, 1);
      const dt = 1 / 60;
      ctx.fillStyle = `rgba(2, 5, 10, ${0.3 + p * 0.15})`;
      ctx.fillRect(0, 0, vw, vh);

      streaks.forEach((s) => {
        s.x -= s.speed * (0.4 + p * 1.6) * dt;
        if (s.x < -s.len) {
          s.x = vw + Math.random() * 200;
          s.y = Math.random() * vh;
        }
        const grad = ctx.createLinearGradient(s.x, s.y, s.x + s.len, s.y);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, color);
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.len, s.y);
        ctx.stroke();
      });

      if (elapsed < duration) rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [color]);

  return <canvas ref={canvasRef} className="launch-streak-canvas" />;
}

// Full-screen portal cinematic: brace (launch checklist) -> catapult release
// (streaks + beam flash + canon-style Japanese launch call) -> whiteout ->
// onComplete, which the caller uses to mount the combat scene underneath.
export function LaunchSequence({ gundamId, onComplete }) {
  const [stage, setStage] = useState('brace'); // brace -> release -> flash
  const gundam = GUNDAM_ROSTER[gundamId % GUNDAM_ROSTER.length];
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    const t1 = setTimeout(() => setStage('release'), 550);
    const t2 = setTimeout(() => setStage('flash'), 1500);
    const t3 = setTimeout(() => onCompleteRef.current?.(), 2050);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return createPortal(
    <div className={`launch-sequence launch-sequence--${stage}`}>
      {(stage === 'release' || stage === 'flash') && <StreakCanvas color={gundam.thruster || '#00e5ff'} />}
      <div className="launch-sequence__vignette" />

      {stage === 'brace' && (
        <div className="launch-sequence__checklist">
          <div className="launch-sequence__line"><ScrambleText text="LAUNCH_CLAMPS_RELEASED" /></div>
          <div className="launch-sequence__line"><ScrambleText text="CATAPULT_DECK_PRESSURIZED" delay={140} /></div>
          <div className="launch-sequence__line"><ScrambleText text={`${gundam.name.toUpperCase()}, STAND BY`} delay={280} /></div>
        </div>
      )}

      {(stage === 'release' || stage === 'flash') && (
        <div className="launch-sequence__call">
          <div className="launch-sequence__unit-name">{gundam.name}</div>
          <div className="launch-sequence__jp">行きます！</div>
        </div>
      )}

      {stage === 'flash' && <div className="launch-sequence__whiteflash" />}
    </div>,
    document.body
  );
}
