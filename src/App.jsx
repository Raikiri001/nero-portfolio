import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BootSequence } from './components/BootSequence/BootSequence';
import { CustomCursor } from './components/HUD/CustomCursor';
import { ScanlineOverlay } from './components/HUD/ScanlineOverlay';
import { Navigation } from './components/HUD/Navigation';
import { TransitionOverlay } from './components/HUD/TransitionOverlay';
import { ScrollIndicator } from './components/HUD/ScrollIndicator';
import { Home } from './components/Sections/Home/Home';
import { Portfolio } from './components/Sections/Portfolio/Portfolio';
import { Hangar } from './components/Sections/Hangar/Hangar';
import { Contact } from './components/Sections/Contact/Contact';
import './App.css';

const SECTIONS = ['home', 'about', 'sorties', 'comms'];

function App() {
  const [bootComplete, setBootComplete] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Mouse tracking for background
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleBootComplete = useCallback(() => {
    setBootComplete(true);
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
      // Don't trigger if user is scrolling inside a scrollable container (like the mission detail overlay)
      if (e.target.closest('.mission-detail') || e.target.closest('.mission-detail-overlay')) return;
      
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

  // Mouse tracking for tactical grid reveal
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleNavigate = useCallback((sectionId) => {
    changeSection(null, sectionId);
  }, [changeSection]);

  // Framer Motion variants for push-back animation
  const containerVariants = {
    initial: { scale: 1.1, opacity: 0, filter: 'brightness(2) blur(4px)' },
    enter: { scale: 1, opacity: 1, filter: 'brightness(1) blur(0px)', transition: { duration: 0.8, ease: "easeOut" } },
    exit: { scale: 0.85, opacity: 0, filter: 'brightness(0.3) blur(8px)', transition: { duration: 0.8, ease: "easeInOut" } }
  };

  return (
    <>
      <CustomCursor />

      <AnimatePresence mode="wait">
        {!bootComplete ? (
          <BootSequence key="boot" onComplete={handleBootComplete} />
        ) : (
          <div key="main" className="main-app">
            
            {/* Background Base */}
            <div className="hex-grid-bg" />
            
            {/* HUD Elements */}
            <Navigation activeSection={activeSection} onNavigate={handleNavigate} />
            <ScanlineOverlay />

            {/* Sections Container for Push-Back Transition */}
            <div className="page-container" style={{ position: 'relative', zIndex: 2 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  variants={containerVariants}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  style={{ position: 'absolute', inset: 0, transformOrigin: 'center center', width: '100%', height: '100vh', overflow: 'hidden' }}
                >
                  {/* Home and Sorties now take extra props to handle deep-linking. We will add them later. */}
                  {activeSection === 'home' && <Home onNavigate={handleNavigate} />}
                  {activeSection === 'about' && <Hangar />}
                  {activeSection === 'sorties' && <Portfolio />}
                  {activeSection === 'comms' && <Contact />}
                  
                  {/* Scroll Indicators inside the push-back container so they transition out together */}
                  <ScrollIndicator direction="up" show={SECTIONS.indexOf(activeSection) > 0} />
                  <ScrollIndicator direction="down" show={SECTIONS.indexOf(activeSection) < SECTIONS.length - 1} />
                </motion.div>
              </AnimatePresence>
            </div>
            
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
