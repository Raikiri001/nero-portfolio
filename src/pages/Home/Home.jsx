import { useRef, useEffect, useState, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { PROJECTS_ARRAY, TERMINAL_MESSAGES, SITE_TEXT } from '../../data/siteData';
import { GUNDAM_ROSTER } from '../../data/gundamVisuals.jsx';
import { ScrambleText } from '../../components/ui/ScrambleText';
import { MultiLockCanvas } from '../../components/ui/MultiLockCanvas';
import './Home.css';

// First N entries in GUNDAM_ROSTER map 1:1 to PROJECTS_ARRAY (in order).
// Everything after that is held in reserve — flown as non-interactive
// background units until a matching project exists.
const AMBIENT_GUNDAM_IDS = GUNDAM_ROSTER.map((_, i) => i).slice(PROJECTS_ARRAY.length);

// ... existing Home component ...
export function Home({ onNavigate }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [lockTarget, setLockTarget] = useState(null);

  // Message Pool for non-duplicating sequence
  const messagePoolRef = useRef([]);

  const getNextMessage = useCallback(() => {
    if (messagePoolRef.current.length === 0) {
      // Refill and shuffle the pool
      messagePoolRef.current = [...TERMINAL_MESSAGES].sort(() => Math.random() - 0.5);
    }
    return messagePoolRef.current.pop();
  }, []);

  // Initialize with a random starting message
  const [scrollingMessages, setScrollingMessages] = useState(() => {
    const startMsg = [...TERMINAL_MESSAGES].sort(() => Math.random() - 0.5)[0];
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

  // Scrolling Terminal Logic - Shuffled Deck Order
  useEffect(() => {
    const interval = setInterval(() => {
      setScrollingMessages(prev => {
        const nextMsg = getNextMessage();

        const newMessage = {
          id: Date.now(),
          text: nextMsg,
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        const newArr = [...prev, newMessage];
        return newArr.slice(-20);
      });
    }, 3500); // 3.5s for a better data-stream feel

    return () => clearInterval(interval);
  }, [getNextMessage]);

  return (
    <section className="home-section" id="home">
      {/* Multi-lock overlay */}
      {lockTarget && <MultiLockCanvas target={lockTarget} />}

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
        <div className="ambient-gundams" style={{ zIndex: 0 }}>
          {AMBIENT_GUNDAM_IDS.map((gundamId, i) => (
            <AmbientGundam key={gundamId} gundamId={gundamId} seed={i} />
          ))}
        </div>

        <div className="cv-overlay" style={{ zIndex: 1 }}>
          {PROJECTS_ARRAY.map((project, index) => (
            <CVBoundingBox
              key={project.id}
              project={project}
              index={index}
              total={PROJECTS_ARRAY.length}
              onNavigate={onNavigate}
              setLockTarget={setLockTarget}
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
          <div className="nero-title" style={{ margin: 0, lineHeight: 1 }}>
            <ScrambleText text={SITE_TEXT.home.title} duration={600} />
          </div>
        </motion.div>

        <motion.div
          className="mission-log hud-panel"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          style={{ width: 'min(95%, 1000px)', height: 'clamp(200px, 45vh, 420px)', marginTop: 'clamp(15px, 3vh, 40px)', zIndex: 2 }}
        >
          <div className="mission-log__header" style={{ borderBottom: '1px solid var(--nerd-accent-red)' }}>
            <ScrambleText text={SITE_TEXT.home.terminalHeader} />
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
function CVBoundingBox({ project, index, total, onNavigate, setLockTarget }) {
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
      } while (attempts <= 15);

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
    
    const rect = e.currentTarget.getBoundingClientRect();
    setLockTarget({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });

    if (onNavigate) {
      setTimeout(() => {
        window.sessionStorage.setItem('openProject', project.id);
        onNavigate('projects');
        setLockTarget(null);
      }, 800);
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
      <span className="cv-box-internal-tgt">{SITE_TEXT.home.targetPrefix}{project.id.replace('proj_', '')}</span>

      <div className="cv-box-corner top-left"></div>
      <div className="cv-box-corner top-right"></div>
      <div className="cv-box-corner bottom-left"></div>
      <div className="cv-box-corner bottom-right"></div>

      <Robot dir={robotDir} gundamId={index} />

      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="cv-expanded-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ textAlign: 'center', marginTop: '10px', pointerEvents: 'none', zIndex: 10, position: 'relative', overflow: 'hidden' }}
          >
            <div className="cv-proj-title" style={{ fontSize: '0.9rem', color: '#fff', textShadow: '0 0 5px red' }}>{project.title}</div>
            <div className="cv-proj-action" style={{ color: 'var(--nerd-accent-red)', fontSize: '0.8rem', marginTop: '5px' }}>{SITE_TEXT.home.interceptLabel}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function MSBody({
  chest = "#0055ff", waist = "#f0f0f0",
  shoulder = "#f0f0f0", shoulderAccent = "#0055ff",
  arm = "#f0f0f0", joint = "#a0a0a0", leg = "#f0f0f0", knee = "#ff0000", foot = "#ff0000",
  vfin = "#fff", visor = "#00ffcc", chin = "#ff0000",
  headBase = "#f0f0f0", centerChest = "#ff0000",
  hideShoulders = false, hideChest = false, hideVfin = false, hideVisor = false,
  wings = null, customParts = null
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
      {!hideVisor && <polygon points="27,12 33,12 32,14 28,14" fill={visor} />}
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

      <g opacity="0.5">
        <line x1="15" y1="35" x2="14" y2="41" stroke="#000" strokeWidth="0.6" />
        <line x1="45" y1="35" x2="46" y2="41" stroke="#000" strokeWidth="0.6" />
        <line x1="21" y1="55" x2="20" y2="62" stroke="#000" strokeWidth="0.6" />
        <line x1="39" y1="55" x2="40" y2="62" stroke="#000" strokeWidth="0.6" />
        <polygon points="27,36 33,36 32,39 28,39" fill="#000" opacity="0.3" />
      </g>

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

  const gundam = GUNDAM_ROSTER[gundamId % GUNDAM_ROSTER.length];

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

// Decorative-only unit for Gundams not yet tied to a project. Drifts slowly
// in the background at reduced scale/opacity. No pointer events, no hover
// or clickable states — purely ambient, held in reserve for future projects.
function AmbientGundam({ gundamId, seed }) {
  const [dir, setDir] = useState('idle');
  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);
  const prevPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    const wander = () => {
      const targetX = (Math.random() - 0.5) * (window.innerWidth - 100);
      const targetY = (Math.random() - 0.5) * (window.innerHeight - 100);

      const dx = targetX - prevPosRef.current.x;
      const dy = targetY - prevPosRef.current.y;
      let d = [];
      if (dy < -50) d.push('up');
      if (dy > 50) d.push('down');
      if (dx < -50) d.push('left');
      if (dx > 50) d.push('right');
      if (d.length === 0) d.push('idle');
      setDir(d.join('-'));
      prevPosRef.current = { x: targetX, y: targetY };

      const duration = 9 + Math.random() * 6;
      animate(motionX, targetX, { duration, ease: 'easeInOut' });
      animate(motionY, targetY, { duration, ease: 'easeInOut' });

      if (!cancelled) {
        timeoutId = setTimeout(wander, duration * 1000);
      }
    };

    const initialDelay = (seed % 10) * 350;
    timeoutId = setTimeout(wander, initialDelay);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [motionX, motionY, seed]);

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        x: motionX,
        y: motionY,
        scale: 0.5,
        opacity: 0.3,
        pointerEvents: 'none'
      }}
    >
      <Robot dir={dir} gundamId={gundamId} />
    </motion.div>
  );
}
