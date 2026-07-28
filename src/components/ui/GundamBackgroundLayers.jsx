import { useCallback, useEffect, useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';
import { PROJECTS_ARRAY } from '../../data/siteData';
import { GUNDAM_ROSTER } from '../../data/gundamVisuals.jsx';
import { Robot } from './GundamRobot';

const LINKED_IDS = PROJECTS_ARRAY.map((_, i) => i);
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
// spawn from the same spot. Also exposes `resync` for an immediate,
// fast re-target — used to track a scrolling card closely.
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

  const resync = useCallback((fastDuration = 0.3) => {
    const result = getTargetRef.current(prevRef.current);
    if (!result) return;
    applyDir(result.point.x - prevRef.current.x, result.point.y - prevRef.current.y);
    prevRef.current = result.point;
    animate(motionX, result.point.x, { duration: fastDuration, ease: 'easeOut' });
    animate(motionY, result.point.y, { duration: fastDuration, ease: 'easeOut' });
  }, [motionX, motionY]);

  return { motionX, motionY, dir, resync };
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
// below all page content. Holds every Gundam not currently "in front" of
// its project card — i.e. all 22 on every page except Projects, where the
// 7 project-linked ones hand off to GundamFrontLayer and only the 15
// reserve/excess designs remain here.
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

// Deterministic anchor near the top-right corner of the project's grid
// card (not random) — the front-layer unit parks here and idles rather
// than roaming, per request. Scoped to `.mission-folder` specifically so
// this never accidentally matches the expanded modal panel, which carries
// the same data-project-id while open.
//
// Also reports how much of the card is actually visible within the
// horizontally-scrolling `.mission-grid` viewport — when a card is mostly
// scrolled off (e.g. clipped on the right), its Gundam should fade out
// with it rather than keep floating there detached, since this layer
// itself is a full-viewport overlay and isn't clipped by the grid's own
// scroll boundary.
function getFrontAnchor(projectId) {
  const el = document.querySelector(`.mission-folder[data-project-id="${projectId}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const x = rect.x + rect.width - rect.width * 0.1;
  const y = rect.y + rect.height * 0.08;

  const grid = document.querySelector('.mission-grid');
  let visible = true;
  if (grid) {
    const gridRect = grid.getBoundingClientRect();
    const visLeft = Math.max(rect.left, gridRect.left);
    const visRight = Math.min(rect.right, gridRect.right);
    const visTop = Math.max(rect.top, gridRect.top);
    const visBottom = Math.min(rect.bottom, gridRect.bottom);
    const visibleArea = Math.max(0, visRight - visLeft) * Math.max(0, visBottom - visTop);
    const cardArea = rect.width * rect.height;
    visible = cardArea > 0 && visibleArea / cardArea > 0.5;
  }

  return { point: { x, y }, visible };
}

// Flies in once (from an off-screen edge) to its anchor, then exposes
// `resync` for snapping to a moved anchor (scroll/resize) — no continuous
// wandering. A separate inner wrapper handles the idle bob once arrived.
// Also tracks `visible` (see getFrontAnchor) so the caller can fade the
// unit out when its card is scrolled mostly out of view.
function useAnchorFlight(getAnchor) {
  const [{ initial, initialVisible }] = useState(() => {
    const result = getAnchor();
    return { initial: result?.point ?? pickEdgeStart(), initialVisible: result?.visible ?? true };
  });
  const motionX = useMotionValue(initial.x);
  const motionY = useMotionValue(initial.y);
  const [visible, setVisible] = useState(initialVisible);
  const arrivedRef = useRef(false);
  const getAnchorRef = useRef(getAnchor);
  useEffect(() => {
    getAnchorRef.current = getAnchor;
  });

  useEffect(() => {
    let timeoutId;

    const tryArrive = () => {
      const result = getAnchorRef.current();
      if (!result) {
        timeoutId = setTimeout(tryArrive, 300);
        return;
      }
      setVisible(result.visible !== false);
      const duration = arrivedRef.current ? 0.3 : 1.6 + Math.random() * 0.6;
      arrivedRef.current = true;
      animate(motionX, result.point.x, { duration, ease: 'easeInOut' });
      animate(motionY, result.point.y, { duration, ease: 'easeInOut' });
    };

    tryArrive();

    // The card's own entrance animation (whileInView, staggered per index)
    // may still be sliding into its final resting spot when the very first
    // anchor snapshot above is taken, especially for later/lower-row cards
    // — a couple of follow-up correction snaps once everything has surely
    // settled keeps every card's Gundam consistently placed relative to it.
    const settle1 = setTimeout(() => {
      const result = getAnchorRef.current();
      if (!result) return;
      setVisible(result.visible !== false);
      motionX.set(result.point.x);
      motionY.set(result.point.y);
    }, 900);
    const settle2 = setTimeout(() => {
      const result = getAnchorRef.current();
      if (!result) return;
      setVisible(result.visible !== false);
      motionX.set(result.point.x);
      motionY.set(result.point.y);
    }, 1600);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(settle1);
      clearTimeout(settle2);
    };
  }, [motionX, motionY]);

  // Instant (no tween) — this fires on every scroll frame, so any easing
  // duration here reads as lag trailing behind the card while swiping.
  const resync = useCallback(() => {
    const result = getAnchorRef.current();
    if (!result) return;
    setVisible(result.visible !== false);
    motionX.set(result.point.x);
    motionY.set(result.point.y);
  }, [motionX, motionY]);

  return { motionX, motionY, resync, visible };
}

function FrontGundam({ gundamId, projectId }) {
  const getAnchor = useCallback(() => getFrontAnchor(projectId), [projectId]);
  const { motionX, motionY, resync, visible } = useAnchorFlight(getAnchor);

  // Re-anchor immediately on scroll/resize instead of drifting — keeps it
  // stuck to its card's top-right corner as the grid scrolls horizontally.
  useEffect(() => {
    let rafId = null;
    const handleReposition = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        resync();
      });
    };
    document.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [resync]);

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        x: motionX,
        y: motionY,
        pointerEvents: 'none'
      }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: visible ? 0.95 : 0, scale: 0.7, transition: { duration: 0.35 } }}
      exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.3 } }}
    >
      {/* Very slow, small-amplitude idle float — not wandering. */}
      <motion.div
        animate={{ y: [0, -9, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Robot dir="idle" gundamId={gundamId} />
      </motion.div>
    </motion.div>
  );
}

// Only populated while on the Projects page: the 7 project-linked Gundams
// pop up here, idling in front of their own project card's top-right
// corner so they stay clearly visible instead of just ambient decoration.
export function GundamFrontLayer({ activeSection }) {
  const active = activeSection === 'projects';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none', overflow: 'hidden' }}>
      <AnimatePresence>
        {active && LINKED_IDS.map((gundamId) => (
          <FrontGundam key={gundamId} gundamId={gundamId} projectId={PROJECTS_ARRAY[gundamId].id} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Ring around the expanded mission-detail panel (outside its bounds, so it
// never sits over the text), scoped to `.mission-detail` specifically so it
// never matches the grid card sharing the same data-project-id.
function getModalOrbitTarget(projectId) {
  const el = document.querySelector(`.mission-detail[data-project-id="${projectId}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const halfDiag = Math.hypot(rect.width / 2, rect.height / 2);
  const radius = halfDiag + 40 + Math.random() * 50;
  const angle = Math.random() * Math.PI * 2;
  const x = cx + Math.cos(angle) * radius;
  const y = cy + Math.sin(angle) * radius * 0.6;
  return { point: { x, y }, duration: 2.2 + Math.random() * 1.6 };
}

function ExpandedGundam({ gundamId, projectId }) {
  const getTarget = useCallback(() => getModalOrbitTarget(projectId), [projectId]);
  const { motionX, motionY, dir } = useWander(getTarget);

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        x: motionX,
        y: motionY,
        scale: 0.8,
        pointerEvents: 'none'
      }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 0.8, transition: { duration: 0.4 } }}
      exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.3 } }}
    >
      <Robot dir={dir} gundamId={gundamId} />
    </motion.div>
  );
}

// Rendered above the mission-detail modal (which sits at z-index 5000):
// whichever project's card is currently expanded gets its Gundam flying
// prominently around the panel's edges instead of hidden behind it.
// Projects.jsx dispatches 'project-modal-change' whenever selectedMission
// changes, so no prop-drilling is needed from this top-level layer.
export function GundamModalLayer() {
  const [expandedProjectId, setExpandedProjectId] = useState(null);

  useEffect(() => {
    const handler = (e) => setExpandedProjectId(e.detail?.projectId ?? null);
    window.addEventListener('project-modal-change', handler);
    return () => window.removeEventListener('project-modal-change', handler);
  }, []);

  const gundamId = expandedProjectId != null
    ? LINKED_IDS.find((id) => PROJECTS_ARRAY[id].id === expandedProjectId)
    : undefined;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 5500, pointerEvents: 'none', overflow: 'hidden' }}>
      <AnimatePresence>
        {gundamId !== undefined && (
          <ExpandedGundam key={expandedProjectId} gundamId={gundamId} projectId={expandedProjectId} />
        )}
      </AnimatePresence>
    </div>
  );
}
