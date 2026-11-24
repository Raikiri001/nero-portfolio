import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { PROJECTS_ARRAY, SITE_TEXT } from '../../data/siteData';
import { SectionHeader } from '../../components/ui/SectionHeader';
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
// itself), not an index-swapping pager. Scrolling it drives a continuous
// camera dolly across HangarCorridor's single persistent 3D scene, so moving
// through projects reads as walking past a row of bays. App.jsx's wheel
// handler reads this element's scrollTop/scrollHeight before deciding
// whether to switch site sections.
//
// `openProjectId` (from App) lands straight on that project's bay — it is
// how Home's bounding-box launch hands off to the hangar.
//
// `sortie` (from App) is the deploy session. Projects only forwards it to
// the canvas — the launch and the fight happen INSIDE the hangar scene, in
// the same shot (CLAUDE.md PART 2) — and gets its own UI out of the way:
// the hangar HUD hides, and scrolling/keys are locked so nothing can move
// the camera mid-shot.
export function Projects({ onDeploy, openProjectId, sortie = null }) {
  const deploying = !!sortie;
  const sectionRef = useRef(null);
  const scrollFractionRef = useRef(0);
  const settleTimerRef = useRef(null);
  const settledRef = useRef(true);
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

      // Only flip state on the transition — this handler runs every frame
      // of a scroll, and the HUD re-renders on every setIsSettled.
      if (settledRef.current) {
        settledRef.current = false;
        setIsSettled(false);
      }
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(() => {
        settledRef.current = true;
        setIsSettled(true);
      }, SETTLE_DELAY);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      clearTimeout(settleTimerRef.current);
    };
  }, []);

  // Deep link from Home: jump straight to that project's bay. Runs once, on
  // mount — App clears `openProjectId` when the section changes.
  useEffect(() => {
    if (!openProjectId) return;
    const idx = PROJECTS_ARRAY.findIndex((p) => p.id === openProjectId);
    if (idx >= 0) scrollToIndex(idx, 'instant');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only by design
  }, []);

  useEffect(() => {
    if (deploying) return undefined;
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') scrollToIndex(currentIndex + 1);
      else if (e.key === 'ArrowLeft') scrollToIndex(currentIndex - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, scrollToIndex, deploying]);

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
  const showCallouts = !deploying && isSettled && callouts.idx === currentIndex;
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
    <section
      className={`projects-section hangar-section ${deploying ? 'projects-section--deploying' : ''}`}
      id="projects"
      ref={sectionRef}
    >
      {!deploying && (
        <SectionHeader
          className="hangar-section-header"
          code={SITE_TEXT.projects.sectionCode}
          title={SITE_TEXT.projects.title}
        />
      )}

      <div className="hangar-scroll-track" style={{ height: `${BAY_COUNT * 100}vh` }}>
        <div className="hangar-viewport">
          <HangarCorridor
            bayCount={BAY_COUNT}
            scrollFractionRef={scrollFractionRef}
            onProject={handleProject}
            sortie={sortie}
          />

          <div className={`hangar-hud ${deploying ? 'hangar-hud--hidden' : ''}`}>
            <button
              className="hangar-nav hangar-nav--left bevel"
              onClick={() => scrollToIndex(currentIndex - 1)}
              disabled={currentIndex === 0}
              data-clickable
              aria-label="Previous unit"
            >
              {'‹'}
            </button>
            <button
              className="hangar-nav hangar-nav--right bevel"
              onClick={() => scrollToIndex(currentIndex + 1)}
              disabled={currentIndex === BAY_COUNT - 1}
              data-clickable
              aria-label="Next unit"
            >
              {'›'}
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
              {isSettled && !deploying && (
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
