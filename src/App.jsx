import { useState, useCallback, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'motion/react';
import { BootSequence } from './components/boot/BootSequence';
import { CustomCursor } from './components/ui/CustomCursor';
import { ScanlineOverlay } from './components/ui/ScanlineOverlay';
import { Navigation } from './components/ui/Navigation';
import { TransitionOverlay } from './components/ui/TransitionOverlay';
import { ScrollIndicator } from './components/ui/ScrollIndicator';
import { GundamBackLayer } from './components/ui/GundamBackgroundLayers';
import { Home } from './pages/Home/Home';
import { Projects } from './pages/Projects/Projects';
import { About } from './pages/About/About';
import { Contact } from './pages/Contact/Contact';
import { LaunchSequence } from './game/LaunchSequence';
import { Combat } from './game/Combat';
import './App.css';

const SECTIONS = ['home', 'about', 'projects', 'contact'];

function App() {
  const [bootComplete, setBootComplete] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [isTransitioning, setIsTransitioning] = useState(false);
  // null | { phase: 'launching' | 'combat', gundamId }
  const [deploySession, setDeploySession] = useState(null);

  const handleBootComplete = useCallback(() => {
    setBootComplete(true);
  }, []);

  const handleDeploy = useCallback((gundamId) => {
    setDeploySession({ phase: 'launching', gundamId });
  }, []);

  const handleLaunchComplete = useCallback(() => {
    setDeploySession((s) => (s ? { ...s, phase: 'combat' } : s));
  }, []);

  const handleCombatReturn = useCallback(() => {
    setDeploySession(null);
  }, []);

  const changeSection = useCallback((direction, targetSection = null) => {
    if (isTransitioning) return;
    
    let newSection = targetSection;
    
    if (!newSection) {
      const currentIndex = SECTIONS.indexOf(activeSection);
      if (direction === 'next' && currentIndex < SECTIONS.length - 1) {
        newSection = SECTIONS[currentIndex + 1];
      } else if (direction === 'prev' && currentIndex > 0) {
        newSection = SECTIONS[currentIndex - 1];
      } else {
        return; // out of bounds
      }
    } else if (newSection === activeSection) {
      return; // already on this section
    }

    setIsTransitioning(true);
    setActiveSection(newSection);

    // Give time for push-back / fall-in animation
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1200); 
  }, [activeSection, isTransitioning]);

  // Wheel listener for vertical scroll switching
  useEffect(() => {
    if (!bootComplete || isTransitioning) return;
    
    // Using an accumulator to prevent overly sensitive touchpad swipes from triggering multiple times
    let wheelAccumulator = 0;
    
    const handleWheel = (e) => {
      // Don't trigger if user is scrolling inside a scrollable container (like the hangar's info panel)
      if (e.target.closest('.hangar-info')) return;
      
      // Allow natural scrolling if the section content overflows
      const scrollContainer = e.target.closest('.eda-dashboard-section, .projects-section, .home-section, .contact-section');
      if (scrollContainer) {
        const isScrollingUp = e.deltaY < 0;
        const isScrollingDown = e.deltaY > 0;
        const atTop = scrollContainer.scrollTop <= 0;
        const atBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 1;
        
        // If it can scroll in the requested direction, don't change sections
        if (isScrollingDown && !atBottom) return;
        if (isScrollingUp && !atTop) return;
      }
      
      wheelAccumulator += e.deltaY;
      
      // Increased threshold to 800 for more deliberate scrolling
      if (wheelAccumulator > 800) {
        changeSection('next');
        wheelAccumulator = 0;
      } else if (wheelAccumulator < -800) {
        changeSection('prev');
        wheelAccumulator = 0;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    
    // Clear accumulator over time
    const interval = setInterval(() => { wheelAccumulator = 0; }, 200);
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
      clearInterval(interval);
    };
  }, [bootComplete, isTransitioning, changeSection]);



  const handleNavigate = useCallback((sectionId) => {
    changeSection(null, sectionId);
  }, [changeSection]);

  // Framer Motion variants for push-back animation
  const containerVariants = {
    initial: { scale: 1.1, opacity: 0, filter: 'brightness(2) blur(4px)' },
    enter: { scale: 1, opacity: 1, filter: 'brightness(1) blur(0px)', transition: { duration: 0.8, ease: "easeOut" } },
    exit: { scale: 0.85, opacity: 0, filter: 'brightness(0.3) blur(8px)', transition: { duration: 0.8, ease: "easeInOut" } }
  };

  // Specific variants for boot sequence to prevent background shrinking
  const bootVariants = {
    enter: { 
      opacity: 1, 
      filter: 'brightness(1) blur(0px)',
      transition: { duration: 0.8, ease: "easeOut" } 
    },
    exit: { 
      opacity: 0, 
      filter: 'brightness(0.3) blur(8px)',
      transition: { duration: 0.8, ease: "easeInOut" } 
    }
  };

  return (
    <>
      <CustomCursor />

      {/* Background Base */}
      <div className="hex-grid-bg" />

      <AnimatePresence mode="wait">
        {!bootComplete ? (
          <motion.div
            key="boot"
            variants={bootVariants}
            initial="enter"
            animate="enter"
            exit="exit"
            style={{ position: 'absolute', inset: 0, zIndex: 10000, transformOrigin: 'center center', width: '100%', height: '100vh' }}
          >
            <BootSequence onComplete={handleBootComplete} />
          </motion.div>
        ) : (
          <div key="main" className="main-app">

            {/* HUD Elements — nav drops out during a deploy session so it
                doesn't overlap the combat HUD's own controls/reticle. */}
            {!deploySession && <Navigation activeSection={activeSection} onNavigate={handleNavigate} />}
            <ScanlineOverlay />

            {/* Persistent, never unmounts across page navigation: every
                Gundam flies continuously in the background on every page.
                While Projects is active, the project-linked units drop
                out of this layer — they're the docked 3D models in the
                hangar corridor instead (see game/hangar/HangarCorridor.jsx). */}
            <GundamBackLayer activeSection={activeSection} />

            {/* Sections Container for Push-Back Transition */}
            <div className="page-container" style={{ position: 'relative', zIndex: 2 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  variants={containerVariants}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  style={{ position: 'absolute', inset: 0, transformOrigin: 'center center', width: '100%', height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}
                >
                  {/* Home and Projects now take extra props to handle deep-linking. We will add them later. */}
                  {activeSection === 'home' && <Home onNavigate={handleNavigate} />}
                  {activeSection === 'about' && <About />}
                  {activeSection === 'projects' && <Projects onDeploy={handleDeploy} />}
                  {activeSection === 'contact' && <Contact />}

                  {/* Scroll Indicators inside the push-back container so they transition out together */}
                  <ScrollIndicator direction="up" show={SECTIONS.indexOf(activeSection) > 0} />
                  <ScrollIndicator direction="down" show={SECTIONS.indexOf(activeSection) < SECTIONS.length - 1} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Deploy flow: hangar's DEPLOY button -> catapult launch
                cinematic -> 3D combat duel -> Retry/Return back here.
                Rendered as full-screen overlays above everything else,
                outside the section push-back cycle. */}
            {deploySession?.phase === 'launching' && (
              <LaunchSequence gundamId={deploySession.gundamId} onComplete={handleLaunchComplete} />
            )}
            {deploySession?.phase === 'combat' && (
              <Combat gundamId={deploySession.gundamId} onReturn={handleCombatReturn} />
            )}

          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
