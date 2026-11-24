import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { PROJECTS_ARRAY, TERMINAL_MESSAGES, SITE_TEXT } from '../../data/siteData';
import { ScrambleText } from '../../components/ui/ScrambleText';
import { MultiLockCanvas } from '../../components/ui/MultiLockCanvas';
import { MechaBattleCanvas } from '../../components/ui/MechaBattleCanvas';
import { Robot } from '../../components/ui/GundamRobot';
import './Home.css';

/** Fisher–Yates — an unbiased shuffle (sort-by-random is not). */
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const timestamp = () => new Date().toLocaleTimeString('en-GB', {
  hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
});

export function Home({ onOpenProject }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const parallaxX = useTransform(mouseX, (v) => v * -0.5);
  const parallaxY = useTransform(mouseY, (v) => v * -0.5);
  // Raw pointer position, shared by every bounding box so they can wander
  // away from it — one window listener for the whole page, not one per box.
  const pointerRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [lockTarget, setLockTarget] = useState(null);

  // Terminal messages are dealt from a shuffled deck so nothing repeats
  // until every message has been shown once.
  const deckRef = useRef([]);
  const nextMessage = useCallback(() => {
    if (deckRef.current.length === 0) deckRef.current = shuffled(TERMINAL_MESSAGES);
    return deckRef.current.pop();
  }, []);

  const [messages, setMessages] = useState(() => [
    { id: 0, text: nextMessage(), time: timestamp() },
  ]);

  useEffect(() => {
    const handleMouse = (e) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 15);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 15);
    };
    window.addEventListener('mousemove', handleMouse, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [mouseX, mouseY]);

  useEffect(() => {
    let id = 1;
    const interval = setInterval(() => {
      setMessages((prev) => [...prev, { id: id++, text: nextMessage(), time: timestamp() }].slice(-20));
    }, 3500);
    return () => clearInterval(interval);
  }, [nextMessage]);

  return (
    <section className="home-section" id="home">
      {lockTarget && <MultiLockCanvas target={lockTarget} />}

      <motion.div className="home-parallax" style={{ x: parallaxX, y: parallaxY }}>
        <div className="cv-overlay">
          {PROJECTS_ARRAY.map((project, index) => (
            <CVBoundingBox
              key={project.id}
              project={project}
              index={index}
              pointerRef={pointerRef}
              onOpenProject={onOpenProject}
              setLockTarget={setLockTarget}
            />
          ))}
        </div>

        <motion.div
          className="nero-centerpiece"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="nero-title">
            <ScrambleText text={SITE_TEXT.home.title} duration={600} />
          </h1>
        </motion.div>

        <motion.div
          className="mission-log hud-panel"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="mission-log__header">
            <ScrambleText text={SITE_TEXT.home.terminalHeader} />
          </div>
          <div className="mission-log__content" aria-live="polite">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                  className="mission-log__message"
                >
                  <span className="mission-log__time">{msg.time}</span>
                  <span className="mission-log__text">{msg.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

// Box size shrinks with the viewport so seven boxes still fit on a phone.
function randomDim() {
  const s = Math.max(0.65, Math.min(1, window.innerWidth / 1024));
  return { w: (240 + Math.random() * 60) * s, h: (140 + Math.random() * 40) * s };
}

// One wandering CV bounding box. Click it and its Gundam fights off a
// missile barrage, launches, and hands off to that project's hangar bay.
function CVBoundingBox({ project, index, pointerRef, onOpenProject, setLockTarget }) {
  const [dim, setDim] = useState(randomDim);
  const [isHovered, setIsHovered] = useState(false);
  const [robotDir, setRobotDir] = useState('idle');
  const boxRef = useRef(null);

  // idle -> bracing (freezes + stands upright) -> battling (missile barrage;
  // 'defend' fights it off, 'evade' just runs from it) -> launching (angles
  // up and flies off) -> navigation happens once launching finishes.
  const [phase, setPhase] = useState('idle');
  const phaseRef = useRef('idle');
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const [mode, setMode] = useState('defend');
  const [battleTarget, setBattleTarget] = useState(null);
  // Whether MechaBattleCanvas is mounted. Deliberately NOT the same as
  // `phase === 'battling'`: in evade mode the launch fires before the
  // missile pack's own scatter-and-explode tail has finished, and gating the
  // canvas on `phase` would cut that tail off mid-scatter. This stays true
  // until the canvas's own onComplete says it is done.
  const [battleActive, setBattleActive] = useState(false);
  const [powering, setPowering] = useState(false);

  // Every one-shot timer this box starts, so unmounting mid-sequence (the
  // launch navigates away from Home) never fires into a dead component.
  const timersRef = useRef(new Set());
  const later = useCallback((fn, ms) => {
    const t = setTimeout(() => { timersRef.current.delete(t); fn(); }, ms);
    timersRef.current.add(t);
  }, []);
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  // Start just off-screen past a random edge so every box visibly flies
  // inward on load instead of all fanning out from the centre.
  const [initialPos] = useState(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 150 + Math.random() * 150;
    switch (Math.floor(Math.random() * 4)) {
      case 0: return { x: (Math.random() - 0.5) * vw, y: -vh / 2 - pad };
      case 1: return { x: (Math.random() - 0.5) * vw, y: vh / 2 + pad };
      case 2: return { x: -vw / 2 - pad, y: (Math.random() - 0.5) * vh };
      default: return { x: vw / 2 + pad, y: (Math.random() - 0.5) * vh };
    }
  });

  const motionX = useMotionValue(initialPos.x);
  const motionY = useMotionValue(initialPos.y);
  const prevPosRef = useRef(initialPos);

  // Idle wander: pick a point away from the pointer every few seconds.
  useEffect(() => {
    const wander = () => {
      if (phaseRef.current !== 'idle') return;

      const mX = pointerRef.current.x - window.innerWidth / 2;
      const mY = pointerRef.current.y - window.innerHeight / 2;
      let targetX = 0;
      let targetY = 0;
      for (let attempts = 0; attempts <= 15; attempts++) {
        targetX = (Math.random() - 0.5) * (window.innerWidth - 300);
        targetY = (Math.random() - 0.5) * (window.innerHeight - 200);
        if (Math.hypot(targetX - mX, targetY - mY) > 350) break;
      }

      setDim(randomDim());

      const dx = targetX - prevPosRef.current.x;
      const dy = targetY - prevPosRef.current.y;
      const dir = [];
      if (dy < -50) dir.push('up');
      if (dy > 50) dir.push('down');
      if (dx < -50) dir.push('left');
      if (dx > 50) dir.push('right');
      setRobotDir(dir.length ? dir.join('-') : 'idle');

      prevPosRef.current = { x: targetX, y: targetY };
      animate(motionX, targetX, { duration: 4.5 + Math.random(), ease: 'easeInOut' });
      animate(motionY, targetY, { duration: 4.5 + Math.random(), ease: 'easeInOut' });
    };

    wander();
    const interval = setInterval(wander, 5000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [pointerRef, motionX, motionY]);

  // Evade mode: banks away along a continuous curving heading — each leg
  // turns by a limited angle from the last, so it reads as one flowing
  // flight path being outrun rather than teleporting between points.
  useEffect(() => {
    if (phase !== 'battling' || mode !== 'evade') return undefined;

    let timeoutId;
    let heading = Math.random() * Math.PI * 2;
    const boundX = (window.innerWidth - 220) / 2;
    const boundY = (window.innerHeight - 180) / 2;
    // On a small viewport a fixed dash distance clips a wall almost every
    // leg, and the reflected heading feeds straight into the missiles' aim
    // point — it reads as the missiles jittering. Scale the dash to fit.
    const spaceScale = Math.max(0.35, Math.min(1, Math.min(boundX, boundY) / 300));

    const dash = () => {
      heading += (Math.random() - 0.5) * Math.PI * 0.7;

      const dist = (340 + Math.random() * 280) * spaceScale;
      let targetX = prevPosRef.current.x + Math.cos(heading) * dist;
      let targetY = prevPosRef.current.y + Math.sin(heading) * dist;

      if (targetX > boundX) { targetX = boundX; heading = Math.PI - heading; }
      if (targetX < -boundX) { targetX = -boundX; heading = Math.PI - heading; }
      if (targetY > boundY) { targetY = boundY; heading = -heading; }
      if (targetY < -boundY) { targetY = -boundY; heading = -heading; }

      const dx = targetX - prevPosRef.current.x;
      const dy = targetY - prevPosRef.current.y;
      const dir = [];
      if (dy < -40) dir.push('up');
      if (dy > 40) dir.push('down');
      if (dx < -40) dir.push('left');
      if (dx > 40) dir.push('right');
      setRobotDir(dir.length ? dir.join('-') : 'idle');
      prevPosRef.current = { x: targetX, y: targetY };

      const duration = 1.15 + Math.random() * 0.55;
      animate(motionX, targetX, { duration, ease: 'easeInOut' });
      animate(motionY, targetY, { duration, ease: 'easeInOut' });
      timeoutId = setTimeout(dash, duration * 1000);
    };

    dash();
    return () => clearTimeout(timeoutId);
  }, [phase, mode, motionX, motionY]);

  const getLiveTarget = useCallback(() => {
    const el = boxRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  const freeze = () => {
    animate(motionX, motionX.get(), { duration: 0 });
    animate(motionY, motionY.get(), { duration: 0 });
  };

  const handleClick = (e) => {
    e.preventDefault();
    if (phase !== 'idle') return;

    freeze();
    const rect = e.currentTarget.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    prevPosRef.current = center;

    setMode(Math.random() < 0.5 ? 'evade' : 'defend');
    setLockTarget(center);
    setBattleTarget(center);
    setRobotDir('idle');
    setPhase('bracing');

    // A brief "standing to attention" beat before the barrage appears.
    later(() => {
      setPhase('battling');
      setBattleActive(true);
    }, 380);
  };

  const handleCounter = useCallback(() => {
    setPowering(true);
    later(() => setPowering(false), 450);
  }, [later]);

  // The barrage has resolved enough to launch: freeze in place, angle up and
  // fly off, ping the nav title as it passes, then open this project's bay.
  // The `phaseRef` guard stops it firing twice.
  const handleBoost = () => {
    if (phaseRef.current === 'launching') return;

    freeze();
    setLockTarget(null);
    setPhase('launching');

    later(() => window.dispatchEvent(new CustomEvent('gundam-title-ping')), 550);
    later(() => onOpenProject?.(project.id), mode === 'evade' ? 1150 : 780);
  };

  // The canvas's own animation has genuinely finished — safe to unmount it.
  // Defend mode has no separate boost signal, so this is its launch
  // trigger; evade mode already launched via onBoost.
  const handleBattleCanvasComplete = () => {
    setBattleActive(false);
    if (mode !== 'evade') handleBoost();
  };

  return (
    <motion.button
      ref={boxRef}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className={`cv-bounding-box ${isHovered ? 'cv-bounding-box--hot' : ''}`}
      aria-label={`${project.title} — ${SITE_TEXT.home.interceptLabel}`}
      animate={{ width: dim.w, height: dim.h }}
      style={{ x: motionX, y: motionY }}
      data-clickable
    >
      <span className="cv-box-internal-tgt">{SITE_TEXT.home.targetPrefix}{project.id.replace('proj_', '')}</span>

      <span className="cv-box-corner cv-box-corner--tl" />
      <span className="cv-box-corner cv-box-corner--tr" />
      <span className="cv-box-corner cv-box-corner--bl" />
      <span className="cv-box-corner cv-box-corner--br" />

      {battleActive && battleTarget && (
        <MechaBattleCanvas
          target={battleTarget}
          gundamId={index}
          mode={mode}
          getLiveTarget={mode === 'evade' ? getLiveTarget : undefined}
          onCounter={handleCounter}
          onBoost={mode === 'evade' ? handleBoost : undefined}
          onComplete={handleBattleCanvasComplete}
        />
      )}

      {/* Power-surge flash as the counter-attack fires, so it reads as the
          mech's own doing rather than a random effect. */}
      {powering && (
        <motion.span
          className="cv-power-flash"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.6, 2.1] }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      )}

      <motion.span
        className="cv-robot"
        animate={
          phase === 'launching'
            ? { rotate: [0, -30, -18], y: [0, -30, -900], opacity: [1, 1, 0], scale: [1, 1.15, 1.3] }
            : { rotate: 0, y: 0, opacity: 1, scale: 1 }
        }
        transition={
          phase === 'launching'
            ? { duration: 0.75, times: [0, 0.3, 1], ease: 'easeIn' }
            : { duration: 0.3 }
        }
      >
        <Robot dir={robotDir} gundamId={index} />
      </motion.span>

      <AnimatePresence>
        {isHovered && (
          <motion.span
            className="cv-expanded-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            aria-hidden="true"
          >
            <span className="cv-proj-title">{project.title}</span>
            <span className="cv-proj-action">{SITE_TEXT.home.interceptLabel}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
