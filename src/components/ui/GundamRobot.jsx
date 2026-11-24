import { motion } from 'motion/react';
import { GUNDAM_ROSTER } from '../../data/gundamVisuals.jsx';

function MSBody({
  chest = "#0055ff", waist = "#f0f0f0",
  shoulder = "#f0f0f0", shoulderAccent = "#0055ff",
  arm = "#f0f0f0", joint = "#a0a0a0", leg = "#f0f0f0", knee = "#ff0000", foot = "#ff0000",
  vfin = "#fff", visor = "#00ffcc", chin = "#ff0000",
  headBase = "#f0f0f0", centerChest = "#ff0000",
  hideShoulders = false, hideChest = false, hideVfin = false, hideVisor = false,
  wings = null, customParts = null
}) {
  return (
    <g>
      {wings}
      {!hideVfin && (
        <g>
          <path d="M 30 7 L 22 2 L 28 9 Z" fill={vfin} />
          <path d="M 30 7 L 38 2 L 32 9 Z" fill={vfin} />
        </g>
      )}
      <polygon points="29,7 31,7 30,10" fill={chin} />
      <polygon points="26,10 34,10 35,17 25,17" fill={headBase} />
      {!hideVisor && <polygon points="27,12 33,12 32,14 28,14" fill={visor} />}
      <polygon points="28,17 32,17 30,20" fill={chin} />

      <polygon points="25,18 35,18 33,21 27,21" fill={joint} />
      {!hideChest && (
        <g>
          <polygon points="22,21 38,21 36,30 24,30" fill={chest} />
          <polygon points="23,23 28,23 28,26 24,26" fill="#444" />
          <polygon points="32,23 37,23 36,26 32,26" fill="#444" />
          <polygon points="28,26 32,26 33,33 27,33" fill={centerChest} />
        </g>
      )}

      <polygon points="26,30 34,30 35,36 25,36" fill={joint} />
      <polygon points="23,36 29,36 29,44 21,44" fill={waist} />
      <polygon points="31,36 37,36 39,44 31,44" fill={waist} />
      <polygon points="29,34 31,34 32,42 28,42" fill={chin} />

      {!hideShoulders && (
        <g>
          <polygon points="12,19 22,19 22,26 10,26" fill={shoulder} />
          <polygon points="13,20 21,20 21,23 12,23" fill={shoulderAccent} />
          <polygon points="38,19 48,19 50,26 38,26" fill={shoulder} />
          <polygon points="39,20 47,20 48,23 39,23" fill={shoulderAccent} />
        </g>
      )}

      <polygon points="15,26 19,26 19,33 16,33" fill={joint} />
      <polygon points="14,33 20,33 19,43 12,43" fill={arm} />
      <polygon points="41,26 45,26 44,33 41,33" fill={joint} />
      <polygon points="40,33 46,33 48,43 41,43" fill={arm} />

      <polygon points="22,44 28,44 28,52 21,52" fill={joint} />
      <polygon points="20,52 29,52 30,64 17,64" fill={leg} />
      <polygon points="22,50 28,50 28,55 21,55" fill={knee} />
      <polygon points="17,64 28,64 29,68 15,68" fill={foot} />

      <polygon points="32,44 38,44 39,52 32,52" fill={joint} />
      <polygon points="31,52 40,52 43,64 30,64" fill={leg} />
      <polygon points="32,50 38,50 39,55 32,55" fill={knee} />
      <polygon points="32,64 43,64 45,68 31,68" fill={foot} />

      <g opacity="0.5">
        <line x1="15" y1="35" x2="14" y2="41" stroke="#000" strokeWidth="0.6" />
        <line x1="45" y1="35" x2="46" y2="41" stroke="#000" strokeWidth="0.6" />
        <line x1="21" y1="55" x2="20" y2="62" stroke="#000" strokeWidth="0.6" />
        <line x1="39" y1="55" x2="40" y2="62" stroke="#000" strokeWidth="0.6" />
        <polygon points="27,36 33,36 32,39 28,39" fill="#000" opacity="0.3" />
      </g>

      {customParts}
    </g>
  );
}

