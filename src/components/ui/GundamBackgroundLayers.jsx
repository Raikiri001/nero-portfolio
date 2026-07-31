import { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';
import { GUNDAM_ROSTER } from '../../data/gundamVisuals.jsx';
import { PROJECTS_ARRAY } from '../../data/siteData';
import { Robot } from './GundamRobot';

const EXCESS_IDS = GUNDAM_ROSTER.map((_, i) => i).slice(PROJECTS_ARRAY.length);
const ALL_IDS = GUNDAM_ROSTER.map((_, i) => i);

// Starting point used whenever getTarget can't resolve one yet (e.g. the
// target DOM node doesn't exist the instant this mounts) — a random point
// just past a screen edge, in absolute viewport coordinates, so the unit
// visibly flies inward on arrival instead of popping in at a fixed corner.
function pickEdgeStart() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const edge = Math.floor(Math.random() * 4);
  const pad = 100 + Math.random() * 150;
  switch (edge) {
    case 0: return { x: Math.random() * vw, y: -pad };
    case 1: return { x: Math.random() * vw, y: vh + pad };
    case 2: return { x: -pad, y: Math.random() * vh };
    default: return { x: vw + pad, y: Math.random() * vh };
  }
}

// Repeatedly animates motionX/Y toward whatever point getTarget() returns.
// getTarget returning null means "not ready yet" (e.g. waiting for a DOM
// node to exist) — retried shortly after instead of scheduling a full hop.
// Starts from a random point (via getTarget itself, falling back to an
// off-screen edge) rather than a fixed origin, so instances don't visibly
// spawn from the same spot.
function useWander(getTarget) {
  const [initial] = useState(() => getTarget({ x: 0, y: 0 })?.point ?? pickEdgeStart());
  const motionX = useMotionValue(initial.x);
  const motionY = useMotionValue(initial.y);
  const [dir, setDir] = useState('idle');
  const prevRef = useRef(initial);
  const getTargetRef = useRef(getTarget);
  useEffect(() => {
    getTargetRef.current = getTarget;
  });

  const applyDir = (dx, dy) => {
    const d = [];
    if (dy < -30) d.push('up');
    if (dy > 30) d.push('down');
    if (dx < -30) d.push('left');
    if (dx > 30) d.push('right');
    setDir(d.length ? d.join('-') : 'idle');
  };

  useEffect(() => {
    let timeoutId;

    const tick = () => {
      const result = getTargetRef.current(prevRef.current);
      if (!result) {
        timeoutId = setTimeout(tick, 300);
        return;
      }

      const { point, duration } = result;
      applyDir(point.x - prevRef.current.x, point.y - prevRef.current.y);
      prevRef.current = point;

      animate(motionX, point.x, { duration, ease: 'easeInOut' });
      animate(motionY, point.y, { duration, ease: 'easeInOut' });
      timeoutId = setTimeout(tick, duration * 1000);
    };

    tick();
    return () => clearTimeout(timeoutId);
  }, [motionX, motionY]);

  return { motionX, motionY, dir };
}

function backTarget() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const x = (Math.random() - 0.5) * (vw - 100);
  const y = (Math.random() - 0.5) * (vh - 100);
  return { point: { x, y }, duration: 9 + Math.random() * 6 };
}

function BackgroundGundam({ gundamId, seed }) {
  const { motionX, motionY, dir } = useWander(backTarget);

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        x: motionX,
        y: motionY,
        scale: 0.5,
        pointerEvents: 'none'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.3, transition: { duration: 0.6, delay: (seed % 8) * 0.15 } }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
    >
      <Robot dir={dir} gundamId={gundamId} />
    </motion.div>
  );
}

// Always-mounted layer, sitting just above the starfield background and
// below all page content. Holds every Gundam not currently taking a
// dedicated foreground role — i.e. all 22 on every page except Projects
// (now a 3D hangar bay, see pages/Projects/HangarBay.jsx), where the 7
// project-linked units are busy being the docked model and only the 15
// reserve/excess designs wander back here.
export function GundamBackLayer({ activeSection }) {
  const ids = activeSection === 'projects' ? EXCESS_IDS : ALL_IDS;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
      <AnimatePresence>
        {ids.map((gundamId, i) => (
          <BackgroundGundam key={gundamId} gundamId={gundamId} seed={i} />
        ))}
      </AnimatePresence>
    </div>
  );
}
