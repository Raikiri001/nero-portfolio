import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useASCIIRenderer } from '../../hooks/useASCIIRenderer';
import { useSoundEngine } from '../../hooks/useSoundEngine';
import { PILOT_HELMET_EMBLEM } from '../../data/ascii-art';
import { SYSTEM_BOOT_SEQUENCE } from '../../data/siteData';
import './BootSequence.css';

export function BootSequence({ onComplete }) {
  const [stage, setStage] = useState('terminal'); // terminal → awaiting_input → done
  const [terminalLines, setTerminalLines] = useState([]);
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [activeCharIdx, setActiveCharIdx] = useState(0);
  
  const [showBurst, setShowBurst] = useState(false);
  const [gateVisible, setGateVisible] = useState(true);

  const sound = useSoundEngine();
  const gateClickedRef = useRef(false);

  const helmetRenderer = useASCIIRenderer(PILOT_HELMET_EMBLEM, { speed: 40 }); // slightly faster

  // Input stage completion
  const handleComplete = useCallback(() => {
    sound.enable();
    sound.ping();
    onComplete();
  }, [sound, onComplete]);

  useEffect(() => {
    if (stage === 'awaiting_input') {
      const handleKeyDown = () => handleComplete();
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [stage, handleComplete]);

  // Terminal Typing Logic
  useEffect(() => {
    if (stage === 'terminal') {
      if (activeLineIdx >= SYSTEM_BOOT_SEQUENCE.length) {
        // Finished typing all lines
        setTimeout(() => setStage('awaiting_input'), 500);
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

  // ASCII Helmet logic removed

  // Burst logic removed

  return (
    <div 
      className="boot-sequence" 
      onClick={stage === 'awaiting_input' ? handleComplete : undefined}
      style={{ cursor: stage === 'awaiting_input' ? 'pointer' : 'default' }}
    >
      {/* Gate Screen */}
      {/* Gate Screen Removed */}

      {/* Terminal Typing Sequence */}
      <AnimatePresence>
        {(stage === 'terminal' || stage === 'awaiting_input') && (
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

              {stage === 'awaiting_input' && (
                <div className="neural-text__content neural-text__content--blink" style={{ marginTop: '10px' }}>
                  CLICK OR PRESS ANY KEY TO INITIALIZE
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ASCII Helmet Removed */}

      {/* System Ready Flash Removed */}
    </div>
  );
}
