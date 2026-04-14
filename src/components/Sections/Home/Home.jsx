import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PROJECTS_ARRAY, TERMINAL_MESSAGES } from '../../../data/siteData';
import { ScrambleText } from '../../HUD/ScrambleText';
import './Home.css';

export function Home({ onNavigate }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollingMessages, setScrollingMessages] = useState([{ id: 0, text: TERMINAL_MESSAGES[0], time: new Date().toLocaleTimeString('en-US', { hour12: false }) }]);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouse = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 15,
        y: (e.clientY / window.innerHeight - 0.5) * 15,
      });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  // Scrolling Terminal Logic
// 1. Updated useEffect (Simplified)
useEffect(() => {
  let currentIdx = TERMINAL_MESSAGES.length; // Start after initial messages
  
  const interval = setInterval(() => {
    const nextMsg = TERMINAL_MESSAGES[currentIdx % TERMINAL_MESSAGES.length];
    
    setScrollingMessages(prev => {
      const newMessage = { 
        id: Date.now(), // Use a unique timestamp for the key
        text: nextMsg, 
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
      };

      const newArr = [...prev, newMessage];
      // Keep a bit more buffer (e.g., 8 items) to ensure the screen stays full during transition
      return newArr.slice(-8); 
    });
    
    currentIdx++;
  }, 2500); // Slightly slower interval feels more readable

  return () => clearInterval(interval);
}, []);

  return (
    <section className="home-section" id="home">
      {/* 3D Parallax Container */}
      <div
        className="home-parallax"
        ref={containerRef}
        style={{
          transform: `translate(${mousePos.x * -0.5}px, ${mousePos.y * -0.5}px)`,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        {/* Dynamic CV Analysis Overlay - Orbiting Further Out */}
        <div className="cv-overlay" style={{ zIndex: 1 }}>
          {PROJECTS_ARRAY.map((project, index) => (
            <CVBoundingBox 
              key={project.id} 
              project={project} 
              index={index} 
              total={PROJECTS_ARRAY.length} 
              onNavigate={onNavigate} 
            />
          ))}
        </div>

        {/* Centerpiece Text */}
        <motion.div
          className="nero-centerpiece"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ zIndex: 2, pointerEvents: 'none' }}
        >
          <div className="nero-title" style={{ fontSize: '8rem', margin: 0, lineHeight: 1 }}>
            <ScrambleText text="Nero G" duration={600} />
          </div>
          
        </motion.div>

        {/* Mission Log / Scrolling Terminal */}
        <motion.div
          className="mission-log hud-panel"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          style={{ width: '1000px', height: '420px', marginTop: '40px', zIndex: 2 }}
        >
          <div className="mission-log__header" style={{ borderBottom: '1px solid var(--nerd-accent-red)' }}>
            <span className="blink-dot" style={{ backgroundColor: 'var(--nerd-accent-red)' }}></span> <ScrambleText text="MISSION_LOG :: ACTIVE" />
          </div>
          <div className="mission-log__content" style={{ maxHeight: '320px', overflow: 'hidden' }}>
            <AnimatePresence>
              {scrollingMessages.map((msgItem) => (
                <motion.div
                  key={msgItem.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                  className="mission-log__message"
                >
                  <span className="log-timestamp" style={{ color: 'var(--nerd-accent-yellow)' }}>{msgItem.time}</span>
                  <span className="log-text">{msgItem.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Bounding Box Component for CV Overlay
function CVBoundingBox({ project, index, total, onNavigate }) {
  const [dim, setDim] = useState({ w: 180, h: 100, x: 0, y: 0 });
  const [confidence, setConfidence] = useState(0.99);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const scramble = () => {
      // Create an orbit that specifically avoids the center using elliptical projection
      const angle = (index / total) * Math.PI * 2 + (Math.random() - 0.5);
      
      // Much wider X radius, shorter Y radius to avoid center block, closer to border
      const radiusX = 650 + Math.random() * 250; 
      const radiusY = 400 + Math.random() * 200;
      
      setDim({
        w: 240 + Math.random() * 60,
        h: 140 + Math.random() * 40,
        x: Math.cos(angle) * radiusX,
        y: Math.sin(angle) * radiusY,
      });
      setConfidence((0.85 + Math.random() * 0.14).toFixed(2));
    };
    
    scramble();
    const interval = setInterval(scramble, 5000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [index, total]);

  const handleClick = (e) => {
    e.preventDefault();
    if (onNavigate) {
       window.sessionStorage.setItem('openProject', project.id);
       onNavigate('sorties');
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`cv-bounding-box project-scanner ${isHovered ? 'locked-on' : ''}`}
      animate={{
        width: dim.w,
        height: dim.h,
        x: dim.x,
        y: dim.y,
        borderColor: isHovered ? 'var(--nerd-accent-red)' : 'var(--nerd-primary)',
        backgroundColor: isHovered ? 'rgba(255, 0, 60, 0.05)' : 'transparent'
      }}
      transition={{ duration: 2.5, ease: "easeInOut" }}
      style={{
        position: 'absolute',
        border: '1px solid var(--nerd-primary)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '5px',
        color: 'var(--color-text-primary)',
      }}
      data-clickable
    >
      <div className="cv-box-corner top-left" style={{ borderColor: isHovered ? 'var(--nerd-accent-red)' : 'var(--nerd-primary)' }}></div>
      <div className="cv-box-corner top-right" style={{ borderColor: isHovered ? 'var(--nerd-accent-red)' : 'var(--nerd-primary)' }}></div>
      <div className="cv-box-corner bottom-left" style={{ borderColor: isHovered ? 'var(--nerd-accent-red)' : 'var(--nerd-primary)' }}></div>
      <div className="cv-box-corner bottom-right" style={{ borderColor: isHovered ? 'var(--nerd-accent-red)' : 'var(--nerd-primary)' }}></div>
      
      <div className="cv-label-container" style={{ background: 'var(--panel-bg-dark)', padding: '2px 8px', fontSize: '0.8rem', zIndex: 2 }}>
        <span className="cv-label" style={{ color: isHovered ? 'var(--nerd-accent-red)' : 'var(--nerd-primary)' }}>[{project.id}]</span>
        <span className="cv-confidence" style={{ marginLeft: '5px', color: 'var(--nerd-accent-yellow)' }}>CONF: {confidence}</span>
      </div>
      
      <div className="cv-expanded-details" style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s', textAlign: 'center', marginTop: '10px', pointerEvents: 'none' }}>
        <div className="cv-proj-title" style={{ fontSize: '0.9rem', color: '#fff', textShadow: '0 0 5px red' }}>{project.title}</div>
        <div className="cv-proj-action" style={{ color: 'var(--nerd-accent-red)', fontSize: '0.8rem', marginTop: '5px' }}>CLICK TO INTERCEPT &gt;&gt;</div>
      </div>
    </motion.button>
  );
}
