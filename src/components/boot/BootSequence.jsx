import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SYSTEM_BOOT_SEQUENCE, SITE_TEXT } from '../../data/siteData';
import './BootSequence.css';

const CHAR_MS = 15;      // typing speed
const LINE_PAUSE_MS = 150;
const PROMPT_DELAY_MS = 500;

// Types SYSTEM_BOOT_SEQUENCE out line by line, then waits for any key or a
// click before handing over to the site.
export function BootSequence({ onComplete }) {
  const [stage, setStage] = useState('terminal'); // terminal → awaiting_input
  const [lines, setLines] = useState([]);
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const awaiting = stage === 'awaiting_input';

  useEffect(() => {
    if (!awaiting) return undefined;
    window.addEventListener('keydown', onComplete);
    return () => window.removeEventListener('keydown', onComplete);
  }, [awaiting, onComplete]);

  useEffect(() => {
    if (stage !== 'terminal') return undefined;

    if (lineIdx >= SYSTEM_BOOT_SEQUENCE.length) {
      const t = setTimeout(() => setStage('awaiting_input'), PROMPT_DELAY_MS);
      return () => clearTimeout(t);
    }

    const target = SYSTEM_BOOT_SEQUENCE[lineIdx];
    if (charIdx < target.length) {
      const t = setTimeout(() => {
        setLines((prev) => {
          const next = [...prev];
          next[lineIdx] = target.substring(0, charIdx + 1);
          return next;
        });
        setCharIdx((c) => c + 1);
      }, CHAR_MS);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setLineIdx((i) => i + 1);
      setCharIdx(0);
    }, LINE_PAUSE_MS);
    return () => clearTimeout(t);
  }, [stage, lineIdx, charIdx]);

  return (
    <div
      className="boot-sequence"
      onClick={awaiting ? onComplete : undefined}
      role={awaiting ? 'button' : undefined}
      tabIndex={awaiting ? 0 : undefined}
      aria-label={awaiting ? SITE_TEXT.boot.initializeLabel : undefined}
    >
      <AnimatePresence>
        <motion.div
          className="boot-sequence__stage"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <div className="boot-sequence__text" aria-live="polite">
            {lines.map((line, idx) => (
              <div key={idx} className="boot-sequence__line">
                {line}
                {idx === lineIdx && <span className="boot-sequence__cursor">█</span>}
                {idx < lineIdx && <span className="boot-sequence__ok"> [OK]</span>}
              </div>
            ))}

            {awaiting && (
              <div className="boot-sequence__line boot-sequence__line--prompt">
                {SITE_TEXT.boot.initializeLabel}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
