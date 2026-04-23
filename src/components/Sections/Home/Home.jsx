import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { PROJECTS_ARRAY, TERMINAL_MESSAGES } from '../../../data/siteData';
import { ScrambleText } from '../../HUD/ScrambleText';
import './Home.css';

// ... existing Home component ...
export function Home({ onNavigate }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const [scrollingMessages, setScrollingMessages] = useState([{ id: 0, text: TERMINAL_MESSAGES[0], time: new Date().toLocaleTimeString('en-US', { hour12: false }) }]);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouse = (e) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 15);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 15);
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [mouseX, mouseY]);

  // Scrolling Terminal Logic
  useEffect(() => {
    let currentIdx = TERMINAL_MESSAGES.length;

    const interval = setInterval(() => {
      const nextMsg = TERMINAL_MESSAGES[currentIdx % TERMINAL_MESSAGES.length];

      setScrollingMessages(prev => {
        const newMessage = {
          id: Date.now(),
          text: nextMsg,
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        const newArr = [...prev, newMessage];
        return newArr.slice(-8);
      });

      currentIdx++;
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="home-section" id="home">
      <motion.div
        className="home-parallax"
        ref={containerRef}
        style={{
          x: useTransform(mouseX, value => value * -0.5),
          y: useTransform(mouseY, value => value * -0.5),
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}
      >
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

        <motion.div
          className="nero-centerpiece"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ zIndex: 2, pointerEvents: 'none' }}
        >
          <div className="nero-title" style={{ fontSize: '8rem', margin: 0, lineHeight: 1 }}>
            <ScrambleText text="NERO GARCIA" duration={600} />
          </div>
        </motion.div>

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
                  <span className="log-timestamp" style={{ color: 'var(--nerd-accent-red)' }}>{msgItem.time}</span>
                  <span className="log-text">{msgItem.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

// Bounding Box Component for CV Overlay
function CVBoundingBox({ project, index, total, onNavigate }) {
  const [dim, setDim] = useState({ w: 240, h: 140 });
  const [isHovered, setIsHovered] = useState(false);
  const [robotDir, setRobotDir] = useState('idle');

  // Motion Values for real-time tracking
  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);

  const mouseRef = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0 });
  const prevPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleGlobalMouse = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleGlobalMouse);
    return () => window.removeEventListener('mousemove', handleGlobalMouse);
  }, []);

  useEffect(() => {
    const scramble = () => {
      let targetX = 0, targetY = 0;
      let attempts = 0;

      const mX = mouseRef.current.x - window.innerWidth / 2;
      const mY = mouseRef.current.y - window.innerHeight / 2;

      do {
        targetX = (Math.random() - 0.5) * (window.innerWidth - 300);
        targetY = (Math.random() - 0.5) * (window.innerHeight - 200);

        const distToMouse = Math.hypot(targetX - mX, targetY - mY);
        if (distToMouse > 350 || attempts > 15) {
          break;
        }
        attempts++;
      } while (true);

      setDim({
        w: 240 + Math.random() * 60,
        h: 140 + Math.random() * 40,
      });
      
      const dx = targetX - prevPosRef.current.x;
      const dy = targetY - prevPosRef.current.y;
      
      let dir = [];
      if (dy < -50) dir.push('up');
      if (dy > 50) dir.push('down');
      if (dx < -50) dir.push('left');
      if (dx > 50) dir.push('right');
      
      if (dir.length === 0) dir.push('idle');
      setRobotDir(dir.join('-'));

      prevPosRef.current = { x: targetX, y: targetY };

      // Animate the motion values directly for smooth real-time interpolation
      animate(motionX, targetX, { duration: 4.5 + Math.random(), ease: "easeInOut" });
      animate(motionY, targetY, { duration: 4.5 + Math.random(), ease: "easeInOut" });
    };

    scramble();
    const interval = setInterval(scramble, 5000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [index, total, motionX, motionY]);

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
        borderColor: isHovered ? 'var(--nerd-accent-red)' : 'var(--nerd-primary)',
        backgroundColor: isHovered ? 'rgba(255, 0, 60, 0.05)' : 'transparent'
      }}
      style={{
        position: 'absolute',
        // Bind position to motion values
        x: motionX,
        y: motionY,
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
      <span className="cv-box-tgt" style={{ zIndex: 10 }}>TGT #{project.id.replace('proj_', '')}</span>

      <div className="cv-box-corner top-left" style={{ borderColor: isHovered ? 'var(--nerd-accent-red)' : 'var(--nerd-primary)' }}></div>
      <div className="cv-box-corner top-right" style={{ borderColor: isHovered ? 'var(--nerd-accent-red)' : 'var(--nerd-primary)' }}></div>
      <div className="cv-box-corner bottom-left" style={{ borderColor: isHovered ? 'var(--nerd-accent-red)' : 'var(--nerd-primary)' }}></div>
      <div className="cv-box-corner bottom-right" style={{ borderColor: isHovered ? 'var(--nerd-accent-red)' : 'var(--nerd-primary)' }}></div>

      <Robot dir={robotDir} />

      <div className="cv-expanded-details" style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s', textAlign: 'center', marginTop: '10px', pointerEvents: 'none', zIndex: 10, position: 'relative' }}>
        <div className="cv-proj-title" style={{ fontSize: '0.9rem', color: '#fff', textShadow: '0 0 5px red' }}>{project.title}</div>
        <div className="cv-proj-action" style={{ color: 'var(--nerd-accent-red)', fontSize: '0.8rem', marginTop: '5px' }}>CLICK TO INTERCEPT</div>
      </div>
    </motion.button>
  );
}

