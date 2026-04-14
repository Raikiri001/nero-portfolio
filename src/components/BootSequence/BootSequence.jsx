import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useASCIIRenderer } from '../../hooks/useASCIIRenderer';
import { useSoundEngine } from '../../hooks/useSoundEngine';
import { PILOT_HELMET_EMBLEM } from '../../data/ascii-art';
import { SYSTEM_BOOT_SEQUENCE } from '../../data/siteData';
import './BootSequence.css';

export function BootSequence({ onComplete }) {
  const [stage, setStage] = useState('gate'); // gate → terminal → ascii-helmet → burst → done
  const [terminalLines, setTerminalLines] = useState([]);
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [activeCharIdx, setActiveCharIdx] = useState(0);
  
  const [showBurst, setShowBurst] = useState(false);
  const [gateVisible, setGateVisible] = useState(true);

  const sound = useSoundEngine();
  const gateClickedRef = useRef(false);

  const helmetRenderer = useASCIIRenderer(PILOT_HELMET_EMBLEM, { speed: 40 }); // slightly faster

  // Gate click handler
  const handleGateClick = useCallback(() => {
    if (gateClickedRef.current) return;
    gateClickedRef.current = true;
    sound.enable();
    sound.ping();
    setGateVisible(false);
    setTimeout(() => setStage('terminal'), 600);
  }, [sound]);

  // Terminal Typing Logic
  useEffect(() => {
    if (stage === 'terminal') {
      if (activeLineIdx >= SYSTEM_BOOT_SEQUENCE.length) {
        // Finished typing all lines
        setTimeout(() => setStage('ascii-helmet'), 800);
        return;
      }

      const currentTargetLine = SYSTEM_BOOT_SEQUENCE[activeLineIdx];

      if (activeCharIdx < currentTargetLine.length) {
        const timeout = setTimeout(() => {
          setTerminalLines(prev => {
            const newLines = [...prev];
            if (!newLines[activeLineIdx]) newLines[activeLineIdx] = '';
            newLines[activeLineIdx] = currentTargetLine.substring(0, activeCharIdx + 1);
            return newLines;
          });
          setActiveCharIdx(prev => prev + 1);
          
          if (activeCharIdx % 3 === 0) sound.ping(); // subtle typing sound
        }, 15); // typing speed
        return () => clearTimeout(timeout);
      } else {
        // Line complete, delay before next line
        const timeout = setTimeout(() => {
          setActiveLineIdx(prev => prev + 1);
          setActiveCharIdx(0);
        }, 150);
        return () => clearTimeout(timeout);
      }
    }
  }, [stage, activeLineIdx, activeCharIdx, sound]);

  // Helmet ASCII rendering
  useEffect(() => {
    if (stage === 'ascii-helmet') {
      sound.hiss();
      helmetRenderer.start();
    }
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (helmetRenderer.isComplete && stage === 'ascii-helmet') {
      setTimeout(() => setStage('burst'), 800);
    }
  }, [helmetRenderer.isComplete, stage]);

  // Simple CSS Flash / Transition
  useEffect(() => {
    if (stage === 'burst') {
      sound.ping(); // Subtle ready sound instead of heavy laser
      setShowBurst(true);
      setTimeout(() => {
        onComplete();
      }, 500); // Fast transition to main site
    }
  }, [stage, sound, onComplete]);

  return (
    <div className="boot-sequence">
      {/* Gate Screen */}
      <AnimatePresence>
        {stage === 'gate' && (
          <motion.div
            className="boot-gate"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={handleGateClick}
          >
            <div className={`gate-content ${!gateVisible ? 'gate-content--fading' : ''}`}>
              <div className="gate-reticle">
                <div className="gate-reticle__ring gate-reticle__ring--outer" />
                <div className="gate-reticle__ring gate-reticle__ring--inner" />
                <div className="gate-reticle__cross" />
              </div>
              <div className="gate-label">
                <span className="gate-label__bracket">[</span>
                <span className="gate-label__text">CLICK TO INITIALIZE SYSTEM BOOT</span>
                <span className="gate-label__bracket">]</span>
              </div>
              <div className="gate-sublabel">N.E.R.O. TACTICAL OS v3.0.0 — AWAITING INPUT</div>
              <div className="gate-pulse-ring" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminal Typing Sequence */}
      <AnimatePresence>
        {stage === 'terminal' && (
          <motion.div
            className="boot-stage boot-neural"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="neural-text" style={{ flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', lineHeight: '1.6' }}>
              {terminalLines.map((line, idx) => (
                <div key={idx} className="neural-text__content">
                  {line}
                  {idx === activeLineIdx && <span className="neural-cursor">█</span>}
                  {idx < activeLineIdx && <span className="neural-text__ok"> [OK]</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ASCII Helmet */}
      <AnimatePresence>
        {stage === 'ascii-helmet' && (
          <motion.div
            className="boot-stage boot-ascii"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="ascii-header" style={{ color: 'var(--nerd-primary)' }}>◆ N.E.R.O. OS KERNEL — VISUAL SENSOR ACTIVE</div>
            <pre className="ascii-render" style={{ color: 'var(--nerd-primary)', textShadow: 'var(--text-glow-primary)' }}>
              {helmetRenderer.lines.map((line, i) => (
                <div key={`helmet-${i}`} className="ascii-line">{line}</div>
              ))}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simple Full Screen Flash */}
      <AnimatePresence>
        {showBurst && (
          <motion.div 
            className="system-ready-flash"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ 
              position: 'fixed', inset: 0, zIndex: 9999, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'var(--nerd-primary)', mixBlendMode: 'screen' 
            }}
          >
            <h1 style={{ color: '#fff', fontSize: '10rem', fontFamily: 'var(--font-ui)', letterSpacing: '0.2em' }}>SYSTEM_READY</h1>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