// One shared transition object rather than a fresh literal per flame per
// render — four of these are created on every render of every robot.
const FLAME = { duration: 0.15, repeat: Infinity };

/**
 * `flicker` drives the thruster flames.
 *
 * TURN IT OFF FOR ANYTHING IN THE BACKGROUND. Each flame is a
 * `repeat: Infinity` tween on an SVG `<path>`'s opacity AND its scale, and a
 * scale on an SVG element is not compositor-accelerated — it re-rasterizes
 * the whole `<svg>` every frame. `GundamBackLayer` mounts 22 of these on
 * EVERY page and never unmounts them, so leaving it on cost 88 permanent
 * per-frame re-rasters site-wide, for a flame drawn at 30 % opacity and half
 * scale where nobody can see it flicker. The foreground robot on Home keeps
 * it; that one is the size it was drawn for.
 */
export function Robot({ dir, gundamId = 0, flicker = true }) {
  const isUp = dir.includes('up');
  const isDown = dir.includes('down');
  const isLeft = dir.includes('left');
  const isRight = dir.includes('right');

  let tilt = 0;
  if (isLeft && isUp) tilt = -45;
  else if (isRight && isUp) tilt = 45;
  else if (isLeft && isDown) tilt = -15;
  else if (isRight && isDown) tilt = 15;
  else if (isLeft) tilt = -25;
  else if (isRight) tilt = 25;

  const showMainThruster = isUp;
  const showRightThruster = isLeft;
  const showLeftThruster = isRight;

  const gundam = GUNDAM_ROSTER[gundamId % GUNDAM_ROSTER.length];

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        pointerEvents: 'none',
        opacity: 0.85,
        zIndex: 0
      }}
      animate={{ rotate: tilt, x: '-50%', y: '-50%' }}
      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
    >
      <svg width="60" height="70" viewBox="0 0 60 70" style={{ overflow: 'visible' }}>
        {showMainThruster && (
          <g>
            <motion.path
              d="M 21 66 L 25 80 L 28 66 Z"
              fill={gundam.thruster}
              animate={flicker ? { opacity: [0.4, 1, 0.4], scaleY: [0.8, 1.4, 0.8] } : undefined}
              transition={FLAME}
              style={{ transformOrigin: "25px 66px", opacity: flicker ? undefined : 0.8 }}
            />
            <motion.path
              d="M 32 66 L 35 80 L 39 66 Z"
              fill={gundam.thruster}
              animate={flicker ? { opacity: [0.4, 1, 0.4], scaleY: [0.8, 1.4, 0.8] } : undefined}
              transition={FLAME}
              style={{ transformOrigin: "35px 66px", opacity: flicker ? undefined : 0.8 }}
            />
          </g>
        )}

        {showRightThruster && (
          <motion.path
            d="M 45 23 L 65 30 L 45 33 Z"
            fill={gundam.thruster}
            animate={flicker ? { opacity: [0.4, 1, 0.4], scaleX: [0.8, 1.4, 0.8] } : undefined}
            transition={FLAME}
            style={{ transformOrigin: "45px 28px", opacity: flicker ? undefined : 0.8 }}
          />
        )}

        {showLeftThruster && (
          <motion.path
            d="M 15 23 L -5 30 L 15 33 Z"
            fill={gundam.thruster}
            animate={flicker ? { opacity: [0.4, 1, 0.4], scaleX: [0.8, 1.4, 0.8] } : undefined}
            transition={FLAME}
            style={{ transformOrigin: "15px 28px", opacity: flicker ? undefined : 0.8 }}
          />
        )}

        <MSBody {...gundam.props} />
      </svg>
    </motion.div>
  );
}
