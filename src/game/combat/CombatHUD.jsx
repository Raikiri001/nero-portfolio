import { useEffect, useRef } from 'react';
import { hudRgba } from '../../data/hudColors';
import './Combat.css';

const CONTROLS_HINT = 'MOUSE AIM · WASD MOVE · SPACE/C VERTICAL · SHIFT BOOST · LMB FIRE · RMB/F MELEE · Q/E SPECIAL · ESC PAUSE';

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
      ctx.strokeStyle = locked ? hudRgba('red') : hudRgba('primary');
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
      ctx.strokeStyle = locked ? hudRgba('red') : hudRgba('primary', 0.7);
      ctx.stroke();

      if (locked) {
        ctx.font = 'bold 11px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = hudRgba('red');
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
        ctx.shadowBlur = b.kind === 'slash' ? 4 : b.kind === 'heavy' ? 24 : 10;
        ctx.lineWidth = b.kind === 'slash' ? 5 : b.kind === 'heavy' ? 7 : 2.5;
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

// One centred modal: the result, the pause menu, or a blocking notice.
function CombatModal({ title, tone = 'neutral', actions }) {
  return (
    <div className="combat-hud__overlay">
      <div className="combat-hud__modal hud-panel" role="dialog" aria-label={title}>
        <div className={`combat-hud__modal-title combat-hud__modal-title--${tone}`}>{title}</div>
        <div className="combat-hud__modal-actions">
          {actions.map(({ label, onClick, secondary }) => (
            <button
              key={label}
              type="button"
              className={`combat-hud__btn ${secondary ? 'combat-hud__btn--secondary' : ''}`}
              onClick={onClick}
              data-clickable
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The DOM overlay over the arena. Bars and labels come from the throttled
 * `snapshot`; beams and the reticle are drawn every frame from `hudRef`.
 * With `notice` set it renders only that notice (e.g. no mouse available).
 */
export function CombatHUD({
  hudRef, snapshot, bossName, result, paused, notice, onResume, onRetry, onReturn,
}) {
  if (notice) {
    return (
      <div className="combat-hud">
        <CombatModal title={notice} actions={[{ label: 'RETURN TO HANGAR', onClick: onReturn }]} />
      </div>
    );
  }

  const playerHpPct = snapshot?.playerHpPct ?? 1;
  const bossHpPct = snapshot?.bossHpPct ?? 1;
  const boostPct = snapshot?.boostPct ?? 1;
  const specialCharge = snapshot?.specialCharge ?? 1;
  const specialReady = specialCharge >= 1;

  return (
    <div className="combat-hud">
      <BeamCanvas hudRef={hudRef} />

      <div className="combat-hud__boss-bar hud-panel">
        <div className="combat-hud__boss-name">{bossName}</div>
        <div className="combat-hud__bar combat-hud__bar--boss">
          <div className="combat-hud__bar-fill" style={{ width: `${Math.max(0, bossHpPct) * 100}%` }} />
        </div>
      </div>

      <div className="combat-hud__player-panel hud-panel">
        <div className="combat-hud__label">{snapshot?.unitName || 'PLAYER'}</div>
        <div className="combat-hud__bar combat-hud__bar--player">
          <div className="combat-hud__bar-fill" style={{ width: `${Math.max(0, playerHpPct) * 100}%` }} />
        </div>
        <div className="combat-hud__label combat-hud__label--boost">BOOST</div>
        <div className="combat-hud__bar combat-hud__bar--boost">
          <div className="combat-hud__bar-fill" style={{ width: `${Math.max(0, boostPct) * 100}%` }} />
        </div>
        {/* Per-unit special: charges over its cooldown, lights when ready. */}
        {snapshot?.specialLabel && (
          <>
            <div className={`combat-hud__label combat-hud__label--boost ${specialReady ? 'combat-hud__label--ready' : ''}`}>
              [Q] {snapshot.specialLabel}{specialReady ? ' — READY' : ''}
            </div>
            <div className="combat-hud__bar combat-hud__bar--special">
              <div className={`combat-hud__bar-fill ${snapshot.specialActive ? 'combat-hud__bar-fill--active' : ''}`}
                style={{ width: `${Math.max(0, Math.min(1, specialCharge)) * 100}%` }} />
            </div>
          </>
        )}
      </div>

      <div className="combat-hud__controls-hint">{CONTROLS_HINT}</div>

      {result && (
        <CombatModal
          title={result === 'won' ? 'SORTIE SUCCESSFUL' : 'MISSION FAILED'}
          tone={result}
          actions={[
            { label: 'RETRY', onClick: onRetry },
            { label: 'RETURN TO HANGAR', onClick: onReturn, secondary: true },
          ]}
        />
      )}
      {!result && paused && (
        <CombatModal
          title="PAUSED"
          actions={[
            { label: 'RESUME', onClick: onResume },
            { label: 'RETURN TO HANGAR', onClick: onReturn, secondary: true },
          ]}
        />
      )}
    </div>
  );
}
