import { useEffect, useMemo, useRef } from 'react';
import './ScrambleText.css';

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*()_+{}:"<>?/';
const SCRAMBLE_MS = 600;  // how long each character churns before settling
const TICK_MS = 30;       // churn rate
const WORD_STAGGER_MS = 200;
const CHAR_STAGGER_MS = 80;

const randomChar = () => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];

/**
 * Text that decodes itself character by character. One rAF loop per
 * instance writes straight to the glyph spans — no React state per
 * character, and no re-render per tick. Screen readers get the real text
 * from `aria-label`; the churning glyphs are hidden from them.
 */
export function ScrambleText({ text, delay = 0, className = '' }) {
  const safeText = String(text ?? '');
  const words = safeText.split(' ');
  const glyphRefs = useRef([]);
  // The pre-decode glyphs are fixed per text: React must render the SAME
  // string on every re-render, or it would overwrite the settled characters
  // the rAF loop wrote.
  const noise = useMemo(() => Array.from(safeText, randomChar), [safeText]);

  useEffect(() => {
    const glyphs = glyphRefs.current.filter(Boolean);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      glyphs.forEach((el) => { el.textContent = el.dataset.char; });
      return undefined;
    }

    const start = performance.now();
    let last = 0;
    let raf;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (now - last < TICK_MS) return;
      last = now;
      const t = now - start;
      let done = true;
      for (const el of glyphs) {
        const begin = Number(el.dataset.start);
        if (t >= begin + SCRAMBLE_MS) {
          if (el.textContent !== el.dataset.char) el.textContent = el.dataset.char;
        } else {
          done = false;
          if (t >= begin) el.textContent = randomChar();
        }
      }
      if (done) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [safeText, delay]);

  let n = 0;
  return (
    <span className={`scramble-wrapper ${className}`.trim()} aria-label={safeText}>
      {words.map((word, w) => (
        <span key={w} className="scramble-word" aria-hidden="true">
          {word.split('').map((char, c) => {
            const i = n++;
            return (
              <span
                key={c}
                ref={(el) => { glyphRefs.current[i] = el; }}
                className="scramble-char"
                data-char={char}
                data-start={delay + w * WORD_STAGGER_MS + c * CHAR_STAGGER_MS}
              >
                {noise[i]}
              </span>
            );
          })}
          {w < words.length - 1 && <span className="scramble-space">&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}
