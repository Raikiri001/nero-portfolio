import { useEffect, useRef } from 'react';
import './Combat.css';

// Draws beam tracers + the lock-on reticle every frame by reading hudRef
// directly (written by CombatScene's useFrame) — its own rAF loop, outside
// React, so 60fps VFX never triggers a React re-render. Mirrors the
// hand-rolled canvas pattern MechaBattleCanvas/MultiLockCanvas already use
// for 2D VFX, just fed from 3D-projected screen coordinates here.
function BeamCanvas({ hudRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let rafId;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const drawReticle = (screen, locked, lockProgress) => {
      if (!screen || screen.behind) return;
      const { x, y } = screen;
      ctx.save();
      ctx.strokeStyle = locked ? '#ff003c' : '#0090d9';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;

      const s = 16;
      ctx.beginPath();
      ctx.moveTo(x - s, y); ctx.lineTo(x - s * 0.4, y);
      ctx.moveTo(x + s * 0.4, y); ctx.lineTo(x + s, y);
      ctx.moveTo(x, y - s); ctx.lineTo(x, y - s * 0.4);
      ctx.moveTo(x, y + s * 0.4); ctx.lineTo(x, y + s);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, s * 1.6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lockProgress);
      ctx.strokeStyle = locked ? '#ff003c' : 'rgba(0,144,217,0.7)';
      ctx.stroke();

      if (locked) {
        ctx.font = 'bold 11px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff003c';
        ctx.fillText('LOCK', x, y - s * 1.9);
      }
      ctx.restore();
    };

    const drawBeams = (beams) => {
      (beams || []).forEach((b) => {
        if (b.from.behind && b.to.behind) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, b.alpha);
        ctx.strokeStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = b.kind === 'slash' ? 4 : 10;
        ctx.lineWidth = b.kind === 'slash' ? 5 : 2.5;
        ctx.beginPath();
        ctx.moveTo(b.from.x, b.from.y);
        ctx.lineTo(b.to.x, b.to.y);
        ctx.stroke();
        ctx.restore();
      });
    };

    const frame = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const hud = hudRef.current;
      if (hud) {
        drawBeams(hud.beams);
        drawReticle(hud.bossScreen, hud.locked, hud.lockProgress || 0);
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [hudRef]);

  return <canvas ref={canvasRef} className="combat-hud__canvas" />;
}

export function CombatHUD({ hudRef, snapshot, bossName, result, onRetry, onReturn }) {
  const playerHpPct = snapshot?.playerHpPct ?? 1;
  const bossHpPct = snapshot?.bossHpPct ?? 1;
  const boostPct = snapshot?.boostPct ?? 1;

  return (
    <div className="combat-hud">
      <BeamCanvas hudRef={hudRef} />

      <div className="combat-hud__boss-bar hud-panel">
        <div className="combat-hud__boss-name">{snapshot?.bossName || bossName}</div>
        <div className="combat-hud__bar combat-hud__bar--boss">
          <div className="combat-hud__bar-fill" style={{ width: `${Math.max(0, bossHpPct) * 100}%` }} />
        </div>
      </div>

      <div className="combat-hud__player-panel hud-panel">
        <div className="combat-hud__label">PLAYER</div>
        <div className="combat-hud__bar combat-hud__bar--player">
          <div className="combat-hud__bar-fill" style={{ width: `${Math.max(0, playerHpPct) * 100}%` }} />
        </div>
        <div className="combat-hud__label combat-hud__label--boost">BOOST</div>
        <div className="combat-hud__bar combat-hud__bar--boost">
          <div className="combat-hud__bar-fill" style={{ width: `${Math.max(0, boostPct) * 100}%` }} />
        </div>
      </div>

      <div className="combat-hud__controls-hint">
        MOUSE AIM · WASD MOVE · SPACE/CTRL VERTICAL · SHIFT BOOST · LMB FIRE · RMB/F MELEE
      </div>

      {result && (
        <div className="combat-hud__result-overlay">
          <div className="combat-hud__result-panel hud-panel">
            <div className={`combat-hud__result-title combat-hud__result-title--${result}`}>
              {result === 'won' ? 'SORTIE SUCCESSFUL' : 'MISSION FAILED'}
            </div>
            <div className="combat-hud__result-actions">
              <button className="combat-hud__result-btn" onClick={onRetry} data-clickable>RETRY</button>
              <button className="combat-hud__result-btn combat-hud__result-btn--secondary" onClick={onReturn} data-clickable>RETURN TO HANGAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
