import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { PROJECTS_ARRAY, TERMINAL_MESSAGES } from '../../../data/siteData';
import { ScrambleText } from '../../HUD/ScrambleText';
import './Home.css';

// ... existing Home component ...
export function Home({ onNavigate }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Initialize with a random starting message to avoid "first message twice" and start random immediately
  const [scrollingMessages, setScrollingMessages] = useState(() => {
    const startMsg = TERMINAL_MESSAGES[Math.floor(Math.random() * TERMINAL_MESSAGES.length)];
    return [{ 
      id: Date.now(), 
      text: startMsg, 
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
    }];
  });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouse = (e) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 15);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 15);
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [mouseX, mouseY]);

  // Scrolling Terminal Logic - Random Order
  useEffect(() => {
    const interval = setInterval(() => {
      setScrollingMessages(prev => {
        // Pick a random message that isn't the same as the last one if possible
        let randomIndex = Math.floor(Math.random() * TERMINAL_MESSAGES.length);
        const lastMsgText = prev[prev.length - 1]?.text;
        
        // Simple retry once to get a different one if list > 1
        if (TERMINAL_MESSAGES.length > 1 && TERMINAL_MESSAGES[randomIndex] === lastMsgText) {
          randomIndex = (randomIndex + 1) % TERMINAL_MESSAGES.length;
        }

        const nextMsg = TERMINAL_MESSAGES[randomIndex];

        const newMessage = {
          id: Date.now(),
          text: nextMsg,
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        const newArr = [...prev, newMessage];
        return newArr.slice(-8);
      });
    }, 3000); // Slightly slower for better readability

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
      <span className="cv-box-internal-tgt">TGT #{project.id.replace('proj_', '')}</span>

      <div className="cv-box-corner top-left"></div>
      <div className="cv-box-corner top-right"></div>
      <div className="cv-box-corner bottom-left"></div>
      <div className="cv-box-corner bottom-right"></div>

      <Robot dir={robotDir} gundamId={index} />

      <div className="cv-expanded-details" style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s', textAlign: 'center', marginTop: '10px', pointerEvents: 'none', zIndex: 10, position: 'relative' }}>
        <div className="cv-proj-title" style={{ fontSize: '0.9rem', color: '#fff', textShadow: '0 0 5px red' }}>{project.title}</div>
        <div className="cv-proj-action" style={{ color: 'var(--nerd-accent-red)', fontSize: '0.8rem', marginTop: '5px' }}>CLICK TO INTERCEPT</div>
      </div>
    </motion.button>
  );
}

function MSBody({ 
  primary="#f0f0f0", chest="#0055ff", waist="#f0f0f0", 
  shoulder="#f0f0f0", shoulderAccent="#0055ff",
  arm="#f0f0f0", joint="#a0a0a0", leg="#f0f0f0", knee="#ff0000", foot="#ff0000",
  vfin="#fff", visor="#00ffcc", chin="#ff0000",
  headBase="#f0f0f0", centerChest="#ff0000",
  hideShoulders=false, hideChest=false, hideVfin=false,
  wings=null, customParts=null
}) {
  return (
    <g>
      {wings}
      {!hideVfin && (
        <g>
          <path d="M 30 7 L 22 2 L 28 9 Z" fill={vfin} />
          <path d="M 30 7 L 38 2 L 32 9 Z" fill={vfin} />
        </g>
      )}
      <polygon points="29,7 31,7 30,10" fill={chin} />
      <polygon points="26,10 34,10 35,17 25,17" fill={headBase} />
      <polygon points="27,12 33,12 32,14 28,14" fill={visor} />
      <polygon points="28,17 32,17 30,20" fill={chin} />

      <polygon points="25,18 35,18 33,21 27,21" fill={joint} />
      {!hideChest && (
        <g>
          <polygon points="22,21 38,21 36,30 24,30" fill={chest} />
          <polygon points="23,23 28,23 28,26 24,26" fill="#444" />
          <polygon points="32,23 37,23 36,26 32,26" fill="#444" />
          <polygon points="28,26 32,26 33,33 27,33" fill={centerChest} />
        </g>
      )}

      <polygon points="26,30 34,30 35,36 25,36" fill={joint} />
      <polygon points="23,36 29,36 29,44 21,44" fill={waist} />
      <polygon points="31,36 37,36 39,44 31,44" fill={waist} />
      <polygon points="29,34 31,34 32,42 28,42" fill={chin} />
      
      {!hideShoulders && (
        <g>
          <polygon points="12,19 22,19 22,26 10,26" fill={shoulder} />
          <polygon points="13,20 21,20 21,23 12,23" fill={shoulderAccent} />
          <polygon points="38,19 48,19 50,26 38,26" fill={shoulder} />
          <polygon points="39,20 47,20 48,23 39,23" fill={shoulderAccent} />
        </g>
      )}

      <polygon points="15,26 19,26 19,33 16,33" fill={joint} />
      <polygon points="14,33 20,33 19,43 12,43" fill={arm} />
      <polygon points="41,26 45,26 44,33 41,33" fill={joint} />
      <polygon points="40,33 46,33 48,43 41,43" fill={arm} />

      <polygon points="22,44 28,44 28,52 21,52" fill={joint} />
      <polygon points="20,52 29,52 30,64 17,64" fill={leg} />
      <polygon points="22,50 28,50 28,55 21,55" fill={knee} />
      <polygon points="17,64 28,64 29,68 15,68" fill={foot} />
      
      <polygon points="32,44 38,44 39,52 32,52" fill={joint} />
      <polygon points="31,52 40,52 43,64 30,64" fill={leg} />
      <polygon points="32,50 38,50 39,55 32,55" fill={knee} />
      <polygon points="32,64 43,64 45,68 31,68" fill={foot} />

      {customParts}
    </g>
  );
}

function Robot({ dir, gundamId = 0 }) {
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

  const id = gundamId % 9;
  
  const getGundamProps = () => {
    switch (id) {
      case 0: // Strike Freedom
        return {
          props: { chest: "#111", centerChest: "#DAA520", joint: "#DAA520", vfin: "#DAA520", wings: (
            <g>
              <path d="M 20 25 L -15 -10 L 5 15 Z" fill="#0055ff" />
              <path d="M 20 25 L -25 5 L 0 20 Z" fill="#DAA520" />
              <path d="M 40 25 L 75 -10 L 55 15 Z" fill="#0055ff" />
              <path d="M 40 25 L 85 5 L 60 20 Z" fill="#DAA520" />
            </g>
          ) },
          thruster: "#0055ff"
        };
      case 1: // Infinite Justice
        return {
          props: { primary: "#ff0055", chest: "#80002a", headBase: "#ff0055", shoulder: "#ff0055", arm: "#ff0055", leg: "#ff0055", joint: "#d0d0d0", visor: "#0f0", chin: "#fff", wings: (
            <g>
              <path d="M 25 22 L 5 5 L 15 20 Z" fill="#d0d0d0" />
              <path d="M 35 22 L 55 5 L 45 20 Z" fill="#d0d0d0" />
              <polygon points="15,20 45,20 40,15 20,15" fill="#ff0055" />
            </g>
          ) },
          thruster: "#ff0055"
        };
      case 2: // Destiny
        return {
          props: { chest: "#55bbee", centerChest: "#ff0033", visor: "#0f0", foot: "#ff0033", wings: (
            <g>
              <path d="M 20 25 L -20 -15 L 0 10 L -30 15 L 5 25 Z" fill="#ff0033" opacity="0.8" />
              <path d="M 40 25 L 80 -15 L 60 10 L 90 15 L 55 25 Z" fill="#ff0033" opacity="0.8" />
              <path d="M 25 20 L 5 -5 L 15 15 Z" fill="#222" />
              <path d="M 35 20 L 55 -5 L 45 15 Z" fill="#222" />
            </g>
          ) },
          thruster: "#ff0033"
        };
      case 3: // Astray Red Frame
        return {
          props: { chest: "#f0f0f0", centerChest: "#ff0000", joint: "#ff0000", shoulder: "#ff0000", shoulderAccent: "#f0f0f0", arm: "#f0f0f0", leg: "#f0f0f0", knee: "#ff0000", chin: "#ff0000", customParts: (
            <g>
              <path d="M 15 35 L -5 50 L -3 52 L 17 37 Z" fill="#111" />
              <path d="M -5 50 L -15 60 L -14 61 L -3 52 Z" fill="#d0d0d0" />
            </g>
          ) },
          thruster: "#ff0000"
        };
      case 4: // Exia
        return {
          props: { hideChest: true, foot: "#0055ff", customParts: (
            <g>
              <polygon points="24,21 36,21 34,30 26,30" fill="#0055ff" />
              <circle cx="30" cy="25" r="4" fill="#00ffcc" />
              <polygon points="26,27 34,27 30,32" fill="#ff0000" />
              <path d="M 12 19 L 5 30" stroke="#00ffcc" strokeWidth="2" opacity="0.7" />
              <path d="M 48 19 L 55 30" stroke="#00ffcc" strokeWidth="2" opacity="0.7" />
            </g>
          ) },
          thruster: "#00ffcc"
        };
      case 5: // Mighty Strike Freedom
        return {
          props: { chest: "#111", centerChest: "#DAA520", joint: "#DAA520", vfin: "#DAA520", wings: (
            <g>
              <path d="M 25 22 L -15 -10 L 5 15 Z" fill="#fff" />
              <path d="M 25 22 L -25 5 L 0 20 Z" fill="#DAA520" />
              <path d="M -15 -10 L -25 5 L 0 20" stroke="#ff00aa" strokeWidth="2" fill="none" opacity="0.8" />
              <path d="M 35 22 L 75 -10 L 55 15 Z" fill="#fff" />
              <path d="M 35 22 L 85 5 L 60 20 Z" fill="#DAA520" />
              <path d="M 75 -10 L 85 5 L 60 20" stroke="#ff00aa" strokeWidth="2" fill="none" opacity="0.8" />
            </g>
          ) },
          thruster: "#ff00aa"
        };
      case 6: // Eclipse
        return {
          props: { chest: "#f0f0f0", centerChest: "#0055ff", waist: "#ff0000", hideShoulders: true, hideVfin: true, customParts: (
            <g>
              <path d="M 30 9 L 20 0 L 26 8 Z" fill="#DAA520" />
              <path d="M 30 9 L 40 0 L 34 8 Z" fill="#DAA520" />
              <polygon points="28,5 32,5 30,12" fill="#0055ff" />
              <polygon points="12,24 22,24 16,5 Z" fill="#f0f0f0" />
              <polygon points="14,24 20,24 16,10 Z" fill="#0055ff" />
              <polygon points="38,24 48,24 44,5 Z" fill="#f0f0f0" />
              <polygon points="40,24 46,24 44,10 Z" fill="#0055ff" />
            </g>
          ) },
          thruster: "#0055ff"
        };
      case 7: // Strike
        return {
          props: { chest: "#0055ff", centerChest: "#f0f0f0", waist: "#f0f0f0", wings: (
            <g>
              <polygon points="20,20 10,10 5,25 15,30" fill="#222" />
              <polygon points="40,20 50,10 55,25 45,30" fill="#222" />
              <polygon points="10,10 5,12 8,25" fill="#ff0000" />
              <polygon points="50,10 55,12 52,25" fill="#ff0000" />
            </g>
          ) },
          thruster: "#00bfff"
        };
      case 8: // Rising Freedom
        return {
          props: { chest: "#111", centerChest: "#0055ff", visor: "#0f0", chin: "#ff0000", wings: (
            <g>
              <path d="M 20 25 L -10 -15 L 5 15 Z" fill="#0055ff" />
              <path d="M 20 25 L -20 0 L 10 20 Z" fill="#fff" />
              <path d="M 40 25 L 70 -15 L 55 15 Z" fill="#0055ff" />
              <path d="M 40 25 L 80 0 L 50 20 Z" fill="#fff" />
            </g>
          ) },
          thruster: "#0055ff"
        };
      default:
        return { props: {}, thruster: "var(--nerd-accent-red)" };
    }
  };

  const gundam = getGundamProps();

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        pointerEvents: 'none',
        opacity: 0.85,
        zIndex: 0
      }}
      animate={{ rotate: tilt, x: '-50%', y: '-50%' }}
      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
    >
      <svg width="60" height="70" viewBox="0 0 60 70" style={{ overflow: 'visible' }}>
        {showMainThruster && (
          <g>
            <motion.path
              d="M 21 66 L 25 80 L 28 66 Z"
              fill={gundam.thruster}
              animate={{ opacity: [0.4, 1, 0.4], scaleY: [0.8, 1.4, 0.8] }}
              transition={{ duration: 0.15, repeat: Infinity }}
              style={{ transformOrigin: "25px 66px" }}
            />
            <motion.path
              d="M 32 66 L 35 80 L 39 66 Z"
              fill={gundam.thruster}
              animate={{ opacity: [0.4, 1, 0.4], scaleY: [0.8, 1.4, 0.8] }}
              transition={{ duration: 0.15, repeat: Infinity }}
              style={{ transformOrigin: "35px 66px" }}
            />
          </g>
        )}

        {showRightThruster && (
          <motion.path
            d="M 45 23 L 65 30 L 45 33 Z"
            fill={gundam.thruster}
            animate={{ opacity: [0.4, 1, 0.4], scaleX: [0.8, 1.4, 0.8] }}
            transition={{ duration: 0.15, repeat: Infinity }}
            style={{ transformOrigin: "45px 28px" }}
          />
        )}

        {showLeftThruster && (
          <motion.path
            d="M 15 23 L -5 30 L 15 33 Z"
            fill={gundam.thruster}
            animate={{ opacity: [0.4, 1, 0.4], scaleX: [0.8, 1.4, 0.8] }}
            transition={{ duration: 0.15, repeat: Infinity }}
            style={{ transformOrigin: "15px 28px" }}
          />
        )}

        <MSBody {...gundam.props} />
      </svg>
    </motion.div>
  );
}