function Robot({ dir }) {
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

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        pointerEvents: 'none',
        opacity: 0.8,
        zIndex: 0
      }}
      animate={{ rotate: tilt, x: '-50%', y: '-50%' }}
      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
    >
      <svg width="60" height="70" viewBox="0 0 60 70">
        {showMainThruster && (
          <motion.path
            d="M 22 55 L 30 70 L 38 55 Z"
            fill="var(--nerd-accent-red)"
            animate={{ opacity: [0.4, 1, 0.4], scaleY: [0.8, 1.4, 0.8] }}
            transition={{ duration: 0.15, repeat: Infinity }}
            style={{ transformOrigin: "30px 55px" }}
          />
        )}

        {showRightThruster && (
          <motion.path
            d="M 45 35 L 60 45 L 45 42 Z"
            fill="var(--nerd-accent-red)"
            animate={{ opacity: [0.4, 1, 0.4], scaleX: [0.8, 1.4, 0.8] }}
            transition={{ duration: 0.15, repeat: Infinity }}
            style={{ transformOrigin: "45px 35px" }}
          />
        )}

        {showLeftThruster && (
          <motion.path
            d="M 15 35 L 0 45 L 15 42 Z"
            fill="var(--nerd-accent-red)"
            animate={{ opacity: [0.4, 1, 0.4], scaleX: [0.8, 1.4, 0.8] }}
            transition={{ duration: 0.15, repeat: Infinity }}
            style={{ transformOrigin: "15px 35px" }}
          />
        )}

        <path d="M 30 5 L 26 12 L 34 12 Z" fill="var(--nerd-accent-yellow)" />
        <path d="M 24 12 L 36 12 L 38 22 L 22 22 Z" fill="var(--nerd-primary)" />
        <rect x="25" y="15" width="10" height="3" fill="#0ff" /> 
        
        <path d="M 20 25 L 40 25 L 36 45 L 24 45 Z" fill="var(--nerd-primary)" stroke="rgba(0,144,217,0.5)" strokeWidth="1"/>
        <path d="M 25 28 L 35 28 L 33 35 L 27 35 Z" fill="rgba(0,144,217,0.3)" />

        <path d="M 10 25 L 20 25 L 18 32 L 10 35 Z" fill="var(--nerd-primary)" />
        <path d="M 40 25 L 50 25 L 50 35 L 42 32 Z" fill="var(--nerd-primary)" />
        
        <rect x="12" y="36" width="6" height="15" fill="var(--nerd-primary)" rx="2" />
        <rect x="42" y="36" width="6" height="15" fill="var(--nerd-primary)" rx="2" />

        <path d="M 24 48 L 28 48 L 28 55 L 22 55 Z" fill="var(--nerd-primary)" />
        <path d="M 32 48 L 36 48 L 38 55 L 32 55 Z" fill="var(--nerd-primary)" />
      </svg>
    </motion.div>
  );
}
