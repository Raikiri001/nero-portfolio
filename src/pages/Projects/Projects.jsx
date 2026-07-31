import { useCallback, useEffect, useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'motion/react';
import { PROJECTS_ARRAY, SITE_TEXT } from '../../data/siteData';
import { ScrambleText } from '../../components/ui/ScrambleText';
import { HangarBay } from './HangarBay';
import './Projects.css';

// One project per full-page "bay" instead of a scrolling card grid — this
// is also the 1:1 project<->gundamId mapping the rest of the site
// (GundamBackgroundLayers, MechaBattleCanvas, etc.) already assumes.
export function Projects({ onDeploy }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const wheelAccum = useRef(0);
  const touchStartX = useRef(null);
  const sectionRef = useRef(null);

  const goTo = useCallback((idx) => {
    setActiveIndex((current) => {
      const clamped = Math.max(0, Math.min(PROJECTS_ARRAY.length - 1, idx));
      setDirection(clamped >= current ? 1 : -1);
      return clamped;
    });
  }, []);

  // Deep-linking from Home's bounding-box click: page straight to that
  // project's bay instead of the old click-to-expand modal.
  useEffect(() => {
    const openProjectId = window.sessionStorage.getItem('openProject');
    if (openProjectId) {
      const idx = PROJECTS_ARRAY.findIndex((p) => p.id === openProjectId);
      if (idx >= 0) goTo(idx);
      window.sessionStorage.removeItem('openProject');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') goTo(activeIndex + 1);
      else if (e.key === 'ArrowLeft') goTo(activeIndex - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeIndex, goTo]);

  // Only reacts to clearly horizontal wheel intent (trackpad swipe) — a
  // plain vertical mouse wheel is left alone so App.jsx's global listener
  // still switches between site sections (Home/About/Projects/Contact) as
  // it always has, rather than fighting this hangar's own left/right paging.
  const handleWheel = (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    wheelAccum.current += e.deltaX;
    if (wheelAccum.current > 350) {
      goTo(activeIndex + 1);
      wheelAccum.current = 0;
    } else if (wheelAccum.current < -350) {
      goTo(activeIndex - 1);
      wheelAccum.current = 0;
    }
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 60) goTo(activeIndex - 1);
    else if (dx < -60) goTo(activeIndex + 1);
    touchStartX.current = null;
  };

  const project = PROJECTS_ARRAY[activeIndex];

  const slideVariants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 70 : -70 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -70 : 70 }),
  };

  return (
    <section
      className="projects-section hangar-section"
      id="projects"
      ref={sectionRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div
        className="section-header"
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        style={{ marginLeft: 'var(--section-margin-x)' }}
      >
        <span className="section-header__code"><ScrambleText text={SITE_TEXT.projects.sectionCode} /></span>
        <h2 className="section-header__title"><ScrambleText text={SITE_TEXT.projects.title} delay={200} /></h2>
        <div className="section-header__line" />
      </motion.div>

      <div className="hangar-pager">
        <button
          className="hangar-nav hangar-nav--left"
          onClick={() => goTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          data-clickable
          aria-label="Previous unit"
        >
          ‹
        </button>

        <div className="hangar-pager__stage">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={project.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="hangar-pager__slide"
            >
              <HangarBay project={project} gundamId={activeIndex} isActive onDeploy={onDeploy} />
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          className="hangar-nav hangar-nav--right"
          onClick={() => goTo(activeIndex + 1)}
          disabled={activeIndex === PROJECTS_ARRAY.length - 1}
          data-clickable
          aria-label="Next unit"
        >
          ›
        </button>
      </div>

      <div className="hangar-dots">
        {PROJECTS_ARRAY.map((p, i) => (
          <button
            key={p.id}
            className={`hangar-dot ${i === activeIndex ? 'hangar-dot--active' : ''}`}
            onClick={() => goTo(i)}
            data-clickable
            aria-label={`Go to ${p.title}`}
          />
        ))}
      </div>
    </section>
  );
}
