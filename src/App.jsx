import { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { BootSequence } from './components/boot/BootSequence';
import { CustomCursor } from './components/ui/CustomCursor';
import { ScanlineOverlay } from './components/ui/ScanlineOverlay';
import { Navigation } from './components/ui/Navigation';
import { ScrollIndicator } from './components/ui/ScrollIndicator';
import { GundamBackLayer } from './components/ui/GundamBackgroundLayers';
import { Home } from './pages/Home/Home';
import { About } from './pages/About/About';
import { Contact } from './pages/Contact/Contact';
import { pickRandomBoss } from './data/bossRoster';
import './App.css';

// Everything that pulls in three.js / React Three Fiber is loaded on demand,
// so Home, About and Contact never download the 3D stack. The loaders are
// named so they can be warmed early.
//
// The game itself (launch + fight) runs INSIDE the hangar canvas, so it
// ships in the Projects chunk; only its DOM overlay is separate.
const loadProjects = () => import('./pages/Projects/Projects');
const loadDeployOverlay = () => import('./game/DeployOverlay');
const Projects = lazy(() => loadProjects().then((m) => ({ default: m.Projects })));
const DeployOverlay = lazy(() => loadDeployOverlay().then((m) => ({ default: m.DeployOverlay })));

function emptyHud() {
  return { bossScreen: null, beams: [], lockProgress: 0, locked: false };
}

const SECTIONS = ['home', 'about', 'projects', 'contact'];

// Wheel travel (px) that switches section. Accumulated, and reset every
// WHEEL_RESET_MS, so a deliberate flick switches and a stray nudge doesn't.
const WHEEL_THRESHOLD = 400;
const WHEEL_RESET_MS = 200;
// Upper bound on the section-switch lock, in case AnimatePresence never
// reports its exit (e.g. reduced motion skips the animation entirely).
const TRANSITION_LOCK_MS = 1700;

// Push-back transition between sections
const SECTION_VARIANTS = {
  initial: { scale: 1.1, opacity: 0, filter: 'brightness(2) blur(4px)' },
  enter: { scale: 1, opacity: 1, filter: 'brightness(1) blur(0px)', transition: { duration: 0.8, ease: 'easeOut' } },
  exit: { scale: 0.85, opacity: 0, filter: 'brightness(0.3) blur(8px)', transition: { duration: 0.8, ease: 'easeInOut' } },
};

// The boot layer only fades — scaling it would shrink the backdrop with it
const BOOT_VARIANTS = {
  enter: { opacity: 1, filter: 'brightness(1) blur(0px)', transition: { duration: 0.8, ease: 'easeOut' } },
  exit: { opacity: 0, filter: 'brightness(0.3) blur(8px)', transition: { duration: 0.8, ease: 'easeInOut' } },
};

/** deltaY in pixels, whatever unit the browser reported it in. */
function wheelPixels(e) {
  if (e.deltaMode === 1) return e.deltaY * 16; // lines (Firefox)
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight; // pages
  return e.deltaY;
}

function SectionLoading() {
  return <div className="section-loading">LOADING_HANGAR…</div>;
}

function App() {
  const [bootComplete, setBootComplete] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [isTransitioning, setIsTransitioning] = useState(false);
  // The project whose bay Projects should open on, or null for the first.
  const [openProjectId, setOpenProjectId] = useState(null);
  // The deploy session — DEPLOY → sortie (launch shot) → combat → return.
  // null, or { gundamId, phase: 'sortie' | 'combat', bossDef, runKey,
  // entry, paused, result }. The same session drives the 3D (through
  // Projects → HangarCorridor) and the DOM (DeployOverlay).
  const [deploySession, setDeploySession] = useState(null);
  const [sortieStage, setSortieStage] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const hudRef = useRef(emptyHud());
  const lockTimerRef = useRef(null);

  // Warm the hangar chunk while the boot sequence plays, so the first visit
  // to Projects doesn't wait on the network.
  useEffect(() => { loadProjects(); }, []);

  // Once someone is in the hangar, they may DEPLOY: warm the overlay too.
  useEffect(() => {
    if (activeSection === 'projects') loadDeployOverlay();
  }, [activeSection]);

  const unlock = useCallback(() => {
    clearTimeout(lockTimerRef.current);
    setIsTransitioning(false);
  }, []);
  useEffect(() => () => clearTimeout(lockTimerRef.current), []);

  const changeSection = useCallback((direction, targetSection = null) => {
    if (isTransitioning) return;

    let next = targetSection;
    if (!next) {
      const i = SECTIONS.indexOf(activeSection);
      if (direction === 'next' && i < SECTIONS.length - 1) next = SECTIONS[i + 1];
      else if (direction === 'prev' && i > 0) next = SECTIONS[i - 1];
      else return;
    } else if (next === activeSection) {
      return;
    }

    setIsTransitioning(true);
    setActiveSection(next);
    clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(unlock, TRANSITION_LOCK_MS);
  }, [activeSection, isTransitioning, unlock]);

  const handleNavigate = useCallback((sectionId) => {
    setOpenProjectId(null);
    changeSection(null, sectionId);
  }, [changeSection]);

  // Home's bounding-box launch: open the hangar on that project's bay.
  const handleOpenProject = useCallback((projectId) => {
    setOpenProjectId(projectId);
    changeSection(null, 'projects');
  }, [changeSection]);

  // ---- the deploy session ------------------------------------------
  const handleDeploy = useCallback((gundamId) => {
    hudRef.current = emptyHud();
    setSnapshot(null);
    setSortieStage(null);
    setDeploySession({
      gundamId, phase: 'sortie', bossDef: pickRandomBoss(), runKey: 0,
      entry: null, paused: false, result: null, skip: false,
    });
  }, []);

  // SPACE / CLICK during the launch shot: the director plays the rest of
  // the timeline fast rather than cutting, so a skip is still one shot.
  const handleSkip = useCallback(() => {
    setDeploySession((s) => (s && s.phase === 'sortie' ? { ...s, skip: true } : s));
  }, []);

  // The suit has left the catapult: the fight starts from there.
  const handleLaunched = useCallback((entry) => {
    setDeploySession((s) => (s ? { ...s, phase: 'combat', entry } : s));
  }, []);

  const handleCombatExit = useCallback((result) => {
    setDeploySession((s) => (s ? { ...s, result } : s));
  }, []);

  const handleTogglePause = useCallback(() => {
    setDeploySession((s) => (s && !s.result ? { ...s, paused: !s.paused } : s));
  }, []);

  // A new opponent, same launch point — no second launch, no cut.
  const handleRetry = useCallback(() => {
    hudRef.current = emptyHud();
    setSnapshot(null);
    setDeploySession((s) => (s ? {
      ...s, bossDef: pickRandomBoss(s.bossDef.id), runKey: s.runKey + 1, paused: false, result: null,
    } : s));
  }, []);

  // Back to the hangar. Projects never unmounted, so it is still on the bay
  // that deployed; the corridor re-docks the suit and re-frames the camera.
  const handleCombatReturn = useCallback(() => {
    setDeploySession(null);
    setSortieStage(null);
  }, []);

  // What the hangar canvas needs. Memoised on the fields it reads, so HUD
  // snapshots (~12/s, separate state) never re-render the 3D.
  const sortie = useMemo(() => deploySession && {
    gundamId: deploySession.gundamId,
    phase: deploySession.phase,
    bossDef: deploySession.bossDef,
    runKey: deploySession.runKey,
    entry: deploySession.entry,
    frozen: deploySession.paused || !!deploySession.result,
    skip: !!deploySession.skip,
    hudRef,
    onStage: setSortieStage,
    onLaunched: handleLaunched,
    onSnapshot: setSnapshot,
    onExit: handleCombatExit,
  }, [deploySession, handleLaunched, handleCombatExit]);

  const handleBootComplete = useCallback(() => setBootComplete(true), []);

  // Wheel → section switching. Only when the content under the pointer
  // can't scroll further in that direction, and never during a deploy.
  useEffect(() => {
    if (!bootComplete || isTransitioning || deploySession) return undefined;

    let accumulated = 0;

    const handleWheel = (e) => {
      if (e.target.closest('.hangar-info')) return;

      // The hangar is its own scroller; everything else scrolls inside the
      // section wrapper (.page-scroll).
      const scroller = e.target.closest('.projects-section, .page-scroll');
      if (scroller) {
        const atTop = scroller.scrollTop <= 0;
        const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
        if (e.deltaY > 0 && !atBottom) return;
        if (e.deltaY < 0 && !atTop) return;
      }

      accumulated += wheelPixels(e);
      if (accumulated > WHEEL_THRESHOLD) {
        changeSection('next');
        accumulated = 0;
      } else if (accumulated < -WHEEL_THRESHOLD) {
        changeSection('prev');
        accumulated = 0;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    const interval = setInterval(() => { accumulated = 0; }, WHEEL_RESET_MS);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      clearInterval(interval);
    };
  }, [bootComplete, isTransitioning, deploySession, changeSection]);

  const sectionIndex = SECTIONS.indexOf(activeSection);

  return (
    <MotionConfig reducedMotion="user">
      <CustomCursor />

      <div className="hex-grid-bg" />

      <AnimatePresence mode="wait">
        {!bootComplete ? (
          <motion.div
            key="boot"
            className="boot-layer"
            variants={BOOT_VARIANTS}
            initial="enter"
            animate="enter"
            exit="exit"
          >
            <BootSequence onComplete={handleBootComplete} />
          </motion.div>
        ) : (
          <div key="main" className="main-app">
            {/* The nav drops out during a deploy so it can't overlap the
                launch shot or the combat HUD. */}
            {!deploySession && <Navigation activeSection={activeSection} onNavigate={handleNavigate} />}
            <ScanlineOverlay />

            {/* Persistent across sections: every roster Gundam flies in the
                background. On Projects, the project-linked units drop out of
                this layer — they are the docked 3D models instead. Gone
                during a deploy: the hangar canvas is transparent, and 2D
                sprites drifting through space would sit behind the fight. */}
            {!deploySession && <GundamBackLayer activeSection={activeSection} />}

            {/* The section stays mounted through a deploy: the hangar canvas
                IS the stage for the launch and the fight. */}
            <main className="page-container">
              <AnimatePresence mode="wait" onExitComplete={unlock}>
                <motion.div
                  key={activeSection}
                  className="page-scroll"
                  variants={SECTION_VARIANTS}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                >
                  {activeSection === 'home' && <Home onOpenProject={handleOpenProject} />}
                  {activeSection === 'about' && <About />}
                  {activeSection === 'projects' && (
                    <Suspense fallback={<SectionLoading />}>
                      <Projects onDeploy={handleDeploy} openProjectId={openProjectId} sortie={sortie} />
                    </Suspense>
                  )}
                  {activeSection === 'contact' && <Contact />}

                  <ScrollIndicator direction="up" show={!deploySession && sectionIndex > 0} />
                  <ScrollIndicator direction="down" show={!deploySession && sectionIndex < SECTIONS.length - 1} />
                </motion.div>
              </AnimatePresence>
            </main>

            {/* Deploy flow, DOM half: the launch callouts, then the combat
                HUD. Text over the live canvas — never a backdrop. */}
            {deploySession && (
              <Suspense fallback={null}>
                <DeployOverlay
                  gundamId={deploySession.gundamId}
                  phase={deploySession.phase}
                  stage={sortieStage}
                  hudRef={hudRef}
                  snapshot={snapshot}
                  bossName={deploySession.bossDef.name}
                  result={deploySession.result}
                  paused={deploySession.paused}
                  onTogglePause={handleTogglePause}
                  onRetry={handleRetry}
                  onReturn={handleCombatReturn}
                  onSkip={handleSkip}
                  skipping={!!deploySession.skip}
                />
              </Suspense>
            )}
          </div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

export default App;
