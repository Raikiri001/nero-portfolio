import { useRef, useEffect, useState, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { PROJECTS_ARRAY, TERMINAL_MESSAGES, SITE_TEXT } from '../../data/siteData';
import { ScrambleText } from '../../components/ui/ScrambleText';
import { MultiLockCanvas } from '../../components/ui/MultiLockCanvas';
import { MechaBattleCanvas } from '../../components/ui/MechaBattleCanvas';
import { Robot } from '../../components/ui/GundamRobot';
import './Home.css';

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
  // `phase === 'battling'` — in evade mode the Gundam's launch (`phase`
  // flips to 'launching') fires early, well before the missile pack's own
  // scatter-and-explode tail is done playing. Gating the canvas's mount on
  // `phase` used to unmount it (cancelling its rAF loop) the instant the
  // boost fired, cutting that tail off mid-scatter instead of letting it
  // finish. This stays true until the canvas's own onComplete says it's
  // genuinely done.
  const [battleActive, setBattleActive] = useState(false);
  const [powering, setPowering] = useState(false);

  // Start just off-screen past a random edge (offset from the box's
  // center-anchored static position) so every box visibly flies inward on
  // load instead of all seven fanning out from the exact same center point.
  const [initialPos] = useState(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const edge = Math.floor(Math.random() * 4);
    const pad = 150 + Math.random() * 150;
    switch (edge) {
      case 0: return { x: (Math.random() - 0.5) * vw, y: -vh / 2 - pad };
      case 1: return { x: (Math.random() - 0.5) * vw, y: vh / 2 + pad };
      case 2: return { x: -vw / 2 - pad, y: (Math.random() - 0.5) * vh };
      default: return { x: vw / 2 + pad, y: (Math.random() - 0.5) * vh };
    }
  });

  // Motion Values for real-time tracking
  const motionX = useMotionValue(initialPos.x);
  const motionY = useMotionValue(initialPos.y);

  const mouseRef = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0 });
  const prevPosRef = useRef(initialPos);

  useEffect(() => {
    const handleGlobalMouse = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleGlobalMouse);
    return () => window.removeEventListener('mousemove', handleGlobalMouse);
  }, []);

  useEffect(() => {
    const scramble = () => {
      if (phaseRef.current !== 'idle') return;

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

  // Evade mode: instead of standing its ground, banks away and keeps
  // gliding along a continuous curving heading — each leg only turns by a
  // limited angle from the last, so it reads as one flowing flight path
  // being outrun, rather than teleporting between random points. Stops the
  // moment the chase ends and the launch sequence takes over (see
  // handleBoost) — no separate "boost" dash beforehand, which used to look
  // like an unmotivated teleport right before it flew up.
  useEffect(() => {
    if (phase !== 'battling' || mode !== 'evade') return;

    let timeoutId;
    let heading = Math.random() * Math.PI * 2;
    const boundX = (window.innerWidth - 220) / 2;
    const boundY = (window.innerHeight - 180) / 2;
    // On a narrow/short viewport (mobile) these bounds are small relative to
    // the fixed 340-620px dash distance below, so almost every dash clipped
    // a wall and got its heading reflected — several sharp bounces per
    // chase instead of one flowing path. That reflected heading feeds
    // straight into the missile pack's aim point (getLiveTarget), so it
    // read as the missiles themselves jittering. Scaling the dash distance
    // down with the available space keeps it a full, uninterrupted glide on
    // any screen size instead of a corner-bound ping-pong.
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
      animate(motionX, targetX, { duration, ease: "easeInOut" });
      animate(motionY, targetY, { duration, ease: "easeInOut" });
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

  const handleClick = (e) => {
    e.preventDefault();
    if (phase !== 'idle') return;

    // Freeze exactly where it is right now — cancel whatever wander
    // animation was already mid-flight rather than letting it keep sliding.
    animate(motionX, motionX.get(), { duration: 0 });
    animate(motionY, motionY.get(), { duration: 0 });

    const rect = e.currentTarget.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    prevPosRef.current = center;

    setMode(Math.random() < 0.5 ? 'evade' : 'defend');
    setLockTarget(center);
    setBattleTarget(center);
    setRobotDir('idle');
    setPhase('bracing');

    // Brief "standing to attention" beat before the barrage appears.
    setTimeout(() => {
      setPhase('battling');
      setBattleActive(true);
    }, 380);
  };

  const handleCounter = useCallback(() => {
    setPowering(true);
    setTimeout(() => setPowering(false), 450);
  }, []);

  // Missile barrage has resolved enough to launch — in defend mode this is
  // the counter's aftermath; in evade mode it's the chasing pack losing the
  // lock (fired as `onBoost` from MechaBattleCanvas, well before that
  // canvas's own scatter-and-explode tail is done — see `battleActive`
  // above and handleBattleCanvasComplete below for why the canvas itself
  // keeps playing independently of this). Freeze in place (cancels any
  // in-flight wander/chase dash so the launch starts from one stable point
  // instead of continuing to drift sideways), angle up and fly off, ping
  // the site title as it passes, then hand off to Projects. The `phase`
  // guard stops this from firing twice. The Robot itself rejoins the
  // ambient background layer (GundamBackgroundLayers), which keeps flying
  // underneath regardless of page, and pops back up next to its card once
  // Projects is open.
  const handleBoost = () => {
    if (phaseRef.current === 'launching') return;

    animate(motionX, motionX.get(), { duration: 0 });
    animate(motionY, motionY.get(), { duration: 0 });

    setLockTarget(null);
    setPhase('launching');

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('gundam-title-ping'));
    }, 550);

    setTimeout(() => {
      if (onNavigate) {
        window.sessionStorage.setItem('openProject', project.id);
        onNavigate('projects');
      }
    }, mode === 'evade' ? 1150 : 780);
  };

  // The canvas's own animation has genuinely finished (defend mode's
  // counter resolution, or evade mode's missile scatter-and-explode tail
  // playing all the way out) — safe to unmount it now. Defend mode has no
  // separate boost signal, so this doubles as its launch trigger; evade
  // mode already launched earlier via onBoost, so here it's purely cleanup.
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

      {/* Brief power-surge flash right as the counter-attack fires, so it
          reads unmistakably as the mech's own doing, not a random effect. */}
      {powering && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.6, 2.1] }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(120,200,255,0.4) 40%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />
      )}

      <motion.div
        key="robot"
        style={{ position: 'absolute', inset: 0 }}
        animate={
          phase === 'launching'
            ? { rotate: [0, -30, -18], y: [0, -30, -900], opacity: [1, 1, 0], scale: [1, 1.15, 1.3] }
            : { rotate: 0, y: 0, opacity: 1, scale: 1 }
        }
        transition={
          phase === 'launching'
            ? { duration: 0.75, times: [0, 0.3, 1], ease: "easeIn" }
            : { duration: 0.3 }
        }
      >
        <Robot dir={robotDir} gundamId={index} />
      </motion.div>

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
