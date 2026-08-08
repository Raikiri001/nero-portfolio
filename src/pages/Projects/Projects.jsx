import { useCallback, useEffect, useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'motion/react';
import { PROJECTS_ARRAY, SITE_TEXT } from '../../data/siteData';
import { ScrambleText } from '../../components/ui/ScrambleText';
import { HangarCorridor } from '../../game/hangar/HangarCorridor';
import { ANCHOR_PARTS } from '../../game/hangar/anchorParts';
import { CircuitConnectors, CircuitCallout } from '../../game/hangar/CircuitCallout';
import { HangarInfo } from './HangarInfo';
import './Projects.css';

// Where each callout's label sits relative to its anchor's projected
// screen position — alternating sides keeps the 4-5 entries per project
// from piling up on one edge.
const LABEL_OFFSETS = [
  { dx: -160, dy: -30 },
  { dx: 180, dy: 0 },
  { dx: -160, dy: 40 },
  { dx: 180, dy: 70 },
  { dx: -160, dy: 100 },
];

// Tactical data + tags — the content that moved off the info panel onto
// the mech itself as circuit callouts (see anchorParts.js for which named
// mech part each index anchors to).
function calloutEntriesFor(project) {
  const entries = Object.entries(project.tacticalData || {});
  if (project.tags?.length) entries.push(['TAGS', project.tags.join(', ')]);
  return entries;
}

const BAY_COUNT = PROJECTS_ARRAY.length;
const SETTLE_DELAY = 200;

// The hangar is one real, tall, natively-scrollable element (this section
// itself) — not an index-swapping pager. Scrolling it drives a continuous
// camera dolly across HangarCorridor's single persistent 3D scene, so
// moving through projects reads as walking past a row of bays instead of
// pages hard-cutting. This also means App.jsx's existing wheel-exemption
// check (it reads this element's real scrollTop/scrollHeight before
// deciding whether to hijack vertical wheel for site-section switching)
// keeps working with zero changes there — see src/App.jsx's handleWheel.
export function Projects({ onDeploy }) {
  const sectionRef = useRef(null);
  const scrollFractionRef = useRef(0);
  const settleTimerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSettled, setIsSettled] = useState(true);
  const [callouts, setCallouts] = useState({});

  const scrollToIndex = useCallback((idx, behavior = 'smooth') => {
    const el = sectionRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(BAY_COUNT - 1, idx));
    el.scrollTo({ top: clamped * el.clientHeight, behavior });
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;

    const handleScroll = () => {
      const viewportHeight = el.clientHeight || 1;
      const fraction = Math.max(0, Math.min(BAY_COUNT - 1, el.scrollTop / viewportHeight));
      scrollFractionRef.current = fraction;

      const rounded = Math.round(fraction);
      setCurrentIndex((prev) => (prev === rounded ? prev : rounded));

      setIsSettled(false);
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(() => setIsSettled(true), SETTLE_DELAY);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      clearTimeout(settleTimerRef.current);
    };
  }, []);

  // Deep-linking from Home's bounding-box click: jump straight to that
  // project's bay instead of the old click-to-expand modal.
  useEffect(() => {
    const openProjectId = window.sessionStorage.getItem('openProject');
    if (openProjectId) {
      const idx = PROJECTS_ARRAY.findIndex((p) => p.id === openProjectId);
      if (idx >= 0) scrollToIndex(idx, 'instant');
      window.sessionStorage.removeItem('openProject');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') scrollToIndex(currentIndex + 1);
      else if (e.key === 'ArrowLeft') scrollToIndex(currentIndex - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, scrollToIndex]);

  // `idx` tags which bay these positions belong to — HangarCorridor already
  // only projects the nearest bay, but stamping it lets consumers ignore a
  // stray frame from mid-transition where this hasn't caught up with
  // `currentIndex` yet, rather than flashing the wrong bay's callouts.
  const handleProject = useCallback((idx, positions) => {
    setCallouts({ idx, positions });
  }, []);

  const project = PROJECTS_ARRAY[currentIndex];
  const calloutEntries = calloutEntriesFor(project);
  // Only render callouts once settled on this exact bay (not mid-scroll)
  // and once HangarCorridor's projection has actually caught up to it.
  const showCallouts = isSettled && callouts.idx === currentIndex;
  const calloutItems = showCallouts
    ? calloutEntries.map(([label, value], i) => {
      const part = ANCHOR_PARTS[i % ANCHOR_PARTS.length];
      const anchor = callouts.positions?.[part];
      if (!anchor) return null;
      const off = LABEL_OFFSETS[i % LABEL_OFFSETS.length];
      // `id` (not `key`) — this object gets spread as JSX props
      // (`{...item}`) below, and React treats a spread `key` field as an
      // error since `key` must be a literal JSX attribute, not a prop value.
      return { id: label, label, value, anchor, dx: off.dx, dy: off.dy, delay: i * 90 };
    }).filter(Boolean)
    : [];

  return (
    <section className="projects-section hangar-section" id="projects" ref={sectionRef}>
      <motion.div
        className="section-header hangar-section-header"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="section-header__code"><ScrambleText text={SITE_TEXT.projects.sectionCode} /></span>
        <h2 className="section-header__title"><ScrambleText text={SITE_TEXT.projects.title} delay={200} /></h2>
        <div className="section-header__line" />
      </motion.div>

      <div className="hangar-scroll-track" style={{ height: `${BAY_COUNT * 100}vh` }}>
        <div className="hangar-viewport">
          <HangarCorridor bayCount={BAY_COUNT} scrollFractionRef={scrollFractionRef} onProject={handleProject} />

          <div className="hangar-hud">
            <button
              className="hangar-nav hangar-nav--left"
              onClick={() => scrollToIndex(currentIndex - 1)}
              disabled={currentIndex === 0}
              data-clickable
              aria-label="Previous unit"
            >
              ‹
            </button>
            <button
              className="hangar-nav hangar-nav--right"
              onClick={() => scrollToIndex(currentIndex + 1)}
              disabled={currentIndex === BAY_COUNT - 1}
              data-clickable
              aria-label="Next unit"
            >
              ›
            </button>

            {/* Reveal choreography: hidden while the corridor is moving,
                boots in (staggered per callout) once it settles on a bay —
                you're "walking," not reading, until you stop. */}
            <AnimatePresence>
              {showCallouts && <CircuitConnectors key={`lines-${currentIndex}`} items={calloutItems} />}
            </AnimatePresence>
            <AnimatePresence>
              {showCallouts && calloutItems.map((item) => (
                <CircuitCallout key={`${currentIndex}-${item.id}`} {...item} />
              ))}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {isSettled && (
                <HangarInfo key={currentIndex} project={project} onDeploy={() => onDeploy?.(currentIndex)} />
              )}
            </AnimatePresence>

            <div className="hangar-dots">
              {PROJECTS_ARRAY.map((p, i) => (
                <button
                  key={p.id}
                  className={`hangar-dot ${i === currentIndex ? 'hangar-dot--active' : ''}`}
                  onClick={() => scrollToIndex(i)}
                  data-clickable
                  aria-label={`Go to ${p.title}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
